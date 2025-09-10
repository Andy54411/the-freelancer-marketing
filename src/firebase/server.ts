import * as admin from 'firebase-admin';

// Simple Firebase initialization for development
if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // Clean escaped characters
      let cleanKey = serviceAccountKey.trim();

      // Remove outer quotes if present
      if (
        (cleanKey.startsWith('"') && cleanKey.endsWith('"')) ||
        (cleanKey.startsWith("'") && cleanKey.endsWith("'"))
      ) {
        cleanKey = cleanKey.slice(1, -1);
      }

      // Replace escaped quotes and newlines
      cleanKey = cleanKey.replace(/\\"/g, '"');
      cleanKey = cleanKey.replace(/\\n/g, '\n');
      cleanKey = cleanKey.replace(/\\r/g, '\r');
      cleanKey = cleanKey.replace(/\\t/g, '\t');
      cleanKey = cleanKey.replace(/\\\\/g, '\\');

      // Try direct JSON.parse first
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(cleanKey);
      } catch (firstError) {
        // Fix common private key formatting issues
        let fixedKey = cleanKey;

        // Ensure proper newlines in private key
        fixedKey = fixedKey.replace(/"private_key":\s*"([^"]*)"/, (match, privateKey) => {
          // Fix private key newlines
          const fixedPrivateKey = privateKey
            .replace(/\\n/g, '\n') // Convert \n to actual newlines
            .replace(/\n+/g, '\n'); // Remove duplicate newlines
          return `"private_key": "${fixedPrivateKey.replace(/\n/g, '\\n')}"`;
        });

        try {
          serviceAccount = JSON.parse(fixedKey);
        } catch (secondError) {
          console.error('❌ Firebase service account parsing failed:');
          console.error('First error:', firstError.message);
          console.error('Second error:', secondError.message);
          throw firstError;
        }
      }

      // Fix private key format if needed
      if (serviceAccount?.private_key && !serviceAccount.private_key.includes('\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'tilvo-f142f',
      });

      console.log('✅ Firebase Admin SDK initialized');
    } else {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not found');
      throw new Error('Firebase credentials missing');
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    throw error;
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

// Export admin for existing server-side code that needs it
export { admin };
