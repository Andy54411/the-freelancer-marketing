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

async function completeOrder() {
  try {
    const orderRef = db.collection('auftraege').doc('order_1756079151320_sif5hrcdg');

    // Update Order Status zu "ABGESCHLOSSEN" mit allen notwendigen Feldern
    await orderRef.update({
      status: 'ABGESCHLOSSEN',
      completedAt: new Date(),
      completedBy: 'pMcdifjaj0SFu7iqd93n3mCZHPk2', // Customer UID
      customerRating: 5,
      customerReview: 'Fantastic service!',
      completionNotes: 'Everything went perfectly',
      payoutStatus: 'pending',
      updatedAt: new Date(),
    });

    console.log('✅ Order successfully completed with ABGESCHLOSSEN status');
    console.log('✅ Customer rating: 5 stars');
    console.log('✅ Payout status: pending');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

completeOrder();
