const admin = require('firebase-admin');
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

async function check() {
  const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  const ownerId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  const mitarbeiterId = '8IyAY0TOvrfjM3CBhN7kaQzMpdC3';
  
  // E-Mails im Cache nach userId gruppieren
  const allEmails = await db.collection('companies').doc(companyId).collection('emailCache').limit(200).get();
  
  let ownerEmails = 0;
  let mitarbeiterEmails = 0;
  let noUserIdEmails = 0;
  
  const ownerFroms = [];
  const mitarbeiterFroms = [];
  
  allEmails.docs.forEach(doc => {
    const data = doc.data();
    if (data.userId === ownerId) {
      ownerEmails++;
      if (ownerFroms.length < 3) ownerFroms.push(data.from?.substring(0, 40));
    } else if (data.userId === mitarbeiterId) {
      mitarbeiterEmails++;
      if (mitarbeiterFroms.length < 3) mitarbeiterFroms.push(data.from?.substring(0, 40));
    } else {
      noUserIdEmails++;
    }
  });
  
  console.log('\n📊 E-Mail-Verteilung im Cache:');
  console.log(`  👤 Inhaber (${ownerId}): ${ownerEmails} E-Mails`);
  console.log(`     Beispiele:`, ownerFroms);
  console.log(`  👥 Mitarbeiter (${mitarbeiterId}): ${mitarbeiterEmails} E-Mails`);
  console.log(`     Beispiele:`, mitarbeiterFroms);
  console.log(`  ❓ Ohne userId: ${noUserIdEmails} E-Mails`);
  console.log(`  📧 Gesamt: ${allEmails.size} E-Mails`);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
