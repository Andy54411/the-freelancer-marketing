// /Users/andystaudinger/Tasko/firebase_functions/src/index.ts

import * as admin from 'firebase-admin'; // Admin importieren
import { logger } from 'firebase-functions/v2'; // logger importieren für Initialisierungs-Logs
import { setGlobalOptions } from 'firebase-functions/v2/options'; // <- setGlobalOptions importieren

// --- Globale Optionen für alle 2nd Gen Funktionen setzen ---
// Diese müssen vor admin.initializeApp() gesetzt werden, wenn sie global wirken sollen
setGlobalOptions({
    timeoutSeconds: 540, // Max. 9 Minuten für den Start/Initialisierung
    memory: '512MiB',   // Mehr Speicher, könnte bei komplexer Initialisierung helfen
    cpu: 1 // Standard ist 1. Kann auf 2 erhöht werden, wenn der Start komplex ist.
});


// --- WICHTIG: Initialisierung des Firebase Admin SDK NUR HIER EINMAL ---
try {
    admin.initializeApp();
    logger.info("Firebase Admin SDK erfolgreich initialisiert in index.ts."); // Zusätzliches Log

} catch (error: any) {
    logger.error("SCHWERER FEHLER BEI DER INITIALISIERUNG DES ADMIN SDK IN index.ts!", { error: error.message, stack: error.stack });
    throw error; // Container abstürzen lassen, damit der Fehler in Cloud Run sichtbar wird
}

// --- Export-Deklarationen für alle deine Funktionen (MÜSSEN auf oberster Ebene stehen) ---
// DIESE ZEILEN MÜSSEN AUSSERHALB des try-catch-Blocks sein.
export * from './callable_stripe';
export * from './callable_general';
export * from './http_general';
export * from './http_webhooks';
export * from './http_file_uploads';
export * from './triggers_firestore';