/**
 * Erstellt das fehlende Firestore-Dokument für einen bestehenden Firebase Auth Benutzer
 * Usage: node scripts/create-missing-user-doc.js <uid>
 */

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Service Account aus Environment Variable laden
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY nicht in .env.local gefunden');
  process.exit(1);
}

// JSON parsen und bereinigen
const serviceAccountJson = serviceAccountRaw
  .replace(/\n/g, '')
  .replace(/\\n/g, '\n')
  .trim();

const serviceAccount = JSON.parse(serviceAccountJson);

// Firebase Admin initialisieren
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function createMissingUserDoc(uid) {
  console.log(`\n=== Erstelle Firestore-Dokument für UID: ${uid} ===\n`);

  try {
    // Prüfe ob Dokument bereits existiert
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();

    if (userDocSnap.exists) {
      console.log('Dokument existiert bereits in /users:');
      console.log(JSON.stringify(userDocSnap.data(), null, 2));
      return;
    }

    // Hole Benutzer aus Firebase Auth
    const authUser = await admin.auth().getUser(uid);
    console.log('Firebase Auth Benutzer gefunden:');
    console.log(`  Email: ${authUser.email}`);
    console.log(`  Display Name: ${authUser.displayName}`);
    console.log(`  Created: ${new Date(authUser.metadata.creationTime).toISOString()}`);

    // Erstelle Firestore-Dokument
    const userData = {
      uid: authUser.uid,
      email: authUser.email,
      user_type: 'kunde',
      displayName: authUser.displayName || null,
      photoURL: authUser.photoURL || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await userDocRef.set(userData);
    console.log('\nFirestore-Dokument erfolgreich erstellt:');
    console.log(JSON.stringify(userData, null, 2));

  } catch (error) {
    console.error('Fehler:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/create-missing-user-doc.js <uid>');
  process.exit(1);
}

createMissingUserDoc(uid);
