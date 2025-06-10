// /Users/andystaudinger/Tasko/firebase_functions/src/index.ts

import * as admin from 'firebase-admin'; // <--- Admin importieren

// Initialisierungslogik in try-catch blocken
try {
    admin.initializeApp();
    console.log("Firebase Admin SDK erfolgreich initialisiert.");

} catch (error) {
    console.error("SCHWERER FEHLER BEI DER INITIALISIERUNG DES ADMIN SDK:", error);
    throw error; // Container abstürzen lassen, damit der Fehler in Cloud Run sichtbar wird
}

// Export-Deklarationen MÜSSEN auf der obersten Ebene stehen
export * from './callable_stripe';
export * from './callable_general';
export * from './http_general';
export * from './http_webhooks';
export * from './http_file_uploads';
export * from './triggers_firestore';