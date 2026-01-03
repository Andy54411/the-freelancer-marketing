require('tsx/cjs');
const { admin } = require('../src/firebase/server');
const db = admin.firestore();

async function fixEscrow() {
  // Setze den Escrow für den abgeschlossenen Auftrag auf 'held'
  const escrowId = 'escrow_CEuG2NDw1cdMUPEzA3DK_1767329551988';
  
  await db.collection('escrows').doc(escrowId).update({
    status: 'held',
    heldAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('Escrow Status auf held gesetzt:', escrowId);
  
  // Prüfe ob der falsche held Escrow zu einem nicht-completed Auftrag gehört
  const wrongHeldEscrow = await db.collection('escrows').doc('escrow_hSMCiD13aAFDi2C1Rww4_1767308494428').get();
  const wrongData = wrongHeldEscrow.data();
  console.log('\nPrüfe falschen held Escrow orderId:', wrongData.orderId);
  
  // Suche den zugehörigen Auftrag
  const ordersSnap = await db.collection('auftraege').get();
  let found = false;
  ordersSnap.docs.forEach(doc => {
    const d = doc.data();
    if (d.tempDraftId === wrongData.orderId || doc.id === wrongData.orderId) {
      console.log('Gefunden: Auftrag', doc.id, 'Status:', d.status);
      found = true;
    }
  });
  if (found === false) {
    console.log('Kein Auftrag gefunden für orderId:', wrongData.orderId);
    console.log('Dieser Escrow sollte wahrscheinlich nicht held sein - setze auf pending');
    
    await db.collection('escrows').doc('escrow_hSMCiD13aAFDi2C1Rww4_1767308494428').update({
      status: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Status auf pending zurückgesetzt');
  }
}

fixEscrow().then(() => process.exit(0));
