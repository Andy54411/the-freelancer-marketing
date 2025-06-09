"use strict";
// /Users/andystaudinger/Tasko/firebase_functions/src/http_file_uploads.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadStripeFile = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const busboy_1 = __importDefault(require("busboy"));
const helpers_1 = require("./helpers");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
// KORREKTUR 1: "UploadResponse" entfernt, da es nicht existiert.
const storage_1 = require("firebase-admin/storage");
const uuid_1 = require("uuid");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
// --- 1. Helper für Authentifizierung ---
const authenticateRequest = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        throw { status: 401, message: 'Unauthorized: Missing or invalid Authorization header.' };
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        return await admin.auth().verifyIdToken(idToken);
    }
    catch (error) {
        v2_1.logger.warn("Token-Verifizierung fehlgeschlagen:", error);
        throw { status: 401, message: 'Unauthorized: Invalid token.' };
    }
};
// --- 2. Helper für Multipart-Parsing ---
const parseMultipartFormData = (req) => {
    return new Promise((resolve, reject) => {
        const bb = (0, busboy_1.default)({ headers: req.headers });
        const tmpdir = os_1.default.tmpdir();
        const fields = {};
        const files = {};
        const fileWrites = [];
        bb.on('field', (fieldname, val) => { fields[fieldname] = val; });
        bb.on('file', (fieldname, file, GCSUploadMetadata) => {
            const { filename, mimeType } = GCSUploadMetadata;
            if (!filename) {
                file.resume();
                return;
            }
            const filepath = path_1.default.join(tmpdir, (0, uuid_1.v4)() + '-' + path_1.default.basename(filename));
            files[fieldname] = { filepath, mimeType, filename };
            const writeStream = fs_1.default.createWriteStream(filepath);
            file.pipe(writeStream);
            const promise = new Promise((res, rej) => {
                file.on('end', () => writeStream.end());
                writeStream.on('finish', res);
                writeStream.on('error', rej);
            });
            fileWrites.push(promise);
        });
        bb.on('finish', async () => {
            try {
                await Promise.all(fileWrites);
                resolve({ fields, files });
            }
            catch (error) {
                reject({ status: 500, message: 'Failed to process file streams.', raw: error });
            }
        });
        bb.on('error', (err) => reject({ status: 400, message: 'Error parsing form data.', raw: err }));
        if (req.rawBody) {
            bb.end(req.rawBody);
        }
        else {
            req.pipe(bb);
        }
    });
};
// --- Hauptfunktion: uploadStripeFile ---
exports.uploadStripeFile = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    // KORREKTUR 2: "return" aus dem res.send() entfernt.
    if (req.method !== 'POST') {
        res.status(405).send({ success: false, message: 'Method Not Allowed' });
        return;
    }
    const tmpFilepaths = [];
    try {
        // Schritt 1: Authentifizieren über Authorization-Header
        const decodedToken = await authenticateRequest(req);
        const userId = decodedToken.uid;
        // Schritt 2: Request parsen mit dem neuen Helper
        const { fields, files } = await parseMultipartFormData(req);
        Object.values(files).forEach(f => tmpFilepaths.push(f.filepath));
        // Schritt 3: Eingaben validieren
        if (userId !== fields.userId) {
            throw { status: 403, message: 'Forbidden: UID does not match token.' };
        }
        const purpose = fields.purpose;
        if (!purpose) {
            throw { status: 400, message: "Bad Request: Missing 'purpose' field." };
        }
        const uploadedFile = files.file;
        if (!uploadedFile) {
            throw { status: 400, message: "Bad Request: No file uploaded in 'file' field." };
        }
        const { filepath: uploadedFilePath, mimeType, filename } = uploadedFile;
        const stripe = (0, helpers_1.getStripeInstance)();
        const bucket = (0, storage_1.getStorage)().bucket();
        // Schritt 4: Parallel zu Stripe und Firebase Storage hochladen
        const stripePromise = stripe.files.create({
            purpose: purpose,
            file: { data: fs_1.default.readFileSync(uploadedFilePath), name: filename, type: mimeType },
        });
        const storagePath = `user_uploads/${userId}/${purpose}_${(0, uuid_1.v4)()}_${filename}`;
        const storagePromise = bucket.upload(uploadedFilePath, {
            destination: storagePath,
            metadata: { contentType: mimeType },
        });
        const [stripeFile, storageResponse] = await Promise.all([stripePromise, storagePromise]);
        // KORREKTUR 1: Direkt auf das erste Element des Arrays zugreifen.
        const gcsFile = storageResponse[0];
        // Schritt 5: URL generieren (SICHERHEITSUPDATE)
        let fileUrl;
        if (purpose === 'business_icon') {
            await gcsFile.makePublic();
            fileUrl = gcsFile.publicUrl();
        }
        else {
            const [signedUrl] = await gcsFile.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
            fileUrl = signedUrl;
            v2_1.logger.warn(`[uploadStripeFile] Für ${storagePath} wurde eine signierte URL erstellt, die 24h gültig ist.`);
        }
        // Schritt 6: Erfolgreiche Antwort senden
        res.status(200).send({
            success: true,
            stripeFileId: stripeFile.id,
            firebaseStorageUrl: fileUrl,
            firebaseStoragePath: storagePath,
        });
    }
    catch (error) {
        v2_1.logger.error("[uploadStripeFile] Fehler bei der Verarbeitung:", error);
        const status = error.status || 500;
        const message = error.message || "Interner Serverfehler beim Upload.";
        res.status(status).send({ success: false, message: message });
    }
    finally {
        // Schritt 7: Temporäre Dateien immer löschen
        tmpFilepaths.forEach(filepath => {
            if (fs_1.default.existsSync(filepath)) {
                fs_1.default.unlinkSync(filepath);
            }
        });
    }
});
//# sourceMappingURL=http_file_uploads.js.map