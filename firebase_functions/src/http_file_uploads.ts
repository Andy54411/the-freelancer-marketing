import { onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger as loggerV2 } from 'firebase-functions/v2';
import Stripe from 'stripe';
import Busboy from 'busboy';
import { getStripeInstance } from './helpers';
import * as admin from 'firebase-admin';
import path from 'path';

interface BusboyFileInfo {
  filename: string;
  encoding: string;
  mimeType: string;
}

export const uploadStripeFile = onRequest(
  { cors: true, region: "us-central1", memory: "512MiB" },
  async (req, res) => {
    loggerV2.info("[uploadStripeFile] Request erhalten", {
      method: req.method,
      headers: req.headers,
      rawBodyLength: req.rawBody?.length
    });

    if (req.method !== "POST") {
      loggerV2.warn("[uploadStripeFile] Ungültige Methode:", req.method);
      res.status(405).send("Method Not Allowed. Please use POST.");
      return;
    }

    const localStripe = getStripeInstance();
    const contentType = req.headers['content-type'];

    if (!contentType?.startsWith('multipart/form-data')) {
      loggerV2.warn("[uploadStripeFile] Ungültiger Content-Type:", contentType);
      res.status(400).json({ success: false, message: "Content-Type muss multipart/form-data sein." });
      return;
    }

    if (!req.rawBody) {
      loggerV2.error("[uploadStripeFile] req.rawBody ist nicht verfügbar.");
      res.status(400).json({ success: false, message: "Request-Body fehlt oder ist nicht lesbar." });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });

      let fileChunks: Buffer[] = [];
      let fileNameHolder: string | null = null;
      let mimeTypeHolder: string | null = null;
      let purposeHolder: Stripe.FileCreateParams.Purpose | null = null;
      let userIdHolder: string | null = null;

      busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, filenameInfo: BusboyFileInfo) => {
        const { filename, mimeType } = filenameInfo;
        const safeFilename = path.basename(filename || `unknown_file_${Date.now()}`);

        loggerV2.info(`[uploadStripeFile] Empfange Datei-Stream: ${safeFilename}, Busboy-MIME-Typ: ${mimeType}, Feld: ${fieldname}`);

        fileNameHolder = safeFilename;
        mimeTypeHolder = mimeType;

        file.on('data', (chunk: Buffer) => {
          loggerV2.debug(`[uploadStripeFile] Empfange Chunk für ${fileNameHolder}, Größe: ${chunk.length}`);
          fileChunks.push(chunk);
        });

        file.on('end', () => {
          loggerV2.info(`[uploadStripeFile] Datei-Stream ${fileNameHolder} beendet. Gesamt-Chunks: ${fileChunks.length}, Gesamtgröße aus Chunks: ${fileChunks.reduce((acc, cur) => acc + cur.length, 0)} bytes`);
        });

        file.on('error', (err: any) => {
          loggerV2.error(`[uploadStripeFile] Fehler im Datei-Stream ${fileNameHolder}.`, err);
          fileChunks = [];
          reject(new HttpsError("internal", `Fehler beim Streamen der Datei ${fileNameHolder}.`));
        });
      });

      busboy.on('field', (fieldname: string, val: any) => {
        loggerV2.info(`[uploadStripeFile] Feld empfangen [${fieldname}]: value: ${val}`);
        if (fieldname === 'purpose') purposeHolder = val as Stripe.FileCreateParams.Purpose;
        if (fieldname === 'userId') userIdHolder = val as string;
      });

      busboy.on('finish', async () => {
        loggerV2.info('[uploadStripeFile] Busboy-Verarbeitung abgeschlossen.');

        if (fileChunks.length === 0 || !fileNameHolder || !purposeHolder || !userIdHolder) {
          loggerV2.warn("[uploadStripeFile] Fehlende Daten nach Busboy-Finish.", { chunks: fileChunks.length, fileNameHolder, purposeHolder, userIdHolder });
          if (!res.headersSent) {
            res.status(400).json({ success: false, message: "Keine Datei, userId oder Purpose empfangen." });
          }
          resolve();
          return;
        }

        const fileBuffer = Buffer.concat(fileChunks);
        loggerV2.info(`[uploadStripeFile] Datei ${fileNameHolder} zu Buffer zusammengefügt, Länge: ${fileBuffer.length} bytes.`);

        if (fileBuffer.length === 0) {
          if (!res.headersSent) {
            res.status(400).json({ success: false, message: "Die zu verarbeitende Datei ist leer." });
          }
          resolve();
          return;
        }

        let stripeFileId: string | undefined = undefined;
        let firebaseStorageUrl: string | undefined = undefined;
        let firebaseStoragePath: string | undefined = undefined;

        try {
          const stripeFileUploadPromise = localStripe.files.create({
            file: { data: fileBuffer, name: fileNameHolder!, type: mimeTypeHolder || undefined },
            purpose: purposeHolder!,
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
            loggerV2.info(`[uploadStripeFile] Datei zu Firebase Storage hochgeladen: ${firebaseStorageUrl} (Pfad: ${firebaseStoragePath})`);
          });

          const [stripeResult] = await Promise.all([
            stripeFileUploadPromise,
            firebaseStorageUploadPromise
          ]);

          stripeFileId = stripeResult.id;
          loggerV2.info("[uploadStripeFile] Datei zu Stripe hochgeladen:", stripeFileId);

          if (!res.headersSent) {
            res.status(200).json({
              success: true,
              stripeFileId: stripeFileId,
              firebaseStorageUrl: firebaseStorageUrl,
              firebaseStoragePath: firebaseStoragePath,
              message: "Datei erfolgreich zu Stripe und Firebase Storage hochgeladen."
            });
          }
        } catch (err: any) {
          loggerV2.error("[uploadStripeFile] Fehler beim Upload (Stripe oder Firebase Storage):", { message: err.message, type: err.type, code: err.code, detail: err.raw?.message || err.stack });
          if (!res.headersSent) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message || "Upload-Fehler.", type: err.type, code: err.code });
          }
        } finally {
          resolve();
        }
      });

      busboy.on('error', (err: any) => {
        loggerV2.error('[uploadStripeFile] Busboy Fehler (generisch):', err);
        reject(err);
      });

      if (req.rawBody) {
        busboy.end(req.rawBody);
      } else {
        loggerV2.warn("[uploadStripeFile] req.rawBody ist nicht verfügbar. Versuche req.pipe.");
        if (typeof (req as any).pipe === 'function') {
          (req as any).pipe(busboy);
        } else {
          loggerV2.error("[uploadStripeFile] Weder req.rawBody noch req.pipe als Stream verfügbar.");
          reject(new HttpsError("internal", "Request-Body konnte nicht verarbeitet werden für Multipart-Upload."));
        }
      }
    }).catch(error => {
      if (!res.headersSent) {
        loggerV2.error("[uploadStripeFile] Unbehandelter Fehler im Haupt-Promise:", { message: error.message, code: error.code, details: error.details });
        const statusCode = error.httpErrorCode?.status || 500;
        const message = error.message || "Interner Serverfehler beim Dateiupload.";
        const errorCode = error.code;
        res.status(statusCode).json({
          success: false,
          message: message,
          code: errorCode,
        });
      } else {
        loggerV2.info("[uploadStripeFile] Fehler im Haupt-Promise, aber Antwort wurde bereits gesendet.", { message: error.message });
      }
    });
  }
);