import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';

// Firebase Admin initialisieren
const serviceAccountPath = path.resolve(__dirname, '../firebase_functions/service-account.json');
const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'taskilo-6e7e2',
});

const db = getFirestore();

async function createTestEscrow() {
  const escrowRef = 'ESC-99887766';
  
  console.log('1. Erstelle Test-Escrow:', escrowRef);
  
  await db.collection('escrows').doc(escrowRef).set({
    paymentReference: escrowRef,
    status: 'pending',
    amountInCents: 10000, // 100 EUR
    currency: 'EUR',
    createdAt: FieldValue.serverTimestamp(),
    description: 'Test Escrow fuer Webhook-Test',
    buyerEmail: 'test@example.com',
  });
  
  console.log('Test-Escrow erstellt!');
  console.log('');
  console.log('Escrow-ID:', escrowRef);
  console.log('Erwarteter Betrag: 100.00 EUR');
}

createTestEscrow().catch(console.error);
