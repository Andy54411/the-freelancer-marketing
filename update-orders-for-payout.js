const admin = require('firebase-admin');
const { readFileSync } = require('fs');

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(readFileSync('/Users/andystaudinger/Tasko/firebase_functions/service-account.json', 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app'
  });
} catch (error) {
  console.error('Firebase init failed:', error);
  process.exit(1);
}

const db = admin.firestore();

async function updateCompletedOrdersForPayout() {
  try {
    console.log('🔍 Suche abgeschlossene Orders...');
    
    // Finde alle ABGESCHLOSSENEN Orders ohne payoutStatus
    const ordersRef = db.collection('auftraege');
    const completedOrdersQuery = ordersRef.where('status', '==', 'ABGESCHLOSSEN');
    
    const snapshot = await completedOrdersQuery.get();
    
    if (snapshot.empty) {
      console.log('❌ Keine abgeschlossenen Orders gefunden');
      return;
    }
    
    console.log(`📋 Gefunden: ${snapshot.size} abgeschlossene Orders`);
    
    const batch = db.batch();
    let updateCount = 0;
    
    snapshot.forEach(doc => {
      const orderData = doc.data();
      
      // Nur updaten wenn noch kein payoutStatus gesetzt ist
      if (!orderData.payoutStatus) {
        console.log(`✅ Updating Order ${doc.id}:`, {
          provider: orderData.selectedAnbieterId,
          amount: orderData.totalAmountPaidByBuyer,
          title: orderData.projectTitle || orderData.description || 'No title'
        });
        
        batch.update(doc.ref, {
          payoutStatus: 'available_for_payout',
          payoutAvailableAt: new Date(),
          updatedAt: new Date()
        });
        
        updateCount++;
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ ${updateCount} Orders für Payout verfügbar gemacht`);
    } else {
      console.log('ℹ️ Alle Orders haben bereits payoutStatus');
    }
    
    // Test: Zeige verfügbare Payouts für den Test-Provider
    console.log('\n🧪 Testing Payout availability für Provider 0Rj5vGkBjeXrzZKBr4cFfV0jRuw1...');
    
    const payoutTestQuery = ordersRef
      .where('selectedAnbieterId', '==', '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1')
      .where('status', '==', 'ABGESCHLOSSEN')
      .where('payoutStatus', '==', 'available_for_payout');
    
    const payoutSnapshot = await payoutTestQuery.get();
    
    console.log(`💰 Verfügbare Payouts für Provider: ${payoutSnapshot.size}`);
    
    let totalAvailable = 0;
    payoutSnapshot.forEach(doc => {
      const orderData = doc.data();
      const amount = orderData.totalAmountPaidByBuyer || 0;
      const platformFee = orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
      const netAmount = amount - platformFee;
      
      totalAvailable += netAmount;
      
      console.log(`  Order ${doc.id}:`, {
        gross: amount / 100,
        fee: platformFee / 100,
        net: netAmount / 100,
        title: orderData.projectTitle || orderData.description
      });
    });
    
    console.log(`💸 Total verfügbar: ${totalAvailable / 100} EUR`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

updateCompletedOrdersForPayout();
