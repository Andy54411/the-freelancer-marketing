#!/usr/bin/env node
/**
 * Import Exported Data to Firebase Emulators
 * Importiert exportierte Live-Daten in lokale Firebase Emulatoren
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK für Emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({
  projectId: 'tilvo-f142f',
});

const db = admin.firestore();
const auth = admin.auth();

async function importCollection(collectionName) {
  const filePath = path.join(__dirname, '../emulator-exports', `${collectionName}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${collectionName} - file not found`);
    return 0;
  }

  console.log(`📥 Importing collection: ${collectionName}`);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const batch = db.batch();
    let count = 0;

    for (const [docId, docData] of Object.entries(data)) {
      const docRef = db.collection(collectionName).doc(docId);
      batch.set(docRef, docData);
      count++;

      // Firestore batch limit is 500
      if (count % 450 === 0) {
        await batch.commit();
        console.log(`  📝 Committed batch of ${count} documents`);
      }
    }

    // Commit remaining documents
    if (count % 450 !== 0) {
      await batch.commit();
    }

    console.log(`✅ Imported ${count} documents to ${collectionName}`);
    return count;
  } catch (error) {
    console.error(`❌ Error importing ${collectionName}:`, error.message);
    return 0;
  }
}

async function importAuthUsers() {
  const filePath = path.join(__dirname, '../emulator-exports', 'auth-users.json');

  if (!fs.existsSync(filePath)) {
    console.log('⏭️  Skipping auth users - file not found');
    return 0;
  }

  console.log('👥 Importing Auth users...');

  try {
    const users = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let count = 0;

    for (const user of users) {
      try {
        await auth.createUser({
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName,
          photoURL: user.photoURL,
          disabled: user.disabled,
        });

        // Set custom claims if they exist
        if (user.customClaims && Object.keys(user.customClaims).length > 0) {
          await auth.setCustomUserClaims(user.uid, user.customClaims);
        }

        count++;
      } catch (error) {
        if (error.code === 'auth/uid-already-exists') {
          console.log(`  ⚠️  User ${user.uid} already exists, skipping`);
        } else {
          console.error(`  ❌ Error creating user ${user.uid}:`, error.message);
        }
      }
    }

    console.log(`✅ Imported ${count} auth users`);
    return count;
  } catch (error) {
    console.error('❌ Error importing auth users:', error.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting Firebase Emulator Data Import...');
  console.log('🔧 Connecting to Local Emulators...');

  const exportDir = path.join(__dirname, '../emulator-exports');
  if (!fs.existsSync(exportDir)) {
    console.error('❌ Export directory not found!');
    console.log('💡 Please run: npm run export-live-data first');
    process.exit(1);
  }

  // Import Auth users first
  const authCount = await importAuthUsers();

  // Import Firestore collections
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
  for (const collection of collections) {
    const count = await importCollection(collection);
    totalDocuments += count;
  }

  console.log('');
  console.log('📊 Import Summary:');
  console.log(`👥 Auth Users: ${authCount}`);
  console.log(`📄 Firestore Documents: ${totalDocuments}`);
  console.log('');
  console.log('🎯 Emulator data import complete!');
  console.log('🌐 Start development server: npm run dev');
  console.log('🔍 View Emulator UI: http://127.0.0.1:4000/');
}

main().catch(console.error);
