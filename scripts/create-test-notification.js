#!/usr/bin/env node

/**
 * Test-Script zum Erstellen einer Test-Benachrichtigung
 */

const admin = require('firebase-admin');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Service Account Key laden
const serviceAccount = require('../firebase-service-account-key.json');

// Firebase Admin SDK initialisieren
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = getFirestore();

async function createTestNotification() {
  console.log('🔔 Erstelle Test-Benachrichtigung...\n');

  // Du kannst hier eine echte User-ID eingeben, wenn du eine hast
  const testUserId = process.argv[2] || 'test-user-123';

  const testNotification = {
    userId: testUserId,
    title: 'Test-Benachrichtigung',
    message: 'Das ist eine Test-Benachrichtigung zur Überprüfung der Firestore-Regeln.',
    type: 'info',
    isRead: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await db.collection('notifications').add(testNotification);
    console.log(`✅ Test-Benachrichtigung erstellt mit ID: ${docRef.id}`);
    console.log(`👤 Für User: ${testUserId}`);
    console.log(`📝 Inhalt:`, testNotification);

    console.log('\n💡 Um diese Benachrichtigung zu testen, verwende:');
    console.log(`   node scripts/test-notifications.js`);
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Test-Benachrichtigung:', error);
  }
}

// Script ausführen
createTestNotification().catch(console.error);
