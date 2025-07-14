const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

// Lade die Umgebungsvariablen
require('dotenv').config({ path: './.env.local' });

// Firebase-Konfiguration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔄 Initialisiere Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateChatbotModel() {
  try {
    console.log('📋 Hole aktuelle Chatbot-Konfiguration...');

    const docRef = doc(db, 'chatbot_config', 'knowledge_base');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log('❌ Chatbot-Konfiguration nicht gefunden');
      return;
    }

    const currentData = docSnap.data();
    console.log('Aktuelles Modell:', currentData.model);

    if (currentData.model === 'gemini-1.5-flash') {
      console.log('✅ Modell ist bereits auf Gemini eingestellt');
      return;
    }

    console.log('🔄 Aktualisiere Modell auf Gemini...');
    await updateDoc(docRef, {
      model: 'gemini-1.5-flash',
      updatedAt: new Date(),
    });

    console.log('✅ Modell erfolgreich auf Gemini geändert!');
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

updateChatbotModel()
  .then(() => {
    console.log('🎉 Fertig!');
    process.exit(0);
  })
  .catch(console.error);
