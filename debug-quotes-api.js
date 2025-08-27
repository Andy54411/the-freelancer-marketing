const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./firebase_functions/service-account.json');
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'tilvo-f142f',
});
const db = getFirestore(app);

async function testAPI() {
  const uid = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';

  // Get user data
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    console.log('❌ User not found');
    return;
  }

  const userData = userDoc.data();
  const customerEmail = userData?.email;

  console.log('🔍 User Data:');
  console.log('- UID:', uid);
  console.log('- Email:', customerEmail);

  if (!customerEmail) {
    console.log('❌ No email found');
    return;
  }

  // Test customerUid query
  console.log('\n📊 Testing customerUid query...');
  try {
    const snapshot1 = await db.collection('quotes').where('customerUid', '==', uid).get();
    console.log('customerUid results:', snapshot1.docs.length);
    snapshot1.docs.forEach(doc => {
      const data = doc.data();
      console.log('  - Quote:', doc.id, 'Title:', data.projectTitle);
    });
  } catch (error) {
    console.log('customerUid query error:', error.message);
  }

  // Test customerEmail query
  console.log('\n📊 Testing customerEmail query...');
  try {
    const snapshot2 = await db
      .collection('quotes')
      .where('customerEmail', '==', customerEmail)
      .get();
    console.log('customerEmail results:', snapshot2.docs.length);
    snapshot2.docs.forEach(doc => {
      const data = doc.data();
      console.log('  - Quote:', doc.id, 'Title:', data.projectTitle);
    });
  } catch (error) {
    console.log('customerEmail query error:', error.message);
  }

  // Check specific quote
  console.log('\n📋 Checking specific quote...');
  const quoteDoc = await db.collection('quotes').doc('quote_1756320622873_zuv5lwk04').get();
  if (quoteDoc.exists) {
    const data = quoteDoc.data();
    console.log('Quote found:');
    console.log('- customerUid:', data.customerUid);
    console.log('- customerEmail:', data.customerEmail);
    console.log('- providerId:', data.providerId);
    console.log('- Matches UID?', data.customerUid === uid);
    console.log('- Matches Email?', data.customerEmail === customerEmail);
  }

  process.exit(0);
}

testAPI().catch(console.error);
