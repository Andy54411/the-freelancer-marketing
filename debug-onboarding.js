import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Debug eines Users - ersetzen Sie die UID
const checkUser = async uid => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('=== USER ONBOARDING STATUS ===');
      console.log('UID:', uid);
      console.log('onboardingCompleted:', userData.onboardingCompleted);
      console.log('onboardingCompletionPercentage:', userData.onboardingCompletionPercentage);
      console.log('onboardingCurrentStep:', userData.onboardingCurrentStep);
      console.log('profileComplete:', userData.profileComplete);
      console.log('profileStatus:', userData.profileStatus);
      console.log('onboardingCompletedAt:', userData.onboardingCompletedAt?.toDate?.());
      console.log('================================');
    } else {
      console.log('User nicht gefunden:', uid);
    }
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Usage: node debug-onboarding.js YOUR_USER_UID
const uid = process.argv[2];
if (!uid) {
  console.log('Usage: node debug-onboarding.js YOUR_USER_UID');
  process.exit(1);
}

checkUser(uid);
