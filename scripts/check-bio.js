const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (getApps().length === 0) {
  initializeApp({ projectId: 'tilvo-f142f' });
}

const db = getFirestore();

async function checkData() {
  const doc = await db.collection('companies').doc('E1bFqbyPGDRBXY3MVIyeANz1TCY2').get();
  const data = doc.data();
  
  console.log('=== Bio/Description Felder ===');
  console.log('bio (root):', data?.bio ? data.bio.substring(0, 100) + '...' : 'NICHT VORHANDEN');
  console.log('description (root):', data?.description ? data.description.substring(0, 100) + '...' : 'NICHT VORHANDEN');
  console.log('step1.description:', data?.step1?.description ? data.step1.description.substring(0, 100) + '...' : 'NICHT VORHANDEN');
  console.log('step3.bio (MASTER):', data?.step3?.bio ? data.step3.bio.substring(0, 100) + '...' : 'NICHT VORHANDEN');
  console.log('publicDescription:', data?.publicDescription ? data.publicDescription.substring(0, 100) + '...' : 'NICHT VORHANDEN');
  
  console.log('\n=== FAQs ===');
  console.log('faqs (root):', data?.faqs?.length || 0, 'items');
  console.log('step3.faqs (MASTER):', data?.step3?.faqs?.length || 0, 'items');
  if (data?.step3?.faqs?.length > 0) {
    console.log('Erste FAQ:', data.step3.faqs[0].question);
  }
  
  console.log('\n=== Portfolio ===');
  console.log('portfolio (root):', data?.portfolio?.length || 0, 'items');
  console.log('step3.portfolio (MASTER):', data?.step3?.portfolio?.length || 0, 'items');
  console.log('portfolioItems:', data?.portfolioItems?.length || 0, 'items');
  
  console.log('\n=== Unternehmensdetails ===');
  console.log('legalForm:', data?.legalForm || data?.step2?.legalForm || 'NICHT VORHANDEN');
  console.log('businessType:', data?.businessType || data?.step1?.businessType || 'NICHT VORHANDEN');
  console.log('employees:', data?.employees || data?.step1?.employees || 'NICHT VORHANDEN');
}

checkData().then(() => process.exit(0)).catch(e => {
  console.error('Fehler:', e.message);
  process.exit(1);
});
