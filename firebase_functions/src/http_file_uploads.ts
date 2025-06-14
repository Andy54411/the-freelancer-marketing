// /Users/andystaudinger/Tasko/firebase_functions/src/http_file_uploads.ts
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin"; // Hier wird 'admin' importiert
import busboy from "busboy";
import Stripe from "stripe";
import { getStripeInstance } from "./helpers"; // Annahme: getStripeInstance ist korrekt definiert
import path from "path";
import os from "os";
import fs from "fs";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from 'uuid';

// WICHTIG: Dies initialisiert die Firebase Admin SDK für DIESE spezielle Funktion.
// Es muss hier stehen, da diese Datei direkt 'admin'-Dienste nutzt.
admin.initializeApp();

const authenticateRequest = async (req: any): Promise<admin.auth.DecodedIdToken> => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    logger.warn("[authenticateRequest] Unauthorized: Missing or invalid Authorization header.");
    throw { status: 401, message: 'Unauthorized: Missing or invalid Authorization header.' };
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    logger.info(`[authenticateRequest] Token verified for UID: ${decodedToken.uid}`);
    return decodedToken;
  } catch (error) {
    logger.warn("[authenticateRequest] Token verification failed:", error); // Dieses Log ist entscheidend!
    throw { status: 401, message: 'Unauthorized: Invalid token.' };
  }
};

const parseMultipartFormData = (req: any): Promise<{ fields: { [key: string]: string }, files: { [key: string]: { filepath: string, mimeType: string, filename: string } } }> => {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();
    const fields: { [key: string]: string } = {};
    const files: { [key: string]: { filepath: string, mimeType: string, filename: string } } = {};
    const fileWrites: Promise<void>[] = [];

    bb.on('field', (fieldname, val) => {
      fields[fieldname] = val;
      logger.debug(`[parseMultipartFormData] Field received: ${fieldname} = ${val}`);
    });

    bb.on('file', (fieldname, file, GCSUploadMetadata) => {
      const { filename, mimeType } = GCSUploadMetadata;
      logger.debug(`[parseMultipartFormData] File received: ${fieldname}, Filename: ${filename}, MimeType: ${mimeType}`);
      if (!filename) {
        file.resume();
        logger.warn("[parseMultipartFormData] File has no filename, skipping.");
        return;
      }
      const filepath = path.join(tmpdir, uuidv4() + '-' + path.basename(filename));
      files[fieldname] = { filepath, mimeType, filename };

      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);

      const promise = new Promise<void>((res, rej) => {
        file.on('end', () => writeStream.end());
        writeStream.on('finish', () => {
          logger.debug(`[parseMultipartFormData] File written to temp: ${filepath}`);
          res();
        });
        writeStream.on('error', (err) => {
          logger.error(`[parseMultipartFormData] Error writing file to temp: ${filepath}`, err);
          rej(err);
        });
      });
      fileWrites.push(promise);
    });

    bb.on('finish', async () => {
      logger.info("[parseMultipartFormData] Busboy finished parsing, waiting for file writes.");
      try {
        await Promise.all(fileWrites);
        logger.info("[parseMultipartFormData] All file writes complete.");
        resolve({ fields, files });
      } catch (error) {
        logger.error("[parseMultipartFormData] Failed to process file streams.", error);
        reject({ status: 500, message: 'Failed to process file streams.', raw: error });
      }
    });

    bb.on('error', (err) => {
      logger.error("[parseMultipartFormData] Error parsing form data.", err);
      reject({ status: 400, message: 'Error parsing form data.', raw: err });
    });

    if (req.rawBody) {
      logger.debug("[parseMultipartFormData] Using req.rawBody to end busboy.");
      bb.end(req.rawBody);
    } else {
      logger.debug("[parseMultipartFormData] Piping req to busboy.");
      req.pipe(bb);
    }
  });
};

