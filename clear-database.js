const admin = require('firebase-admin');

// Firebase Admin initialisieren
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'tilvo-f142f',
});

const db = admin.firestore();

async function clearDatabase() {
  console.log('🗑️  Taskilo Datenbank wird geleert...\n');

  try {
    // Collections die geleert werden sollen
    const collections = [
      'companies',
      'users',
      'orders',
      'chats',
      'notifications',
      'reviews',
      'invites',
      'bookings',
      'payments',
      'profiles',
    ];

    for (const collectionName of collections) {
      console.log(`🔄 Lösche Collection: ${collectionName}`);

      const collectionRef = db.collection(collectionName);
      const snapshot = await collectionRef.get();

      if (snapshot.empty) {
        console.log(`   ✅ Collection ${collectionName} ist bereits leer`);
        continue;
      }

      console.log(`   📊 Gefunden: ${snapshot.docs.length} Dokumente`);

      // Batch delete für bessere Performance
      const batchSize = 100;
      const batches = [];

      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = snapshot.docs.slice(i, i + batchSize);

        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });

        batches.push(batch.commit());
      }

      await Promise.all(batches);
      console.log(
        `   ✅ Collection ${collectionName} geleert (${snapshot.docs.length} Dokumente gelöscht)`
      );
    }

    console.log('\n🎉 Datenbank erfolgreich geleert!');
    console.log('💡 Die Datenbank ist jetzt bereit für saubere Tests.');
  } catch (error) {
    console.error('❌ Fehler beim Leeren der Datenbank:', error);
  } finally {
    process.exit(0);
  }
}

// Sicherheitsabfrage
console.log('⚠️  WARNUNG: Dies wird ALLE Daten in der Taskilo-Datenbank löschen!');
console.log('🎯 Projekt: tilvo-f142f (TASKO)');
console.log('📍 Environment: Production');
console.log('\nStarten Sie das Script nur wenn Sie sicher sind!\n');

// Script ausführen
clearDatabase();
