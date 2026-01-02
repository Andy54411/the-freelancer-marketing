/**
 * API Route: Get Order Participant Details
 * Ersetzt die gelöschte Cloud Function getOrderParticipantDetails
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/firebase/server';

interface ParticipantDetails {
  name: string;
  avatarUrl: string | null;
  email?: string;
  phone?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!db || !auth) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Verify auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get order data
    const orderDoc = await db.collection('auftraege').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();
    if (!orderData) {
      return NextResponse.json({ error: 'Order data empty' }, { status: 404 });
    }

    const providerId = orderData.selectedAnbieterId;
    const customerId = orderData.customerFirebaseUid || orderData.kundeId;

    // Security check: User must be provider or customer or employee
    const isProvider = decodedToken.uid === providerId;
    const isCustomer = decodedToken.uid === customerId;
    const isEmployee = decodedToken.role === 'mitarbeiter' && 
      (decodedToken.companyId === providerId || decodedToken.companyId === customerId);

    if (!isProvider && !isCustomer && !isEmployee) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch provider details
    let providerDetails: ParticipantDetails = {
      name: 'Unbekannter Anbieter',
      avatarUrl: null,
    };

    if (providerId) {
      // Try companies collection first (for B2B)
      const companyDoc = await db.collection('companies').doc(providerId).get();
      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        providerDetails = {
          name: companyData?.companyName || companyData?.name || 'Unbekannte Firma',
          avatarUrl: companyData?.logoUrl || companyData?.profilePictureURL || null,
          email: companyData?.email,
          phone: companyData?.phone,
        };
      } else {
        // Fallback to users collection
        const userDoc = await db.collection('users').doc(providerId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const firstName = userData?.firstName || '';
          const lastName = userData?.lastName || '';
          providerDetails = {
            name: `${firstName} ${lastName}`.trim() || userData?.displayName || 'Unbekannter Anbieter',
            avatarUrl: userData?.profilePictureURL || userData?.profilePictureFirebaseUrl || null,
            email: userData?.email,
            phone: userData?.phone,
          };
        }
      }
    }

    // Fetch customer details
    let customerDetails: ParticipantDetails = {
      name: 'Unbekannter Kunde',
      avatarUrl: null,
    };

    if (customerId) {
      // Try users collection first
      const userDoc = await db.collection('users').doc(customerId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const firstName = userData?.firstName || '';
        const lastName = userData?.lastName || '';
        customerDetails = {
          name: `${firstName} ${lastName}`.trim() || userData?.displayName || 'Unbekannter Kunde',
          avatarUrl: userData?.profilePictureURL || userData?.profilePictureFirebaseUrl || null,
          email: userData?.email,
          phone: userData?.phone,
        };
      } else {
        // Fallback to companies collection (B2B customer)
        const companyDoc = await db.collection('companies').doc(customerId).get();
        if (companyDoc.exists) {
          const companyData = companyDoc.data();
          customerDetails = {
            name: companyData?.companyName || companyData?.name || 'Unbekannte Firma',
            avatarUrl: companyData?.logoUrl || companyData?.profilePictureURL || null,
            email: companyData?.email,
            phone: companyData?.phone,
          };
        }
      }
    }

    return NextResponse.json({
      provider: providerDetails,
      customer: customerDetails,
    });

  } catch (error) {
    console.error('[participants] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
