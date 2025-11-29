const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin initialisieren mit Umgebungsvariablen
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function fixOnboardingStatus() {
  try {
    const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
    
    console.log('🔧 Aktualisiere Onboarding-Status für:', companyId);
    
    await db.collection('companies').doc(companyId).update({
      onboardingCompleted: true,
      profileComplete: true,
      onboardingCompletionPercentage: 100,
      status: 'active',
    });
    
    console.log('✅ Onboarding-Status erfolgreich aktualisiert!');
    console.log('   - onboardingCompleted: true');
    console.log('   - profileComplete: true');
    console.log('   - onboardingCompletionPercentage: 100');
    console.log('   - status: active');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
  
  process.exit(0);
}

fixOnboardingStatus();
