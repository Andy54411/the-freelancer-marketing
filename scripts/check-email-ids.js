const admin = require('firebase-admin');
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

async function check() {
  const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  
  // Suche nach E-Mails mit a.staudinger32 im ID
  const allEmails = await db.collection('companies').doc(companyId).collection('emailCache').limit(300).get();
  
  console.log(`📧 Gesamt E-Mails: ${allEmails.size}`);
  
  const byEmailPrefix = {};
  allEmails.docs.forEach(doc => {
    const prefix = doc.id.split('_')[0];
    byEmailPrefix[prefix] = (byEmailPrefix[prefix] || 0) + 1;
  });
  
  console.log('\n📊 E-Mails nach Prefix:');
  Object.entries(byEmailPrefix).forEach(([prefix, count]) => {
    console.log(`  ${prefix}: ${count}`);
  });
  
  // Zeige die ersten paar IDs die mit a.staudinger anfangen
  const staudingerEmails = allEmails.docs.filter(doc => doc.id.startsWith('a.staudinger'));
  console.log(`\n📧 E-Mails mit a.staudinger Prefix: ${staudingerEmails.length}`);
  staudingerEmails.slice(0, 3).forEach(doc => {
    console.log(`  ID: ${doc.id}`);
    console.log(`  userId: ${doc.data().userId}`);
  });
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
