import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET PROVIDER INFO: Holt Provider-Informationen für Emergency-Transfer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, firebaseUserId } = body;

    if (!orderId && !firebaseUserId) {
      return NextResponse.json(
        { error: 'orderId oder firebaseUserId ist erforderlich.' },
        { status: 400 }
      );
    }

    let providerInfo: {
      providerId: string;
      stripeAccountId: any;
      companyName: any;
      ownerUserId: any;
      email: any;
    } | null = null;

    // Wenn orderId gegeben, hole Provider über Auftrag
    if (orderId) {
      const orderDoc = await db.collection('auftraege').doc(orderId).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        const providerId = orderData?.providerId;
        
        if (providerId) {
          const providerDoc = await db.collection('companies').doc(providerId).get();
          if (providerDoc.exists) {
            const providerData = providerDoc.data();
            providerInfo = {
              providerId,
              stripeAccountId: providerData?.stripeAccountId,
              companyName: providerData?.companyName || providerData?.name,
              ownerUserId: providerData?.ownerUserId,
              email: providerData?.email
            };
          }
        }
      }
    }

    // Wenn firebaseUserId gegeben, hole Provider direkt
    if (!providerInfo && firebaseUserId) {
      const companiesQuery = await db.collection('companies')
        .where('ownerUserId', '==', firebaseUserId)
        .limit(1)
        .get();
      
      if (!companiesQuery.empty) {
        const companyDoc = companiesQuery.docs[0];
        const companyData = companyDoc.data();
        
        providerInfo = {
          providerId: companyDoc.id,
          stripeAccountId: companyData?.stripeAccountId,
          companyName: companyData?.companyName || companyData?.name,
          ownerUserId: companyData?.ownerUserId,
          email: companyData?.email
        };
      }
    }

    if (!providerInfo) {
      return NextResponse.json(
        { error: 'Provider nicht gefunden.' },
        { status: 404 }
      );
    }

    console.log('Provider Info:', providerInfo);
    return NextResponse.json(providerInfo);

  } catch (error) {
    console.error('Get Provider Info Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Provider-Informationen.' },
      { status: 500 }
    );
  }
}
