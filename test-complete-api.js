const admin = require('firebase-admin');

// Initialisiere Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert('./firebase_functions/service-account.json'),
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });
} catch (e) {
  // Already initialized
}

async function testCompleteOrderAPI() {
  try {
    // 1. Reset Order Status zu PROVIDER_COMPLETED
    const db = admin.firestore();
    const orderRef = db.collection('auftraege').doc('order_1756079151320_sif5hrcdg');

    await orderRef.update({
      status: 'PROVIDER_COMPLETED',
      updatedAt: new Date(),
    });

    console.log('✅ Order status reset to PROVIDER_COMPLETED');

    // 2. Rufe die Complete API auf
    const response = await fetch(
      'http://localhost:3000/api/user/pMcdifjaj0SFu7iqd93n3mCZHPk2/orders/order_1756079151320_sif5hrcdg/complete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: 5,
          review: 'Excellent service!',
          completionNotes: 'Everything was perfect',
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log('✅ API Success:', result);
      console.log('💰 Payout Amount:', result.payoutAmount, '€');
      console.log('🔄 Payout Status:', result.payoutStatus);

      if (result.transferId) {
        console.log('💳 Stripe Transfer ID:', result.transferId);
      }
    } else {
      console.error('❌ API Error:', result);
    }
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testCompleteOrderAPI();
