const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../firebase-minimal.json');

const app = initializeApp({ credential: cert(serviceAccount) }, 'check-invoices-' + Date.now());
const db = getFirestore(app);

async function check() {
  const uid = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  
  // Check company subcollection
  const invoicesSubSnap = await db.collection('companies').doc(uid).collection('invoices').get();
  console.log('Invoices in companies/' + uid + '/invoices:', invoicesSubSnap.size);
  
  // Check global invoices collection
  const invoicesGlobalSnap = await db.collection('invoices').where('companyId', '==', uid).get();
  console.log('Invoices in global invoices collection:', invoicesGlobalSnap.size);
  
  if (invoicesSubSnap.size > 0) {
    console.log('\nSample invoice from subcollection:');
    const doc = invoicesSubSnap.docs[0];
    const data = doc.data();
    console.log('ID:', doc.id);
    console.log('Status:', data.status);
    console.log('Total:', data.total);
    console.log('Amount:', data.amount);
    console.log('GrandTotal:', data.grandTotal);
  }
  
  if (invoicesGlobalSnap.size > 0) {
    console.log('\nSample invoice from global collection:');
    const doc = invoicesGlobalSnap.docs[0];
    const data = doc.data();
    console.log('ID:', doc.id);
    console.log('Status:', data.status);
    console.log('Total:', data.total);
    console.log('Amount:', data.amount);
    console.log('GrandTotal:', data.grandTotal);
  }
  
  process.exit(0);
}
check();
