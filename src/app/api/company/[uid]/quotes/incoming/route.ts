import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  console.log('[Incoming Quotes API] Starting request for company:', uid);

  try {
    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Incoming Quotes API] No auth header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('[Incoming Quotes API] Token verified for user:', decodedToken.uid);
    } catch (error) {
      console.error('[Incoming Quotes API] Error verifying token:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      console.log('[Incoming Quotes API] User not authorized for this company');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[Incoming Quotes API] Auth successful, now querying Firestore');

    // Get company data to verify it exists and get additional info
    console.log('[Incoming Quotes API] Getting company data for:', uid);
    const companyDoc = await db.collection('companies').doc(uid).get();
    if (!companyDoc.exists) {
      console.log('[Incoming Quotes API] Company not found:', uid);
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = companyDoc.data();
    console.log('[Incoming Quotes API] Company found:', companyData?.companyName);

    // Query for incoming quote requests where this company is the provider
    console.log('[Incoming Quotes API] Querying requests for provider:', uid);

    // First, let's check what collections exist
    const allRequestsSnapshot = await db.collection('requests').limit(5).get();
    console.log('[Incoming Quotes API] Total requests in collection:', allRequestsSnapshot.size);

    if (allRequestsSnapshot.size > 0) {
      allRequestsSnapshot.docs.forEach((doc, index) => {
        console.log(`[Incoming Quotes API] Sample request ${index + 1}:`, {
          id: doc.id,
          data: doc.data(),
        });
      });
    }

    // Query requests collection for incoming quote requests
    const quotesSnapshot = await db
      .collection('requests')
      .where('providerUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    console.log('[Incoming Quotes API] Found requests with providerUid:', quotesSnapshot.size);

    // Try alternative query patterns for requests
    const altQuotes1 = await db.collection('requests').where('providerId', '==', uid).get();
    console.log('[Incoming Quotes API] Found requests with providerId:', altQuotes1.size);

    const altQuotes2 = await db.collection('requests').where('companyId', '==', uid).get();
    console.log('[Incoming Quotes API] Found requests with companyId:', altQuotes2.size);

    const altQuotes3 = await db.collection('requests').where('serviceProviderId', '==', uid).get();
    console.log('[Incoming Quotes API] Found requests with serviceProviderId:', altQuotes3.size);

    const quotes = [];

    for (const doc of quotesSnapshot.docs) {
      const requestData = doc.data();
      console.log('[Incoming Quotes API] Processing request:', doc.id, 'with data:', {
        customerUid: requestData.customerUid,
        userUid: requestData.userUid,
        customerId: requestData.customerId,
        title: requestData.title,
        status: requestData.status,
        description: requestData.description,
        category: requestData.category,
        subcategory: requestData.subcategory,
      });

      // Get customer information (can be user or company)
      let customerInfo = null;

      // Check different possible customer uid field names
      const customerUid = requestData.customerUid || requestData.userUid || requestData.customerId;

      if (customerUid) {
        console.log('[Incoming Quotes API] Getting customer data for:', customerUid);

        // First try to get user data
        const customerDoc = await db.collection('users').doc(customerUid).get();

        if (customerDoc.exists) {
          const customerData = customerDoc.data();
          customerInfo = {
            name:
              `${customerData?.firstName || ''} ${customerData?.lastName || ''}`.trim() ||
              customerData?.displayName ||
              'Unbekannter Kunde',
            type: 'user',
            email: customerData?.email,
            avatar: customerData?.photoURL,
            uid: customerUid,
          };
        } else {
          // If not found in users, try companies
          const companyDoc = await db.collection('companies').doc(customerUid).get();
          if (companyDoc.exists) {
            const companyData = companyDoc.data();
            customerInfo = {
              name: companyData?.companyName || 'Unbekanntes Unternehmen',
              type: 'company',
              email: companyData?.email,
              avatar: companyData?.logoUrl,
              uid: customerUid,
            };
          }
        }
      }

      quotes.push({
        id: doc.id,
        ...requestData,
        customer: customerInfo,
        createdAt: requestData.createdAt?.toDate?.() || new Date(requestData.createdAt),
        // Map request fields to quote fields for consistency
        title: requestData.title || requestData.description || 'Anfrage',
        status: requestData.status || 'pending',
      });
    }

    console.log('[Incoming Quotes API] Returning quotes:', quotes.length);

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error) {
    console.error('[Incoming Quotes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
