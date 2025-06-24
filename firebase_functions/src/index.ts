// /Users/andystaudinger/Tasko/firebase_functions/src/index.ts
import dotenv from 'dotenv';

dotenv.config();

import { setGlobalOptions } from 'firebase-functions/v2/options';

setGlobalOptions({
    timeoutSeconds: 540,
    memory: '512MiB',
    cpu: 1,
    concurrency: 1, // <-- NEU: Jede Instanz bearbeitet nur eine Anfrage gleichzeitig.
});

// KEIN admin.initializeApp() mehr hier!

export * from './callable_stripe';
export * from './callable_general';
export * from './http_general';
export * from './http_webhooks';
export * from './http_file_uploads';
export * from './triggers_firestore';
export * from './getUserOrders'; 