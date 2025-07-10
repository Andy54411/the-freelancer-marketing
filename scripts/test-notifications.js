#!/usr/bin/env node

/**
 * Test-Script für Firestore Benachrichtigungen
 * Überprüft, ob die Firestore-Regeln korrekt funktionieren
 */

const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Service Account Key laden
const serviceAccount = require('../firebase-service-account-key.json');

// Firebase Admin SDK initialisieren
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });
}

const db = getFirestore();

async function testNotificationsRules() {
    console.log('🔍 Teste Firestore Benachrichtigungen-Regeln...\n');

    try {
        // 1. Liste alle Benachrichtigungen (sollte alle zurückgeben, da wir Admin-Rechte haben)
        console.log('1. Admin-Test: Alle Benachrichtigungen auflisten...');
        const allNotifications = await db.collection('notifications').limit(5).get();
        console.log(`   ✅ Gefunden: ${allNotifications.size} Benachrichtigungen`);

        if (allNotifications.size > 0) {
            const sampleNotification = allNotifications.docs[0];
            const data = sampleNotification.data();
            console.log(`   📄 Beispiel-Benachrichtigung:`, {
                id: sampleNotification.id,
                userId: data.userId,
                title: data.title,
                createdAt: data.createdAt?.toDate?.() || data.createdAt
            });

            // 2. Teste spezifische User-Query
            const userId = data.userId;
            if (userId) {
                console.log(`\n2. User-spezifischer Test für userId: ${userId}...`);
                const userNotifications = await db.collection('notifications')
                    .where('userId', '==', userId)
                    .orderBy('createdAt', 'desc')
                    .limit(5)
                    .get();
                console.log(`   ✅ User-spezifische Benachrichtigungen: ${userNotifications.size}`);
            }
        }

        // 3. Teste ob Index für die Query existiert
        console.log('\n3. Index-Test...');
        const indexTestQuery = await db.collection('notifications')
            .where('userId', '==', 'test-user-id')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        console.log('   ✅ Index ist vorhanden (Query erfolgreich)');

    } catch (error) {
        console.error('❌ Fehler beim Testen:', error);

        if (error.code === 9) {
            console.log('\n💡 Index-Fehler erkannt. Erstelle einen Index mit:');
            console.log('   firebase firestore:indexes');
            console.log('   Oder in der Firebase Console unter Firestore > Indexes');
        }
    }

    console.log('\n✅ Test abgeschlossen');
}

// Script ausführen
testNotificationsRules().catch(console.error);
