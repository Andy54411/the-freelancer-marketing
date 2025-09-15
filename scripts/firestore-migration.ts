/**
 * Firestore Collection Migration Script
 * Migriert Company-spezifische Collections zu Subcollections
 * 
 * MIGRATION PLAN:
 * 1. customers/ → companies/[id]/customers/
 * 2. inventory/ → companies/[id]/inventory/
 * 3. stockMovements/ → companies/[id]/stockMovements/
 * 4. timeEntries/ → companies/[id]/timeEntries/
 * 5. quotes/ → companies/[id]/quotes/
 * 6. expenses/ → companies/[id]/expenses/
 * 7. orderTimeTracking/ → companies/[id]/orderTimeTracking/
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, writeBatch, doc } from 'firebase/firestore';

// Firebase Configuration (replace with your config)
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface MigrationConfig {
  collectionName: string;
  companyIdField: string;
  batchSize: number;
}

const COLLECTIONS_TO_MIGRATE: MigrationConfig[] = [
  { collectionName: 'customers', companyIdField: 'companyId', batchSize: 100 },
  { collectionName: 'inventory', companyIdField: 'companyId', batchSize: 100 },
  { collectionName: 'stockMovements', companyIdField: 'companyId', batchSize: 100 },
  { collectionName: 'timeEntries', companyIdField: 'companyId', batchSize: 100 },
  { collectionName: 'quotes', companyIdField: 'companyId', batchSize: 50 },
  { collectionName: 'expenses', companyIdField: 'companyId', batchSize: 100 },
  { collectionName: 'orderTimeTracking', companyIdField: 'companyId', batchSize: 100 },
];

class FirestoreMigration {
  private dryRun: boolean;
  
  constructor(dryRun = true) {
    this.dryRun = dryRun;
  }

  async migrateCollection(config: MigrationConfig): Promise<void> {
    console.log(`\n🔄 Starting migration of '${config.collectionName}'...`);
    
    try {
      // 1. Hole alle Dokumente aus der ursprünglichen Collection
      const originalRef = collection(db, config.collectionName);
      const snapshot = await getDocs(originalRef);
      
      console.log(`📊 Found ${snapshot.docs.length} documents in '${config.collectionName}'`);
      
      if (snapshot.docs.length === 0) {
        console.log(`✅ No documents to migrate in '${config.collectionName}'`);
        return;
      }

      // 2. Gruppiere Dokumente nach Company ID
      const companiesData: { [companyId: string]: any[] } = {};
      
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const companyId = data[config.companyIdField];
        
        if (!companyId) {
          console.warn(`⚠️  Document ${docSnap.id} has no ${config.companyIdField}, skipping...`);
          return;
        }
        
        if (!companiesData[companyId]) {
          companiesData[companyId] = [];
        }
        
        companiesData[companyId].push({
          id: docSnap.id,
          data: data
        });
      });

      console.log(`🏢 Found data for ${Object.keys(companiesData).length} companies`);

      // 3. Migriere für jede Company
      for (const [companyId, documents] of Object.entries(companiesData)) {
        await this.migrateCompanyData(config.collectionName, companyId, documents);
      }

      console.log(`✅ Migration of '${config.collectionName}' completed!`);
      
    } catch (error) {
      console.error(`❌ Error migrating '${config.collectionName}':`, error);
      throw error;
    }
  }

  private async migrateCompanyData(
    collectionName: string, 
    companyId: string, 
    documents: any[]
  ): Promise<void> {
    console.log(`  📦 Migrating ${documents.length} documents for company ${companyId}...`);
    
    if (this.dryRun) {
      console.log(`  🧪 DRY RUN: Would create subcollection companies/${companyId}/${collectionName}/`);
      return;
    }

    try {
      // Erstelle Batch für bessere Performance
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const document of documents) {
        // Erstelle neues Dokument in Subcollection
        const newDocRef = doc(collection(db, 'companies', companyId, collectionName));
        
        // Entferne companyId aus den Daten (nicht mehr nötig in Subcollection)
        const cleanedData = { ...document.data };
        delete cleanedData.companyId;
        
        batch.set(newDocRef, cleanedData);
        batchCount++;

        // Führe Batch aus, wenn Limit erreicht
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`    ✅ Batch of ${batchCount} documents written`);
          batchCount = 0;
        }
      }

      // Führe verbleibenden Batch aus
      if (batchCount > 0) {
        await batch.commit();
        console.log(`    ✅ Final batch of ${batchCount} documents written`);
      }

      console.log(`  ✅ Successfully migrated ${documents.length} documents for company ${companyId}`);
      
    } catch (error) {
      console.error(`  ❌ Error migrating company ${companyId}:`, error);
      throw error;
    }
  }

  async deleteOriginalCollection(collectionName: string): Promise<void> {
    if (this.dryRun) {
      console.log(`🧪 DRY RUN: Would delete original collection '${collectionName}'`);
      return;
    }

    console.log(`🗑️  Deleting original collection '${collectionName}'...`);
    
    const originalRef = collection(db, collectionName);
    const snapshot = await getDocs(originalRef);
    
    const batch = writeBatch(db);
    let batchCount = 0;

    snapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
      batchCount++;

      if (batchCount >= 500) {
        // Note: This would need to be handled differently for large collections
        console.log(`Preparing to delete batch of ${batchCount} documents...`);
      }
    });

    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Deleted ${batchCount} documents from '${collectionName}'`);
    }
  }

  async runFullMigration(): Promise<void> {
    console.log(`🚀 Starting Firestore Migration (DRY RUN: ${this.dryRun})`);
    console.log(`📅 ${new Date().toISOString()}`);
    
    for (const config of COLLECTIONS_TO_MIGRATE) {
      try {
        await this.migrateCollection(config);
      } catch (error) {
        console.error(`💥 Failed to migrate ${config.collectionName}:`, error);
        
        // Ask if user wants to continue
        const shouldContinue = confirm(`Migration of '${config.collectionName}' failed. Continue with next collection?`);
        if (!shouldContinue) {
          break;
        }
      }
    }
    
    console.log(`\n🎉 Migration process completed!`);
    
    if (!this.dryRun) {
      console.log(`\n⚠️  NEXT STEPS:`);
      console.log(`1. Update all service files to use new subcollection paths`);
      console.log(`2. Update Firestore security rules`);
      console.log(`3. Test application thoroughly`);
      console.log(`4. Delete original collections (run deleteOriginalCollection)`);
    }
  }
}

// Usage Examples:
async function runMigration() {
  // 1. Test run first (DRY RUN)
  const dryRunMigration = new FirestoreMigration(true);
  await dryRunMigration.runFullMigration();
  
  // 2. Ask for confirmation
  const shouldProceed = confirm('DRY RUN completed. Proceed with actual migration?');
  
  if (shouldProceed) {
    // 3. Run actual migration
    const realMigration = new FirestoreMigration(false);
    await realMigration.runFullMigration();
  }
}

// Export for use
export { FirestoreMigration, runMigration, COLLECTIONS_TO_MIGRATE };

// Run if called directly
if (typeof window !== 'undefined') {
  console.log('Migration script loaded. Call runMigration() to start.');
}