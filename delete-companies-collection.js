const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase_functions/service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'tilvo-f142f',
});

const db = admin.firestore();

async function deleteCompaniesCollection() {
  try {
    console.log('🗑️  Lösche alle Dokumente aus der companies Collection...');

    // Hole alle Dokumente aus der companies Collection
    const companiesSnapshot = await db.collection('companies').get();

    if (companiesSnapshot.empty) {
      console.log('✅ Companies Collection ist bereits leer!');
      return;
    }

    console.log(`📋 Gefunden: ${companiesSnapshot.docs.length} Dokumente in companies Collection`);

    // Batch Delete für bessere Performance
    const batch = db.batch();
    let deleteCount = 0;

    for (const doc of companiesSnapshot.docs) {
      console.log(`🗑️  Lösche Company Document: ${doc.id}`);
      batch.delete(doc.ref);
      deleteCount++;

      // Firebase Batch Limit ist 500
      if (deleteCount % 400 === 0) {
        await batch.commit();
        console.log(`✅ Batch von ${deleteCount} Dokumenten gelöscht`);
      }
    }

    // Letzten Batch committen
    if (deleteCount % 400 !== 0) {
      await batch.commit();
    }

    console.log(`🎉 Erfolgreich ${deleteCount} Dokumente aus companies Collection gelöscht!`);

    // Prüfe ob Collection wirklich leer ist
    const checkSnapshot = await db.collection('companies').get();
    if (checkSnapshot.empty) {
      console.log('✅ Companies Collection erfolgreich gelöscht!');
    } else {
      console.log(`⚠️  Noch ${checkSnapshot.docs.length} Dokumente übrig`);
    }
  } catch (error) {
    console.error('❌ Fehler beim Löschen der companies Collection:', error);
  } finally {
    process.exit(0);
  }
}

deleteCompaniesCollection();
