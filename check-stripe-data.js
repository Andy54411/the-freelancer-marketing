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

async function checkStripeData() {
  try {
    const orderRef = db.collection('auftraege').doc('order_1756079151320_sif5hrcdg');
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists) {
      console.log('❌ Order not found');
      return;
    }

    const orderData = orderSnapshot.data();
    console.log('📋 STRIPE DATA CHECK:');
    console.log('PaymentIntent ID:', orderData.paymentIntentId || 'MISSING');
    console.log('Stripe PaymentIntent ID:', orderData.stripePaymentIntentId || 'MISSING');
    console.log('Anbieter Stripe Account:', orderData.anbieterStripeAccountId || 'MISSING');
    console.log('Total Amount:', orderData.totalAmountPaidByBuyer);
    console.log(
      'Platform Fee:',
      orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe
    );
    console.log(
      'Net Amount:',
      orderData.totalAmountPaidByBuyer - (orderData.sellerCommissionInCents || 1400)
    );
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkStripeData();
