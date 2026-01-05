/**
 * Script: Finde und lösche Test-Projekte
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

async function findAndDeleteProjects() {
  const deleteMode = process.argv[2] === '--delete';
  
  // Alle project_requests abrufen
  const snapshot = await db.collection('project_requests').get();
  
  const testProjects = [];
  
  console.log('Projekte mit test/sellin im Titel:');
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const title = (data.title || '').toLowerCase();
    if (title.includes('test') || title.includes('sellin')) {
      console.log('ID:', doc.id);
      console.log('Title:', data.title);
      console.log('Description:', (data.description || '').substring(0, 50));
      console.log('---');
      testProjects.push(doc);
    }
  });
  
  if (deleteMode && testProjects.length > 0) {
    console.log('\n=== LÖSCHE PROJEKTE ===\n');
    for (const doc of testProjects) {
      await doc.ref.delete();
      console.log('Gelöscht:', doc.id);
    }
    console.log(`\n${testProjects.length} Projekt(e) gelöscht.`);
  } else if (testProjects.length > 0) {
    console.log('\nZum Löschen: node scripts/find-test-projects.js --delete');
  }
  
  process.exit(0);
}

findAndDeleteProjects();
