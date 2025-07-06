// /Users/andystaudinger/Tasko/firebase_functions/src/index.ts
import dotenv from 'dotenv';

dotenv.config();

import { initializeApp } from "firebase-admin/app";
initializeApp();

import { setGlobalOptions } from 'firebase-functions/v2/options';

setGlobalOptions({
    region: "europe-west1", // <-- HIER die korrekte Region global festlegen
    timeoutSeconds: 540,
    memory: '512MiB',
    cpu: 1,
    concurrency: 1, // <-- NEU: Jede Instanz bearbeitet nur eine Anfrage gleichzeitig.
});

export * from './callable_stripe';
export * from './callable_general';
export * from './http_general';
export * from './http_webhooks';
export * from './http_file_uploads';
export * from './triggers_firestore';
export * from './callable_orders';
export * from './getUserOrders';
export * from './getProviderOrders';
export * from './triggers_chat';
export * from './http_migrations'
export * from './invites';
export * from './triggers_auth';
export * from './on_call_functions';
export * from './chatbot';