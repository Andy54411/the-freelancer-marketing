#!/usr/bin/env node
/**
 * Import Emulator Data for Testing
 * Lädt Backup-Daten in Firebase Emulator für Migrationstests
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase Admin für Emulator initialisieren
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'taskilo-next-optimized'
  });
}

const db = admin.firestore();

// Emulator-Verbindung konfigurieren
if (isEmulator) {
  const { Firestore } = require('@google-cloud/firestore');
  process.env.FIRESTORE_EMULATOR_HOST = isEmulator;
  console.log(`🔧 Verbinde mit Firestore Emulator: ${isEmulator}`);
}

async function importData() {
  console.log('📤 Starte Datenimport in Emulator...\n');
  
  // Neuestes Backup finden
  const backupDir = path.join(__dirname, '../migration-backup');
  if (!fs.existsSync(backupDir)) {
    console.log('❌ Kein Backup-Ordner gefunden. Führe zuerst export-live-data.js aus.');
    return;
  }
  
  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('firestore-backup-') && file.endsWith('.json'))
    .sort()
    .reverse();
  
  if (backupFiles.length === 0) {
    console.log('❌ Keine Backup-Dateien gefunden.');
    return;
  }
  
  const latestBackup = path.join(backupDir, backupFiles[0]);
  console.log(`📁 Verwende Backup: ${backupFiles[0]}`);
  
  const backupData = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
  
  // Importiere alle Collections
  for (const [collectionName, documents] of Object.entries(backupData.collections)) {
    console.log(`📥 Importiere ${collectionName}...`);
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const docData of documents) {
      const docRef = db.collection(collectionName).doc(docData.id);
      batch.set(docRef, docData.data);
      batchCount++;
      
      // Firebase Batch-Limit: 500 Operationen
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`   💾 Batch von ${batchCount} Dokumenten gespeichert`);
        batchCount = 0;
      }
    }
    
    // Verbleibende Dokumente committen
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   💾 Finale Batch von ${batchCount} Dokumenten gespeichert`);
    }
    
    console.log(`✅ ${collectionName}: ${documents.length} Dokumente importiert`);
  }
  
  console.log('\n🎯 Import abgeschlossen. Emulator ist bereit für Migration.\n');
}

importData().catch(console.error);