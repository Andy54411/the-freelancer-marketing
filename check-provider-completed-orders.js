const admin = require('firebase-admin');
const { readFileSync } = require('fs');

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(
    readFileSync('/Users/andystaudinger/Tasko/firebase_functions/service-account.json', 'utf8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });
} catch (error) {
  console.error('Firebase init failed:', error);
  process.exit(1);
}

const db = admin.firestore();

async function checkProviderCompletedOrders() {
  try {
    console.log('🔍 Prüfe Orders mit Status PROVIDER_COMPLETED...');

    const ordersRef = db.collection('auftraege');
    const providerCompletedQuery = ordersRef.where('status', '==', 'PROVIDER_COMPLETED');

    const snapshot = await providerCompletedQuery.get();

    if (snapshot.empty) {
      console.log('❌ Keine PROVIDER_COMPLETED Orders gefunden');
      return;
    }

    console.log(`📋 Gefunden: ${snapshot.size} PROVIDER_COMPLETED Orders`);

    snapshot.forEach(doc => {
      const orderData = doc.data();
      console.log(`\n📦 Order ${doc.id}:`);
      console.log('  Status:', orderData.status);
      console.log('  Provider:', orderData.selectedAnbieterId);
      console.log('  Customer:', orderData.userId);
      console.log('  Amount:', orderData.totalAmountPaidByBuyer / 100, 'EUR');
      console.log('  Title:', orderData.projectTitle || orderData.description);
      console.log('  Created:', orderData.createdAt?.toDate?.() || orderData.createdAt);
      console.log(
        '  Provider Completed:',
        orderData.providerCompletedAt?.toDate?.() || orderData.providerCompletedAt || 'Not set'
      );
      console.log(
        '  Customer Completed:',
        orderData.completedAt?.toDate?.() || orderData.completedAt || 'Not set'
      );
      console.log('  Payout Status:', orderData.payoutStatus || 'Not set');
      console.log('  Rating:', orderData.rating || 'Not rated');
      console.log('  Review:', orderData.review || 'No review');
    });

    console.log(
      '\n🎯 Diese Orders warten darauf, dass der Kunde sie als "ABGESCHLOSSEN" markiert.'
    );
    console.log('💡 Tipp: Der Kunde kann diese Orders im Dashboard abschließen und bewerten.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkProviderCompletedOrders();
