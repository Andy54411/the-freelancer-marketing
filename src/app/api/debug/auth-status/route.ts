import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
  }
}

/**
 * Debug API endpoint to check Firebase authentication and permissions
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.replace('Bearer ', '');

    if (!idToken) {
      return NextResponse.json(
        {
          error: 'No authorization token provided',
          help: 'Please provide Authorization: Bearer <token> header',
        },
        { status: 401 }
      );
    }

    const admin = getAuth();

    // Verify the ID token
    const decodedToken = await admin.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Get user document from Firestore
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    // Get company document if user is a company
    const companyDocRef = doc(db, 'companies', uid);
    const companyDocSnap = await getDoc(companyDocRef);

    // Check custom claims
    const userRecord = await admin.getUser(uid);

    return NextResponse.json({
      success: true,
      debug: {
        uid: uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        customClaims: userRecord.customClaims || {},
        tokenClaims: {
          role: decodedToken.role,
          master: decodedToken.master,
          support: decodedToken.support,
          firma: decodedToken.firma,
          kunde: decodedToken.kunde,
        },
        userDocument: {
          exists: userDocSnap.exists(),
          data: userDocSnap.exists() ? userDocSnap.data() : null,
        },
        companyDocument: {
          exists: companyDocSnap.exists(),
          data: companyDocSnap.exists() ? companyDocSnap.data() : null,
        },
        firebaseConfig: {
          projectId: process.env.FIREBASE_PROJECT_ID || 'NOT_SET',
          hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Auth debug error:', error);

    return NextResponse.json(
      {
        error: 'Authentication debug failed',
        details: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Test endpoint to check basic Firestore permissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        {
          error: 'UID required',
          help: 'Please provide { "uid": "user-id" } in request body',
        },
        { status: 400 }
      );
    }

    // Test reading user document
    const userDocRef = doc(db, 'users', uid);
    let userResult: { success: boolean; error: string; data: any } = {
      success: false,
      error: '',
      data: null,
    };

    try {
      const userDocSnap = await getDoc(userDocRef);
      userResult = {
        success: true,
        error: '',
        data: userDocSnap.exists() ? userDocSnap.data() : null,
      };
    } catch (error: any) {
      userResult = {
        success: false,
        error: error.message,
        data: null,
      };
    }

    // Test reading company document
    const companyDocRef = doc(db, 'companies', uid);
    let companyResult: { success: boolean; error: string; data: any } = {
      success: false,
      error: '',
      data: null,
    };

    try {
      const companyDocSnap = await getDoc(companyDocRef);
      companyResult = {
        success: true,
        error: '',
        data: companyDocSnap.exists() ? companyDocSnap.data() : null,
      };
    } catch (error: any) {
      companyResult = {
        success: false,
        error: error.message,
        data: null,
      };
    }

    return NextResponse.json({
      success: true,
      uid: uid,
      tests: {
        userDocument: userResult,
        companyDocument: companyResult,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Firestore test error:', error);

    return NextResponse.json(
      {
        error: 'Firestore test failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
