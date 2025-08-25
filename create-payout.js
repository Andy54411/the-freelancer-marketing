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

async function createPayout() {
  try {
    const orderRef = db.collection('auftraege').doc('order_1756079151320_sif5hrcdg');
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.log('❌ Order not found');
      return;
    }

    const orderData = orderSnap.data();
    console.log('📋 Order Data:');
    console.log('- Total Amount:', orderData.totalAmountPaidByBuyer, 'cents');
    console.log(
      '- Platform Fee:',
      orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe,
      'cents'
    );

    const totalAmount = orderData.totalAmountPaidByBuyer || 40000; // 400€
    const platformFee =
      orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 1400; // 14€
    const payoutAmount = totalAmount - platformFee; // 386€

    console.log('💰 Calculated Payout Amount:', payoutAmount, 'cents (', payoutAmount / 100, '€)');

    // Erstelle oder aktualisiere Payout-Eintrag
    const payoutRef = db.collection('payouts').doc();
    await payoutRef.set({
      orderId: orderData.id,
      providerId: orderData.selectedAnbieterId,
      customerId: orderData.customerFirebaseUid,
      amount: payoutAmount,
      currency: 'EUR',
      status: 'pending',
      createdAt: new Date(),
      orderCompletedAt: new Date(),
      stripeAccountId: orderData.anbieterStripeAccountId,
      description: `Auszahlung für Auftrag ${orderData.projectTitle || orderData.projectName}`,
      category: orderData.selectedCategory,
      subcategory: orderData.selectedSubcategory,
    });

    console.log('✅ Payout entry created successfully');
    console.log('✅ Amount available for withdrawal:', payoutAmount / 100, '€');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

createPayout();
