import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  const { uid, quoteId } = await params;
  console.log('[Quote Action API] Processing action for company:', uid, 'quote:', quoteId);

  try {
    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Quote Action API] No auth header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('[Quote Action API] Token verified for user:', decodedToken.uid);
    } catch (error) {
      console.error('[Quote Action API] Error verifying token:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      console.log('[Quote Action API] User not authorized for this company');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (!action || !['accept', 'decline'].includes(action)) {
      console.log('[Quote Action API] Invalid action:', action);
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    console.log('[Quote Action API] Processing action:', action, 'for quote:', quoteId);

    // Get the quote document - first try quotes collection, then requests collection
    let quoteDoc = await db.collection('quotes').doc(quoteId).get();
    let quoteData: any = null;
    let collectionName = 'quotes';

    if (quoteDoc.exists) {
      quoteData = quoteDoc.data();
    } else {
      // Try requests collection as fallback
      quoteDoc = await db.collection('requests').doc(quoteId).get();
      if (quoteDoc.exists) {
        quoteData = quoteDoc.data();
        collectionName = 'requests';
      }
    }

    if (!quoteData) {
      console.log('[Quote Action API] Quote not found in either collection');
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    console.log('[Quote Action API] Found quote in collection:', collectionName);
    console.log('[Quote Action API] Quote data:', {
      customerEmail: quoteData.customerEmail,
      providerId: quoteData.providerId || quoteData.providerUid,
      projectTitle: quoteData.projectTitle || quoteData.title,
      status: quoteData.status,
      paymentStatus: quoteData.payment?.provisionStatus || 'none',
    });

    // CHECK: If quote is already accepted and action is accept, verify payment status
    if (action === 'accept' && quoteData.status === 'accepted') {
      console.log('[Quote Action API] Quote already accepted - checking payment status');

      const paymentStatus = quoteData.payment?.provisionStatus;

      if (paymentStatus === 'pending') {
        console.log('[Quote Action API] Provision payment still pending');
        return NextResponse.json(
          {
            error: 'Provision payment required',
            message: 'Die 5% Provision muss vor dem Kontaktaustausch bezahlt werden',
            paymentRequired: true,
            provisionAmount: quoteData.payment?.provisionAmount || 0,
          },
          { status: 402 }
        ); // Payment Required
      }

      if (paymentStatus !== 'paid') {
        console.log('[Quote Action API] Invalid payment status:', paymentStatus);
        return NextResponse.json(
          {
            error: 'Payment verification failed',
            message: 'Zahlungsstatus konnte nicht verifiziert werden',
          },
          { status: 400 }
        );
      }

      console.log('[Quote Action API] Provision payment verified - allowing contact exchange');
    }

    // Get user data for contact exchange
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      console.log('[Quote Action API] User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    console.log('[Quote Action API] User data found for UID:', uid);

    // Update quote status
    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const updateData = {
      status: newStatus,
      customerDecision: {
        action: action,
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        decidedBy: uid,
      },
    };

    await db.collection(collectionName).doc(quoteId).update(updateData);

    console.log(
      '[Quote Action API] Quote status updated to:',
      newStatus,
      'in collection:',
      collectionName
    );

    // If accepted, set up provision payment requirement (DO NOT exchange contacts yet)
    if (action === 'accept') {
      console.log('[Quote Action API] Quote accepted - setting up provision payment requirement');

      const totalAmount = quoteData.response?.totalAmount || 0;
      const provisionAmount = totalAmount * 0.05; // 5% provision

      await db
        .collection(collectionName)
        .doc(quoteId)
        .update({
          payment: {
            provisionStatus: 'pending',
            provisionAmount: provisionAmount,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });

      console.log('[Quote Action API] Provision payment requirement set:', provisionAmount, '€');
      console.log(
        '[Quote Action API] Contact exchange will happen AFTER successful provision payment via payment endpoint'
      );
    }

    // If quote was already accepted and payment is verified, allow contact exchange
    if (
      action === 'accept' &&
      quoteData.status === 'accepted' &&
      quoteData.payment?.provisionStatus === 'paid'
    ) {
      console.log('[Quote Action API] Payment verified - exchanging contact information');

      // Exchange contact information between customer and provider
      const providerId = quoteData.providerId || quoteData.providerUid;

      if (providerId) {
        // Get provider data
        const providerDoc = await db.collection('users').doc(providerId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();

          // Update quote with contact exchange
          await db
            .collection(collectionName)
            .doc(quoteId)
            .update({
              contactExchange: {
                exchangedAt: admin.firestore.FieldValue.serverTimestamp(),
                customerContact: {
                  name:
                    userData?.firstName && userData?.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : userData?.name || 'Kunde',
                  email: userData?.email || quoteData.customerEmail,
                  phone: userData?.phone,
                },
                providerContact: {
                  name:
                    providerData?.firstName && providerData?.lastName
                      ? `${providerData.firstName} ${providerData.lastName}`
                      : providerData?.name || 'Anbieter',
                  email: providerData?.email,
                  phone: providerData?.phone,
                },
              },
              status: 'contacts_exchanged',
            });

          console.log('[Quote Action API] Contact information exchanged successfully');
        }
      }
    }

    console.log('[Quote Action API] Quote action processed successfully');

    // Determine response based on payment status and action
    let responseData: any = {
      quoteId,
      action,
      status: newStatus,
    };

    if (action === 'accept') {
      const paymentStatus = quoteData.payment?.provisionStatus;

      if (paymentStatus === 'paid') {
        // Payment already completed - contacts exchanged
        responseData = {
          ...responseData,
          contactsExchanged: true,
          message: 'Angebot angenommen und Kontakte ausgetauscht',
        };
      } else {
        // Payment required before contact exchange
        responseData = {
          ...responseData,
          payment: {
            provisionRequired: true,
            provisionAmount: (quoteData.response?.totalAmount || 0) * 0.05,
            status: 'pending',
          },
          message: 'Angebot angenommen - 5% Provision muss vor Kontaktaustausch bezahlt werden',
        };
      }
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'accept'
          ? quoteData.payment?.provisionStatus === 'paid'
            ? 'Quote accepted and contacts exchanged successfully'
            : 'Quote accepted - provision payment required before contact exchange'
          : `Quote ${action}ed successfully`,
      data: responseData,
    });
  } catch (error) {
    console.error('[Quote Action API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
