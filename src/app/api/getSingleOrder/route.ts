import { NextRequest, NextResponse } from 'next/server';

// Robust Firebase initialization function
async function getFirebaseServices() {
  try {
    console.log('Initializing Firebase for getSingleOrder API - NO JSON FILES...');

    // DIRECT Firebase initialization without JSON imports
    const firebaseAdmin = await import('firebase-admin');

    // Check if app is already initialized
    let app;
    try {
      app = firebaseAdmin.app();
      console.log('Using existing Firebase app');
    } catch (appError) {
      console.log('Initializing new Firebase app for getSingleOrder...');

      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL
      ) {
        app = firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
        console.log('Initialized with service account credentials');
      } else if (process.env.FIREBASE_PROJECT_ID) {
        app = firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
        console.log('Initialized with application default credentials');
      } else {
        throw new Error('No Firebase configuration available');
      }
    }

    const auth = firebaseAdmin.auth();
    const db = firebaseAdmin.firestore();
    console.log('Firebase services initialized successfully for getSingleOrder API');
    return { auth, db };
  } catch (error: any) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Use robust Firebase initialization
    const { auth, db } = await getFirebaseServices();

    // Check if Firebase is properly initialized
    if (!auth || !db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    // Verify authentication - required for all environments
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    let userId: string;

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (authError) {
      console.error('Token verification failed:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the order from Firestore
    const orderDoc = await db.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();

    // Check if user has permission to view this order (support multiple field names)
    const isCustomer = orderData?.kundeId === userId || orderData?.customerFirebaseUid === userId;
    const isProvider =
      orderData?.selectedAnbieterId === userId || orderData?.providerFirebaseUid === userId;

    if (!isCustomer && !isProvider) {
      console.log('Access denied - user not authorized for this order');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Return the order data
    return NextResponse.json({
      success: true,
      order: {
        id: orderDoc.id,
        ...orderData,
      },
    });
  } catch (error: any) {
    console.error('getSingleOrder API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
