const admin = require('firebase-admin');
const serviceAccount = require('./firebase_functions/service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function updateChatbotModel() {
  try {
    console.log('🔄 Aktualisiere Chatbot-Modell von GPT-3.5-turbo auf Gemini...');

    const docRef = db.collection('chatbot_config').doc('knowledge_base');

    // Erst aktuelle Konfiguration abrufen
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

    // Modell auf Gemini aktualisieren
    await docRef.update({
      model: 'gemini-1.5-flash',
      updatedAt: new Date(),
    });

    console.log('✅ Modell erfolgreich auf Gemini geändert!');

    // Neue Konfiguration anzeigen
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    console.log('📋 Neue Konfiguration:');
    console.log('- Modell:', updatedData.model);
    console.log('- Max Tokens:', updatedData.maxTokens);
    console.log('- Temperatur:', updatedData.temperature);
    console.log('- Letzte Aktualisierung:', updatedData.updatedAt);
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren:', error);
  }
}

updateChatbotModel().then(() => {
  console.log('🎉 Chatbot-Konfiguration erfolgreich aktualisiert!');
  process.exit(0);
});
