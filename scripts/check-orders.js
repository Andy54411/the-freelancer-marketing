const admin = require('firebase-admin');

// Directly initialize with environment variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'tilvo-f142f',
      clientEmail: 'firebase-adminsdk-fbsvc@tilvo-f142f.iam.gserviceaccount.com',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();

async function check() {
  const userId = 'bBQ4WUMQ4LX29mSxnGQmEWstnrI1';
  
  // Get ALL auftraege (recent)
  const allOrders = await db.collection('auftraege').limit(10).get();
  console.log('=== Recent Auftraege ===');
  allOrders.docs.forEach(doc => {
    const d = doc.data();
    console.log('ID:', doc.id);
    console.log('  kundeId:', d.kundeId);
    console.log('  customerFirebaseUid:', d.customerFirebaseUid);
    console.log('  status:', d.status);
    console.log('  unterkategorie:', d.unterkategorie);
    console.log('  createdAt:', d.createdAt ? d.createdAt.toDate() : null);
    console.log('  paidAt:', d.paidAt ? d.paidAt.toDate() : null);
    console.log('');
  });

  // Check for user's orders specifically
  console.log('\n=== Orders for user', userId, '===');
  const userOrders1 = await db.collection('auftraege').where('kundeId', '==', userId).get();
  const userOrders2 = await db.collection('auftraege').where('customerFirebaseUid', '==', userId).get();
  
  console.log('kundeId matches:', userOrders1.size);
  console.log('customerFirebaseUid matches:', userOrders2.size);
  
  userOrders1.docs.forEach(doc => {
    console.log('Order:', doc.id, doc.data().status);
  });
  userOrders2.docs.forEach(doc => {
    console.log('Order:', doc.id, doc.data().status);
  });
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
