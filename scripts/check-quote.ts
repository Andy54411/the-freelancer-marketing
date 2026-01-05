import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Firebase Admin initialisieren mit Service Account Key aus ENV
let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY nicht in .env.local gefunden');
  process.exit(1);
}

// Bereinige den Key - entferne escaped Quotes
serviceAccountKey = serviceAccountKey.trim();
if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(serviceAccountKey);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkQuote() {
  const docId = 'quote_1767539031867_4y2ziy4iu';
  
  // Check in quotes collection
  const quoteDoc = await db.collection('quotes').doc(docId).get();
  if (quoteDoc.exists) {
    const data = quoteDoc.data();
    console.log('Found in quotes collection:');
    console.log('isPublic:', data?.isPublic);
    console.log('status:', data?.status);
    console.log('title:', data?.title);
    
    // If not public, set it to public
    if (!data?.isPublic) {
      console.log('\nSetting isPublic to true...');
      await db.collection('quotes').doc(docId).update({ isPublic: true });
      console.log('Done! isPublic is now true');
    }
    return;
  }
  
  // Check in project_requests collection
  const projectDoc = await db.collection('project_requests').doc(docId).get();
  if (projectDoc.exists) {
    const data = projectDoc.data();
    console.log('Found in project_requests collection:');
    console.log('isPublic:', data?.isPublic);
    console.log('status:', data?.status);
    console.log('title:', data?.title);
    
    // If not public, set it to public
    if (!data?.isPublic) {
      console.log('\nSetting isPublic to true...');
      await db.collection('project_requests').doc(docId).update({ isPublic: true });
      console.log('Done! isPublic is now true');
    }
    return;
  }
  
  console.log('Document not found in either collection');
}

checkQuote().then(() => process.exit(0));
