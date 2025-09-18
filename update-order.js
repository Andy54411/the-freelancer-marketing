// Use the existing Firebase server configuration
const { db, admin } = require('./src/firebase/server');

async function updateOrder() {
  try {
    if (!db) {
      console.error('❌ Firebase not initialized');
      return;
    }

    await db.collection('auftraege').doc('order_1757236855486_zfhg6tikp').update({
      status: 'ABGESCHLOSSEN',
      payoutStatus: 'available_for_payout',
      completedAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(
      '✅ Order updated successfully to ABGESCHLOSSEN with payoutStatus: available_for_payout'
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

updateOrder();
