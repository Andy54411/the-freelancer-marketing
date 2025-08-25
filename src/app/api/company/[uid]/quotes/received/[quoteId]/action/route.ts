import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
import { QuoteNotificationService } from '@/lib/quote-notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  const { uid, quoteId } = await params;

  try {
    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await admin.auth().verifyIdToken(token);

    } catch (error) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {

      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (!action || !['accept', 'decline'].includes(action)) {

      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

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

      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // CHECK: If quote is already accepted and action is accept, verify payment status
    if (action === 'accept' && quoteData.status === 'accepted') {

      const paymentStatus = quoteData.payment?.provisionStatus;

      if (paymentStatus === 'pending') {

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

        return NextResponse.json(
          {
            error: 'Payment verification failed',
            message: 'Zahlungsstatus konnte nicht verifiziert werden',
          },
          { status: 400 }
        );
      }

    }

    // Get user data for contact exchange
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {

      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    // Get provider and customer names for notifications
    const customerName =
      userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.name || quoteData.customerName || 'Kunde';

    let providerName = 'Anbieter';
    const providerId = quoteData.providerId || quoteData.providerUid;
    if (providerId) {
      try {
        const providerDoc = await db.collection('users').doc(providerId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();
          providerName = providerData?.companyName || 'Anbieter';
        }
      } catch (error) {

      }
    }

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

    // Bell-Notification an Provider senden (Kunde hat entschieden)
    if (providerId) {
      try {
        await QuoteNotificationService.createQuoteStatusNotification(
          quoteId,
          providerId,
          action as 'accepted' | 'declined',
          {
            customerName: customerName,
            providerName: providerName,
            subcategory: quoteData.projectSubcategory || quoteData.projectTitle || 'Service',
            estimatedPrice: quoteData.response?.estimatedPrice,
            isCustomerAction: true, // Flag to indicate this was a customer action
          }
        );

      } catch (notificationError) {

        // Notification-Fehler sollten die Aktion nicht blockieren
      }
    }

    // If accepted, set up provision payment requirement (DO NOT exchange contacts yet)
    if (action === 'accept') {

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

      // Bell-Notification für Zahlungsanforderung
      try {
        await QuoteNotificationService.createPaymentRequiredNotification(
          quoteId,
          uid, // Customer UID
          {
            providerName: providerName,
            subcategory: quoteData.projectSubcategory || quoteData.projectTitle || 'Service',
            provisionAmount: provisionAmount,
          }
        );

      } catch (notificationError) {

      }
    }

    // If quote was already accepted and payment is verified, allow contact exchange
    if (
      action === 'accept' &&
      quoteData.status === 'accepted' &&
      quoteData.payment?.provisionStatus === 'paid'
    ) {

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

        }
      }
    }

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

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
