// Temporäres Script zum Aktivieren des Projekts
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-config.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const projectId = 'SIMKNV6z1I5xY8yDh3Zn';

async function activateProject() {
  try {
    const docRef = db.collection('project_requests').doc(projectId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.log('Projekt nicht gefunden');
      return;
    }
    
    const data = doc.data();
    console.log('Aktueller Status:');
    console.log('- title:', data.title);
    console.log('- status:', data.status);
    console.log('- isActive:', data.isActive);
    console.log('- isPublic:', data.isPublic);
    console.log('- publishingFeePaid:', data.publishingFeePaid);
    
    // Projekt aktivieren
    await docRef.update({
      status: 'active',
      isActive: true,
      isPublic: true,
      publishingFeePaid: true,
      publishedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    
    console.log('\nProjekt wurde aktiviert!');
    
  } catch (error) {
    console.error('Fehler:', error);
  }
  process.exit(0);
}

activateProject();
