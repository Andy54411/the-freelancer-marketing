const { readFileSync } = require('fs');

// Load environment variables
const envPath = '.env.local';
if (require('fs').existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  const serviceAccountPath = './firebase_functions/service-account.json';
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app'
    });
  }
  
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function checkAuftraegeCollection() {
  try {
    console.log('\n🔍 Checking auftraege collection...\n');
    
    // Get all orders
    const auftraegeRef = db.collection('auftraege');
    const allOrdersSnap = await auftraegeRef.limit(10).get();
    
    console.log(`📊 Total orders found: ${allOrdersSnap.size}`);
    
    if (allOrdersSnap.size > 0) {
      console.log('\n📋 Sample orders:');
      allOrdersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`- Order ID: ${doc.id}`);
        console.log(`  Status: ${data.status || 'unknown'}`);
        console.log(`  Anbieter ID: ${data.selectedAnbieterId || 'none'}`);
        console.log(`  Amount: ${data.totalAmountPaidByBuyer || 0} cents`);
        console.log(`  Payout Status: ${data.payoutStatus || 'not set'}`);
        console.log(`  ---`);
      });
    }
    
    // Check for completed orders
    const completedOrdersQuery = auftraegeRef.where('status', '==', 'ABGESCHLOSSEN');
    const completedOrdersSnap = await completedOrdersQuery.get();
    
    console.log(`\n✅ Completed orders (ABGESCHLOSSEN): ${completedOrdersSnap.size}`);
    
    // Check for orders with payout status
    const payoutReadyQuery = auftraegeRef.where('payoutStatus', '==', 'available_for_payout');
    const payoutReadySnap = await payoutReadyQuery.get();
    
    console.log(`💰 Orders ready for payout: ${payoutReadySnap.size}`);
    
    // Check for a specific company
    const testCompanyQuery = auftraegeRef.where('selectedAnbieterId', '==', 'test_company_123');
    const testCompanySnap = await testCompanyQuery.get();
    
    console.log(`🏢 Orders for test_company_123: ${testCompanySnap.size}`);
    
    // Show all possible statuses
    const statusesSet = new Set();
    allOrdersSnap.forEach(doc => {
      const status = doc.data().status;
      if (status) statusesSet.add(status);
    });
    
    console.log(`\n📊 Found order statuses: ${Array.from(statusesSet).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error checking auftraege collection:', error);
  }
}

checkAuftraegeCollection();
