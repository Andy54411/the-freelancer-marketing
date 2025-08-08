// Script um eine Test-Rechnung zu erstellen
// Verwendung: node create-test-invoice.js

const admin = require('firebase-admin');

// Firebase Admin konfigurieren
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./firebase_functions/service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.log('⚠️ Service Account nicht gefunden, verwende Standard-Konfiguration');
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function createTestInvoice() {
  console.log('📄 Erstelle Test-Rechnung...');

  const testInvoice = {
    invoiceNumber: 'R-2025-TEST-001',
    number: 'R-2025-TEST-001',
    companyId: 'test-company-123',
    companyName: 'Mietkoch Andy',
    customerName: 'Andy Staudinger',
    customerEmail: 'a.staudinger32@icloud.com',
    date: new Date().toISOString(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 Tage später
    total: 59.5,
    status: 'unpaid',
    items: [
      {
        description: 'Mietkoch Service',
        quantity: 1,
        price: 59.5,
        total: 59.5,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = await db.collection('invoices').add(testInvoice);
    console.log('✅ Test-Rechnung erstellt!');
    console.log('📋 Rechnung-ID:', docRef.id);
    console.log('🔢 Rechnungsnummer:', testInvoice.invoiceNumber);
    console.log('💰 Betrag:', testInvoice.total, '€');
    console.log('🔗 Print-URL: http://localhost:3000/print/invoice/' + docRef.id);
    console.log('🌐 Live-URL: https://taskilo.de/print/invoice/' + docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Test-Rechnung:', error.message);
    throw error;
  }
}

createTestInvoice().catch(console.error);
