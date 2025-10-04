const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'tilvo-f142f'
  });
}

const db = getFirestore();

async function checkInvoice() {
  try {
    const invoiceDoc = await db
      .collection('companies')
      .doc('LLc8PX1VYHfpoFknk8o51LAOfSA2')
      .collection('invoices')
      .doc('2cb09tWauyEXiL2VuY1S')
      .get();
    
    if (invoiceDoc.exists) {
      const data = invoiceDoc.data();
      console.log('📄 Rechnung 2cb09tWauyEXiL2VuY1S:');
      console.log('   invoiceNumber:', data.invoiceNumber || data.number);
      console.log('   status:', data.status);
      console.log('   isLocked (direkt):', data.isLocked);
      console.log('   gobdStatus:', JSON.stringify(data.gobdStatus, null, 2));
      console.log('   lockedAt:', data.lockedAt);
      console.log('   lockedBy:', data.lockedBy);
      
      // Prüfe GoBD-Lock-Status
      const gobdLocked = data.gobdStatus?.isLocked;
      const directLocked = data.isLocked;
      const shouldBeLocked = gobdLocked || directLocked;
      
      console.log('🔍 LOCK ANALYSIS:');
      console.log('   gobdStatus.isLocked:', gobdLocked);
      console.log('   isLocked (direct):', directLocked);
      console.log('   Should be locked:', shouldBeLocked);
      
      if (!shouldBeLocked) {
        console.log('✅ Rechnung ist NICHT gesperrt - "Dokument bearbeiten" sollte angezeigt werden');
      } else {
        console.log('🔒 Rechnung ist gesperrt - "Dokument ist festgeschrieben" sollte angezeigt werden');
      }
    } else {
      console.log('❌ Rechnung nicht gefunden');
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

checkInvoice().then(() => {
  console.log('✅ Prüfung abgeschlossen');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script-Fehler:', error);
  process.exit(1);
});