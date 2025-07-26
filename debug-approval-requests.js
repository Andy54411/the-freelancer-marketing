// Debug Script für Approval Requests
// node debug-approval-requests.js

const admin = require('firebase-admin');
const serviceAccount = require('./taskilo-newsletter-service-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'taskilo',
});

const db = admin.firestore();

async function debugApprovalRequests() {
  try {
    console.log('🔍 Debugging Approval Requests...\n');

    // Hole alle Aufträge
    const auftraegeSnapshot = await db.collection('auftraege').get();

    console.log(`📊 Gefundene Aufträge: ${auftraegeSnapshot.docs.length}\n`);

    for (const doc of auftraegeSnapshot.docs) {
      const data = doc.data();

      console.log(`📋 Auftrag: ${doc.id}`);
      console.log(`   Kunde: ${data.customerFirebaseUid}`);
      console.log(`   Status: ${data.status}`);

      // Prüfe Time Tracking
      if (data.timeTracking) {
        console.log(`   ⏱️ Time Tracking:`);
        console.log(`      Status: ${data.timeTracking.status}`);
        console.log(`      Einträge: ${data.timeTracking.timeEntries?.length || 0}`);
        console.log(`      Geplante Stunden: ${data.timeTracking.originalPlannedHours}`);
        console.log(`      Geloggte Stunden: ${data.timeTracking.totalLoggedHours}`);

        // Prüfe Time Entries
        if (data.timeTracking.timeEntries) {
          data.timeTracking.timeEntries.forEach((entry, index) => {
            console.log(
              `      Entry ${index + 1}: ${entry.category} - ${entry.hours}h - Status: ${entry.status}`
            );
          });
        }
      } else {
        console.log(`   ❌ Kein Time Tracking`);
      }

      // Prüfe Approval Requests
      if (data.approvalRequests && data.approvalRequests.length > 0) {
        console.log(`   📤 Approval Requests: ${data.approvalRequests.length}`);
        data.approvalRequests.forEach((req, index) => {
          console.log(
            `      Request ${index + 1}: ${req.status} - ${req.totalHours}h - €${req.totalAmount / 100}`
          );
          console.log(`         Time Entry IDs: ${req.timeEntryIds.join(', ')}`);
        });
      } else {
        console.log(`   ❌ Keine Approval Requests`);
      }

      console.log(''); // Leerzeile
    }

    // Prüfe auch separate customerApprovalRequests Collection (falls vorhanden)
    console.log('\n🔍 Prüfe separate customerApprovalRequests Collection...');
    const approvalRequestsSnapshot = await db.collection('customerApprovalRequests').get();
    console.log(`📊 Separate Approval Requests: ${approvalRequestsSnapshot.docs.length}`);

    if (approvalRequestsSnapshot.docs.length > 0) {
      approvalRequestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   Request: ${doc.id} - Order: ${data.orderId} - Status: ${data.status}`);
      });
    }
  } catch (error) {
    console.error('❌ Fehler beim Debugging:', error);
  } finally {
    admin.app().delete();
  }
}

debugApprovalRequests();
