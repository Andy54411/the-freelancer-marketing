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

async function testAPIComplete() {
  try {
    console.log('🧪 Testing API Complete Endpoint...');

    // Daten aus der Datenbank abrufen
    const orderRef = db.collection('auftraege').doc('order_1756079151320_sif5hrcdg');
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists) {
      console.log('❌ Order not found');
      return;
    }

    const orderData = orderSnapshot.data();
    console.log('📋 Current order data fields:');
    console.log('Status:', orderData.status);
    console.log('Customer UID:', orderData.customerFirebaseUid);
    console.log('Provider ID:', orderData.selectedAnbieterId);
    console.log('anbieterStripeAccountId:', orderData.anbieterStripeAccountId);
    console.log('paymentIntentId:', orderData.paymentIntentId);
    console.log('totalAmountPaidByBuyer:', orderData.totalAmountPaidByBuyer);
    console.log('sellerCommissionInCents:', orderData.sellerCommissionInCents);
    console.log('');

    // Berechne companyNetAmount
    const totalAmount = orderData.totalAmountPaidByBuyer || 0;
    const platformFee = orderData.sellerCommissionInCents || 0;
    const companyNetAmount = totalAmount - platformFee;

    console.log('💰 Calculated amounts:');
    console.log('Total Amount:', totalAmount);
    console.log('Platform Fee:', platformFee);
    console.log('Company Net Amount:', companyNetAmount);
    console.log('');

    // Simuliere API Request
    const requestBody = {
      rating: 4,
      review: 'Test review',
      completionNotes: 'Test completion',
    };

    console.log('📤 API Request Body:', requestBody);

    // Test API mit curl
    const apiUrl =
      'http://localhost:3000/api/user/pMcdifjaj0SFu7iqd93n3mCZHPk2/orders/order_1756079151320_sif5hrcdg/complete';
    console.log('🌐 API URL:', apiUrl);
    console.log('');
    console.log('Run this curl command to test:');
    console.log(`curl -X POST "${apiUrl}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '${JSON.stringify(requestBody)}'`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testAPIComplete();
