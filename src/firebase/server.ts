import * as admin from 'firebase-admin';

// Simple Firebase initialization for development
if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    console.log(
      '🔍 Checking FIREBASE_SERVICE_ACCOUNT_KEY...',
      serviceAccountKey ? 'EXISTS' : 'MISSING'
    );

    if (serviceAccountKey) {
      console.log('📝 Parsing service account key...');

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

      console.log('🔍 First 100 chars of cleaned key:', cleanKey.substring(0, 100));
      console.log('🔍 Key starts with:', cleanKey.charAt(0), 'Second char:', cleanKey.charAt(1));

      // Try direct JSON.parse first
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(cleanKey);
      } catch (firstError) {
        console.log('🔄 First parse failed, trying to fix private key format...');

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
          console.error('❌ Both parsing methods failed:');
          console.error('First error:', firstError.message);
          console.error('Second error:', secondError.message);
          throw firstError;
        }
      }
      console.log('✅ Service account parsed successfully');

      // Fix private key format if needed
      if (serviceAccount?.private_key && !serviceAccount.private_key.includes('\n')) {
        console.log('🔧 Fixing private key format...');
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n'); // Convert escaped newlines to actual newlines
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'tilvo-f142f',
      });

      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not found');
      throw new Error('Firebase credentials missing');
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    throw error; // Re-throw to prevent accessing undefined firebase services
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
