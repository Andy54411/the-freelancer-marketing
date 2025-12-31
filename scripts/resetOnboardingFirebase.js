const admin = require('firebase-admin');

async function main() {
  try {
    const serviceAccount = require('../firebase_functions/service-account.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const db = admin.firestore();

    const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
    console.log('Resetting onboarding for company:', companyId);

    await db.collection('companies').doc(companyId).update({
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      onboardingCompletionPercentage: 0,
      onboardingCurrentStep: '1',
      profileComplete: false,
      profileStatus: 'pending_onboarding',
      status: 'pending_onboarding',
    });

    console.log('Onboarding reset successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting onboarding:', err);
    process.exit(1);
  }
}

main();
