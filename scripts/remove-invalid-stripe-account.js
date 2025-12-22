const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function removeInvalidStripeAccount() {
  const companyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
  const invalidAccountId = 'acct_1S0kcIDfwsoONzwi';
  
  console.log('Removing invalid Stripe Account from company:', companyId);
  
  const companyRef = db.collection('companies').doc(companyId);
  const companyDoc = await companyRef.get();
  
  if (!companyDoc.exists) {
    console.log('Company not found');
    return;
  }
  
  const data = companyDoc.data();
  if (data.stripeAccountId !== invalidAccountId) {
    console.log('Stripe Account ID does not match. Current:', data.stripeAccountId);
    return;
  }
  
  // Remove the invalid stripeAccountId
  await companyRef.update({
    stripeAccountId: admin.firestore.FieldValue.delete(),
    stripeAccountStatus: 'disconnected',
    stripeAccountRemovedAt: admin.firestore.Timestamp.now(),
    stripeAccountRemovedReason: 'Invalid account - access revoked by platform'
  });
  
  console.log('Successfully removed invalid stripeAccountId from company');
  console.log('Company "Mietkoch Andy" needs to reconnect their Stripe account');
}

removeInvalidStripeAccount()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
