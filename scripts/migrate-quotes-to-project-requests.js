/**
 * Migration Script: Quotes zu Project Requests
 * 
 * Migriert bestehende Daten aus companies/{id}/quotes nach project_requests
 * 
 * Ausführen mit:
 * node scripts/migrate-quotes-to-project-requests.js
 * 
 * Flags:
 *   --live       Live-Migration durchführen (sonst nur Dry-Run)
 *   --limit=N    Maximal N Dokumente migrieren
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Initialize with service account from environment variable
let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

// Bereinige den Key - entferne umschließende Anführungszeichen und escaped Zeichen
serviceAccountKey = serviceAccountKey.trim();
if ((serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) ||
    (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'"))) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');
serviceAccountKey = serviceAccountKey.replace(/\\\n/g, '\\n');

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
  console.error('Fehler beim Parsen des Service Account Keys:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function migrateQuotesToProjectRequests(dryRun = true, limit = 100) {
  const stats = {
    totalQuotes: 0,
    migratedQuotes: 0,
    skippedQuotes: 0,
    migratedProposals: 0,
    errors: [],
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migration: Quotes -> Project Requests`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (keine Änderungen)' : 'LIVE (Änderungen werden gespeichert)'}`);
  console.log(`Limit: ${limit} Dokumente`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Hole alle Companies
    const companiesSnapshot = await db.collection('companies').get();
    console.log(`Gefundene Companies: ${companiesSnapshot.size}\n`);

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      
      // Hole Quotes für diese Company
      const quotesSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('quotes')
        .limit(limit)
        .get();

      if (quotesSnapshot.empty) continue;

      console.log(`Company ${companyId}: ${quotesSnapshot.size} Quotes gefunden`);

      for (const quoteDoc of quotesSnapshot.docs) {
        stats.totalQuotes++;

        if (stats.migratedQuotes >= limit) {
          console.log(`\nLimit von ${limit} erreicht, stoppe Migration.`);
          break;
        }

        const quoteId = quoteDoc.id;
        const quoteData = quoteDoc.data();

        // Prüfe ob bereits in project_requests existiert
        const existingProject = await db.collection('project_requests').doc(quoteId).get();
        if (existingProject.exists) {
          console.log(`  [SKIP] ${quoteId} - existiert bereits in project_requests`);
          stats.skippedQuotes++;
          continue;
        }

        // Konvertiere Quote zu Project Request Format
        const projectRequest = {
          // Basis-Felder
          title: quoteData.title || quoteData.projectTitle || 'Projekt-Anfrage',
          description: quoteData.description || quoteData.projectDescription || '',
          
          // Kunde
          customerUid: quoteData.customerUid || '',
          customerEmail: quoteData.customerEmail || '',
          customerData: {
            uid: quoteData.customerUid || '',
            email: quoteData.customerEmail || '',
            name: quoteData.customerName || '',
          },
          
          // Kategorie
          category: quoteData.category || quoteData.serviceCategory || '',
          subcategory: quoteData.subcategory || quoteData.serviceSubcategory || '',
          
          // Budget
          budgetRange: quoteData.budgetRange || {
            min: quoteData.budgetAmount || quoteData.estimatedBudget || 0,
            max: quoteData.budgetAmount || quoteData.estimatedBudget || 0,
            currency: 'EUR',
          },
          estimatedBudget: quoteData.estimatedBudget || quoteData.budgetAmount || 0,
          
          // Zeitplan
          timeline: quoteData.timeline || quoteData.timeframe || '',
          
          // Standort
          location: quoteData.location || '',
          
          // Status
          status: quoteData.status === 'responded' ? 'has_proposals' : (quoteData.status || 'open'),
          isActive: quoteData.isActive !== false,
          urgency: quoteData.urgency || 'medium',
          
          // UNIFIED Felder
          requestType: 'direct',
          targetProviderId: companyId,
          isPublic: false,
          
          // Escrow (immer erforderlich im unified system)
          escrowRequired: true,
          escrowFeePercent: 0.05,
          escrowFeeMinCents: 500,
          escrowFeeMaxCents: 5000,
          
          // Timestamps
          createdAt: quoteData.createdAt || admin.firestore.Timestamp.now(),
          updatedAt: quoteData.updatedAt || admin.firestore.Timestamp.now(),
          migratedAt: admin.firestore.Timestamp.now(),
          migratedFrom: `companies/${companyId}/quotes/${quoteId}`,
        };

        // Kopiere weitere Felder aus Original
        const excludeKeys = [
          'id', 'companyId',
          'title', 'projectTitle', 'description', 'projectDescription',
          'customerUid', 'customerEmail', 'customerName',
          'category', 'serviceCategory', 'subcategory', 'serviceSubcategory',
          'budgetRange', 'budgetAmount', 'estimatedBudget',
          'timeline', 'timeframe', 'location', 'status', 'isActive', 'urgency',
          'createdAt', 'updatedAt'
        ];
        
        for (const [key, value] of Object.entries(quoteData)) {
          if (!excludeKeys.includes(key) && !projectRequest.hasOwnProperty(key)) {
            projectRequest[key] = value;
          }
        }

        console.log(`  [MIGRATE] ${quoteId}`);
        console.log(`    Title: ${projectRequest.title}`);
        console.log(`    Customer: ${projectRequest.customerUid}`);
        console.log(`    Status: ${quoteData.status} -> ${projectRequest.status}`);

        if (!dryRun) {
          try {
            // Erstelle Project Request
            await db.collection('project_requests').doc(quoteId).set(projectRequest);
            
            // Migriere Proposals (Subcollection)
            const proposalsSnapshot = await db
              .collection('companies')
              .doc(companyId)
              .collection('quotes')
              .doc(quoteId)
              .collection('proposals')
              .get();

            if (!proposalsSnapshot.empty) {
              console.log(`    Migriere ${proposalsSnapshot.size} Proposals...`);
              
              for (const proposalDoc of proposalsSnapshot.docs) {
                const proposalData = proposalDoc.data();
                
                await db
                  .collection('project_requests')
                  .doc(quoteId)
                  .collection('proposals')
                  .doc(proposalDoc.id)
                  .set({
                    ...proposalData,
                    migratedAt: admin.firestore.Timestamp.now(),
                    migratedFrom: `companies/${companyId}/quotes/${quoteId}/proposals/${proposalDoc.id}`,
                  });
                
                stats.migratedProposals++;
              }
            }

            stats.migratedQuotes++;
          } catch (error) {
            const errorMsg = `Fehler bei ${quoteId}: ${error.message}`;
            console.error(`    [ERROR] ${errorMsg}`);
            stats.errors.push(errorMsg);
          }
        } else {
          stats.migratedQuotes++;
          
          // Zähle Proposals im Dry-Run
          const proposalsSnapshot = await db
            .collection('companies')
            .doc(companyId)
            .collection('quotes')
            .doc(quoteId)
            .collection('proposals')
            .get();
          
          if (!proposalsSnapshot.empty) {
            console.log(`    Proposals: ${proposalsSnapshot.size}`);
            stats.migratedProposals += proposalsSnapshot.size;
          }
        }
      }
    }

    // Zusammenfassung
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Migration ${dryRun ? '(DRY RUN)' : ''} abgeschlossen`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Quotes gefunden:  ${stats.totalQuotes}`);
    console.log(`Migrierte Quotes:       ${stats.migratedQuotes}`);
    console.log(`Übersprungene Quotes:   ${stats.skippedQuotes}`);
    console.log(`Migrierte Proposals:    ${stats.migratedProposals}`);
    console.log(`Fehler:                 ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log(`\nFehler-Details:`);
      stats.errors.forEach(e => console.log(`  - ${e}`));
    }

    if (dryRun) {
      console.log(`\n[INFO] Dies war ein Dry-Run. Führe mit --live aus um die Migration durchzuführen.`);
    }

    return stats;
  } catch (error) {
    console.error('Migration fehlgeschlagen:', error);
    throw error;
  }
}

// CLI Ausführung
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;

  try {
    await migrateQuotesToProjectRequests(dryRun, limit);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
