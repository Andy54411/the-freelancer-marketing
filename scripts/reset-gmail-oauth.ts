#!/usr/bin/env tsx
/**
 * Gmail OAuth Reset Script
 * Revoked alle Gmail OAuth Tokens bei Google und löscht lokale Configs
 */

import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Firebase Admin initialisieren - nutze existierende Verbindung falls vorhanden
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
  }

  try {
    // Parse Service Account direkt ohne escaping
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('❌ Fehler beim Parsen des Service Account Keys');
    console.error('Versuche alternative Methode...');
    
    // Fallback: Nutze Application Default Credentials
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function revokeGoogleToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.ok) {
      console.log('✅ Token bei Google revoked');
      return true;
    } else {
      console.log('⚠️ Token revoke fehlgeschlagen:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Fehler beim Token revoke:', error);
    return false;
  }
}

async function resetGmailOAuth(companyId: string) {
  console.log(`\n🔄 Starte Gmail OAuth Reset für Company: ${companyId}\n`);

  try {
    // 1. Lade alle Gmail emailConfigs
    const emailConfigsSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('emailConfigs')
      .where('provider', '==', 'gmail')
      .get();

    console.log(`📧 Gefunden: ${emailConfigsSnapshot.size} Gmail Config(s)\n`);

    // 2. Revoke jeden Token bei Google
    for (const doc of emailConfigsSnapshot.docs) {
      const config = doc.data();
      console.log(`🔐 Verarbeite: ${config.email}`);
      
      if (config.tokens?.access_token) {
        console.log('  → Revoke Access Token bei Google...');
        await revokeGoogleToken(config.tokens.access_token);
      }

      if (config.tokens?.refresh_token) {
        console.log('  → Revoke Refresh Token bei Google...');
        await revokeGoogleToken(config.tokens.refresh_token);
      }

      // 3. Lösche emailConfig aus Firestore
      console.log('  → Lösche emailConfig aus Firestore...');
      await doc.ref.delete();
      console.log('  ✅ Config gelöscht\n');
    }

    // 4. Lösche gmail_sync_status
    const syncStatusSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('gmail_sync_status')
      .get();

    console.log(`🔄 Lösche ${syncStatusSnapshot.size} Sync Status Einträge...`);
    for (const doc of syncStatusSnapshot.docs) {
      await doc.ref.delete();
    }

    // 5. Lösche emailCache (optional)
    console.log('\n🗑️ Lösche Email Cache...');
    const emailCacheSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('emailCache')
      .limit(500)
      .get();

    console.log(`   Lösche ${emailCacheSnapshot.size} Emails aus Cache...`);
    const batch = db.batch();
    emailCacheSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log('\n✅ Gmail OAuth Reset abgeschlossen!');
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. Gehe zu: https://myaccount.google.com/permissions');
    console.log('   2. Entferne "Taskilo" aus der App-Liste');
    console.log('   3. Verbinde Gmail neu in deinem Dashboard\n');

  } catch (error) {
    console.error('❌ Fehler beim Reset:', error);
    throw error;
  }
}

// Main
const companyId = process.argv[2];

if (!companyId) {
  console.error('❌ Company ID fehlt!');
  console.error('Usage: tsx scripts/reset-gmail-oauth.ts <COMPANY_ID>');
  process.exit(1);
}

resetGmailOAuth(companyId)
  .then(() => {
    console.log('✅ Script abgeschlossen');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });
