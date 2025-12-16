const admin = require('firebase-admin');
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

async function check() {
  const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  
  // Alle emailConfigs für diese Company (subcollection)
  const configs = await db.collection('companies').doc(companyId).collection('emailConfigs').get();
  console.log('📧 EmailConfigs in subcollection:');
  configs.docs.forEach(doc => {
    const data = doc.data();
    console.log('  - ID:', doc.id);
    console.log('    email:', data.email);
    console.log('    userId:', data.userId || 'NICHT GESETZT!');
    console.log('    connectedAt:', data.connectedAt);
  });
  
  // Check alte top-level emailConfigs
  const oldConfigs = await db.collection('emailConfigs').where('companyId', '==', companyId).get();
  console.log('\n📧 Alte emailConfigs (top-level):');
  oldConfigs.docs.forEach(doc => {
    const data = doc.data();
    console.log('  - ID:', doc.id);
    console.log('    email:', data.email);
    console.log('    userId:', data.userId || 'NICHT GESETZT!');
  });
  
  // Check emailCache
  const cache = await db.collection('companies').doc(companyId).collection('emailCache').limit(5).get();
  console.log('\n📧 EmailCache (erste 5):');
  cache.docs.forEach(doc => {
    const data = doc.data();
    console.log('  - ID:', doc.id);
    console.log('    userId:', data.userId || 'NICHT GESETZT!');
    console.log('    from:', data.from?.substring(0, 50));
  });
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
