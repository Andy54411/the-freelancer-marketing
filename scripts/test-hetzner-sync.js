const admin = require('firebase-admin');
const serviceAccount = require('../firebase_functions/service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';

async function testSync() {
  console.log('1. Setze suspended: true');
  await db.collection('companies').doc(companyId).update({ suspended: true });
  
  console.log('Warte 5 Sekunden...');
  await new Promise(r => setTimeout(r, 5000));
  
  const r1 = await fetch('https://mail.taskilo.de/api/profile/by-company/' + companyId);
  const d1 = await r1.json();
  console.log('Hetzner suspended:', d1.profile?.suspended);
  
  console.log('\n2. Setze suspended: false');
  await db.collection('companies').doc(companyId).update({ suspended: false });
  
  console.log('Warte 5 Sekunden...');
  await new Promise(r => setTimeout(r, 5000));
  
  const r2 = await fetch('https://mail.taskilo.de/api/profile/by-company/' + companyId);
  const d2 = await r2.json();
  console.log('Hetzner suspended:', d2.profile?.suspended);
  
  process.exit(0);
}

testSync().catch(e => { console.error(e); process.exit(1); });
