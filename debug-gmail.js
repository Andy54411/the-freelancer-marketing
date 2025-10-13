/**
 * Debug Script - Gmail Watch Setup und Status
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'tilvo-f142f',
  });
}

const db = admin.firestore();

async function debugGmailStatus() {
  console.log('🔍 Debug Gmail Status für: a.staudinger32@gmail.com');

  try {
    // 1. Prüfe Gmail Sync Status
    console.log('\n📊 Prüfe Gmail Sync Status...');
    const syncStatusSnapshot = await db.collection('gmail_sync_status').get();

    if (syncStatusSnapshot.empty) {
      console.log('❌ Keine Gmail Sync Status gefunden');
    } else {
      syncStatusSnapshot.forEach(doc => {
        console.log('✅ Gmail Sync Status:', doc.id, doc.data());
      });
    }

    // 2. Prüfe Company Gmail Config
    console.log('\n🏢 Prüfe Company Gmail Config...');
    const companiesSnapshot = await db
      .collection('companies')
      .where('gmailConfig.email', '==', 'a.staudinger32@gmail.com')
      .get();

    if (companiesSnapshot.empty) {
      console.log('❌ Keine Company mit Gmail Config gefunden');
    } else {
      companiesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('✅ Company gefunden:', doc.id);
        console.log('Gmail Config:', {
          email: data.gmailConfig?.email,
          status: data.gmailConfig?.status,
          hasTokens: !!data.gmailConfig?.tokens,
        });
      });
    }

    // 3. Prüfe realtime_events
    console.log('\n📡 Prüfe letzte Real-time Events...');
    const realtimeSnapshot = await db
      .collection('realtime_events')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    if (realtimeSnapshot.empty) {
      console.log('❌ Keine Real-time Events gefunden');
    } else {
      realtimeSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('📡 Event:', data.eventType, data.timestamp?.toDate());
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

debugGmailStatus();
