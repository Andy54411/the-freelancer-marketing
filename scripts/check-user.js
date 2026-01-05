/**
 * Script: Check User Profile
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Initialize with service account from environment variable
let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

// Bereinige den Key
serviceAccountKey = serviceAccountKey.trim();
if ((serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) ||
    (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'"))) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');
serviceAccountKey = serviceAccountKey.replace(/\\\n/g, '\\n');

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
  console.error('Fehler beim Parsen des Service Account Keys:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkUser(uid) {
  console.log(`\n=== Checking User: ${uid} ===\n`);
  
  // 1. Check users collection
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    console.log('✅ User in /users collection:', JSON.stringify(userDoc.data(), null, 2));
  } else {
    console.log('❌ User NOT found in /users collection');
  }
  
  // 2. Check Firebase Auth
  try {
    const authUser = await admin.auth().getUser(uid);
    console.log('\n✅ Firebase Auth User:');
    console.log('  Email:', authUser.email);
    console.log('  Display Name:', authUser.displayName);
    console.log('  Created:', authUser.metadata.creationTime);
    console.log('  Last Sign In:', authUser.metadata.lastSignInTime);
  } catch (e) {
    console.log('\n❌ Firebase Auth User NOT found:', e.message);
  }
  
  process.exit(0);
}

const uid = process.argv[2];
if (!uid) {
  console.log('Usage: node scripts/check-user.js <uid>');
  process.exit(1);
}

checkUser(uid);
