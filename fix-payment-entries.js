const admin = require('firebase-admin');
const serviceAccount = require('./firebase_functions/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixPaymentEntries() {
  try {
    const orderId = '4bMTQQzVWsHyKhkbkRRu';
    const paymentIntentId = 'pi_3RpXEuD5Lvjon30a1xbmBjsl';
    const entryIds =
      '1753523589663lkqom0166,1753534030125mlw9ike5x,1753542218196he8wuwgs9,17535514465883vdf9d2v8,17535516502776y139k7dj,1753551828361x893anh6j,1753589834860th4gmulv2,1753590469417o4w5hma31,1753594883399rkc5l1mke,1753594955490lwp68v8ir'.split(
        ','
      );

    console.log('🔧 Fixing TimeEntries manually...');
    const orderRef = db.collection('auftraege').doc(orderId);

    await db.runTransaction(async transaction => {
      const orderSnapshot = await transaction.get(orderRef);

      if (!orderSnapshot.exists) {
        throw new Error(`Order ${orderId} not found.`);
      }

      const orderData = orderSnapshot.data();
      const timeEntries = orderData.timeTracking?.timeEntries || [];
      let updatedCount = 0;

      const now = new Date();

      const updatedTimeEntries = timeEntries.map(entry => {
        if (entryIds.includes(entry.id) && entry.status === 'billing_pending') {
          updatedCount++;
          console.log(`✅ TimeEntry ${entry.id.slice(-8)} marked as platform_held`);
          return {
            ...entry,
            status: 'platform_held',
            paidAt: admin.firestore.Timestamp.fromDate(now),
            paymentIntentId: paymentIntentId,
          };
        }
        return entry;
      });

      // Update the order document
      transaction.update(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.status': 'completed',
        'timeTracking.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`🎉 Successfully updated ${updatedCount} time entries to platform_held status!`);

      if (updatedCount === entryIds.length) {
        console.log('✅ ALL ENTRIES FIXED! Payment should now show as completed.');
      } else {
        console.log(`⚠️  Only ${updatedCount}/${entryIds.length} entries were updated.`);
      }
    });
  } catch (error) {
    console.error('❌ Error fixing payment entries:', error.message);
  }

  process.exit(0);
}

fixPaymentEntries();