export const uploadStripeFile = onRequest(
  {
    cors: true,
    region: 'us-central1'
  },
  async (req, res) => {
    logger.info("[uploadStripeFile] Function execution started.");

    if (req.method !== 'POST') {
      logger.warn(`[uploadStripeFile] Method Not Allowed: ${req.method}`);
      res.status(405).send({ success: false, message: 'Method Not Allowed' });
      return;
    }

    const tmpFilepaths: string[] = [];

    try {
      logger.info("[uploadStripeFile] Attempting authentication.");
      const decodedToken = await authenticateRequest(req);
      const userId = decodedToken.uid;
      logger.info(`[uploadStripeFile] Authenticated user: ${userId}`);

      logger.info("[uploadStripeFile] Parsing multipart form data.");
      const { fields, files } = await parseMultipartFormData(req);
      logger.info("[uploadStripeFile] Form data parsed. Fields:", fields);
      logger.info("[uploadStripeFile] Files received (keys):", Object.keys(files));

      Object.values(files).forEach(f => tmpFilepaths.push(f.filepath));

      logger.info("[uploadStripeFile] Validating inputs.");
      if (userId !== fields.userId) {
        logger.error(`[uploadStripeFile] Forbidden: UID mismatch. Token UID: ${userId}, Field UID: ${fields.userId}`);
        throw { status: 403, message: 'Forbidden: UID does not match token.' };
      }
      const purpose = fields.purpose as Stripe.FileCreateParams.Purpose;
      if (!purpose) {
        logger.error("[uploadStripeFile] Bad Request: Missing 'purpose' field.");
        throw { status: 400, message: "Bad Request: Missing 'purpose' field." };
      }
      const uploadedFile = files.file;
      if (!uploadedFile) {
        logger.error("[uploadStripeFile] Bad Request: No file uploaded in 'file' field.");
        throw { status: 400, message: "Bad Request: No file uploaded in 'file' field." };
      }

      const { filepath: uploadedFilePath, mimeType, filename } = uploadedFile;
      logger.info(`[uploadStripeFile] Processing file: ${filename} (${mimeType}) from ${uploadedFilePath}`);

      const stripe = getStripeInstance();
      logger.info("[uploadStripeFile] Stripe instance obtained.");
      const bucket = getStorage().bucket();
      logger.info("[uploadStripeFile] Firebase Storage bucket obtained.");

      logger.info("[uploadStripeFile] Initiating parallel uploads to Stripe and Firebase Storage.");
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
      logger.info(`[uploadStripeFile] Uploads complete. Stripe file ID: ${stripeFile.id}, Storage path: ${storagePath}`);

      const gcsFile = storageResponse[0];
      logger.info("[uploadStripeFile] GCS file object obtained from storage response.");

      let fileUrl: string;
      if (purpose === 'business_icon') {
        await gcsFile.makePublic();
        fileUrl = gcsFile.publicUrl();
        logger.info(`[uploadStripeFile] Business icon made public. URL: ${fileUrl}`);
      } else {
        const [signedUrl] = await gcsFile.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
        fileUrl = signedUrl;
        logger.warn(`[uploadStripeFile] Signed URL created for ${storagePath}, valid for 24h.`);
      }

      logger.info("[uploadStripeFile] Sending success response.");
      res.status(200).send({
        success: true,
        stripeFileId: stripeFile.id,
        firebaseStorageUrl: fileUrl,
        firebaseStoragePath: storagePath,
      });

    } catch (error: any) {
      logger.error("[uploadStripeFile] Error during processing:", error);
      const status = error.status || 500;
      const message = error.message || "Interner Serverfehler beim Upload.";
      res.status(status).send({ success: false, message: message });

    } finally {
      logger.info("[uploadStripeFile] Cleaning up temporary files.");
      tmpFilepaths.forEach(filepath => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          logger.debug(`[uploadStripeFile] Deleted temporary file: ${filepath}`);
        }
      });
      logger.info("[uploadStripeFile] Function execution finished.");
    }
  }
);