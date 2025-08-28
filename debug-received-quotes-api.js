const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase Setup
const serviceAccount = require('./firebase_functions/service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

async function debugReceivedQuotesAPI() {
  try {
    const companyUid = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
    
    console.log(`🔍 DEBUG: Received Quotes API for company ${companyUid}...`);
    
    // 1. Check company data (same as API does)
    console.log('\n📋 Step 1: Company Data Check');
    let customerEmail;

    // Try companies collection first
    const companyDoc = await db.collection('companies').doc(companyUid).get();
    if (companyDoc.exists) {
      const companyData = companyDoc.data();
      customerEmail = companyData?.email || companyData?.ownerEmail;
      console.log(`✅ Found in companies collection: ${customerEmail}`);
    } else {
      // Fallback to users collection
      const userDoc = await db.collection('users').doc(companyUid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        customerEmail = userData?.email;
        console.log(`✅ Found in users collection: ${customerEmail}`);
      } else {
        console.log('❌ Company not found in any collection');
        return;
      }
    }

    // 2. Find quotes by email and UID (same as API does)
    console.log('\n📄 Step 2: Find Quotes');
    const quotesSnapshot = await db
      .collection('quotes')
      .where('customerEmail', '==', customerEmail)
      .get();

    console.log(`Found ${quotesSnapshot.size} quotes by email`);

    // 3. Analyze each quote
    console.log('\n📋 Step 3: Analyze Each Quote');
    let quotesWithResponses = 0;

    for (const doc of quotesSnapshot.docs) {
      const quoteData = doc.data();
      console.log(`\n--- Quote ${doc.id} ---`);
      console.log('Status:', quoteData.status);
      console.log('Title:', quoteData.projectTitle || quoteData.title);

      // Check for proposals in subcollection
      const subcollectionProposals = await db
        .collection('quotes')
        .doc(doc.id)
        .collection('proposals')
        .get();

      console.log(`Subcollection proposals: ${subcollectionProposals.size}`);

      // Check old proposals collection
      const oldProposals = await db
        .collection('proposals')
        .where('quoteId', '==', doc.id)
        .get();

      console.log(`Old collection proposals: ${oldProposals.size}`);

      const hasResponse = subcollectionProposals.size > 0 || oldProposals.size > 0;
      console.log(`Has response: ${hasResponse}`);

      if (hasResponse) {
        quotesWithResponses++;
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`Total quotes: ${quotesSnapshot.size}`);
    console.log(`Quotes with responses: ${quotesWithResponses}`);
    console.log(`Expected count on overview page: ${quotesWithResponses}`);

    // 4. Check specific quote that's causing the issue
    const problemQuoteId = 'quote_1756320622873_zuv5lwk04';
    console.log(`\n🔍 SPECIFIC QUOTE ANALYSIS: ${problemQuoteId}`);
    
    const problemQuoteDoc = await db.collection('quotes').doc(problemQuoteId).get();
    if (problemQuoteDoc.exists) {
      const problemQuoteData = problemQuoteDoc.data();
      console.log('Customer Email:', problemQuoteData.customerEmail);
      console.log('Customer UID:', problemQuoteData.customerUid);
      console.log('Status:', problemQuoteData.status);
      
      console.log('Should this company see this quote?');
      console.log('Email match:', problemQuoteData.customerEmail === customerEmail);
      console.log('UID match:', problemQuoteData.customerUid === companyUid);
    }

  } catch (error) {
    console.error('❌ Error in debug:', error);
  }
}

debugReceivedQuotesAPI().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
});
