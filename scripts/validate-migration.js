const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase Admin SDK initialisieren
const app = initializeApp();
const db = getFirestore(app);

async function validateMigration() {
  console.log('🔍 Validiere Live-Datenbank Migration...\n');

  const targetCompanyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';

  const collections = ['customers', 'inventory', 'stockMovements', 'timeEntries', 'expenses'];

  console.log(`📊 Prüfe migrierte Daten für Company: ${targetCompanyId}\n`);

  for (const collectionName of collections) {
    try {
      // Prüfe neue Subcollection
      const newCollectionRef = db
        .collection('companies')
        .doc(targetCompanyId)
        .collection(collectionName);
      const newSnapshot = await newCollectionRef.get();

      // Prüfe alte Root-Collection (sollte leer oder reduziert sein)
      const oldCollectionRef = db.collection(collectionName);
      const oldSnapshot = await oldCollectionRef.get();

      console.log(`📁 ${collectionName}:`);
      console.log(`   ✅ Neue Subcollection: ${newSnapshot.size} Dokumente`);
      console.log(`   ⚠️  Alte Root-Collection: ${oldSnapshot.size} Dokumente`);

      // Zeige Details der migrierten Dokumente
      if (newSnapshot.size > 0) {
        console.log(
          `   📋 Migrierte Dokument-IDs: ${newSnapshot.docs.map(doc => doc.id).join(', ')}`
        );
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Fehler bei Validierung von ${collectionName}:`, error.message);
    }
  }

  // Prüfe problematische Collections ohne companyId
  console.log('🔍 Prüfe Dokumente ohne companyId:\n');

  const problematicCollections = ['quotes', 'orderTimeTracking'];

  for (const collectionName of problematicCollections) {
    try {
      const snapshot = await db.collection(collectionName).get();
      console.log(`📁 ${collectionName}: ${snapshot.size} Dokumente (nicht migriert)`);

      if (snapshot.size > 0) {
        const docsWithoutCompanyId = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (!data.companyId) {
            docsWithoutCompanyId.push({
              id: doc.id,
              data: {
                createdAt: data.createdAt?.toDate?.()?.toISOString() || 'Unbekannt',
                userId: data.userId || 'Unbekannt',
                // Weitere relevante Felder je nach Collection
                ...(collectionName === 'quotes' && {
                  projectTitle: data.projectTitle || 'Unbekannt',
                }),
                ...(collectionName === 'orderTimeTracking' && {
                  orderId: data.orderId || 'Unbekannt',
                }),
              },
            });
          }
        });

        console.log(`   ⚠️  Dokumente ohne companyId: ${docsWithoutCompanyId.length}`);
        docsWithoutCompanyId.forEach(doc => {
          console.log(
            `      - ID: ${doc.id}, User: ${doc.data.userId}, Created: ${doc.data.createdAt}`
          );
        });
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Fehler bei Prüfung von ${collectionName}:`, error.message);
    }
  }
}

// Ausführen
validateMigration()
  .then(() => {
    console.log('✅ Migration-Validierung abgeschlossen!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Validierung fehlgeschlagen:', error);
    process.exit(1);
  });
