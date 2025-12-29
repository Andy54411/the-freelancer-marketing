const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  // Verwende GOOGLE_APPLICATION_CREDENTIALS oder Default Credentials
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'tilvo-78a6f'
  });
}

const email = process.argv[2] || 'a.staudinger32@gmail.com';

admin.auth().getUserByEmail(email)
  .then(user => {
    console.log('User found:');
    console.log('  UID:', user.uid);
    console.log('  Email:', user.email);
    console.log('  Email Verified:', user.emailVerified);
    console.log('  Provider:', user.providerData.map(p => p.providerId).join(', '));
    console.log('  Created:', user.metadata.creationTime);
    console.log('  Last Sign In:', user.metadata.lastSignInTime);
    process.exit(0);
  })
  .catch(err => {
    console.log('User NOT found:', err.code);
    process.exit(1);
  });
