const admin = require('firebase-admin');
const { readFileSync } = require('fs');

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(
    readFileSync('/Users/andystaudinger/Tasko/firebase_functions/service-account.json', 'utf8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });
} catch (error) {
  console.error('Firebase init failed:', error);
  process.exit(1);
}

const db = admin.firestore();

async function resetOnboardingStep() {
  const companyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';

  try {
    console.log('🔄 Setze onboardingCurrentStep zurück für Company:', companyId);

    const companyRef = db.collection('companies').doc(companyId);

    await companyRef.update({
      onboardingCurrentStep: '3', // Zurück zu Step 3 für Banner-Upload Test
      onboardingCompleted: false,
      onboardingCompletionPercentage: 60, // ~60% für Step 3
    });

    console.log('✅ onboardingCurrentStep erfolgreich auf "3" gesetzt');
    console.log('✅ onboardingCompleted auf false gesetzt');
    console.log('✅ Company kann jetzt wieder das Onboarding ab Step 3 durchlaufen');
  } catch (error) {
    console.error('❌ Fehler beim Zurücksetzen des Onboarding-Steps:', error);
  }
}

resetOnboardingStep();
