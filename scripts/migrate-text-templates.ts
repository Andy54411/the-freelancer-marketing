/**
 * 🔄 TEXT TEMPLATES MIGRATION SCRIPT
 * 
 * Migriert Text Templates von Root Collection zu Subcollections
 * Von: textTemplates/{templateId}
 * Nach: companies/{companyId}/textTemplates/{templateId}
 * 
 * WICHTIG:
 * - Erstellt automatisch Backup
 * - Behält Template-IDs bei
 * - Prüft Company-Existenz
 * - Fehlerbehandlung für jede Company
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// ===== KONFIGURATION =====
const PROJECT_ID = 'tilvo-f142f';
const DRY_RUN = process.env.DRY_RUN === 'true'; // Nur Simulation, keine Änderungen

// ===== FIREBASE ADMIN INITIALISIERUNG =====
if (!admin.apps.length) {
  try {
    // Verwende Application Default Credentials (automatisch aus Firebase CLI)
    admin.initializeApp({
      projectId: PROJECT_ID,
    });
    console.log('✅ Firebase Admin initialisiert');
  } catch (error) {
    console.error('❌ Fehler beim Initialisieren von Firebase Admin:', error);
    console.log('💡 Stelle sicher, dass du mit Firebase CLI eingeloggt bist:');
    console.log('   $ firebase login');
    process.exit(1);
  }
}

const db = admin.firestore();

// ===== TYPEN =====
interface OldTemplate {
  id: string;
  companyId: string;
  [key: string]: any;
}

interface MigrationStats {
  totalTemplates: number;
  companies: number;
  migrated: number;
  errors: number;
  skipped: number;
}

// ===== HAUPTFUNKTION =====
async function migrateTextTemplates() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 TEXT TEMPLATES MIGRATION GESTARTET');
  console.log('='.repeat(70));
  console.log(`📍 Project: ${PROJECT_ID}`);
  console.log(`🔧 Mode: ${DRY_RUN ? 'DRY RUN (Simulation)' : 'LIVE (Echte Migration)'}`);
  console.log('='.repeat(70) + '\n');

  const stats: MigrationStats = {
    totalTemplates: 0,
    companies: 0,
    migrated: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // ===== SCHRITT 1: BACKUP ERSTELLEN =====
    console.log('📦 SCHRITT 1: Backup erstellen...\n');
    
    const oldTemplatesSnapshot = await db.collection('textTemplates').get();
    stats.totalTemplates = oldTemplatesSnapshot.size;
    
    console.log(`   Gefunden: ${stats.totalTemplates} Templates in Root Collection`);
    
    if (stats.totalTemplates === 0) {
      console.log('\n⚠️  Keine Templates zum Migrieren gefunden!');
      return;
    }

    if (!DRY_RUN) {
      const backupRef = db.collection('textTemplates_backup');
      const backupBatch = db.batch();
      
      oldTemplatesSnapshot.docs.forEach(doc => {
        backupBatch.set(backupRef.doc(doc.id), doc.data());
      });
      
      await backupBatch.commit();
      console.log(`   ✅ Backup erstellt: textTemplates_backup (${stats.totalTemplates} Dokumente)\n`);
    } else {
      console.log(`   🔧 DRY RUN: Backup würde erstellt werden\n`);
    }

    // ===== SCHRITT 2: TEMPLATES NACH COMPANY GRUPPIEREN =====
    console.log('📊 SCHRITT 2: Templates nach Company gruppieren...\n');
    
    const templatesByCompany = new Map<string, OldTemplate[]>();
    
    oldTemplatesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const companyId = data.companyId;
      
      if (!companyId) {
        console.warn(`   ⚠️  Template ${doc.id} hat keine companyId, wird übersprungen`);
        stats.skipped++;
        return;
      }
      
      if (!templatesByCompany.has(companyId)) {
        templatesByCompany.set(companyId, []);
      }
      
      templatesByCompany.get(companyId)!.push({
        id: doc.id,
        companyId,
        ...data,
      });
    });
    
    stats.companies = templatesByCompany.size;
    console.log(`   ✅ ${stats.companies} Companies gefunden`);
    console.log(`   📋 Templates pro Company:`);
    
    for (const [companyId, templates] of templatesByCompany) {
      console.log(`      - ${companyId.substring(0, 8)}...: ${templates.length} Templates`);
    }
    console.log('');

    // ===== SCHRITT 3: MIGRATION ZU SUBCOLLECTIONS =====
    console.log('🔄 SCHRITT 3: Migration zu Subcollections...\n');
    
    let companyIndex = 0;
    for (const [companyId, templates] of templatesByCompany) {
      companyIndex++;
      console.log(`   [${companyIndex}/${stats.companies}] Company: ${companyId.substring(0, 20)}...`);
      
      try {
        // Prüfe ob Company existiert
        const companyDoc = await db.collection('companies').doc(companyId).get();
        if (!companyDoc.exists) {
          console.error(`      ❌ Company nicht gefunden, überspringe...`);
          stats.errors += templates.length;
          continue;
        }

        if (!DRY_RUN) {
          // Erstelle Templates in Subcollection mit Batch
          const batch = db.batch();
          
          templates.forEach(template => {
            const { id, ...templateData } = template;
            const newRef = db
              .collection('companies')
              .doc(companyId)
              .collection('textTemplates')
              .doc(id); // Behalte alte ID bei
            
            batch.set(newRef, templateData);
          });

          await batch.commit();
          stats.migrated += templates.length;
          console.log(`      ✅ ${templates.length} Templates migriert`);
        } else {
          stats.migrated += templates.length;
          console.log(`      🔧 DRY RUN: ${templates.length} Templates würden migriert werden`);
        }
        
      } catch (error) {
        console.error(`      ❌ Fehler bei Migration:`, error);
        stats.errors += templates.length;
      }
    }

    // ===== SCHRITT 4: ZUSAMMENFASSUNG =====
    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATIONS-ZUSAMMENFASSUNG');
    console.log('='.repeat(70));
    console.log(`Modus:              ${DRY_RUN ? 'DRY RUN (Simulation)' : 'LIVE Migration'}`);
    console.log(`Gefunden:           ${stats.totalTemplates} Templates`);
    console.log(`Companies:          ${stats.companies}`);
    console.log(`✅ Migriert:        ${stats.migrated}`);
    console.log(`⚠️  Übersprungen:   ${stats.skipped}`);
    console.log(`❌ Fehler:          ${stats.errors}`);
    console.log('='.repeat(70));
    
    if (!DRY_RUN) {
      console.log('\n📦 Backup Location: textTemplates_backup Collection');
      console.log('\n⚠️  WICHTIG:');
      console.log('   1. Verifiziere die migrierten Daten in Firebase Console');
      console.log('   2. Teste alle Template-Funktionen in der App');
      console.log('   3. Lösche die alte Root Collection MANUELL nach 30 Tagen');
      console.log('   4. Lösche dann auch das Backup (textTemplates_backup)');
    } else {
      console.log('\n💡 Dies war ein DRY RUN - keine Daten wurden verändert');
      console.log('   Führe den Script ohne DRY_RUN=true aus für echte Migration:');
      console.log('   $ npx ts-node scripts/migrate-text-templates.ts');
    }
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ KRITISCHER FEHLER:', error);
    process.exit(1);
  }
}

// ===== SCRIPT AUSFÜHREN =====
console.log('⏳ Starting migration...\n');

migrateTextTemplates()
  .then(() => {
    console.log('✅ Migration erfolgreich abgeschlossen!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration fehlgeschlagen:', error);
    process.exit(1);
  });
