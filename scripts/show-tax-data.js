/**
 * Script: Zeigt alle Steuerdaten-Felder einer Company
 */

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (getApps().length === 0) {
  initializeApp({ projectId: 'tilvo-f142f' });
}

const db = getFirestore();

async function showTaxData(companyId) {
  const doc = await db.collection('companies').doc(companyId).get();
  
  if (!doc.exists) {
    console.log('Company nicht gefunden');
    return;
  }
  
  const data = doc.data();
  
  console.log('\n========================================');
  console.log('STEUERDATEN-ÜBERSICHT');
  console.log('========================================\n');
  
  console.log('ROOT-LEVEL:');
  console.log(`  taxNumber: "${data.taxNumber || 'NULL'}"`);
  console.log(`  vatId:     "${data.vatId || 'NULL'}"`);
  console.log(`  kleinunternehmer: "${data.kleinunternehmer || 'NULL'}"`);
  console.log(`  taxRate:   "${data.taxRate || 'NULL'}"`);
  
  console.log('\nSTEP1:');
  console.log(`  taxNumber: "${data.step1?.taxNumber || 'NULL'}"`);
  console.log(`  vatId:     "${data.step1?.vatId || 'NULL'}"`);
  
  console.log('\nSTEP2:');
  console.log(`  taxNumber: "${data.step2?.taxNumber || 'NULL'}"`);
  console.log(`  vatId:     "${data.step2?.vatId || 'NULL'}"`);
  console.log(`  kleinunternehmer: "${data.step2?.kleinunternehmer || 'NULL'}"`);
  
  console.log('\nSTEP3 (MASTER):');
  console.log(`  taxNumber: "${data.step3?.taxNumber || 'NULL'}"`);
  console.log(`  vatId:     "${data.step3?.vatId || 'NULL'}"`);
  console.log(`  ust:       "${data.step3?.ust || 'NULL'}"`);
  console.log(`  defaultTaxRate: "${data.step3?.defaultTaxRate || 'NULL'}"`);
  
  console.log('\n========================================');
  
  // Prüfe Konsistenz
  const taxNumber = data.step3?.taxNumber;
  const vatId = data.step3?.vatId;
  
  let issues = [];
  
  if (taxNumber && data.taxNumber !== taxNumber) {
    issues.push(`taxNumber: Root "${data.taxNumber}" ≠ step3 "${taxNumber}"`);
  }
  if (vatId && data.vatId !== vatId) {
    issues.push(`vatId: Root "${data.vatId}" ≠ step3 "${vatId}"`);
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️  INKONSISTENZEN GEFUNDEN:');
    issues.forEach(i => console.log(`    - ${i}`));
  } else {
    console.log('\n✅ Alle Steuerdaten sind konsistent!');
  }
  
  console.log('========================================\n');
}

const companyId = process.argv[2] || 'E1bFqbyPGDRBXY3MVIyeANz1TCY2';
showTaxData(companyId).catch(console.error);
