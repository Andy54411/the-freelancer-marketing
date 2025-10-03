#!/usr/bin/env node
/**
 * Export Live Firestore Data for Migration
 * Erstellt ein Backup der Produktionsdaten vor Migration
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase Admin initialisieren
const config = require('../firebase-config.json');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'tilvo-f142f',
      privateKey: config.tilvo.firebase_private_key?.replace(/\\n/g, '\n'),
      clientEmail: config.tilvo.firebase_client_email,
    }),
    projectId: 'tilvo-f142f',
  });
}

const db = admin.firestore();

async function exportCollectionData(collectionName) {
  console.log(`📥 Exportiere Collection: ${collectionName}`);

  try {
    const snapshot = await db.collection(collectionName).get();
    const data = [];

    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        data: doc.data(),
      });
    });

    console.log(`✅ ${collectionName}: ${data.length} Dokumente exportiert`);
    return data;
  } catch (error) {
    console.error(`❌ Fehler beim Export von ${collectionName}:`, error);
    return [];
  }
}

async function exportData() {
  console.log('🚀 Starte Datenexport für Migration...\n');

  // Collections die migriert werden sollen
  const collectionsToMigrate = [
    'customers',
    'inventory',
    'stockMovements',
    'timeEntries',
    'quotes',
    'expenses',
    'orderTimeTracking',
  ];

  const exportData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    collections: {},
  };

  // Exportiere alle Collections
  for (const collectionName of collectionsToMigrate) {
    exportData.collections[collectionName] = await exportCollectionData(collectionName);
  }

  // Backup-Ordner erstellen
  const backupDir = path.join(__dirname, '../migration-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Backup-Datei schreiben
  const backupFile = path.join(backupDir, `firestore-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(exportData, null, 2));

  console.log(`\n✅ Backup erstellt: ${backupFile}`);
  console.log(`📊 Backup-Statistik:`);

  Object.entries(exportData.collections).forEach(([name, data]) => {
    console.log(`   ${name}: ${data.length} Dokumente`);
  });

  console.log('\n🎯 Backup abgeschlossen. Migration kann beginnen.\n');
}

exportData().catch(console.error);
