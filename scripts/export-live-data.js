#!/usr/bin/env node
/**
 * Export Live Firebase Data to Emulator
 * Exportiert Live-Daten von Production Firebase zu lokalen Emulatoren
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK with Production credentials
const serviceAccountPath = path.join(__dirname, '../firebase_functions/service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ service-account.json not found in firebase_functions/');
  console.log('💡 Please ensure service-account.json exists for production access');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
});

const db = admin.firestore();

async function exportCollection(collectionName) {
  console.log(`📦 Exporting collection: ${collectionName}`);

  try {
    const snapshot = await db.collection(collectionName).get();
    const data = {};

    snapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });

    // Create export directory
    const exportDir = path.join(__dirname, '../emulator-exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Write collection data
    const filePath = path.join(exportDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`✅ Exported ${snapshot.size} documents from ${collectionName} to ${filePath}`);
    return snapshot.size;
  } catch (error) {
    console.error(`❌ Error exporting ${collectionName}:`, error.message);
    return 0;
  }
}

async function exportAuthUsers() {
  console.log('👥 Exporting Auth users...');

  try {
    const listUsers = await admin.auth().listUsers();
    const users = listUsers.users.map(user => ({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      disabled: user.disabled,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
      },
      customClaims: user.customClaims || {},
    }));

    const exportDir = path.join(__dirname, '../emulator-exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filePath = path.join(exportDir, 'auth-users.json');
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    console.log(`✅ Exported ${users.length} auth users to ${filePath}`);
    return users.length;
  } catch (error) {
    console.error('❌ Error exporting auth users:', error.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting Firebase Live Data Export...');
  console.log('📡 Connecting to Production Firebase...');

  // Key collections to export
  const collections = [
    'users',
    'companies',
    'orders',
    'providers',
    'chats',
    'payments',
    'reviews',
    'services',
    'time_tracking',
    'platform_config',
    'newsletters',
    'categories',
    'subcategories',
  ];

  let totalDocuments = 0;

  // Export Auth users
  const authCount = await exportAuthUsers();

  // Export Firestore collections
  for (const collection of collections) {
    const count = await exportCollection(collection);
    totalDocuments += count;
  }

  console.log('');
  console.log('📊 Export Summary:');
  console.log(`👥 Auth Users: ${authCount}`);
  console.log(`📄 Firestore Documents: ${totalDocuments}`);
  console.log(`📁 Export Directory: ${path.join(__dirname, '../emulator-exports')}`);
  console.log('');
  console.log('🎯 Ready for emulator import!');
  console.log('💡 Run: npm run import-emulator-data');
}

main().catch(console.error);
