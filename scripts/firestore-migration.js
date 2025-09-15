#!/usr/bin/env node
/**
 * Firestore Migration Script - JavaScript Version
 * Migriert Collections zu Company-spezifischen Subcollections
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

class FirestoreMigration {
  constructor() {
    this.config = require('../firebase-config.json');
    this.dryRun = process.argv.includes('--dry-run');
    this.batchSize = 500;
    this.logFile = path.join(__dirname, '../migration-backup', `migration-log-${Date.now()}.log`);
    
    this.collectionsToMigrate = [
      'customers',
      'inventory',
      'stockMovements', 
      'timeEntries',
      'quotes',
      'expenses',
      'orderTimeTracking'
    ];
    
    this.migrationStats = {
      totalDocuments: 0,
      migratedDocuments: 0,
      errors: [],
      collections: {}
    };

    this.initFirebase();
    this.initLogging();
  }

  initFirebase() {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: 'tilvo-f142f',
          privateKey: this.config.tilvo.firebase_private_key?.replace(/\\n/g, '\n'),
          clientEmail: this.config.tilvo.firebase_client_email
        }),
        projectId: 'tilvo-f142f'
      });
    }
    
    this.db = admin.firestore();
    console.log('✅ Firebase Admin initialisiert');
  }

  initLogging() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    console.log(`📝 Log-Datei: ${this.logFile}`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async getCompanies() {
    this.log('🏢 Lade alle Companies...');
    const companiesSnapshot = await this.db.collection('companies').get();
    const companies = [];
    
    companiesSnapshot.forEach(doc => {
      companies.push({ id: doc.id, data: doc.data() });
    });
    
    this.log(`✅ ${companies.length} Companies gefunden`);
    return companies;
  }

  async migrateCollection(collectionName, companies) {
    this.log(`\n🚀 Beginne Migration: ${collectionName}`);
    
    const sourceSnapshot = await this.db.collection(collectionName).get();
    const totalDocs = sourceSnapshot.size;
    
    this.migrationStats.collections[collectionName] = {
      total: totalDocs,
      migrated: 0,
      errors: 0
    };
    
    if (totalDocs === 0) {
      this.log(`⏭️  Collection ${collectionName} ist leer`);
      return;
    }
    
    this.log(`📄 ${totalDocs} Dokumente zu migrieren`);
    
    // Gruppiere Dokumente nach companyId
    const documentsByCompany = new Map();
    
    sourceSnapshot.forEach(doc => {
      const data = doc.data();
      const companyId = data.companyId;
      
      if (!companyId) {
        this.log(`⚠️  Dokument ${doc.id} hat keine companyId - wird übersprungen`);
        this.migrationStats.errors.push({
          collection: collectionName,
          docId: doc.id,
          error: 'Keine companyId gefunden'
        });
        return;
      }
      
      if (!documentsByCompany.has(companyId)) {
        documentsByCompany.set(companyId, []);
      }
      
      documentsByCompany.get(companyId).push({
        id: doc.id,
        data: data
      });
    });
    
    this.log(`📊 Dokumente auf ${documentsByCompany.size} Companies verteilt`);
    
    // Migriere für jede Company
    for (const [companyId, documents] of documentsByCompany) {
      await this.migrateCompanyDocuments(collectionName, companyId, documents);
    }
    
    this.log(`✅ Migration von ${collectionName} abgeschlossen`);
  }

  async migrateCompanyDocuments(collectionName, companyId, documents) {
    this.log(`  📦 Migriere ${documents.length} Dokumente für Company: ${companyId}`);
    
    if (this.dryRun) {
      this.log(`  🏃 DRY-RUN: Würde ${documents.length} Dokumente migrieren`);
      this.migrationStats.collections[collectionName].migrated += documents.length;
      return;
    }
    
    const batch = this.db.batch();
    let batchCount = 0;
    
    for (const doc of documents) {
      // Entferne companyId aus den Daten (da es nun im Pfad ist)
      const { companyId: removedCompanyId, ...cleanData } = doc.data;
      
      // Neue Subcollection-Referenz
      const newDocRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection(collectionName)
        .doc(doc.id);
      
      batch.set(newDocRef, cleanData);
      batchCount++;
      
      // Firebase Batch-Limit: 500 Operationen
      if (batchCount >= this.batchSize) {
        await batch.commit();
        this.log(`    💾 Batch von ${batchCount} Dokumenten gespeichert`);
        this.migrationStats.collections[collectionName].migrated += batchCount;
        batchCount = 0;
      }
    }
    
    // Verbleibende Dokumente committen
    if (batchCount > 0) {
      await batch.commit();
      this.log(`    💾 Finale Batch von ${batchCount} Dokumenten gespeichert`);
      this.migrationStats.collections[collectionName].migrated += batchCount;
    }
  }

  async cleanupOriginalCollection(collectionName) {
    if (this.dryRun) {
      this.log(`🏃 DRY-RUN: Würde Collection ${collectionName} löschen`);
      return;
    }
    
    this.log(`🧹 Lösche Original-Collection: ${collectionName}`);
    
    const snapshot = await this.db.collection(collectionName).get();
    const batch = this.db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    this.log(`✅ Collection ${collectionName} gelöscht`);
  }

  async run() {
    this.log(`🚀 Firestore Migration gestartet ${this.dryRun ? '(DRY-RUN)' : '(LIVE)'}`);
    this.log(`📅 Zeitstempel: ${new Date().toISOString()}`);
    
    try {
      // Lade alle Companies
      const companies = await this.getCompanies();
      
      // Migriere jede Collection
      for (const collectionName of this.collectionsToMigrate) {
        await this.migrateCollection(collectionName, companies);
      }
      
      // Cleanup (nur bei Live-Migration)
      if (!this.dryRun) {
        this.log('\n🧹 Beginne Cleanup der Original-Collections...');
        for (const collectionName of this.collectionsToMigrate) {
          await this.cleanupOriginalCollection(collectionName);
        }
      }
      
      this.printFinalStats();
      
    } catch (error) {
      this.log(`❌ Migration fehlgeschlagen: ${error.message}`);
      console.error('Vollständiger Fehler:', error);
      process.exit(1);
    }
  }

  printFinalStats() {
    this.log('\n📊 MIGRATION ABGESCHLOSSEN!');
    this.log('================================');
    
    Object.entries(this.migrationStats.collections).forEach(([name, stats]) => {
      this.log(`${name}: ${stats.migrated}/${stats.total} Dokumente (${stats.errors} Fehler)`);
    });
    
    this.log(`\nGesamt: ${this.migrationStats.migratedDocuments} Dokumente migriert`);
    this.log(`Fehler: ${this.migrationStats.errors.length}`);
    
    if (this.migrationStats.errors.length > 0) {
      this.log('\nFehler-Details:');
      this.migrationStats.errors.forEach(error => {
        this.log(`  - ${error.collection}/${error.docId}: ${error.error}`);
      });
    }
    
    if (this.dryRun) {
      this.log('\n🎯 DRY-RUN erfolgreich! Führe ohne --dry-run aus für echte Migration.');
    } else {
      this.log('\n🎉 LIVE-MIGRATION erfolgreich abgeschlossen!');
    }
  }
}

// Script ausführen
const migration = new FirestoreMigration();
migration.run().catch(console.error);