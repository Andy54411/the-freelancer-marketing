#!/usr/bin/env node

/**
 * Migration Script: Jobs von Top-Level Collection zu Company Subcollections
 *
 * Verschiebt Jobs von jobs/{jobId} nach companies/{companyId}/jobs/{jobId}
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
 * Migriert alle Jobs von der Top-Level Collection zu Company Subcollections
 */
async function migrateJobsToSubcollections() {
  console.log('🚀 Starte Job-Migration zu Subcollections...');

  try {
    // 1. Alle Jobs aus der Top-Level Collection laden
    const jobsSnapshot = await db.collection('jobs').get();

    console.log(`📊 Gefunden: ${jobsSnapshot.size} Jobs zum Migrieren`);

    if (jobsSnapshot.empty) {
      console.log('✅ Keine Jobs zu migrieren gefunden');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    // 2. Batch-Operation für bessere Performance (max 500 ops per batch)
    const batchSize = 400;
    let batch = db.batch();
    let operationCount = 0;

    for (const doc of jobsSnapshot.docs) {
      const jobData = doc.data();
      const jobId = doc.id;
      const companyId = jobData.companyId;

      if (!companyId) {
        console.warn(`⚠️ Job ${jobId} hat keine companyId und wird übersprungen.`);
        errorCount++;
        continue;
      }

      // Ziel-Referenz: companies/{companyId}/jobs/{jobId}
      const targetRef = db.collection('companies').doc(companyId).collection('jobs').doc(jobId);

      // Original-Referenz zum Löschen
      const sourceRef = db.collection('jobs').doc(jobId);

      // Daten kopieren
      batch.set(targetRef, jobData);

      // Original löschen
      batch.delete(sourceRef);

      operationCount++;
      migratedCount++;

      // Batch ausführen wenn voll
      if (operationCount >= batchSize) {
        await batch.commit();
        console.log(`💾 Batch gespeichert (${operationCount} Operationen)`);
        batch = db.batch();
        operationCount = 0;
      }
    }

    // Letzten Batch ausführen
    if (operationCount > 0) {
      await batch.commit();
      console.log(`💾 Letzter Batch gespeichert (${operationCount} Operationen)`);
    }

    console.log('-----------------------------------');
    console.log(`✅ Migration abgeschlossen!`);
    console.log(`📦 Migriert: ${migratedCount}`);
    console.log(`❌ Fehler/Übersprungen: ${errorCount}`);
  } catch (error) {
    console.error('❌ Kritischer Fehler bei der Migration:', error);
  }
}

// Script ausführen
migrateJobsToSubcollections();
