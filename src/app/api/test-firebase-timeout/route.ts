import { NextRequest, NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin Initialisierung
if (!getApps().length) {
  try {
    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountKeyBase64 || !projectId) {
      throw new Error('Missing Firebase configuration');
    }

    const serviceAccountKey = JSON.parse(
      Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8')
    );

    initializeApp({
      credential: cert(serviceAccountKey),
      projectId: projectId,
    });
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
  }
}

// Timeout Wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔍 [Firebase Timeout Test] Started at:', new Date().toISOString());

  try {
    // Test 1: Firebase Admin App Check
    console.log('⏱️ [Step 1] Checking Firebase Admin App...');
    const stepStart = Date.now();
    const apps = getApps();
    console.log(`✅ [Step 1] Firebase apps available: ${apps.length} (${Date.now() - stepStart}ms)`);

    // Test 2: Firestore Instance
    console.log('⏱️ [Step 2] Getting Firestore instance...');
    const step2Start = Date.now();
    const db = getFirestore();
    console.log(`✅ [Step 2] Firestore instance ready (${Date.now() - step2Start}ms)`);

    // Test 3: Simple Firestore Operation mit Timeout
    console.log('⏱️ [Step 3] Testing simple Firestore operation with 10s timeout...');
    const step3Start = Date.now();
    
    const testOperation = async () => {
      const collections = await db.listCollections();
      return collections.map(col => col.id);
    };

    const collections = await withTimeout(testOperation(), 10000);
    console.log(`✅ [Step 3] Collections retrieved: ${collections.length} (${Date.now() - step3Start}ms)`);

    // Test 4: User Document Query mit Timeout
    console.log('⏱️ [Step 4] Testing user query with 15s timeout...');
    const step4Start = Date.now();
    
    const userQuery = async () => {
      const usersSnapshot = await db.collection('users').limit(1).get();
      return usersSnapshot.size;
    };

    const userCount = await withTimeout(userQuery(), 15000);
    console.log(`✅ [Step 4] User query completed: ${userCount} docs (${Date.now() - step4Start}ms)`);

    const totalTime = Date.now() - startTime;
    console.log(`🎉 [Firebase Timeout Test] All tests completed in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      message: 'Firebase operations completed successfully',
      timing: {
        totalTime: totalTime,
        steps: {
          adminCheck: 'fast',
          firestoreInstance: 'fast',
          collectionsQuery: 'completed within 10s timeout',
          userQuery: 'completed within 15s timeout'
        }
      },
      tests: {
        firebaseApps: apps.length,
        collectionsFound: collections.length,
        userDocsChecked: userCount
      }
    });

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [Firebase Timeout Test] Error after', totalTime, 'ms:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      timing: {
        totalTime: totalTime,
        failedAt: totalTime
      },
      message: 'Firebase operation failed or timed out'
    }, { status: 500 });
  }
}
