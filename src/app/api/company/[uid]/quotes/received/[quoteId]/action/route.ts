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
    let quoteData = null;
    let collectionName = 'quotes';

    if (!quoteDoc.exists) {
      console.log('[Quote Action API] Quote not found in quotes collection, trying requests...');
      quoteDoc = await db.collection('requests').doc(quoteId).get();
      collectionName = 'requests';
    }

    if (!quoteDoc.exists) {
      console.log('[Quote Action API] Quote not found in either collection:', quoteId);
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    quoteData = quoteDoc.data();
    console.log('[Quote Action API] Quote found in', collectionName, ':', {
      customerEmail: quoteData.customerEmail,
      providerId: quoteData.providerId || quoteData.providerUid,
      projectTitle: quoteData.projectTitle || quoteData.title,
      status: quoteData.status,
    });

    // Verify this company is the customer for this quote
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      console.log('[Quote Action API] User not found:', uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const customerEmail = quoteData.customerEmail || quoteData.email;

    if (userData.email !== customerEmail) {
      console.log(
        '[Quote Action API] User email mismatch. User:',
        userData.email,
        'Quote:',
        customerEmail
      );
      return NextResponse.json({ error: 'Not authorized for this quote' }, { status: 403 });
    }

    // Update the quote status in the correct collection
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const updateData = {
      status: newStatus,
      customerDecision: {
        action: newStatus,
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

    // If accepted, exchange contact information between both parties
    if (action === 'accept') {
      console.log('[Quote Action API] Quote accepted - exchanging contact information');
      console.log('[Quote Action API] Original quote data:', JSON.stringify(quoteData, null, 2));

      try {
        // Get provider (service provider) information
        const providerId = quoteData.providerId || quoteData.providerUid;
        console.log('[Quote Action API] Provider ID:', providerId);

        if (providerId) {
          const providerDoc = await db.collection('users').doc(providerId).get();
          console.log('[Quote Action API] Provider doc exists:', providerDoc.exists);

          if (providerDoc.exists) {
            const providerData = providerDoc.data();
            console.log('[Quote Action API] Provider data:', JSON.stringify(providerData, null, 2));
            console.log(
              '[Quote Action API] Customer data (userData):',
              JSON.stringify(userData, null, 2)
            );

            // Customer contact info to share with provider
            const customerContactInfo = {
              name:
                userData.user_type === 'firma'
                  ? userData.companyName ||
                    userData.onboarding?.companyName ||
                    'Unbekanntes Unternehmen'
                  : `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
              email: userData.email,
              phone: userData.phone || userData.onboarding?.phone,
              address: userData.address || userData.onboarding?.address,
              postalCode:
                userData.postalCode ||
                userData.step1?.personalPostalCode ||
                userData.step2?.postalCode ||
                userData.companyPostalCodeForBackend,
              city:
                userData.city ||
                userData.step1?.personalCity ||
                userData.step2?.city ||
                userData.companyCityForBackend,
              country:
                userData.country ||
                userData.step1?.personalCountry ||
                userData.step2?.country ||
                userData.companyCountryForBackend ||
                'DE',
              type: userData.user_type === 'firma' ? 'company' : 'individual',
              uid: uid,
            };

            console.log(
              '[Quote Action API] Customer contact info:',
              JSON.stringify(customerContactInfo, null, 2)
            );

            // Provider contact info to share with customer
            const providerContactInfo = {
              name:
                providerData.user_type === 'firma'
                  ? providerData.companyName ||
                    providerData.onboarding?.companyName ||
                    'Unbekanntes Unternehmen'
                  : `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim(),
              email: providerData.email,
              phone: providerData.phone || providerData.onboarding?.phone,
              address: providerData.address || providerData.onboarding?.address,
              postalCode:
                providerData.postalCode ||
                providerData.step1?.personalPostalCode ||
                providerData.step2?.postalCode ||
                providerData.companyPostalCodeForBackend,
              city:
                providerData.city ||
                providerData.step1?.personalCity ||
                providerData.step2?.city ||
                providerData.companyCityForBackend,
              country:
                providerData.country ||
                providerData.step1?.personalCountry ||
                providerData.step2?.country ||
                providerData.companyCountryForBackend ||
                'DE',
              type: providerData.user_type === 'firma' ? 'company' : 'individual',
              uid: providerId,
            };

            console.log(
              '[Quote Action API] Provider contact info:',
              JSON.stringify(providerContactInfo, null, 2)
            );

            // Update quote with shared contact information
            const contactUpdateData = {
              contactExchange: {
                exchangedAt: admin.firestore.FieldValue.serverTimestamp(),
                customerData: customerContactInfo, // Geändert von customerContact zu customerData
                providerData: providerContactInfo, // Geändert von providerContact zu providerData
                status: 'exchanged',
              },
            };

            console.log(
              '[Quote Action API] Contact update data:',
              JSON.stringify(contactUpdateData, null, 2)
            );

            await db.collection(collectionName).doc(quoteId).update(contactUpdateData);

            console.log(
              '[Quote Action API] Contact data successfully exchanged and saved to database'
            );
            console.log('[Quote Action API] Contact information exchanged successfully');

            // Optional: Create notifications for both parties
            const notificationPromises = [];

            // Notification for provider
            notificationPromises.push(
              db.collection('notifications').add({
                userId: providerId,
                type: 'quote_accepted',
                title: 'Angebot angenommen!',
                message: `Ihr Angebot für "${quoteData.projectTitle || quoteData.title}" wurde angenommen. Kontaktdaten wurden freigegeben.`,
                quoteId: quoteId,
                customerContact: customerContactInfo,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              })
            );

            // Notification for customer
            notificationPromises.push(
              db.collection('notifications').add({
                userId: uid,
                type: 'contact_exchanged',
                title: 'Kontaktdaten erhalten',
                message: `Die Kontaktdaten für Ihr angenommenes Angebot "${quoteData.projectTitle || quoteData.title}" wurden freigegeben.`,
                quoteId: quoteId,
                providerContact: providerContactInfo,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              })
            );

            await Promise.all(notificationPromises);
            console.log('[Quote Action API] Notifications sent to both parties');
          }
        }
      } catch (contactError) {
        console.error('[Quote Action API] Error exchanging contact information:', contactError);
        // Don't fail the main operation if contact exchange fails
      }
    }

    // Send notification to provider about the decision (for both accept/decline)
    const providerId = quoteData.providerId || quoteData.providerUid;
    if (providerId) {
      try {
        await db.collection('notifications').add({
          userId: providerId,
          type: action === 'accept' ? 'quote_accepted' : 'quote_declined',
          title: action === 'accept' ? 'Angebot angenommen!' : 'Angebot abgelehnt',
          message: `Ihr Angebot für "${quoteData.projectTitle || quoteData.title}" wurde ${action === 'accept' ? 'angenommen' : 'abgelehnt'}.`,
          quoteId: quoteId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('[Quote Action API] Decision notification sent to provider');
      } catch (notificationError) {
        console.error('[Quote Action API] Error sending notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Quote ${newStatus} successfully`,
      quoteId,
      newStatus,
    });
  } catch (error) {
    console.error('[Quote Action API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
