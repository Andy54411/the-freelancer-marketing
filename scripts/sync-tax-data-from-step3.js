/**
 * Script: Synchronisiert Steuerdaten von step3 (MASTER) auf Root-Level
 * 
 * Problem: Die Settings-Seite speichert Steuerdaten in step3, aber andere Teile
 * der App lesen von Root-Level. Dieses Script synchronisiert die Daten.
 * 
 * Verwendung:
 *   node scripts/sync-tax-data-from-step3.js [companyId]
 * 
 * Ohne companyId werden ALLE Companies geprüft und gefixt.
 */

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (getApps().length === 0) {
  initializeApp({ projectId: 'tilvo-f142f' });
}

const db = getFirestore();

async function syncTaxDataForCompany(companyId) {
  const docRef = db.collection('companies').doc(companyId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    console.log(`  ❌ Company ${companyId} nicht gefunden`);
    return { synced: false, reason: 'not_found' };
  }
  
  const data = doc.data();
  const updates = {};
  let needsUpdate = false;
  
  // Steuerdaten: step3 ist MASTER
  if (data.step3?.taxNumber && data.step3.taxNumber !== data.taxNumber) {
    updates.taxNumber = data.step3.taxNumber;
    console.log(`  📝 taxNumber: "${data.taxNumber || 'null'}" → "${data.step3.taxNumber}"`);
    needsUpdate = true;
  }
  
  if (data.step3?.vatId && data.step3.vatId !== data.vatId) {
    updates.vatId = data.step3.vatId;
    console.log(`  📝 vatId: "${data.vatId || 'null'}" → "${data.step3.vatId}"`);
    needsUpdate = true;
  }
  
  // Bio: step3 ist MASTER
  if (data.step3?.bio && data.step3.bio !== data.bio) {
    updates.bio = data.step3.bio;
    console.log(`  📝 bio: wird synchronisiert`);
    needsUpdate = true;
  }
  
  // FAQs: step3 ist MASTER
  if (data.step3?.faqs && JSON.stringify(data.step3.faqs) !== JSON.stringify(data.faqs)) {
    updates.faqs = data.step3.faqs;
    console.log(`  📝 faqs: ${data.step3.faqs?.length || 0} Einträge werden synchronisiert`);
    needsUpdate = true;
  }
  
  // Portfolio: step3 ist MASTER
  if (data.step3?.portfolio && JSON.stringify(data.step3.portfolio) !== JSON.stringify(data.portfolio)) {
    updates.portfolio = data.step3.portfolio;
    console.log(`  📝 portfolio: ${data.step3.portfolio?.length || 0} Einträge werden synchronisiert`);
    needsUpdate = true;
  }
  
  // Bankdaten: step3.bankDetails ist MASTER
  if (data.step3?.bankDetails) {
    if (data.step3.bankDetails.iban && data.step3.bankDetails.iban !== data.iban) {
      updates.iban = data.step3.bankDetails.iban;
      console.log(`  📝 iban: wird synchronisiert`);
      needsUpdate = true;
    }
    if (data.step3.bankDetails.bic && data.step3.bankDetails.bic !== data.bic) {
      updates.bic = data.step3.bankDetails.bic;
      console.log(`  📝 bic: wird synchronisiert`);
      needsUpdate = true;
    }
    if (data.step3.bankDetails.bankName && data.step3.bankDetails.bankName !== data.bankName) {
      updates.bankName = data.step3.bankDetails.bankName;
      console.log(`  📝 bankName: wird synchronisiert`);
      needsUpdate = true;
    }
    if (data.step3.bankDetails.accountHolder && data.step3.bankDetails.accountHolder !== data.accountHolder) {
      updates.accountHolder = data.step3.bankDetails.accountHolder;
      console.log(`  📝 accountHolder: wird synchronisiert`);
      needsUpdate = true;
    }
  }
  
  // Buchhaltungseinstellungen: step3 ist MASTER
  if (data.step3?.ust) {
    const newKleinunternehmer = data.step3.ust === 'kleinunternehmer' ? 'ja' : 'nein';
    if (newKleinunternehmer !== data.kleinunternehmer) {
      updates.kleinunternehmer = newKleinunternehmer;
      console.log(`  📝 kleinunternehmer: "${data.kleinunternehmer}" → "${newKleinunternehmer}"`);
      needsUpdate = true;
    }
  }
  
  if (data.step3?.profitMethod && data.step3.profitMethod !== data.profitMethod) {
    updates.profitMethod = data.step3.profitMethod;
    console.log(`  📝 profitMethod: "${data.profitMethod}" → "${data.step3.profitMethod}"`);
    needsUpdate = true;
  }
  
  if (data.step3?.priceInput && data.step3.priceInput !== data.priceInput) {
    updates.priceInput = data.step3.priceInput;
    console.log(`  📝 priceInput: "${data.priceInput}" → "${data.step3.priceInput}"`);
    needsUpdate = true;
  }
  
  if (data.step3?.defaultTaxRate && data.step3.defaultTaxRate !== data.taxRate) {
    updates.taxRate = data.step3.defaultTaxRate;
    console.log(`  📝 taxRate: "${data.taxRate}" → "${data.step3.defaultTaxRate}"`);
    needsUpdate = true;
  }
  
  if (needsUpdate) {
    updates.lastUpdated = FieldValue.serverTimestamp();
    await docRef.update(updates);
    console.log(`  ✅ ${Object.keys(updates).length - 1} Felder synchronisiert`);
    return { synced: true, fields: Object.keys(updates).length - 1 };
  } else {
    console.log(`  ✓ Bereits synchron`);
    return { synced: false, reason: 'already_synced' };
  }
}

async function main() {
  const companyId = process.argv[2];
  
  if (companyId) {
    // Einzelne Company
    console.log(`\n🔄 Synchronisiere Company: ${companyId}`);
    await syncTaxDataForCompany(companyId);
  } else {
    // Alle Companies
    console.log('\n🔄 Synchronisiere ALLE Companies...\n');
    
    const snapshot = await db.collection('companies').get();
    let synced = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const doc of snapshot.docs) {
      console.log(`\n📋 ${doc.id} (${doc.data().companyName || 'Unbenannt'})`);
      try {
        const result = await syncTaxDataForCompany(doc.id);
        if (result.synced) {
          synced++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.log(`  ❌ Fehler: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n========================================');
    console.log(`✅ Synchronisiert: ${synced}`);
    console.log(`⏭️  Übersprungen:  ${skipped}`);
    console.log(`❌ Fehler:        ${errors}`);
    console.log('========================================\n');
  }
}

main().catch(console.error);
