import { setGlobalOptions } from 'firebase-functions/v2/options';

// Globale Optionen setzen (das ist gut so).
setGlobalOptions({
    timeoutSeconds: 540,
    memory: '512MiB',
    cpu: 1
});

// KEIN admin.initializeApp() mehr hier!

// Alle Funktionen werden wieder normal exportiert.
export * from './callable_stripe';
export * from './callable_general';
export * from './http_general';
export * from './http_webhooks';
export * from './http_file_uploads';
export * from './triggers_firestore';