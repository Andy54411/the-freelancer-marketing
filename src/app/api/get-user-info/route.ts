import { NextRequest, NextResponse } from 'next/server';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(): Promise<any> {
  try {
    const firebaseModule = await import('@/firebase/server');

    if (!firebaseModule.db) {
      console.error('Firebase database not initialized properly');
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
 * GET USER INFO: Direkte Abfrage der users Collection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUserId } = body;

    if (!firebaseUserId) {
      return NextResponse.json({ error: 'firebaseUserId ist erforderlich.' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Direkte Abfrage der users Collection
    const userDoc = await db.collection('users').doc(firebaseUserId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User nicht gefunden in users collection.' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Auch companies collection checken
    let companyData: any = null;
    try {
      const companiesQuery = await db
        .collection('users')
        .where('ownerUserId', '==', firebaseUserId)
        .limit(1)
        .get();

      if (!companiesQuery.empty) {
        const companyDoc = companiesQuery.docs[0];
        companyData = {
          id: companyDoc.id,
          ...companyDoc.data(),
        };
      }
    } catch (error) {}

    // Auch stripe_accounts collection checken
    let stripeAccountData: any = null;
    try {
      const stripeAccountDoc = await db.collection('stripe_accounts').doc(firebaseUserId).get();
      if (stripeAccountDoc.exists) {
        stripeAccountData = stripeAccountDoc.data();
      }
    } catch (error) {}

    const response = {
      firebaseUserId,
      userData: userData,
      companyData: companyData,
      stripeAccountData: stripeAccountData,

      // Sammle alle möglichen Stripe Account IDs
      possibleStripeAccountIds: {
        fromUsers: userData?.stripeAccountId,
        fromCompany: companyData?.stripeAccountId,
        fromStripeAccounts: stripeAccountData?.stripeAccountId,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Laden der User-Informationen.' },
      { status: 500 }
    );
  }
}

/**
 * GET USER INFO: Query parameter support
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'uid parameter ist erforderlich.' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Use same logic as POST but with query parameter
    const userDoc = await db.collection('users').doc(uid).get();

    let userData: any = null;
    if (userDoc.exists) {
      userData = userDoc.data();
    }

    const response = {
      firebaseUserId: uid,
      userData: userData,
      exists: userDoc.exists,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Laden der User-Informationen.' },
      { status: 500 }
    );
  }
}
