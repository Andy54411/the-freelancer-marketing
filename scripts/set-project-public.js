/**
 * Set project to public
 */
const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found');
  process.exit(1);
}

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
  console.error('Fehler beim Parsen:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function setProjectPublic(projectId) {
  try {
    const ref = db.collection('project_requests').doc(projectId);
    const doc = await ref.get();
    
    if (!doc.exists) {
      console.log('Projekt nicht gefunden:', projectId);
      return;
    }
    
    const data = doc.data();
    console.log('Aktueller Status:');
    console.log('  isPublic:', data.isPublic);
    console.log('  requestType:', data.requestType);
    
    await ref.update({
      isPublic: true,
      requestType: 'marketplace',
    });
    
    console.log('\nProjekt aktualisiert:');
    console.log('  isPublic: true');
    console.log('  requestType: marketplace');
    
    process.exit(0);
  } catch (error) {
    console.error('Fehler:', error);
    process.exit(1);
  }
}

const projectId = process.argv[2] || 'quote_1767539031867_4y2ziy4iu';
setProjectPublic(projectId);
