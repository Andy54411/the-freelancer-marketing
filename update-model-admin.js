#!/usr/bin/env node

const admin = require('firebase-admin');

// Service Account aus der JSON-Datei laden
let serviceAccount;
try {
  serviceAccount = require('./firebase-service-account-key.json');
} catch (e) {
  console.error(
    '❌ Kann Service Account Key nicht laden. Stelle sicher, dass firebase-service-account-key.json existiert.'
  );
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

async function updateChatbotModel() {
  try {
    console.log('🔄 Aktualisiere Chatbot-Modell von GPT-3.5-turbo auf Gemini...');

    const docRef = db.collection('chatbot_config').doc('knowledge_base');

    // Aktuelle Konfiguration abrufen
    const doc = await docRef.get();
    if (!doc.exists) {
      console.log('❌ Chatbot-Konfiguration nicht gefunden');
      return;
    }

    const currentData = doc.data();
    console.log('📋 Aktuelle Konfiguration:');
    console.log('- Modell:', currentData.model);
    console.log('- Max Tokens:', currentData.maxTokens);
    console.log('- Temperatur:', currentData.temperature);
    console.log(
      '- System Instruction:',
      currentData.systemInstruction
        ? currentData.systemInstruction.substring(0, 50) + '...'
        : 'Nicht gesetzt'
    );

    if (currentData.model === 'gemini-1.5-flash') {
      console.log('✅ Modell ist bereits auf Gemini eingestellt');
      return;
    }

    // Modell auf Gemini aktualisieren
    await docRef.update({
      model: 'gemini-1.5-flash',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Modell erfolgreich auf Gemini geändert!');

    // Neue Konfiguration anzeigen
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    console.log('📋 Neue Konfiguration:');
    console.log('- Modell:', updatedData.model);
    console.log('- Max Tokens:', updatedData.maxTokens);
    console.log('- Temperatur:', updatedData.temperature);
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren:', error);
  } finally {
    // Firebase-App schließen
    await admin.app().delete();
  }
}

updateChatbotModel()
  .then(() => {
    console.log('🎉 Chatbot-Konfiguration erfolgreich aktualisiert!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });
