const admin = require('firebase-admin');

try {
  admin.initializeApp({
    credential: admin.credential.cert('./firebase_functions/service-account.json'),
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });
} catch (e) {
  // Already initialized
}

const db = admin.firestore();

async function checkOrder() {
  try {
    const orderRef = db.collection('auftraege').doc('order_1756079409042_l2ry7piy0');
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists) {
      console.log('❌ Order not found');
      return;
    }

    const orderData = orderSnapshot.data();
    console.log('📋 ORDER DATA:');
    console.log('Order ID:', orderData.id);
    console.log('Status:', orderData.status);
    console.log('Provider ID:', orderData.selectedAnbieterId);
    console.log('Customer ID:', orderData.customerFirebaseUid);
    console.log(
      'Created:',
      orderData.createdAt?.toDate?.()?.toISOString?.() || orderData.createdAt
    );
    console.log(
      'Last Updated:',
      orderData.lastUpdated?.toDate?.()?.toISOString?.() || orderData.lastUpdated
    );
    console.log('Description:', orderData.description);
    console.log('Price:', orderData.totalAmountPaidByBuyer || orderData.originalJobPriceInCents);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkOrder();
