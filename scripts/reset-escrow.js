const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
serviceAccountKey = serviceAccountKey.trim();
if ((serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) ||
    (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'"))) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');
serviceAccountKey = serviceAccountKey.replace(/\\\n/g, '\\n');

const serviceAccount = JSON.parse(serviceAccountKey);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function resetEscrow() {
  const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  
  console.log('\n=== Escrow zuruecksetzen ===\n');
  
  // Finde den released Escrow
  const snap = await db.collection('escrows')
    .where('providerId', '==', companyId)
    .where('status', '==', 'released')
    .get();
  
  if (snap.empty) {
    console.log('Kein released Escrow gefunden. Suche nach allen Escrows...');
    const allSnap = await db.collection('escrows')
      .where('providerId', '==', companyId)
      .get();
    allSnap.forEach(doc => {
      const d = doc.data();
      console.log('- ID:', doc.id, '| Status:', d.status, '| Amount:', d.amount);
    });
    process.exit(0);
  }
  
  console.log(`Gefunden: ${snap.size} released Escrows\n`);
  
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log('Escrow:', doc.id);
    console.log('  Status vorher:', d.status);
    console.log('  Amount:', d.amount);
    
    await db.collection('escrows').doc(doc.id).update({
      status: 'held',
      releasedAt: admin.firestore.FieldValue.delete(),
      paymentId: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('  Status nachher: held');
    console.log('  => Zurueckgesetzt!\n');
  }
  
  console.log('Fertig!');
  process.exit(0);
}

resetEscrow().catch(err => {
  console.error('Fehler:', err);
  process.exit(1);
});
