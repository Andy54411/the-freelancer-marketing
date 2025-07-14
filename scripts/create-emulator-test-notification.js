#!/usr/bin/env node

/**
 * Test-Script zum Erstellen einer Test-Benachrichtigung im EMULATOR
 */

const admin = require('firebase-admin');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// EMULATOR-Konfiguration
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Firebase Admin SDK initialisieren für Emulator
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'tilvo-f142f', // Nur Project ID für Emulator
  });
}

const db = getFirestore();

async function createTestNotificationInEmulator() {
  console.log('🔔 Erstelle Test-Benachrichtigung im EMULATOR...\n');

  // Verwende die User-ID aus dem Kommandozeilen-Parameter oder Standard
  const testUserId = process.argv[2] || 'hV6SL3gC4laSYqMI6Gw2WvUU4r8r';

  const testNotification = {
    userId: testUserId,
    title: 'Emulator Test-Benachrichtigung',
    message: 'Das ist eine Test-Benachrichtigung im Firebase Emulator.',
    type: 'info',
    link: `/dashboard/user/${testUserId}`, // Gültiger Link hinzugefügt
    isRead: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await db.collection('notifications').add(testNotification);
    console.log(`✅ Emulator Test-Benachrichtigung erstellt mit ID: ${docRef.id}`);
    console.log(`👤 Für User: ${testUserId}`);
    console.log(`📝 Inhalt:`, testNotification);

    console.log('\n💡 Jetzt sollte der UserHeader diese Benachrichtigung laden können!');
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Test-Benachrichtigung im Emulator:', error);
  }
}

// Script ausführen
createTestNotificationInEmulator().catch(console.error);
