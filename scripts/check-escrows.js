// Verwende tsx um TypeScript-Module zu laden
require('tsx/cjs');
const { admin } = require('../src/firebase/server');

const db = admin.firestore();

async function checkEscrows() {
  const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  
  const escrows = await db.collection('escrows')
    .where('providerId', '==', companyId)
    .get();
  
  console.log('=== ESCROWS für Company ===');
  console.log('Anzahl:', escrows.size);
  
  let totalAmount = 0;
  let totalProviderAmount = 0;
  
  escrows.docs.forEach(doc => {
    const data = doc.data();
    console.log('---');
    console.log('ID:', doc.id);
    console.log('OrderId:', data.orderId);
    console.log('Amount:', data.amount);
    console.log('ProviderAmount:', data.providerAmount);
    console.log('Status:', data.status);
    console.log('ClearingEndsAt:', data.clearingEndsAt ? data.clearingEndsAt.toDate() : 'nicht gesetzt');
    
    if (data.status === 'held') {
      totalAmount += data.amount || 0;
      totalProviderAmount += data.providerAmount || data.amount || 0;
    }
  });
  
  console.log('\n=== SUMMEN (nur held) ===');
  console.log('Total Amount:', totalAmount);
  console.log('Total ProviderAmount:', totalProviderAmount);
}

checkEscrows().then(() => process.exit(0));
