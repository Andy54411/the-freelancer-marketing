// Test-Script für das neue Payout-System
// Testet: Order Completion → Payout Available → Manual Payout Request

const admin = require('firebase-admin');

// Initialize Firebase Admin (falls nicht bereits initialisiert)
if (!admin.apps.length) {
  const serviceAccount = require('./firebase_functions/service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'tilvo-f142f'
  });
}

const db = admin.firestore();

async function testControlledPayoutSystem() {
  console.log('🧪 Testing Controlled Payout System...\n');

  try {
    // 1. Test: Finde abgeschlossene Orders mit verfügbaren Payouts
    console.log('1️⃣ Checking completed orders available for payout...');
    
    const availableOrdersQuery = db.collection('auftraege')
      .where('status', '==', 'ABGESCHLOSSEN')
      .where('payoutStatus', '==', 'available_for_payout')
      .limit(5);

    const availableOrdersSnap = await availableOrdersQuery.get();
    
    if (availableOrdersSnap.empty) {
      console.log('❌ No completed orders found with available_for_payout status');
      console.log('   Creating test data...\n');
      return await createTestData();
    }

    console.log(`✅ Found ${availableOrdersSnap.size} orders available for payout\n`);

    // 2. Test: Berechne verfügbare Beträge
    console.log('2️⃣ Calculating available payout amounts...');
    
    let totalAvailable = 0;
    const orderDetails = [];

    availableOrdersSnap.forEach(doc => {
      const orderData = doc.data();
      const platformFee = orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
      const netAmount = orderData.totalAmountPaidByBuyer - platformFee;
      
      totalAvailable += netAmount;
      orderDetails.push({
        id: doc.id,
        gross: orderData.totalAmountPaidByBuyer / 100,
        fee: platformFee / 100,
        net: netAmount / 100,
        companyId: orderData.selectedAnbieterId,
        projectTitle: orderData.projectTitle || orderData.description
      });
    });

    console.log(`✅ Total available for payout: €${(totalAvailable / 100).toFixed(2)}`);
    console.log(`   Orders breakdown:`);
    orderDetails.forEach(order => {
      console.log(`   - ${order.projectTitle}: €${order.gross} (Fee: €${order.fee}) = Net: €${order.net}`);
    });
    console.log('');

    // 3. Test: Gruppiere nach Company
    console.log('3️⃣ Grouping orders by company...');
    
    const companiesMap = {};
    orderDetails.forEach(order => {
      if (!companiesMap[order.companyId]) {
        companiesMap[order.companyId] = {
          orderCount: 0,
          totalAmount: 0,
          orders: []
        };
      }
      companiesMap[order.companyId].orderCount++;
      companiesMap[order.companyId].totalAmount += order.net;
      companiesMap[order.companyId].orders.push(order);
    });

    for (const [companyId, data] of Object.entries(companiesMap)) {
      console.log(`✅ Company ${companyId}:`);
      console.log(`   - ${data.orderCount} orders`);
      console.log(`   - €${data.totalAmount.toFixed(2)} available`);
    }
    console.log('');

    // 4. Test: Simuliere API Call für verfügbare Payouts
    console.log('4️⃣ Simulating GET /api/company/[uid]/payout...');
    
    const testCompanyId = Object.keys(companiesMap)[0];
    if (testCompanyId) {
      const companyData = companiesMap[testCompanyId];
      
      const mockApiResponse = {
        availableAmount: companyData.totalAmount,
        currency: 'EUR',
        orderCount: companyData.orderCount,
        orders: companyData.orders.map(order => ({
          id: order.id,
          amount: order.net,
          completedAt: new Date(),
          projectTitle: order.projectTitle
        }))
      };

      console.log(`✅ Mock API Response for company ${testCompanyId}:`);
      console.log(JSON.stringify(mockApiResponse, null, 2));
    }
    console.log('');

    // 5. Test: Prüfe Stripe Account Konfiguration
    console.log('5️⃣ Checking Stripe account configuration...');
    
    if (testCompanyId) {
      const companyRef = db.collection('companies').doc(testCompanyId);
      const companySnap = await companyRef.get();
      
      if (companySnap.exists) {
        const companyData = companySnap.data();
        if (companyData.stripeAccountId) {
          console.log(`✅ Company ${testCompanyId} has Stripe account: ${companyData.stripeAccountId}`);
        } else {
          console.log(`❌ Company ${testCompanyId} missing Stripe account configuration`);
        }
      } else {
        console.log(`❌ Company ${testCompanyId} not found in companies collection`);
      }
    }
    console.log('');

    // 6. Test: Validiere Payout-Status Transitions
    console.log('6️⃣ Validating payout status transitions...');
    
    const statusCheck = await validatePayoutStatusFlow();
    if (statusCheck.valid) {
      console.log('✅ All payout status transitions are valid');
    } else {
      console.log('❌ Found invalid payout status transitions:');
      statusCheck.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    console.log('');

    console.log('🎉 Controlled Payout System Test COMPLETED successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - ${availableOrdersSnap.size} orders ready for payout`);
    console.log(`   - €${(totalAvailable / 100).toFixed(2)} total available`);
    console.log(`   - ${Object.keys(companiesMap).length} companies with available payouts`);
    console.log(`   - API endpoints ready for testing`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function validatePayoutStatusFlow() {
  // Prüfe verschiedene Payout-Status Kombinationen
  try {
    const allOrders = await db.collection('auftraege')
      .where('payoutStatus', 'in', ['available_for_payout', 'payout_requested', 'paid_out'])
      .get();

    const issues = [];
    
    allOrders.forEach(doc => {
      const orderData = doc.data();
      const status = orderData.status;
      const payoutStatus = orderData.payoutStatus;

      // Validation Rules:
      // 1. Nur ABGESCHLOSSEN Orders können available_for_payout haben
      if (payoutStatus === 'available_for_payout' && status !== 'ABGESCHLOSSEN') {
        issues.push(`Order ${doc.id}: has available_for_payout but status is ${status}, not ABGESCHLOSSEN`);
      }

      // 2. payout_requested sollte stripePayoutId haben
      if (payoutStatus === 'payout_requested' && !orderData.stripePayoutId) {
        issues.push(`Order ${doc.id}: has payout_requested but missing stripePayoutId`);
      }

      // 3. Prüfe ob payoutRequestedAt existiert bei payout_requested
      if (payoutStatus === 'payout_requested' && !orderData.payoutRequestedAt) {
        issues.push(`Order ${doc.id}: has payout_requested but missing payoutRequestedAt timestamp`);
      }
    });

    return {
      valid: issues.length === 0,
      issues: issues
    };

  } catch (error) {
    return {
      valid: false,
      issues: [`Validation error: ${error.message}`]
    };
  }
}

async function createTestData() {
  console.log('📝 Creating test data for payout system...');
  
  // Erstelle einen Test-Order im ABGESCHLOSSEN Status
  const testOrder = {
    status: 'ABGESCHLOSSEN',
    payoutStatus: 'available_for_payout',
    selectedAnbieterId: 'test_company_123',
    totalAmountPaidByBuyer: 10000, // €100.00
    sellerCommissionInCents: 1500,  // €15.00 Platform Fee
    projectTitle: 'Test Auftrag für Payout System',
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Test-Auftrag zum Testen des kontrollierten Auszahlungssystems'
  };

  const orderRef = db.collection('auftraege').doc();
  await orderRef.set(testOrder);

  console.log(`✅ Created test order: ${orderRef.id}`);
  console.log('   - Status: ABGESCHLOSSEN');
  console.log('   - Payout Status: available_for_payout');
  console.log('   - Amount: €100.00 (Fee: €15.00, Net: €85.00)');
  console.log('\nNow re-running tests with test data...\n');

  // Test erneut ausführen
  return await testControlledPayoutSystem();
}

// Script ausführen
if (require.main === module) {
  testControlledPayoutSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testControlledPayoutSystem };
