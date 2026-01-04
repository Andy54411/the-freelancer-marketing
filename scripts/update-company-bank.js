const admin = require('firebase-admin');
const serviceAccount = require('/Users/andystaudinger/Tasko/firebase-config.json');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'taskilo-e955e'
  });
}

const db = admin.firestore();

async function updateCompanyBank() {
  const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  
  // Elisabeth Schröder Bankdaten
  const newBankData = {
    iban: 'DE67258622920039393200',
    bic: 'GENODEF1EUB',
    bankName: 'Volksbank Eutin',
    accountHolder: 'Elisabeth Schröder',
    // Update auch step3.bankDetails und step4
    'step3.bankDetails.iban': 'DE67258622920039393200',
    'step3.bankDetails.bic': 'GENODEF1EUB',
    'step3.bankDetails.bankName': 'Volksbank Eutin',
    'step3.bankDetails.accountHolder': 'Elisabeth Schröder',
    'step4.iban': 'DE67258622920039393200',
    'step4.bic': 'GENODEF1EUB',
    'step4.bankName': 'Volksbank Eutin',
    'step4.accountHolder': 'Elisabeth Schröder',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  console.log('Updating company', companyId, 'with:');
  console.log('- IBAN:', newBankData.iban);
  console.log('- BIC:', newBankData.bic);
  console.log('- Bank:', newBankData.bankName);
  console.log('- Kontoinhaber:', newBankData.accountHolder);
  
  await db.collection('companies').doc(companyId).update(newBankData);
  
  console.log('\nDatenbank erfolgreich aktualisiert!');
  
  // Verifizieren
  const doc = await db.collection('companies').doc(companyId).get();
  const data = doc.data();
  console.log('\nVerifikation:');
  console.log('- Top-Level IBAN:', data.iban);
  console.log('- Top-Level BIC:', data.bic);
  console.log('- Top-Level Bank:', data.bankName);
  console.log('- Top-Level Kontoinhaber:', data.accountHolder);
  
  process.exit(0);
}

updateCompanyBank().catch(err => {
  console.error('Fehler:', err);
  process.exit(1);
});
