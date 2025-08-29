import { NextRequest, NextResponse } from 'next/server';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(): Promise<any> {
  try {
    // Dynamically import Firebase services
    const firebaseModule = await import('@/firebase/server');

    // Check if we have valid db service
    if (!firebaseModule.db) {
      console.error('Firebase database not initialized properly');
      // Try to get from admin if needed
      const { admin } = firebaseModule;
      if (admin && admin.apps.length > 0) {
        const { getFirestore } = await import('firebase-admin/firestore');
        return getFirestore();
      }
      throw new Error('Firebase database unavailable');
    }

    return firebaseModule.db;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw new Error('Firebase database unavailable');
  }
}

/**
 * API Route für Company-Daten
 * GET /api/companies/[uid]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Lade Company-Daten aus Firestore
    const companyDoc = await db.collection('companies').doc(uid).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    return NextResponse.json({
      success: true,
      company: companyData,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Company-Daten:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Laden der Company-Daten' },
      { status: 500 }
    );
  }
}
