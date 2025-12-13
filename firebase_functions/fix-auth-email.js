const admin = require('firebase-admin');
const serviceAccount = require('../firebase-config.json');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function fixAuthEmail() {
  const userId = 'VP9BNVTey1WvdkMb0EPA3rdPq4t2';
  const correctEmail = 'a.staudinger32@gmail.com';
  
  try {
    const authUser = await admin.auth().getUser(userId);
    console.log('Current Firebase Auth email:', authUser.email);
    
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const firestoreEmail = userDoc.data()?.email;
    console.log('Firestore email:', firestoreEmail);
    
    if (authUser.email !== correctEmail) {
      console.log('Updating Firebase Auth to:', correctEmail);
      await admin.auth().updateUser(userId, {
        email: correctEmail,
        emailVerified: true
      });
      console.log('Firebase Auth email updated successfully!');
    } else {
      console.log('Firebase Auth already has correct email');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixAuthEmail().then(() => process.exit(0));
