import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Build time detection - Skip Firebase during builds
const isBuildTime =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build' ||
  process.argv.includes('build');

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

// Initialize Firebase Admin SDK for Vercel
if (!isBuildTime && !admin.apps.length) {
  try {
    // Vercel Environment: Use FIREBASE_SERVICE_ACCOUNT_KEY only
    const firebaseServiceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!firebaseServiceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable missing');
    }

    // Parse service account JSON
    let serviceAccount;
    try {
      // Try direct JSON parse first
      serviceAccount = JSON.parse(firebaseServiceAccountKey);
    } catch (directParseError) {
      // Try Base64 decode then parse
      try {
        const decoded = Buffer.from(firebaseServiceAccountKey, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
      } catch (base64ParseError) {
        throw new Error('Firebase Service Account Key format invalid');
      }
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tilvo-f142f',
      storageBucket: 'tilvo-f142f.firebasestorage.app',
      databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
    });

    // Get instances
    db = getFirestore();
    auth = getAuth();

    console.log('✅ Firebase Admin initialized successfully');
  } catch (error: any) {
    console.error('❌ Firebase initialization failed:', error.message);

    // Don't throw during build
    if (!isBuildTime) {
      throw new Error('Firebase initialization failed');
    }
  }
}

export { db, auth, admin };
