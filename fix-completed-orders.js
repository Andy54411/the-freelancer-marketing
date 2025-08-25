const admin = require('firebase-admin');
const { readFileSync } = require('fs');

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(
    readFileSync('/Users/andystaudinger/Tasko/firebase_functions/service-account.json', 'utf8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });
} catch (error) {
  console.error('Firebase init failed:', error);
  process.exit(1);
}

const db = admin.firestore();

async function fixCompletedOrders() {
  try {
    console.log('🔧 Repariere Orders mit completedAt aber falschen Status...');

    const ordersRef = db.collection('auftraege');

    // Finde Orders die completedAt haben aber nicht ABGESCHLOSSEN sind
    const allOrdersQuery = ordersRef.where('status', '==', 'PROVIDER_COMPLETED');
    const snapshot = await allOrdersQuery.get();

    const batch = db.batch();
    let fixedCount = 0;

    snapshot.forEach(doc => {
      const orderData = doc.data();

      // Wenn Order completedAt hat aber nicht ABGESCHLOSSEN ist
      if (orderData.completedAt && orderData.status !== 'ABGESCHLOSSEN') {
        console.log(`🔧 Repariere Order ${doc.id}:`);
        console.log('  Current Status:', orderData.status);
        console.log('  Has completedAt:', !!orderData.completedAt);
        console.log('  Amount:', orderData.totalAmountPaidByBuyer / 100, 'EUR');

        // Update zu ABGESCHLOSSEN und available_for_payout
        batch.update(doc.ref, {
          status: 'ABGESCHLOSSEN',
          payoutStatus: 'available_for_payout',
          payoutAvailableAt: new Date(),
          updatedAt: new Date(),
        });

        fixedCount++;
      }
    });

    if (fixedCount > 0) {
      await batch.commit();
      console.log(`✅ ${fixedCount} Orders repariert!`);

      // Test: Zeige neue verfügbare Payouts
      console.log('\n💰 Neue verfügbare Payouts für Provider 0Rj5vGkBjeXrzZKBr4cFfV0jRuw1:');

      const payoutQuery = ordersRef
        .where('selectedAnbieterId', '==', '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1')
        .where('status', '==', 'ABGESCHLOSSEN')
        .where('payoutStatus', '==', 'available_for_payout');

      const payoutSnapshot = await payoutQuery.get();

      let totalAvailable = 0;
      payoutSnapshot.forEach(doc => {
        const orderData = doc.data();
        const amount = orderData.totalAmountPaidByBuyer || 0;
        const platformFee =
          orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
        const netAmount = amount - platformFee;
        totalAvailable += netAmount;

        console.log(`  📦 ${doc.id}: ${netAmount / 100} EUR (${orderData.projectTitle})`);
      });

      console.log(`💸 Total verfügbar: ${totalAvailable / 100} EUR`);
    } else {
      console.log('ℹ️ Keine Orders zum Reparieren gefunden');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixCompletedOrders();
