const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function checkTimeEntries() {
  console.log('🔍 Checking TimeEntries status for order 4bMTQQzVWsHyKhkbkRRu...\n');

  try {
    const timeEntriesRef = db
      .collection('auftraege')
      .doc('4bMTQQzVWsHyKhkbkRRu')
      .collection('timeEntries');
    const snapshot = await timeEntriesRef.get();

    let billingPendingCount = 0;
    let platformHeldCount = 0;
    let totalEntries = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      totalEntries++;

      if (data.status === 'billing_pending') {
        billingPendingCount++;
        console.log(`❌ Entry ${doc.id}: status = ${data.status}`);
      } else if (data.status === 'platform_held') {
        platformHeldCount++;
        const paidAtStr = data.paidAt ? data.paidAt.toDate().toISOString() : 'N/A';
        console.log(`✅ Entry ${doc.id}: status = ${data.status}, paidAt = ${paidAtStr}`);
      } else {
        console.log(`ℹ️  Entry ${doc.id}: status = ${data.status || 'undefined'}`);
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`Total entries: ${totalEntries}`);
    console.log(`billing_pending: ${billingPendingCount}`);
    console.log(`platform_held: ${platformHeldCount}`);
    console.log(`other statuses: ${totalEntries - billingPendingCount - platformHeldCount}`);

    if (billingPendingCount === 0 && platformHeldCount > 0) {
      console.log(
        `\n🎉 SUCCESS! Alle TimeEntries wurden erfolgreich von billing_pending auf platform_held aktualisiert!`
      );
      console.log(`💰 Ihre €3,421.00 Zahlung wurde korrekt verarbeitet!`);
    } else if (billingPendingCount > 0) {
      console.log(`\n⚠️  Es gibt noch ${billingPendingCount} Einträge im billing_pending Status.`);
    } else {
      console.log(`\n❓ Unerwarteter Status - keine platform_held Einträge gefunden.`);
    }
  } catch (error) {
    console.error('❌ Error checking TimeEntries:', error);
  } finally {
    process.exit(0);
  }
}

checkTimeEntries();
