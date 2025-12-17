import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-config.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function getEmails() {
  const snap = await db.collection('companies').doc('jcGLTdv9D9VV2PpZZPkBjzbrrIx2').collection('emailCache').limit(5).get();
  console.log('Gefundene E-Mails:', snap.size);
  snap.docs.forEach(doc => {
    console.log('ID:', doc.id);
    console.log('Labels:', doc.data().labels);
    console.log('UserId:', doc.data().userId);
    console.log('Subject:', doc.data().subject?.substring(0, 50));
    console.log('---');
  });
}

getEmails();
