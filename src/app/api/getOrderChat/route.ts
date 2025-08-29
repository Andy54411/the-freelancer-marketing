import { NextRequest, NextResponse } from 'next/server';

// Robust Firebase initialization function
async function getFirebaseServices() {
  try {
    console.log('Initializing Firebase for getOrderChat API - NO JSON FILES...');

    // DIRECT Firebase initialization without JSON imports
    const firebaseAdmin = await import('firebase-admin');

    // Check if app is already initialized
    let app;
    try {
      app = firebaseAdmin.app();
      console.log('Using existing Firebase app');
    } catch (appError) {
      console.log('Initializing new Firebase app for getOrderChat...');

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
    console.log('Firebase services initialized successfully for getOrderChat API');
    return { auth, db };
  } catch (error: any) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use robust Firebase initialization
    const { auth, db } = await getFirebaseServices();

    // Check if Firebase is properly initialized
    if (!auth || !db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // First check if user has access to this order
    const orderDoc = await db.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();

    // Check if user has permission to view this order's chat
    // Support both legacy field names and new field names
    const isCustomer = orderData?.kundeId === userId || orderData?.customerFirebaseUid === userId;
    const isProvider =
      orderData?.selectedAnbieterId === userId || orderData?.providerFirebaseUid === userId;

    if (!isCustomer && !isProvider) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get chat messages for this order
    const messagesSnapshot = await db
      .collection('auftraege')
      .doc(orderId)
      .collection('nachrichten')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamp to ISO string for JSON serialization
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp,
      };
    });

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error('getOrderChat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
