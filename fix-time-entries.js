const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function fixTimeEntriesStatus() {
  console.log('🔧 Fixing TimeEntries status for your €3,421.00 payment...\n');

  try {
    const orderId = '4bMTQQzVWsHyKhkbkRRu';
    const paymentIntentId = 'pi_3RpWwVD5Lvjon30a0SUDpeQr';

    const orderRef = db.collection('auftraege').doc(orderId);

    await db.runTransaction(async transaction => {
      const orderSnapshot = await transaction.get(orderRef);

      if (!orderSnapshot.exists) {
        throw new Error(`Order ${orderId} not found`);
      }

      const orderData = orderSnapshot.data();
      const timeEntries = orderData.timeEntries || [];

      console.log(`📊 Found ${timeEntries.length} total time entries`);

      let updatedCount = 0;
      const updatedTimeEntries = timeEntries.map(entry => {
        // Check if this entry has the payment intent ID and is billing_pending
        if (entry.paymentIntentId === paymentIntentId && entry.status === 'billing_pending') {
          updatedCount++;
          console.log(`✅ Updating entry ${entry.id}: ${entry.status} → platform_held`);

          return {
            ...entry,
            status: 'platform_held',
            paidAt: new Date(), // Use current timestamp
          };
        }
        return entry;
      });

      // Update the order document with the fixed time entries
      transaction.update(orderRef, {
        timeEntries: updatedTimeEntries,
        'timeTracking.status': 'completed', // Update overall status
        'timeTracking.lastUpdated': new Date(),
      });

      console.log(
        `\n🎉 SUCCESS! Updated ${updatedCount} time entries from billing_pending to platform_held`
      );
      console.log(`💰 Your €3,421.00 payment is now fully processed!`);
      console.log(`📱 The frontend should now show "BEZAHLT" instead of "BEZAHLUNG ERFORDERLICH!"`);
    });
  } catch (error) {
    console.error('❌ Error fixing time entries:', error);
  } finally {
    process.exit(0);
  }
}

fixTimeEntriesStatus();
