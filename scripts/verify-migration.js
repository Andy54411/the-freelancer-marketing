#!/usr/bin/env node
/**
 * Verifiziert die migrierten Subcollections
 */

const admin = require('firebase-admin');

// Firebase initialisieren
if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'tilvo-f142f' });
}

const db = admin.firestore();

async function verifyMigration() {
  console.log('✅ Verifiziere Migration - Prüfe Subcollections...\n');

  const companyIds = ['LLc8PX1VYHfpoFknk8o51LAOfSA2', 't0VQOV5RfTMIIgo6UDhy5b3z0BL2'];

  const collections = [
    'customers',
    'inventory',
    'stockMovements',
    'timeEntries',
    'quotes',
    'expenses',
    'orderTimeTracking',
  ];

  let totalMigrated = 0;

  for (const companyId of companyIds) {
    console.log(`🏢 Company: ${companyId}`);

    for (const collectionName of collections) {
      try {
        const subcollectionRef = db
          .collection('companies')
          .doc(companyId)
          .collection(collectionName);

        const snapshot = await subcollectionRef.get();

        if (!snapshot.empty) {
          console.log(`   📂 ${collectionName}: ${snapshot.size} Dokumente`);
          totalMigrated += snapshot.size;

          // Zeige erste paar Dokument-IDs als Bestätigung
          const docIds = snapshot.docs.slice(0, 3).map(doc => doc.id);
          console.log(`      IDs: ${docIds.join(', ')}${snapshot.size > 3 ? '...' : ''}`);
        } else {
          console.log(`   📂 ${collectionName}: 0 Dokumente`);
        }
      } catch (error) {
        console.log(`   ❌ Fehler bei ${collectionName}: ${error.message}`);
      }
    }
    console.log('');
  }

  console.log(`📊 Migration-Zusammenfassung:`);
  console.log(`   Gesamt migrierte Dokumente: ${totalMigrated}`);
  console.log(`   Erwartete Dokumente: 23 (basierend auf vorheriger Migration)`);

  if (totalMigrated === 23) {
    console.log('✅ Migration vollständig erfolgreich!');
  } else if (totalMigrated > 0) {
    console.log('⚠️  Migration teilweise erfolgreich');
  } else {
    console.log('❌ Keine migrierten Dokumente gefunden');
  }

  console.log('\n🎯 Verifikation abgeschlossen!');
}

verifyMigration().catch(console.error);
