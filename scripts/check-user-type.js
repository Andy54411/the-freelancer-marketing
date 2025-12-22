const admin = require('firebase-admin');
const serviceAccount = require('../firebase-minimal.json');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  const uid = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  
  // Check users collection
  const userDoc = await db.collection('users').doc(uid).get();
  console.log('=== USERS COLLECTION ===');
  if (userDoc.exists) {
    const data = userDoc.data();
    console.log('user_type:', data.user_type);
    console.log('email:', data.email);
  } else {
    console.log('NOT FOUND in users collection');
  }
  
  // Check companies collection
  const companyDoc = await db.collection('companies').doc(uid).get();
  console.log('\n=== COMPANIES COLLECTION ===');
  if (companyDoc.exists) {
    const data = companyDoc.data();
    console.log('user_type:', data.user_type);
    console.log('email:', data.email);
  } else {
    console.log('NOT FOUND in companies collection');
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
