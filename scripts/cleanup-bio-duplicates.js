/**
 * Script zum Bereinigen der duplizierten bio/description Felder
 * 
 * MASTER ist step3.bio - alle anderen werden gelöscht:
 * - Root-Level: bio, description
 * - step1.description (Onboarding-Input)
 * 
 * Führe aus mit: node scripts/cleanup-bio-duplicates.js
 */

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (getApps().length === 0) {
  initializeApp({ projectId: 'tilvo-f142f' });
}

const db = getFirestore();

async function cleanupBioDuplicates() {
  console.log('=== CLEANUP: bio/description Duplikate entfernen ===\n');
  
  // Alle Companies laden
  const companiesSnapshot = await db.collection('companies').get();
  
  console.log(`Gefunden: ${companiesSnapshot.size} Companies\n`);
  
  let cleanedCount = 0;
  let errorCount = 0;
  
  for (const doc of companiesSnapshot.docs) {
    const data = doc.data();
    const companyId = doc.id;
    const companyName = data.companyName || 'Unbekannt';
    
    // Prüfen ob Root-Level bio oder description existiert
    const hasRootBio = data.bio !== undefined;
    const hasRootDescription = data.description !== undefined;
    const hasStep1Description = data.step1?.description !== undefined;
    
    if (!hasRootBio && !hasRootDescription && !hasStep1Description) {
      continue; // Keine Duplikate
    }
    
    console.log(`\n--- ${companyName} (${companyId}) ---`);
    console.log(`  Root bio: ${hasRootBio ? 'JA' : 'NEIN'}`);
    console.log(`  Root description: ${hasRootDescription ? 'JA' : 'NEIN'}`);
    console.log(`  step1.description: ${hasStep1Description ? 'JA' : 'NEIN'}`);
    console.log(`  step3.bio: ${data.step3?.bio ? 'JA' : 'NEIN'}`);
    
    try {
      // Lösche Root-Level bio und description
      const deleteFields = {};
      
      if (hasRootBio) {
        deleteFields.bio = FieldValue.delete();
        console.log(`  -> Lösche Root-Level bio`);
      }
      
      if (hasRootDescription) {
        deleteFields.description = FieldValue.delete();
        console.log(`  -> Lösche Root-Level description`);
      }
      
      // step1.description löschen - muss über Punkt-Notation erfolgen
      if (hasStep1Description) {
        deleteFields['step1.description'] = FieldValue.delete();
        console.log(`  -> Lösche step1.description`);
      }
      
      await db.collection('companies').doc(companyId).update(deleteFields);
      console.log(`  ✓ Bereinigt!`);
      cleanedCount++;
      
    } catch (error) {
      console.error(`  ✗ Fehler: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== ERGEBNIS ===');
  console.log(`Bereinigt: ${cleanedCount} Companies`);
  console.log(`Fehler: ${errorCount}`);
  console.log('\nstep3.bio ist jetzt der einzige Speicherort für die Beschreibung!');
}

// Script ausführen
cleanupBioDuplicates()
  .then(() => {
    console.log('\nFertig!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fehler:', error);
    process.exit(1);
  });
