/**
 * Script: Escrow-Beträge prüfen
 */
const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found');
  process.exit(1);
}

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
  console.error('Fehler beim Parsen:', e.message);
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkEscrows() {
  const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  
  console.log('\n=== Escrow-Beträge prüfen ===\n');
  
  const snap = await db.collection('escrows')
    .where('providerId', '==', companyId)
    .where('status', '==', 'held')
    .get();
  
  console.log(`Gefunden: ${snap.size} Escrows mit status=held\n`);
  
  snap.forEach(doc => {
    const d = doc.data();
    console.log('Escrow ID:', doc.id);
    console.log('  Order ID:', d.orderId);
    console.log('  amount:', d.amount, '(Typ:', typeof d.amount, ')');
    console.log('  providerAmount:', d.providerAmount, '(Typ:', typeof d.providerAmount, ')');
    console.log('  platformFee:', d.platformFee);
    console.log('  platformFeePercent:', d.platformFeePercent);
    console.log('  currency:', d.currency);
    console.log('');
    
    // Interpretation
    if (d.amount > 100) {
      console.log('  => Vermutlich in CENT gespeichert!');
      console.log('  => amount in EUR:', (d.amount / 100).toFixed(2), '€');
      console.log('  => providerAmount in EUR:', ((d.providerAmount || d.amount) / 100).toFixed(2), '€');
    } else {
      console.log('  => Vermutlich in EUR gespeichert');
    }
    console.log('---');
  });
  
  process.exit(0);
}

checkEscrows().catch(err => {
  console.error('Fehler:', err);
  process.exit(1);
});
