#!/usr/bin/env node

/**
 * Migration Script: Reviews von Top-Level Collection zu Company Subcollections
 *
 * Verschiebt Reviews von reviews/{reviewId} nach companies/{companyId}/reviews/{reviewId}
 */

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin initialisieren
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'tilvo-f142f',
  });
} catch (error) {
  console.log('⚠️ Lokaler Service Account nicht gefunden, verwende Default-Credentials');
  admin.initializeApp({
    projectId: 'tilvo-f142f',
  });
}

const db = admin.firestore();

/**
 * Migriert alle Reviews von der Top-Level Collection zu Company Subcollections
 */
async function migrateReviewsToSubcollections() {
  console.log('🚀 Starte Review-Migration zu Subcollections...');

  try {
    // 1. Alle Reviews aus der Top-Level Collection laden
    const reviewsSnapshot = await db.collection('reviews').get();

    console.log(`📊 Gefunden: ${reviewsSnapshot.size} Reviews zum Migrieren`);

    if (reviewsSnapshot.empty) {
      console.log('✅ Keine Reviews zu migrieren gefunden');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    // 2. Batch-Operation für bessere Performance
    const batch = db.batch();

    // 3. Durch alle Reviews iterieren
    for (const reviewDoc of reviewsSnapshot.docs) {
      const reviewId = reviewDoc.id;
      const reviewData = reviewDoc.data();

      console.log(`\n🔄 Migriere Review: ${reviewId}`);
      console.log(`   Provider: ${reviewData.providerId}`);
      console.log(`   Customer: ${reviewData.customerId}`);
      console.log(`   Rating: ${reviewData.rating}`);

      // Validierung
      if (!reviewData.providerId) {
        console.log(`❌ Überspringe Review ${reviewId} - keine providerId`);
        errorCount++;
        continue;
      }

      try {
        // 4. Review in Subcollection kopieren
        const subcollectionRef = db
          .collection('companies')
          .doc(reviewData.providerId)
          .collection('reviews')
          .doc(reviewId);

        // Review-Daten mit Migration-Metadaten
        const migratedReviewData = {
          ...reviewData,
          // Migration-Metadaten hinzufügen
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          migratedFrom: 'reviews',
          migrationVersion: '1.0',
        };

        // Batch: Review in Subcollection erstellen
        batch.set(subcollectionRef, migratedReviewData);

        console.log(`✅ Review ${reviewId} für Migration vorbereitet`);
        migratedCount++;
      } catch (error) {
        console.log(`❌ Fehler bei Review ${reviewId}:`, error.message);
        errorCount++;
      }
    }

    // 5. Batch ausführen
    console.log(`\n🔥 Führe Batch-Migration aus für ${migratedCount} Reviews...`);
    await batch.commit();

    console.log(`\n✅ Migration abgeschlossen!`);
    console.log(`   Migriert: ${migratedCount} Reviews`);
    console.log(`   Fehler: ${errorCount} Reviews`);

    // 6. Validierung
    console.log(`\n🔍 Validiere Migration...`);
    await validateMigration();
  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
    throw error;
  }
}

/**
 * Validiert die Migration
 */
async function validateMigration() {
  try {
    // Prüfe eine spezifische Review
    const specificProviderId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
    const specificReviewId = '5Ok62RDfegdOOq84ROik';

    console.log(`🔍 Prüfe spezifische Review: ${specificReviewId}`);

    // Prüfe in Subcollection
    const subcollectionDoc = await db
      .collection('companies')
      .doc(specificProviderId)
      .collection('reviews')
      .doc(specificReviewId)
      .get();

    if (subcollectionDoc.exists) {
      const data = subcollectionDoc.data();
      console.log(`✅ Review in Subcollection gefunden:`);
      console.log(`   Rating: ${data.rating}`);
      console.log(`   Text: ${data.reviewText}`);
      console.log(`   MigratedAt: ${data.migratedAt?.toDate()}`);
    } else {
      console.log(`❌ Review nicht in Subcollection gefunden`);
    }

    // Prüfe Statistiken für alle Companies
    const companiesSnapshot = await db.collection('companies').get();

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      const reviewsInSubcollection = await db
        .collection('companies')
        .doc(companyId)
        .collection('reviews')
        .get();

      if (reviewsInSubcollection.size > 0) {
        console.log(
          `📊 Company ${companyId}: ${reviewsInSubcollection.size} Reviews in Subcollection`
        );
      }
    }
  } catch (error) {
    console.error('❌ Validierung fehlgeschlagen:', error);
  }
}

/**
 * Löscht die alten Reviews aus der Top-Level Collection
 * VORSICHT: Nur nach erfolgreicher Validierung ausführen!
 */
async function deleteOldReviews() {
  console.log('⚠️ WARNUNG: Lösche alte Reviews aus Top-Level Collection');
  console.log('⚠️ Stelle sicher, dass die Migration erfolgreich war!');

  const confirmation = process.env.DELETE_OLD_REVIEWS;
  if (confirmation !== 'YES_DELETE_OLD_REVIEWS') {
    console.log(
      '❌ Löschung abgebrochen. Setze DELETE_OLD_REVIEWS=YES_DELETE_OLD_REVIEWS um fortzufahren.'
    );
    return;
  }

  try {
    const reviewsSnapshot = await db.collection('reviews').get();

    const batch = db.batch();
    let deleteCount = 0;

    for (const reviewDoc of reviewsSnapshot.docs) {
      batch.delete(reviewDoc.ref);
      deleteCount++;
    }

    await batch.commit();
    console.log(`✅ ${deleteCount} alte Reviews gelöscht`);
  } catch (error) {
    console.error('❌ Fehler beim Löschen alter Reviews:', error);
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
        await migrateReviewsToSubcollections();
        break;
      case 'validate':
        await validateMigration();
        break;
      case 'delete-old':
        await deleteOldReviews();
        break;
      default:
        console.log(`
🔧 Review Migration Tool

Befehle:
  node migrate-reviews-to-subcollection.js migrate     - Migriert Reviews zu Subcollections
  node migrate-reviews-to-subcollection.js validate   - Validiert die Migration
  node migrate-reviews-to-subcollection.js delete-old - Löscht alte Reviews (VORSICHT!)

Beispiel:
  cd scripts/
  node migrate-reviews-to-subcollection.js migrate
        `);
    }
  } catch (error) {
    console.error('❌ Script fehlgeschlagen:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  migrateReviewsToSubcollections,
  validateMigration,
  deleteOldReviews,
};
