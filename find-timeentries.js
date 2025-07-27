const admin = require('firebase-admin');
const serviceAccount = require('./firebase_functions/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function findTimeEntries() {
  try {
    const orderId = '4bMTQQzVWsHyKhkbkRRu';

    console.log('🔍 Checking all possible TimeEntry locations...');
    const orderRef = db.collection('auftraege').doc(orderId);
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists) {
      console.log('❌ Order not found');
      return;
    }

    const orderData = orderSnapshot.data();
    console.log('📄 Order found');
    console.log('🔑 Top-level keys:', Object.keys(orderData).sort());

    // Check timeEntries array
    console.log('\n🔍 Checking timeEntries ARRAY:');
    if (orderData.timeEntries) {
      console.log(`📊 Array length: ${orderData.timeEntries.length}`);
      if (orderData.timeEntries.length > 0) {
        console.log('📋 First array entry sample:', {
          id: orderData.timeEntries[0].id,
          status: orderData.timeEntries[0].status,
          category: orderData.timeEntries[0].category,
        });
      }
    } else {
      console.log('❌ No timeEntries array found');
    }

    // Check timeEntries subcollection
    console.log('\n🔍 Checking timeEntries SUBCOLLECTION:');
    const timeEntriesCollection = await orderRef.collection('timeEntries').get();
    console.log(`📊 Subcollection size: ${timeEntriesCollection.size} documents`);

    if (timeEntriesCollection.size > 0) {
      const firstEntry = timeEntriesCollection.docs[0];
      console.log('📋 First subcollection entry:', {
        id: firstEntry.id,
        status: firstEntry.data().status,
        category: firstEntry.data().category,
        paymentIntentId: firstEntry.data().paymentIntentId || 'NONE',
      });

      // List all subcollection entries
      console.log('\n📋 All subcollection entries:');
      timeEntriesCollection.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(
          `   ${index + 1}. ID: ${doc.id.slice(-8)} | Status: ${data.status} | Category: ${data.category}`
        );
      });
    }

    // Check timeTracking structure
    if (orderData.timeTracking && orderData.timeTracking.timeEntries) {
      console.log(
        `\n🔍 timeTracking.timeEntries array: ${orderData.timeTracking.timeEntries.length} entries`
      );
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

findTimeEntries();
