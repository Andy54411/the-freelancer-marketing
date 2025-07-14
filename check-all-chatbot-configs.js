#!/usr/bin/env node

const admin = require('firebase-admin');

// Service Account aus der JSON-Datei laden
let serviceAccount;
try {
  serviceAccount = require('./firebase-service-account-key.json');
} catch (e) {
  console.error('❌ Kann Service Account Key nicht laden.');
  process.exit(1);
}

// Firebase Admin initialisieren
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();

async function checkAllChatbotConfigs() {
  try {
    console.log('🔍 Überprüfe alle Chatbot-Konfigurationen...\n');

    // 1. Hauptkonfiguration
    console.log('1️⃣ Hauptkonfiguration (chatbot_config/knowledge_base):');
    const mainConfigRef = db.collection('chatbot_config').doc('knowledge_base');
    const mainConfigDoc = await mainConfigRef.get();

    if (mainConfigDoc.exists) {
      const data = mainConfigDoc.data();
      console.log('✅ Gefunden:');
      console.log('   - Modell:', data.model);
      console.log('   - Max Tokens:', data.maxTokens);
      console.log('   - Temperatur:', data.temperature);
      console.log('   - Enabled Features:', data.enabledFeatures);
      console.log(
        '   - System Instruction:',
        data.systemInstruction ? `${data.systemInstruction.substring(0, 100)}...` : 'Nicht gesetzt'
      );
      console.log('   - Letzte Aktualisierung:', data.updatedAt?.toDate?.() || data.updatedAt);
    } else {
      console.log('❌ Nicht gefunden');
    }

    console.log('\n');

    // 2. Andere mögliche Konfigurationen prüfen
    console.log('2️⃣ Weitere Konfigurationen in chatbot_config:');
    const allConfigsSnapshot = await db.collection('chatbot_config').get();

    if (allConfigsSnapshot.empty) {
      console.log('❌ Keine Dokumente gefunden');
    } else {
      allConfigsSnapshot.forEach(doc => {
        console.log(`📄 Dokument: ${doc.id}`);
        const data = doc.data();
        if (data.model) {
          console.log(`   - Modell: ${data.model}`);
        }
        if (data.systemInstruction) {
          console.log(
            `   - System Instruction vorhanden: ${data.systemInstruction.length} Zeichen`
          );
        }
      });
    }

    console.log('\n');

    // 3. Platform Config prüfen (falls vorhanden)
    console.log('3️⃣ Platform Config:');
    const platformConfigRef = db.collection('platform_config').doc('settings');
    const platformConfigDoc = await platformConfigRef.get();

    if (platformConfigDoc.exists) {
      const data = platformConfigDoc.data();
      console.log('✅ Platform Config gefunden');
      if (data.chatbot) {
        console.log('   - Chatbot-Einstellungen:', JSON.stringify(data.chatbot, null, 2));
      }
    } else {
      console.log('❌ Platform Config nicht gefunden');
    }
  } catch (error) {
    console.error('❌ Fehler beim Überprüfen:', error);
  } finally {
    await admin.app().delete();
  }
}

checkAllChatbotConfigs()
  .then(() => {
    console.log('\n🎉 Überprüfung abgeschlossen!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });
