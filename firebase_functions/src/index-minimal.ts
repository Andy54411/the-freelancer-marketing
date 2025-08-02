// /Users/andystaudinger/Tasko/firebase_functions/src/index-minimal.ts
// Minimale Version nur für getProviderOrders ohne Secret Manager Dependencies

import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from "firebase-admin/app";
initializeApp();

import { setGlobalOptions } from 'firebase-functions/v2/options';

setGlobalOptions({
    region: "europe-west1",
    timeoutSeconds: 540,
    memory: '256MiB',
    cpu: 0.1,
    concurrency: 1,
});

// Nur getProviderOrders importieren - keine Module mit defineSecret()
import * as getProviderOrdersModule from './getProviderOrders';

// Nur kritische Functions exportieren
export const getProviderOrders = getProviderOrdersModule.getProviderOrders;
