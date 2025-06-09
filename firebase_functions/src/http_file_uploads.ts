// /Users/andystaudinger/Tasko/firebase_functions/src/http_file_uploads.ts

import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import busboy from "busboy";
import Stripe from "stripe";
import { getStripeInstance } from "./helpers";
import path from "path";
import os from "os";
import fs from "fs";
// KORREKTUR 1: "UploadResponse" entfernt, da es nicht existiert.
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from 'uuid';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- 1. Helper für Authentifizierung ---
const authenticateRequest = async (req: any): Promise<admin.auth.DecodedIdToken> => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    throw { status: 401, message: 'Unauthorized: Missing or invalid Authorization header.' };
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    logger.warn("Token-Verifizierung fehlgeschlagen:", error);
    throw { status: 401, message: 'Unauthorized: Invalid token.' };
  }
};

// --- 2. Helper für Multipart-Parsing ---
const parseMultipartFormData = (req: any): Promise<{ fields: { [key: string]: string }, files: { [key: string]: { filepath: string, mimeType: string, filename: string } } }> => {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();
    const fields: { [key: string]: string } = {};
    const files: { [key: string]: { filepath: string, mimeType: string, filename: string } } = {};
    const fileWrites: Promise<void>[] = [];

    bb.on('field', (fieldname, val) => { fields[fieldname] = val; });

    bb.on('file', (fieldname, file, GCSUploadMetadata) => {
      const { filename, mimeType } = GCSUploadMetadata;
      if (!filename) {
        file.resume();
        return;
      }
      const filepath = path.join(tmpdir, uuidv4() + '-' + path.basename(filename));
      files[fieldname] = { filepath, mimeType, filename };

      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);

      const promise = new Promise<void>((res, rej) => {
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
      } catch (error) {
        reject({ status: 500, message: 'Failed to process file streams.', raw: error });
      }
    });

    bb.on('error', (err) => reject({ status: 400, message: 'Error parsing form data.', raw: err }));

    if (req.rawBody) {
      bb.end(req.rawBody);
    } else {
      req.pipe(bb);
    }
  });
};

// --- Hauptfunktion: uploadStripeFile ---
export const uploadStripeFile = onRequest({ cors: true }, async (req, res) => {
  // KORREKTUR 2: "return" aus dem res.send() entfernt.
  if (req.method !== 'POST') {
    res.status(405).send({ success: false, message: 'Method Not Allowed' });
    return;
  }

  const tmpFilepaths: string[] = [];

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
    const purpose = fields.purpose as Stripe.FileCreateParams.Purpose;
    if (!purpose) {
      throw { status: 400, message: "Bad Request: Missing 'purpose' field." };
    }
    const uploadedFile = files.file;
    if (!uploadedFile) {
      throw { status: 400, message: "Bad Request: No file uploaded in 'file' field." };
    }

    const { filepath: uploadedFilePath, mimeType, filename } = uploadedFile;
    const stripe = getStripeInstance();
    const bucket = getStorage().bucket();

    // Schritt 4: Parallel zu Stripe und Firebase Storage hochladen
    const stripePromise = stripe.files.create({
      purpose: purpose,
      file: { data: fs.readFileSync(uploadedFilePath), name: filename, type: mimeType },
    });

    const storagePath = `user_uploads/${userId}/${purpose}_${uuidv4()}_${filename}`;
    const storagePromise = bucket.upload(uploadedFilePath, {
      destination: storagePath,
      metadata: { contentType: mimeType },
    });

    const [stripeFile, storageResponse] = await Promise.all([stripePromise, storagePromise]);

    // KORREKTUR 1: Direkt auf das erste Element des Arrays zugreifen.
    const gcsFile = storageResponse[0];

    // Schritt 5: URL generieren (SICHERHEITSUPDATE)
    let fileUrl: string;
    if (purpose === 'business_icon') {
      await gcsFile.makePublic();
      fileUrl = gcsFile.publicUrl();
    } else {
      const [signedUrl] = await gcsFile.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
      fileUrl = signedUrl;
      logger.warn(`[uploadStripeFile] Für ${storagePath} wurde eine signierte URL erstellt, die 24h gültig ist.`);
    }

    // Schritt 6: Erfolgreiche Antwort senden
    res.status(200).send({
      success: true,
      stripeFileId: stripeFile.id,
      firebaseStorageUrl: fileUrl,
      firebaseStoragePath: storagePath,
    });

  } catch (error: any) {
    logger.error("[uploadStripeFile] Fehler bei der Verarbeitung:", error);
    const status = error.status || 500;
    const message = error.message || "Interner Serverfehler beim Upload.";
    res.status(status).send({ success: false, message: message });

  } finally {
    // Schritt 7: Temporäre Dateien immer löschen
    tmpFilepaths.forEach(filepath => {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    });
  }
});