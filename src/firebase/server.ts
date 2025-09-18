import * as admin from 'firebase-admin';

// Firebase initialization with build-time safety
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return;
  }

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
    } else {
      // Fallback for build-time when credentials are not available
      admin.initializeApp({
        projectId: 'tilvo-f142f',
      });
    }
  } catch (error) {
    console.warn('Firebase initialization warning:', error.message);
    // Initialize with minimal config for build-time
    try {
      admin.initializeApp({
        projectId: 'tilvo-f142f',
      });
    } catch (fallbackError) {
      console.error('Firebase fallback initialization failed:', fallbackError);
    }
  }
}

// Initialize Firebase
initializeFirebase();

// Safe database and auth exports with runtime checking
export const db = (() => {
  try {
    return admin.firestore();
  } catch (error) {
    console.warn('Firestore not available during build time');
    return null;
  }
})();

export const auth = (() => {
  try {
    return admin.auth();
  } catch (error) {
    console.warn('Auth not available during build time');
    return null;
  }
})();

// Utility function to check if Firebase is available
export function isFirebaseAvailable(): boolean {
  return db !== null && auth !== null;
}

// Utility function for safe Firebase operations
export function withFirebase<T>(operation: () => Promise<T>): Promise<T> {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase not available');
  }
  return operation();
}

// Export admin for existing server-side code that needs it
export { admin };
