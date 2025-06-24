"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadStripeFile = void 0;
// /Users/andystaudinger/Tasko/firebase_functions/src/http_file_uploads.ts
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const busboy_1 = __importDefault(require("busboy"));
const cors_1 = __importDefault(require("cors"));
const helpers_1 = require("./helpers");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const params_1 = require("firebase-functions/params"); // <-- Hinzufügen, falls noch nicht da
// Parameter zentral definieren (auf oberster Ebene der Datei)
const STRIPE_SECRET_KEY_UPLOADS = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
// WICHTIG: Dies initialisiert die Firebase Admin SDK für DIESE spezielle Funktion.
// Es muss hier stehen, da diese Datei direkt 'admin'-Dienste nutzt.
// admin.initializeApp(); // Entfernt, da getStorage() dies über getAdminApp() in helpers.ts handhabt
const corsHandler = (0, cors_1.default)({ origin: true });
const authenticateRequest = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        v2_1.logger.warn("[authenticateRequest] Unauthorized: Missing or invalid Authorization header.");
        throw { status: 401, message: 'Unauthorized: Missing or invalid Authorization header.' };
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        const decodedToken = await (0, helpers_1.getAuthInstance)().verifyIdToken(idToken);
        v2_1.logger.info(`[authenticateRequest] Token verified for UID: ${decodedToken.uid}`);
        return decodedToken;
    }
    catch (error) {
        v2_1.logger.warn("[authenticateRequest] Token verification failed:", error); // Dieses Log ist entscheidend!
        throw { status: 401, message: 'Unauthorized: Invalid token.' };
    }
};
const parseMultipartFormData = (req) => {
    return new Promise((resolve, reject) => {
        const bb = (0, busboy_1.default)({ headers: req.headers });
        const tmpdir = os_1.default.tmpdir();
        const fields = {};
        const files = {};
        const fileWrites = [];
        bb.on('field', (fieldname, val) => {
            fields[fieldname] = val;
            v2_1.logger.debug(`[parseMultipartFormData] Field received: ${fieldname} = ${val}`);
        });
        bb.on('file', (fieldname, file, GCSUploadMetadata) => {
            const { filename, mimeType } = GCSUploadMetadata;
            v2_1.logger.debug(`[parseMultipartFormData] File received: ${fieldname}, Filename: ${filename}, MimeType: ${mimeType}`);
            if (!filename) {
                file.resume();
                v2_1.logger.warn("[parseMultipartFormData] File has no filename, skipping.");
                return;
            }
            const filepath = path_1.default.join(tmpdir, (0, uuid_1.v4)() + '-' + path_1.default.basename(filename));
            files[fieldname] = { filepath, mimeType, filename };
            const writeStream = fs_1.default.createWriteStream(filepath);
            file.pipe(writeStream);
            const promise = new Promise((res, rej) => {
                file.on('end', () => writeStream.end());
                writeStream.on('finish', () => {
                    v2_1.logger.debug(`[parseMultipartFormData] File written to temp: ${filepath}`);
                    res();
                });
                writeStream.on('error', (err) => {
                    v2_1.logger.error(`[parseMultipartFormData] Error writing file to temp: ${filepath}`, err);
                    rej(err);
                });
            });
            fileWrites.push(promise);
        });
        bb.on('finish', async () => {
            v2_1.logger.info("[parseMultipartFormData] Busboy finished parsing, waiting for file writes.");
            try {
                await Promise.all(fileWrites);
                v2_1.logger.info("[parseMultipartFormData] All file writes complete.");
                resolve({ fields, files });
            }
            catch (error) {
                v2_1.logger.error("[parseMultipartFormData] Failed to process file streams.", error);
                reject({ status: 500, message: 'Failed to process file streams.', raw: error });
            }
        });
        bb.on('error', (err) => {
            v2_1.logger.error("[parseMultipartFormData] Error parsing form data.", err);
            reject({ status: 400, message: 'Error parsing form data.', raw: err });
        });
        if (req.rawBody) {
            v2_1.logger.debug("[parseMultipartFormData] Using req.rawBody to end busboy.");
            bb.end(req.rawBody);
        }
        else {
            v2_1.logger.debug("[parseMultipartFormData] Piping req to busboy.");
            req.pipe(bb);
        }
    });
};
exports.uploadStripeFile = (0, https_1.onRequest)({
    // Die Option { cors: true } scheint bei multipart/form-data nicht zuverlässig zu sein.
    // Wir verwenden stattdessen den manuellen cors-Handler.
    region: 'us-central1'
}, async (req, res) => {
    corsHandler(req, res, async () => {
        v2_1.logger.info("[uploadStripeFile] Function execution started.");
        if (req.method !== 'POST') {
            v2_1.logger.warn(`[uploadStripeFile] Method Not Allowed: ${req.method}`);
            res.status(405).send({ success: false, message: 'Method Not Allowed' });
            return;
        }
        const tmpFilepaths = [];
        try {
            v2_1.logger.info("[uploadStripeFile] Attempting authentication.");
            const decodedToken = await authenticateRequest(req);
            const userId = decodedToken.uid;
            v2_1.logger.info(`[uploadStripeFile] Authenticated user: ${userId}`);
            v2_1.logger.info("[uploadStripeFile] Parsing multipart form data.");
            const { fields, files } = await parseMultipartFormData(req);
            v2_1.logger.info("[uploadStripeFile] Form data parsed. Fields:", fields);
            v2_1.logger.info("[uploadStripeFile] Files received (keys):", Object.keys(files));
            Object.values(files).forEach(f => tmpFilepaths.push(f.filepath));
            v2_1.logger.info("[uploadStripeFile] Validating inputs.");
            if (userId !== fields.userId) {
                v2_1.logger.error(`[uploadStripeFile] Forbidden: UID mismatch. Token UID: ${userId}, Field UID: ${fields.userId}`);
                throw { status: 403, message: 'Forbidden: UID does not match token.' };
            }
            const purpose = fields.purpose;
            if (!purpose) {
                v2_1.logger.error("[uploadStripeFile] Bad Request: Missing 'purpose' field.");
                throw { status: 400, message: "Bad Request: Missing 'purpose' field." };
            }
            const uploadedFile = files.file;
            if (!uploadedFile) {
                v2_1.logger.error("[uploadStripeFile] Bad Request: No file uploaded in 'file' field.");
                throw { status: 400, message: "Bad Request: No file uploaded in 'file' field." };
            }
            const { filepath: uploadedFilePath, mimeType, filename } = uploadedFile;
            v2_1.logger.info(`[uploadStripeFile] Processing file: ${filename} (${mimeType}) from ${uploadedFilePath}`);
            const isEmulated = process.env.FUNCTIONS_EMULATOR === "true";
            const stripeKey = isEmulated ? process.env.STRIPE_SECRET_KEY : STRIPE_SECRET_KEY_UPLOADS.value();
            const stripe = (0, helpers_1.getStripeInstance)(stripeKey);
            v2_1.logger.info("[uploadStripeFile] Stripe instance obtained.");
            const bucket = (0, helpers_1.getStorageInstance)().bucket();
            v2_1.logger.info("[uploadStripeFile] Firebase Storage bucket obtained.");
            v2_1.logger.info("[uploadStripeFile] Initiating parallel uploads to Stripe and Firebase Storage.");
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
            v2_1.logger.info(`[uploadStripeFile] Uploads complete. Stripe file ID: ${stripeFile.id}, Storage path: ${storagePath}`);
            const gcsFile = storageResponse[0];
            v2_1.logger.info("[uploadStripeFile] GCS file object obtained from storage response.");
            let fileUrl;
            if (purpose === 'business_icon') {
                await gcsFile.makePublic();
                fileUrl = gcsFile.publicUrl();
                v2_1.logger.info(`[uploadStripeFile] Business icon made public. URL: ${fileUrl}`);
            }
            else {
                const [signedUrl] = await gcsFile.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
                fileUrl = signedUrl;
                v2_1.logger.warn(`[uploadStripeFile] Signed URL created for ${storagePath}, valid for 24h.`);
            }
            v2_1.logger.info("[uploadStripeFile] Sending success response.");
            res.status(200).send({
                success: true,
                stripeFileId: stripeFile.id,
                firebaseStorageUrl: fileUrl,
                firebaseStoragePath: storagePath,
            });
        }
        catch (error) {
            v2_1.logger.error("[uploadStripeFile] Error during processing:", error);
            const status = error.status || 500;
            const message = error.message || "Interner Serverfehler beim Upload.";
            res.status(status).send({ success: false, message: message });
        }
        finally {
            v2_1.logger.info("[uploadStripeFile] Cleaning up temporary files.");
            tmpFilepaths.forEach(filepath => {
                if (fs_1.default.existsSync(filepath)) {
                    fs_1.default.unlinkSync(filepath);
                    v2_1.logger.debug(`[uploadStripeFile] Deleted temporary file: ${filepath}`);
                }
            });
            v2_1.logger.info("[uploadStripeFile] Function execution finished.");
        }
    });
});
//# sourceMappingURL=http_file_uploads.js.map