import { NextRequest, NextResponse } from 'next/server';

// Dynamic Firebase imports to prevent build-time issues
let db: any;

async function getFirebaseServices() {
  if (!db) {
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
      return { db };
    } catch (error: any) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }
  return { db };
}

/**
 * API Route zum Abrufen der Angebotsanfragen für einen Anbieter
 * GET /api/quote-requests/[providerId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;

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
    const quoteRequestsSnapshot = await adminDb
      .collection('quotes')
      .where('providerId', '==', providerId)
      .get();

    const quoteRequests = quoteRequestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      quoteRequests,
      count: quoteRequests.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Angebotsanfragen' },
      { status: 500 }
    );
  }
}
