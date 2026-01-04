/**
 * Script: Company Bankdaten aktualisieren
 * 
 * Aktualisiert die Bankverbindung einer Company mit den Daten von Elisabeth Schröder
 * 
 * Ausführen: node scripts/update-company-bank-data.js
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Initialize with service account from environment variable
let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

// Bereinige den Key
serviceAccountKey = serviceAccountKey.trim();
if ((serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) ||
    (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'"))) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');
serviceAccountKey = serviceAccountKey.replace(/\\\n/g, '\\n');

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
  console.error('Fehler beim Parsen des Service Account Keys:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function updateCompanyBankData() {
  const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  
  // Elisabeth Schröder Bankdaten (aus Revolut Counterparty)
  const elisabethBankData = {
    iban: 'DE67258622920039393200',
    bic: 'GENODEF1EUB',
    bankName: 'Volksbank Eutin',
    accountHolder: 'Elisabeth Schröder',
  };
  
  console.log('\n=== Company Bankdaten aktualisieren ===\n');
  console.log('Company ID:', companyId);
  console.log('\nNeue Bankdaten (Elisabeth Schröder):');
  console.log('- IBAN:', elisabethBankData.iban);
  console.log('- BIC:', elisabethBankData.bic);
  console.log('- Bank:', elisabethBankData.bankName);
  console.log('- Kontoinhaber:', elisabethBankData.accountHolder);
  
  // Aktualisiere alle relevanten Felder
  const updateData = {
    // Top-Level Felder (werden fuer Auszahlungen verwendet)
    iban: elisabethBankData.iban,
    bic: elisabethBankData.bic,
    bankName: elisabethBankData.bankName,
    accountHolder: elisabethBankData.accountHolder,
    // step3.bankDetails
    'step3.bankDetails.iban': elisabethBankData.iban,
    'step3.bankDetails.bic': elisabethBankData.bic,
    'step3.bankDetails.bankName': elisabethBankData.bankName,
    'step3.bankDetails.accountHolder': elisabethBankData.accountHolder,
    // step4
    'step4.iban': elisabethBankData.iban,
    'step4.bic': elisabethBankData.bic,
    'step4.bankName': elisabethBankData.bankName,
    'step4.accountHolder': elisabethBankData.accountHolder,
    // Timestamp
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  console.log('\nAktualisiere Firestore...');
  
  await db.collection('companies').doc(companyId).update(updateData);
  
  console.log('Datenbank erfolgreich aktualisiert!\n');
  
  // Verifizieren
  const doc = await db.collection('companies').doc(companyId).get();
  const data = doc.data();
  
  console.log('=== Verifikation ===\n');
  console.log('Top-Level Felder:');
  console.log('- IBAN:', data.iban);
  console.log('- BIC:', data.bic);
  console.log('- Bank:', data.bankName);
  console.log('- Kontoinhaber:', data.accountHolder);
  console.log('\nbankDetails:');
  console.log('- IBAN:', data.bankDetails?.iban);
  console.log('- BIC:', data.bankDetails?.bic);
  console.log('- Bank:', data.bankDetails?.bankName);
  console.log('- Kontoinhaber:', data.bankDetails?.accountHolder);
  console.log('\nstep3.bankDetails:');
  console.log('- IBAN:', data.step3?.bankDetails?.iban);
  console.log('- BIC:', data.step3?.bankDetails?.bic);
  console.log('\nstep4:');
  console.log('- IBAN:', data.step4?.iban);
  console.log('- BIC:', data.step4?.bic);
  
  console.log('\nFertig!');
  process.exit(0);
}

updateCompanyBankData().catch(err => {
  console.error('Fehler:', err);
  process.exit(1);
});
