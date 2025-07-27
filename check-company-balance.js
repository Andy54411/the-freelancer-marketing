const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function checkCompanyBalance() {
  console.log('🔍 Checking company balance updates...\n');

  try {
    // Get company by stripe account ID
    const companiesRef = db.collection('companies');
    const companyQuery = companiesRef.where('stripeAccountId', '==', 'acct_1QS9iqRsBNYVHcWU');
    const companySnapshot = await companyQuery.get();

    if (companySnapshot.empty) {
      console.log('❌ Company not found with stripe account ID: acct_1QS9iqRsBNYVHcWU');
      return;
    }

    const companyDoc = companySnapshot.docs[0];
    const companyData = companyDoc.data();

    console.log('📊 Company Balance Info:');
    console.log(`Company ID: ${companyDoc.id}`);
    console.log(`Platform Hold Balance: €${(companyData.platformHoldBalance || 0) / 100}`);
    console.log(`Last Updated: ${companyData.lastUpdated?.toDate()?.toISOString() || 'N/A'}\n`);

    // Check balance history
    const balanceHistoryRef = companyDoc.ref.collection('balanceHistory');
    const historyQuery = balanceHistoryRef
      .where('type', '==', 'additional_hours_payment')
      .orderBy('createdAt', 'desc')
      .limit(5);
    const historySnapshot = await historyQuery.get();

    console.log('💰 Recent Additional Hours Payments:');
    if (historySnapshot.empty) {
      console.log('❌ No additional hours payment history found');
    } else {
      historySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(
          `✅ ${data.createdAt?.toDate()?.toISOString()}: €${data.amount / 100} (PI: ${data.paymentIntentId})`
        );
        console.log(`   Order: ${data.orderId}, Status: ${data.status}`);
        console.log(
          `   Entry IDs: ${data.entryIds?.slice(0, 3).join(', ')}... (${data.entryIds?.length} total)\n`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error checking company balance:', error);
  } finally {
    process.exit(0);
  }
}

checkCompanyBalance();
