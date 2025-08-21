import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET USER INFO: Direkte Abfrage der users Collection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUserId } = body;

    if (!firebaseUserId) {
      return NextResponse.json(
        { error: 'firebaseUserId ist erforderlich.' },
        { status: 400 }
      );
    }

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
      const companiesQuery = await db.collection('companies')
        .where('ownerUserId', '==', firebaseUserId)
        .limit(1)
        .get();
      
      if (!companiesQuery.empty) {
        const companyDoc = companiesQuery.docs[0];
        companyData = {
          id: companyDoc.id,
          ...companyDoc.data()
        };
      }
    } catch (error) {
      console.log('Error getting company data:', error);
    }

    // Auch stripe_accounts collection checken
    let stripeAccountData: any = null;
    try {
      const stripeAccountDoc = await db.collection('stripe_accounts').doc(firebaseUserId).get();
      if (stripeAccountDoc.exists) {
        stripeAccountData = stripeAccountDoc.data();
      }
    } catch (error) {
      console.log('Error getting stripe account data:', error);
    }

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
      }
    };

    console.log('User Info Response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Get User Info Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der User-Informationen.' },
      { status: 500 }
    );
  }
}
