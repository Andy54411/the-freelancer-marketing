import { NextResponse, type NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Initialize Firebase Admin 
let db: any = null;

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (!serviceAccountKey || !projectId) {
      throw new Error("Missing Firebase credentials");
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId,
    });
    
    return getFirestore(app);
  } catch (error) {
    console.error("[Firebase Init] Failed:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log("[FIRESTORE-TEST] Starting test");
  
  const { searchParams } = new URL(request.url);
  const firebaseUserId = searchParams.get('firebaseUserId');
  
  if (!firebaseUserId) {
    return NextResponse.json({ error: 'firebaseUserId Parameter erforderlich.' }, { status: 400 });
  }
  
  try {
    // Step 1: Test Firebase initialization (with timeout)
    console.log("[FIRESTORE-TEST] Step 1: Initializing Firebase...");
    const dbInit = await withTimeout(
      Promise.resolve(initializeFirebaseAdmin()),
      5000
    );
    
    if (!dbInit) {
      throw new Error("Firebase initialization failed");
    }
    
    console.log("[FIRESTORE-TEST] Step 1 completed in", Date.now() - startTime, "ms");
    
    // Step 2: Test Firestore connection (with timeout)
    console.log("[FIRESTORE-TEST] Step 2: Testing Firestore connection...");
    const connectionTest = await withTimeout(
      dbInit.collection('companies').doc(firebaseUserId).get(),
      10000
    );
    
    console.log("[FIRESTORE-TEST] Step 2 completed in", Date.now() - startTime, "ms");
    
    // Step 3: Analyze result
    let hasCompanyData = false;
    let hasStripeAccountId = false;
    let stripeAccountId = null;
    
    if (connectionTest.exists) {
      hasCompanyData = true;
      const data = connectionTest.data();
      if (data?.stripeAccountId) {
        hasStripeAccountId = true;
        stripeAccountId = data.stripeAccountId;
      }
    }
    
    // If no company data, try users collection
    if (!hasCompanyData) {
      console.log("[FIRESTORE-TEST] Step 3: Checking users collection...");
      const userTest = await withTimeout(
        dbInit.collection('users').doc(firebaseUserId).get(),
        10000
      );
      
      if (userTest.exists) {
        const userData = userTest.data();
        if (userData?.stripeAccountId) {
          hasStripeAccountId = true;
          stripeAccountId = userData.stripeAccountId;
        }
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log("[FIRESTORE-TEST] Test completed in", totalTime, "ms");
    
    return NextResponse.json({
      success: true,
      firebaseUserId,
      totalTimeMs: totalTime,
      hasCompanyData,
      hasStripeAccountId,
      stripeAccountId: stripeAccountId ? `${stripeAccountId.substring(0, 10)}...` : null,
      message: "Firestore connection test successful",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("[FIRESTORE-TEST] Error after", totalTime, "ms:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      totalTimeMs: totalTime,
      firebaseUserId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
