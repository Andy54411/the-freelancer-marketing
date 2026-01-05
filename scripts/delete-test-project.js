const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    let serviceAccountKey =
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccountKey) {
      // Handle escaped JSON from .env file
      let cleanKey = serviceAccountKey.trim();
      // Remove surrounding quotes if present
      if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
        cleanKey = cleanKey.slice(1, -1);
      }
      // Replace escaped quotes
      cleanKey = cleanKey.replace(/\\"/g, '"');
      
      const serviceAccount = JSON.parse(cleanKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialisiert');
    } else {
      admin.initializeApp();
      console.log('Firebase Admin mit Default Credentials initialisiert');
    }
  } catch (error) {
    console.error('Fehler bei Firebase Admin Init:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function findAndDeleteTestProject() {
  console.log('Suche nach Test-Projekten...');
  
  // Suche in project_requests
  const projectsRef = db.collection('project_requests');
  const snapshot = await projectsRef.where('title', '==', 'Test').get();
  
  if (!snapshot.empty) {
    for (const doc of snapshot.docs) {
      console.log('Gefunden in project_requests:', doc.id, '- Titel:', doc.data().title, '- Kategorie:', doc.data().category);
      await doc.ref.delete();
      console.log('Gelöscht:', doc.id);
    }
  }
  
  // Suche auch in quotes
  const quotesRef = db.collection('quotes');
  const quotesSnapshot = await quotesRef.where('title', '==', 'Test').get();
  
  if (!quotesSnapshot.empty) {
    for (const doc of quotesSnapshot.docs) {
      console.log('Gefunden in quotes:', doc.id, '- Titel:', doc.data().title, '- Kategorie:', doc.data().category);
      await doc.ref.delete();
      console.log('Gelöscht:', doc.id);
    }
  }
  
  if (snapshot.empty && quotesSnapshot.empty) {
    console.log('Kein Projekt mit Titel "Test" gefunden');
  } else {
    console.log('Fertig!');
  }
  
  process.exit(0);
}

findAndDeleteTestProject().catch(console.error);
