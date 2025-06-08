"use strict";
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
const busboy_1 = __importDefault(require("busboy"));
const helpers_1 = require("./helpers");
const admin = __importStar(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
exports.uploadStripeFile = (0, https_1.onRequest)({ cors: true, region: "us-central1", memory: "512MiB" }, async (req, res) => {
    v2_1.logger.info("[uploadStripeFile] Request erhalten", {
        method: req.method,
        headers: req.headers,
        rawBodyLength: req.rawBody?.length
    });
    if (req.method !== "POST") {
        v2_1.logger.warn("[uploadStripeFile] Ungültige Methode:", req.method);
        res.status(405).send("Method Not Allowed. Please use POST.");
        return;
    }
    const localStripe = (0, helpers_1.getStripeInstance)();
    const contentType = req.headers['content-type'];
    if (!contentType?.startsWith('multipart/form-data')) {
        v2_1.logger.warn("[uploadStripeFile] Ungültiger Content-Type:", contentType);
        res.status(400).json({ success: false, message: "Content-Type muss multipart/form-data sein." });
        return;
    }
    if (!req.rawBody) {
        v2_1.logger.error("[uploadStripeFile] req.rawBody ist nicht verfügbar.");
        res.status(400).json({ success: false, message: "Request-Body fehlt oder ist nicht lesbar." });
        return;
    }
    await new Promise((resolve, reject) => {
        const busboy = (0, busboy_1.default)({ headers: req.headers });
        let fileChunks = [];
        let fileNameHolder = null;
        let mimeTypeHolder = null;
        let purposeHolder = null;
        let userIdHolder = null;
        busboy.on('file', (fieldname, file, filenameInfo) => {
            const { filename, mimeType } = filenameInfo;
            const safeFilename = path_1.default.basename(filename || `unknown_file_${Date.now()}`);
            v2_1.logger.info(`[uploadStripeFile] Empfange Datei-Stream: ${safeFilename}, Busboy-MIME-Typ: ${mimeType}, Feld: ${fieldname}`);
            fileNameHolder = safeFilename;
            mimeTypeHolder = mimeType;
            file.on('data', (chunk) => {
                v2_1.logger.debug(`[uploadStripeFile] Empfange Chunk für ${fileNameHolder}, Größe: ${chunk.length}`);
                fileChunks.push(chunk);
            });
            file.on('end', () => {
                v2_1.logger.info(`[uploadStripeFile] Datei-Stream ${fileNameHolder} beendet. Gesamt-Chunks: ${fileChunks.length}, Gesamtgröße aus Chunks: ${fileChunks.reduce((acc, cur) => acc + cur.length, 0)} bytes`);
            });
            file.on('error', (err) => {
                v2_1.logger.error(`[uploadStripeFile] Fehler im Datei-Stream ${fileNameHolder}.`, err);
                fileChunks = [];
                reject(new https_1.HttpsError("internal", `Fehler beim Streamen der Datei ${fileNameHolder}.`));
            });
        });
        busboy.on('field', (fieldname, val) => {
            v2_1.logger.info(`[uploadStripeFile] Feld empfangen [${fieldname}]: value: ${val}`);
            if (fieldname === 'purpose')
                purposeHolder = val;
            if (fieldname === 'userId')
                userIdHolder = val;
        });
        busboy.on('finish', async () => {
            v2_1.logger.info('[uploadStripeFile] Busboy-Verarbeitung abgeschlossen.');
            if (fileChunks.length === 0 || !fileNameHolder || !purposeHolder || !userIdHolder) {
                v2_1.logger.warn("[uploadStripeFile] Fehlende Daten nach Busboy-Finish.", { chunks: fileChunks.length, fileNameHolder, purposeHolder, userIdHolder });
                if (!res.headersSent) {
                    res.status(400).json({ success: false, message: "Keine Datei, userId oder Purpose empfangen." });
                }
                resolve();
                return;
            }
            const fileBuffer = Buffer.concat(fileChunks);
            v2_1.logger.info(`[uploadStripeFile] Datei ${fileNameHolder} zu Buffer zusammengefügt, Länge: ${fileBuffer.length} bytes.`);
            if (fileBuffer.length === 0) {
                if (!res.headersSent) {
                    res.status(400).json({ success: false, message: "Die zu verarbeitende Datei ist leer." });
                }
                resolve();
                return;
            }
            let stripeFileId = undefined;
            let firebaseStorageUrl = undefined;
            let firebaseStoragePath = undefined;
            try {
                const stripeFileUploadPromise = localStripe.files.create({
                    file: { data: fileBuffer, name: fileNameHolder, type: mimeTypeHolder || undefined },
                    purpose: purposeHolder,
                });
                const storage = admin.storage(); // Firebase Storage Instanz erhalten
                const bucket = storage.bucket();
                const storageFileName = `user_uploads/${userIdHolder}/${purposeHolder}_${Date.now()}_${fileNameHolder}`;
                const storageFile = bucket.file(storageFileName);
                const firebaseStorageUploadPromise = storageFile.save(fileBuffer, {
                    metadata: { contentType: mimeTypeHolder || 'application/octet-stream' },
                    public: true,
                }).then(() => {
                    firebaseStorageUrl = storageFile.publicUrl();
                    firebaseStoragePath = storageFileName;
                    v2_1.logger.info(`[uploadStripeFile] Datei zu Firebase Storage hochgeladen: ${firebaseStorageUrl} (Pfad: ${firebaseStoragePath})`);
                });
                const [stripeResult] = await Promise.all([
                    stripeFileUploadPromise,
                    firebaseStorageUploadPromise
                ]);
                stripeFileId = stripeResult.id;
                v2_1.logger.info("[uploadStripeFile] Datei zu Stripe hochgeladen:", stripeFileId);
                if (!res.headersSent) {
                    res.status(200).json({
                        success: true,
                        stripeFileId: stripeFileId,
                        firebaseStorageUrl: firebaseStorageUrl,
                        firebaseStoragePath: firebaseStoragePath,
                        message: "Datei erfolgreich zu Stripe und Firebase Storage hochgeladen."
                    });
                }
            }
            catch (err) {
                v2_1.logger.error("[uploadStripeFile] Fehler beim Upload (Stripe oder Firebase Storage):", { message: err.message, type: err.type, code: err.code, detail: err.raw?.message || err.stack });
                if (!res.headersSent) {
                    res.status(err.statusCode || 500).json({ success: false, message: err.message || "Upload-Fehler.", type: err.type, code: err.code });
                }
            }
            finally {
                resolve();
            }
        });
        busboy.on('error', (err) => {
            v2_1.logger.error('[uploadStripeFile] Busboy Fehler (generisch):', err);
            reject(err);
        });
        if (req.rawBody) {
            busboy.end(req.rawBody);
        }
        else {
            v2_1.logger.warn("[uploadStripeFile] req.rawBody ist nicht verfügbar. Versuche req.pipe.");
            if (typeof req.pipe === 'function') {
                req.pipe(busboy);
            }
            else {
                v2_1.logger.error("[uploadStripeFile] Weder req.rawBody noch req.pipe als Stream verfügbar.");
                reject(new https_1.HttpsError("internal", "Request-Body konnte nicht verarbeitet werden für Multipart-Upload."));
            }
        }
    }).catch(error => {
        if (!res.headersSent) {
            v2_1.logger.error("[uploadStripeFile] Unbehandelter Fehler im Haupt-Promise:", { message: error.message, code: error.code, details: error.details });
            const statusCode = error.httpErrorCode?.status || 500;
            const message = error.message || "Interner Serverfehler beim Dateiupload.";
            const errorCode = error.code;
            res.status(statusCode).json({
                success: false,
                message: message,
                code: errorCode,
            });
        }
        else {
            v2_1.logger.info("[uploadStripeFile] Fehler im Haupt-Promise, aber Antwort wurde bereits gesendet.", { message: error.message });
        }
    });
});
//# sourceMappingURL=http_file_uploads.js.map