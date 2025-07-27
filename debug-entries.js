const admin = require('firebase-admin');
const serviceAccount = require('./firebase_functions/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugEntries() {
  try {
    const orderId = '4bMTQQzVWsHyKhkbkRRu';
    const entryIds =
      '1753523589663lkqom0166,1753534030125mlw9ike5x,1753542218196he8wuwgs9,17535514465883vdf9d2v8,17535516502776y139k7dj,1753551828361x893anh6j,1753589834860th4gmulv2,1753590469417o4w5hma31,1753594883399rkc5l1mke,1753594955490lwp68v8ir'.split(
        ','
      );

    console.log('🔍 Debugging TimeEntries...');
    const orderRef = db.collection('auftraege').doc(orderId);
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists) {
      console.log('❌ Order not found');
      return;
    }

    const orderData = orderSnapshot.data();
    const timeEntries = orderData.timeEntries || [];

    console.log(`📊 Total TimeEntries: ${timeEntries.length}`);

    // Check target entries specifically
    const targetEntries = timeEntries.filter(entry => entryIds.includes(entry.id));
    console.log(`🎯 Target entries found: ${targetEntries.length}/${entryIds.length}`);

    targetEntries.forEach((entry, index) => {
      console.log(`\n📋 Entry ${index + 1}:`);
      console.log(`   ID: ${entry.id.slice(-8)}`);
      console.log(`   Status: ${entry.status}`);
      console.log(`   PaymentIntentId: ${entry.paymentIntentId || 'NONE'}`);
      console.log(`   Category: ${entry.category}`);
    });

    // Status summary
    const statusCounts = {};
    targetEntries.forEach(entry => {
      statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
    });

    console.log(`\n📈 Status Summary:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} entries`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

debugEntries();
