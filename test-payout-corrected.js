const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./firebase_functions/service-account.json')),
    projectId: 'taskilo-b6e16'
  });
}

const db = admin.firestore();

async function testPayoutSystemCorrected() {
  console.log('🧪 Testing Corrected Payout System...\n');

  try {
    // 1. Test if we can find a real company/user with stripeAccountId
    console.log('1️⃣ Looking for companies with Stripe accounts...');
    
    const usersSnapshot = await db.collection('users')
      .where('stripeAccountId', '!=', null)
      .limit(5)
      .get();

    if (usersSnapshot.empty) {
      console.log('❌ No companies found with Stripe accounts in users collection');
      
      // Let's check what users exist
      const allUsersSnapshot = await db.collection('users').limit(10).get();
      console.log('\n📋 Sample users in collection:');
      allUsersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.name || data.displayName || 'No name'} (Type: ${data.userType || 'unknown'})`);
      });
      return;
    }

    console.log(`✅ Found ${usersSnapshot.size} companies with Stripe accounts`);
    
    const testCompany = usersSnapshot.docs[0];
    const testCompanyId = testCompany.id;
    const testCompanyData = testCompany.data();
    
    console.log(`\n📌 Testing with company: ${testCompanyId}`);
    console.log(`   Name: ${testCompanyData.name || testCompanyData.displayName}`);
    console.log(`   Stripe Account: ${testCompanyData.stripeAccountId}`);

    // 2. Check for completed orders for this company
    console.log('\n2️⃣ Checking for completed orders...');
    
    const ordersSnapshot = await db.collection('auftraege')
      .where('selectedAnbieterId', '==', testCompanyId)
      .where('status', '==', 'ABGESCHLOSSEN')
      .where('payoutStatus', '==', 'available_for_payout')
      .get();

    console.log(`   Found ${ordersSnapshot.size} orders ready for payout`);

    if (ordersSnapshot.empty) {
      console.log('   ℹ️ No orders ready for payout for this company');
      
      // Check all orders for this company
      const allOrdersSnapshot = await db.collection('auftraege')
        .where('selectedAnbieterId', '==', testCompanyId)
        .get();
      
      console.log(`   Total orders for company: ${allOrdersSnapshot.size}`);
      
      if (!allOrdersSnapshot.empty) {
        console.log('   📋 Order statuses:');
        allOrdersSnapshot.forEach(doc => {
          const order = doc.data();
          console.log(`     - ${doc.id}: Status=${order.status}, PayoutStatus=${order.payoutStatus || 'none'}`);
        });
      }
    } else {
      // Calculate available amount
      let totalAvailable = 0;
      ordersSnapshot.forEach(doc => {
        const orderData = doc.data();
        const platformFee = orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
        const netAmount = orderData.totalAmountPaidByBuyer - platformFee;
        totalAvailable += netAmount;
      });

      console.log(`   💰 Total available for payout: €${(totalAvailable / 100).toFixed(2)}`);
    }

    // 3. Test the GET endpoint
    console.log('\n3️⃣ Testing GET /api/company/[uid]/payout...');
    
    const response = await fetch(`http://localhost:3000/api/company/${testCompanyId}/payout`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ GET endpoint working');
      console.log(`   Available amount: €${data.availableAmount}`);
      console.log(`   Order count: ${data.orderCount}`);
    } else {
      console.log(`❌ GET endpoint failed: ${response.status}`);
      const errorData = await response.text();
      console.log(`   Error: ${errorData}`);
    }

    console.log('\n✅ Payout system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPayoutSystemCorrected();
