require('tsx/cjs');
const { admin } = require('../src/firebase/server');
const db = admin.firestore();

async function setLevel2() {
  const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  
  await db.collection('companies').doc(companyId).update({
    'taskerLevel.currentLevel': 'level2',
    'taskerLevel.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    'taskerLevel.previousLevel': 'new'
  });
  
  console.log('Level 2 Status gesetzt für Company:', companyId);
  
  // Verifiziere
  const doc = await db.collection('companies').doc(companyId).get();
  console.log('Aktueller Level:', doc.data().taskerLevel);
}

setLevel2().then(() => process.exit(0));
