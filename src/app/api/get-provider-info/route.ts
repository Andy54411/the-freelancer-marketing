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
      companyName: any;
      ownerUserId: any;
      email: any;
    } | null = null;

    // Wenn orderId gegeben, hole Provider über Auftrag
    if (orderId) {
      const orderDoc = await db!.collection('auftraege').doc(orderId).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        const providerId = orderData?.providerId;

        if (providerId) {
          const providerDoc = await db!.collection('users').doc(providerId).get();
          if (providerDoc.exists) {
            const providerData = providerDoc.data();
            providerInfo = {
              providerId,
              companyName: providerData?.companyName || providerData?.name,
              ownerUserId: providerData?.ownerUserId,
              email: providerData?.email,
            };
          }
        }
      }
    }

    // Wenn firebaseUserId gegeben, hole Provider aus companies collection oder users collection (legacy)
    if (!providerInfo && firebaseUserId) {
      // FIXED: Check companies collection first
      const companyDoc = await db!.collection('companies').doc(firebaseUserId).get();

      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        providerInfo = {
          providerId: companyDoc.id,
          companyName: companyData?.companyName || companyData?.name,
          ownerUserId: companyData?.owner_uid || companyData?.uid,
          email: companyData?.ownerEmail || companyData?.email,
        };
      } else {
        // Only companies collection is used - no legacy fallback needed
      }
    }

    if (!providerInfo) {
      return NextResponse.json({ error: 'Provider nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json(providerInfo);
  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Laden der Provider-Informationen.' },
      { status: 500 }
    );
  }
}
