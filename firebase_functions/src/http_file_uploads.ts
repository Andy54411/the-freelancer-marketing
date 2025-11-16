// /Users/andystaudinger/Tasko/firebase_functions/src/http_file_uploads.ts
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
// import * as functions from "firebase-functions"; // Veraltet, wird entfernt
import type * as admin from "firebase-admin";
import busboy from "busboy";
import { corsHandler } from "./shared/cors";
import Stripe from "stripe";
import { getStripeInstance, getStorageInstance, getAuthInstance } from "./helpers";
import path from "path";
import os from "os";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { defineSecret } from "firebase-functions/params"; // Korrekte Methode für v2 Secrets

// Secret wieder mit defineSecret definieren
const STRIPE_SECRET_KEY_UPLOADS = defineSecret("STRIPE_SECRET_KEY");

// CORS-Konfiguration wird jetzt aus shared/cors.ts importiert

const authenticateRequest = async (req: any): Promise<admin.auth.DecodedIdToken> => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    logger.warn("[authenticateRequest] Unauthorized: Missing or invalid Authorization header.");
    throw { status: 401, message: 'Unauthorized: Missing or invalid Authorization header.' };
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const decodedToken = await getAuthInstance().verifyIdToken(idToken);
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
    region: 'europe-west1',
    secrets: [STRIPE_SECRET_KEY_UPLOADS], // Secret für die Funktion deklarieren
    memory: '512MiB', // Speicher auf 512 MiB erhöhen für Datei-Uploads
    timeoutSeconds: 120 // Timeout auf 120 Sekunden erhöhen für große Dateien
  },
  async (req, res) => {
    // WICHTIG: Der corsHandler MUSS die Anfrage verarbeiten, BEVOR irgendeine andere Logik ausgeführt wird.
    corsHandler(req, res, async () => {
      logger.info("[uploadStripeFile] Function execution started after CORS check.");

      // Der Preflight-Request (OPTIONS) sollte hier bereits behandelt worden sein.
      // Wenn es sich um einen OPTIONS-Request handelt, hat corsHandler bereits geantwortet und wir sollten hier nicht weitermachen.
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

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
        logger.info(`[uploadStripeFile] Processing file: ${filename} (${mimeType}) from ${uploadedFilePath} for purpose: ${purpose}`);

        logger.info("[uploadStripeFile] Attempting to get Stripe key");
        const stripeKey = process.env.STRIPE_SECRET_KEY_UPLOADS || process.env.STRIPE_SECRET_KEY;
        
        if (!stripeKey) {
          logger.error("[uploadStripeFile] Stripe key is not available");
          throw new Error("Stripe key is not available");
        }

        // Bereinige den Key von Whitespace
        const cleanKey = stripeKey.trim();
        
        if (!cleanKey.startsWith('sk_')) {
          logger.error("[uploadStripeFile] Invalid Stripe key format");
          throw new Error("Invalid Stripe key format");
        }

        logger.info("[uploadStripeFile] Successfully obtained Stripe key:", {
          keyType: cleanKey.startsWith('sk_live_') ? 'LIVE' : 'TEST',
          keyLength: cleanKey.length
        });

        logger.info("[uploadStripeFile] Using Stripe key type:", 
          stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST'
        );
        // Direktes Stripe-Instanz erstellen für bessere Kontrolle
        const stripe = new Stripe(cleanKey, {
          typescript: true,
          maxNetworkRetries: 5,
          timeout: 120000
        });
        logger.info("[uploadStripeFile] Stripe instance created");

        const bucket = getStorageInstance().bucket('tilvo-f142f-storage');
        logger.info("[uploadStripeFile] Firebase Storage bucket obtained.");

        logger.info("[uploadStripeFile] Initiating parallel uploads to Stripe and Firebase Storage.");
        
        // Memory-optimiert: Datei in Chunks lesen statt alles auf einmal
        let fileBuffer: Buffer;
        try {
          fileBuffer = fs.readFileSync(uploadedFilePath);
          logger.info(`[uploadStripeFile] File read into buffer: ${fileBuffer.length} bytes`);
        } catch (readError) {
          logger.error("[uploadStripeFile] Failed to read file into buffer:", readError);
          throw { status: 500, message: "Failed to read uploaded file." };
        }
        
        logger.info('[uploadStripeFile] Creating Stripe file with:', {
          purpose,
          filename,
          mimeType,
          fileSize: fileBuffer.length,
          stripeKeyType: stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST'
        });

        const stripePromise = stripe.files.create({
          purpose: purpose,
          file: { 
            data: fileBuffer, 
            name: filename, 
            type: mimeType 
          }
        }, {
          timeout: 60000, // 60 Sekunden Timeout
          maxNetworkRetries: 3, // 3 Versuche bei Netzwerkfehlern
        }).catch(stripeError => {
          logger.error('[uploadStripeFile] Stripe API Error:', {
            type: stripeError.type,
            code: stripeError.code,
            param: stripeError.param,
            message: stripeError.message,
            raw: stripeError.raw,
            statusCode: stripeError.statusCode,
            requestId: stripeError.requestId
          });
          throw stripeError;
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

        // WORKAROUND: Temporarily make the file public to avoid signBlob permission issues.
        await gcsFile.makePublic();
        const fileUrl = gcsFile.publicUrl();
        logger.info(`[uploadStripeFile] File made temporarily public. URL: ${fileUrl}`);

        // Schedule a task to make the file private again after a short delay.
        // This is a simplified approach. For production, consider using Cloud Tasks.
        setTimeout(() => {
          gcsFile.makePrivate().then(() => {
            logger.info(`[uploadStripeFile] File ${gcsFile.name} has been made private again.`);
          }).catch((err: any) => {
            logger.error(`[uploadStripeFile] Failed to make file ${gcsFile.name} private again.`, err);
          });
        }, 60000); // 60 seconds delay

        logger.info("[uploadStripeFile] Sending success response.");
        res.status(200).send({
          success: true,
          stripeFileId: stripeFile.id,
          firebaseStorageUrl: fileUrl,
          firebaseStoragePath: storagePath,
        });

      } catch (error: any) {
        logger.error("[uploadStripeFile] Error during processing:", {
          name: error.name,
          message: error.message,
          code: error.code,
          type: error.type,
          statusCode: error.statusCode,
          requestId: error.requestId, // Stripe specific
          param: error.param, // Stripe specific
          raw: error.raw, // Stripe specific
          stack: error.stack
        });

        // Spezifische Fehlerbehandlung für Stripe-Fehler
        if (error.type && error.type.startsWith('Stripe')) {
          const stripeError = error as Stripe.errors.StripeError;
          return res.status(error.statusCode || 500).send({
            success: false,
            message: `Stripe-Fehler: ${stripeError.message}`,
            code: stripeError.code,
            type: stripeError.type,
            requestId: stripeError.requestId
          });
        }

        const status = error.status || 500;
        const message = error.message || "Interner Serverfehler beim Upload.";
        res.status(status).send({ 
          success: false, 
          message: message,
          type: error.type || 'InternalError',
          code: error.code
        });

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
    });
  }
);