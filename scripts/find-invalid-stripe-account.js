const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function findInvalidAccount() {
  const accountId = 'acct_1S0kcIDfwsoONzwi';
  
  console.log('Searching for Stripe Account:', accountId);
  
  // Search in companies collection
  const companiesSnap = await db.collection('companies')
    .where('stripeAccountId', '==', accountId)
    .get();
  
  if (!companiesSnap.empty) {
    companiesSnap.forEach(doc => {
      const data = doc.data();
      console.log('\n=== Found in companies ===');
      console.log('Doc ID:', doc.id);
      console.log('Company Name:', data.companyName || data.name);
      console.log('Email:', data.email);
    });
  } else {
    console.log('Not found in companies collection');
  }
  
  // Search in users collection
  const usersSnap = await db.collection('users')
    .where('stripeAccountId', '==', accountId)
    .get();
  
  if (!usersSnap.empty) {
    usersSnap.forEach(doc => {
      const data = doc.data();
      console.log('\n=== Found in users ===');
      console.log('Doc ID:', doc.id);
      console.log('Email:', data.email);
      console.log('Name:', data.firstName, data.lastName);
    });
  } else {
    console.log('Not found in users collection');
  }
}

findInvalidAccount()
  .then(() => {
    console.log('\nDone');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
