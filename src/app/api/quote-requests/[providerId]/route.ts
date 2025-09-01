import { NextRequest, NextResponse } from 'next/server';

// Dynamic Firebase imports to prevent build-time issues
let db: any;
let initializationPromise: Promise<any> | null = null;

async function getFirebaseServices() {
  if (initializationPromise) {
    return await initializationPromise;
  }

  if (!db) {
    initializationPromise = initializeFirebase();
    return await initializationPromise;
  }

  return { db };
}

async function initializeFirebase() {
  try {
    console.log('Initializing Firebase for Quote Requests API - NO JSON FILES...');

    // DIRECT Firebase initialization without JSON imports
    const firebaseAdmin = await import('firebase-admin');

    // Check if app is already initialized
    let app;
    try {
      app = firebaseAdmin.app();
      console.log('Using existing Firebase app');
    } catch (appError) {
      console.log('Initializing new Firebase app for Quote Requests...');

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

    db = firebaseAdmin.firestore();
    console.log('Firebase Firestore initialized successfully for Quote Requests API');
    initializationPromise = null; // Reset promise after successful initialization
    return { db };
  } catch (error: any) {
    console.error('Firebase initialization failed:', error);
    initializationPromise = null; // Reset promise on error
    throw error;
  }
}

/**
 * API Route zum Abrufen der Angebotsanfragen für einen Anbieter
 * GET /api/quote-requests/[providerId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  let providerId: string = '';

  try {
    const resolvedParams = await params;
    providerId = resolvedParams.providerId;

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID ist erforderlich' }, { status: 400 });
    }

    // Use improved Firebase initialization
    const { db: adminDb } = await getFirebaseServices();

    // Check if Firebase is properly initialized
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    // Abrufen aller Angebotsanfragen für diesen Anbieter
    console.log(`Fetching quote requests for provider: ${providerId}`);

    const quoteRequestsSnapshot = await adminDb
      .collection('quotes')
      .where('providerId', '==', providerId)
      .get();

    console.log(
      `Found ${quoteRequestsSnapshot.docs.length} quote requests for provider ${providerId}`
    );

    const quoteRequests = quoteRequestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      quoteRequests,
      count: quoteRequests.length,
    });
  } catch (error: any) {
    console.error('Quote Requests API error:', {
      error: error.message,
      stack: error.stack,
      providerId: providerId || 'unknown',
      timestamp: new Date().toISOString(),
    });

    // More specific error handling
    if (error.message?.includes('permission')) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Zugriff auf diese Daten' },
        { status: 403 }
      );
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Angebotsanfragen nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Angebotsanfragen',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
