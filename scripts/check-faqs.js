const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('../firebase-config.json');

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function checkData() {
  const doc = await db.collection('companies').doc('E1bFqbyPGDRBXY3MVIyeANz1TCY2').get();
  const data = doc.data();
  
  console.log('=== FAQs auf Root-Level ===');
  console.log('faqs:', JSON.stringify(data?.faqs, null, 2));
  
  console.log('\n=== FAQs in step3 ===');
  console.log('step3.faqs:', JSON.stringify(data?.step3?.faqs, null, 2));
  
  console.log('\n=== Portfolio auf Root-Level ===');
  console.log('portfolio:', data?.portfolio ? 'vorhanden (' + data.portfolio.length + ' items)' : 'nicht vorhanden');
  console.log('portfolioItems:', data?.portfolioItems ? 'vorhanden (' + data.portfolioItems.length + ' items)' : 'nicht vorhanden');
  
  console.log('\n=== Portfolio in step3 ===');
  console.log('step3.portfolio:', data?.step3?.portfolio ? 'vorhanden (' + data.step3.portfolio.length + ' items)' : 'nicht vorhanden');
  
  console.log('\n=== Skills ===');
  console.log('skills:', data?.skills);
  console.log('step3.skills:', data?.step3?.skills);
  
  console.log('\n=== Bio/Description ===');
  console.log('bio:', data?.bio?.substring(0, 50) + '...');
  console.log('description:', data?.description?.substring(0, 50) + '...');
  console.log('step3.bio:', data?.step3?.bio?.substring(0, 50) + '...');
}

checkData().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
