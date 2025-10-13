/**
 * Gmail Watch Diagnostic Script
 * Überprüft den Status der Gmail Watch-Registrierung
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID only
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'tilvo-f142f',
  });
}

const db = admin.firestore();

async function checkGmailWatchStatus() {
  console.log('🔍 Checking Gmail Watch Status...\n');

  try {
    // Check emailConfigs
    const companyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
    const emailConfigsSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('emailConfigs')
      .get();

    if (emailConfigsSnapshot.empty) {
      console.log('❌ Keine emailConfigs gefunden');
      return;
    }

    for (const configDoc of emailConfigsSnapshot.docs) {
      const config = configDoc.data();
      console.log(`\n📧 Email: ${config.email}`);
      console.log(`   Config ID: ${configDoc.id}`);
      console.log(`   Watch Registered: ${config.watchRegistered || false}`);

      if (config.watchExpiration) {
        const expirationDate = new Date(config.watchExpiration);
        const now = new Date();
        const isExpired = expirationDate < now;
        const hoursLeft = ((expirationDate - now) / (1000 * 60 * 60)).toFixed(1);

        console.log(`   Watch Expiration: ${expirationDate.toLocaleString('de-DE')}`);
        console.log(`   Status: ${isExpired ? '❌ EXPIRED' : `✅ Active (${hoursLeft}h left)`}`);
      } else {
        console.log(`   Watch Expiration: ❌ NOT SET`);
      }

      if (config.historyId) {
        console.log(`   Last History ID: ${config.historyId}`);
      }

      if (config.lastSync) {
        const lastSync = new Date(config.lastSync);
        const minutesAgo = ((new Date() - lastSync) / (1000 * 60)).toFixed(1);
        console.log(`   Last Sync: ${lastSync.toLocaleString('de-DE')} (${minutesAgo} min ago)`);
      }
    }

    // Check recent webhook logs
    console.log('\n\n📊 Recent Webhook Activity:');
    const recentLogs = await db
      .collection('webhook_logs')
      .where('service', '==', 'gmail')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    if (recentLogs.empty) {
      console.log('   No webhook logs found');
    } else {
      recentLogs.forEach(log => {
        const data = log.data();
        const timestamp = data.timestamp?.toDate?.() || data.timestamp;
        console.log(`   ${timestamp}: ${data.message || 'Event received'}`);
      });
    }

    // Check gmail_sync_stats
    console.log('\n\n📈 Sync Statistics:');
    const statsSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('gmail_sync_stats')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (!statsSnapshot.empty) {
      const stats = statsSnapshot.docs[0].data();
      console.log(`   Last Stats Update: ${stats.timestamp?.toDate?.().toLocaleString('de-DE')}`);
      console.log(`   Emails Synced: ${stats.totalEmails || 0}`);
      console.log(`   Success Rate: ${stats.successRate || 'N/A'}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkGmailWatchStatus()
  .then(() => {
    console.log('\n✅ Diagnostic Complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
