const admin = require('firebase-admin');

// Direkt Service Account laden
const serviceAccount = require('/Users/andystaudinger/Downloads/tilvo-f142f-firebase-adminsdk-fbsvc-5c8f74a326.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = process.argv[2] || 'a.staudinger32@gmail.com';

console.log('Checking user:', email);

admin.auth().getUserByEmail(email)
  .then(user => {
    console.log('\nUser found:');
    console.log('  UID:', user.uid);
    console.log('  Email:', user.email);
    console.log('  Email Verified:', user.emailVerified);
    console.log('  Provider:', user.providerData.map(p => p.providerId).join(', '));
    console.log('  Created:', user.metadata.creationTime);
    console.log('  Last Sign In:', user.metadata.lastSignInTime);
    process.exit(0);
  })
  .catch(err => {
    console.log('\nUser NOT found:', err.code, err.message);
    process.exit(1);
  });
