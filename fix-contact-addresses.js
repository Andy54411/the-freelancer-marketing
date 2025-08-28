const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Initialize Firebase Admin using service account file
const serviceAccount = JSON.parse(fs.readFileSync('./firebase_functions/service-account.json', 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: "tilvo-f142f"
});

const db = getFirestore(app);

async function fixContactExchangeAddresses() {
  try {
    const quoteId = 'quote_1756320622873_zuv5lwk04';
    console.log('🔧 Fixing contact exchange addresses for quote:', quoteId);
    
    // Get the quote document
    const quoteDoc = await db.collection('quotes').doc(quoteId).get();
    
    if (quoteDoc.exists) {
      const quoteData = quoteDoc.data();
      console.log('📄 Current quote data:', {
        status: quoteData.status,
        contactExchange: quoteData.contactExchange
      });
      
      // Update the contactExchange with proper addresses
      const updateData = {
        'contactExchange.customerContact.address': 'Siedlung am Wald Sellin',
        'contactExchange.providerContact.address': 'Siedlung am Wald Sellin',
      };
      
      await quoteDoc.ref.update(updateData);
      console.log('✅ Updated contact exchange addresses');
      
      // Also check proposals subcollection
      const proposalsSnapshot = await db.collection('quotes').doc(quoteId).collection('proposals').get();
      
      if (!proposalsSnapshot.empty) {
        for (const proposalDoc of proposalsSnapshot.docs) {
          const proposalData = proposalDoc.data();
          console.log('📋 Found proposal:', {
            id: proposalDoc.id,
            status: proposalData.status,
            customerContact: proposalData.customerContact,
            providerContact: proposalData.providerContact
          });
          
          if (proposalData.customerContact || proposalData.providerContact) {
            const proposalUpdateData = {};
            
            if (proposalData.customerContact) {
              proposalUpdateData['customerContact.address'] = 'Siedlung am Wald Sellin';
            }
            
            if (proposalData.providerContact) {
              proposalUpdateData['providerContact.address'] = 'Siedlung am Wald Sellin';
            }
            
            await proposalDoc.ref.update(proposalUpdateData);
            console.log('✅ Updated proposal contact addresses');
          }
        }
      }
      
    } else {
      console.log('❌ Quote not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixContactExchangeAddresses();
