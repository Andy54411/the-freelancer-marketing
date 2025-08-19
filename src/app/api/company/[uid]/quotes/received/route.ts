import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  console.log('[Received Quotes API] Starting request for company:', uid);

  try {
    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Received Quotes API] No auth header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('[Received Quotes API] Token verified for user:', decodedToken.uid);
    } catch (error) {
      console.error('[Received Quotes API] Error verifying token:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      console.log('[Received Quotes API] User not authorized for this company');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[Received Quotes API] Auth successful, now querying Firestore');

    // Get company data to verify it exists and get email for customer lookup
    console.log('[Received Quotes API] Getting company data for:', uid);
    const companyDoc = await db.collection('companies').doc(uid).get();
    if (!companyDoc.exists) {
      console.log('[Received Quotes API] Company not found:', uid);
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = companyDoc.data();
    console.log('[Received Quotes API] Company found:', companyData?.companyName);

    // Also get user data to find email
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      console.log('[Received Quotes API] User not found:', uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const customerEmail = userData?.email;
    console.log('[Received Quotes API] Customer email:', customerEmail);

    if (!customerEmail) {
      console.log('[Received Quotes API] No email found for user');
      return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
    }

    // Query for quotes where this company is the customer (received quotes)
    console.log('[Received Quotes API] Querying quotes where company is customer');

    const quotesSnapshot = await db
      .collection('quotes')
      .where('customerEmail', '==', customerEmail)
      .orderBy('createdAt', 'desc')
      .get();

    console.log('[Received Quotes API] Found quotes with customerEmail:', quotesSnapshot.size);

    const quotes = [];

    for (const doc of quotesSnapshot.docs) {
      const quoteData = doc.data();
      console.log('[Received Quotes API] Processing received quote:', doc.id, 'with data:', {
        providerId: quoteData.providerId,
        customerEmail: quoteData.customerEmail,
        projectTitle: quoteData.projectTitle,
        status: quoteData.status,
        response: quoteData.response ? 'Has response' : 'No response',
      });

      // Get provider information (who sent the quote)
      let providerInfo = null;

      if (quoteData.providerId) {
        console.log('[Received Quotes API] Getting provider data for:', quoteData.providerId);

        // First try to get user data
        const providerUserDoc = await db.collection('users').doc(quoteData.providerId).get();
        if (providerUserDoc.exists) {
          const providerUserData = providerUserDoc.data();
          if (providerUserData.user_type === 'firma') {
            // It's a company
            providerInfo = {
              name:
                providerUserData.companyName ||
                providerUserData.onboarding?.companyName ||
                'Unbekanntes Unternehmen',
              type: 'company',
              email: providerUserData.email,
              avatar: providerUserData.profilePictureURL || providerUserData.companyLogo,
              uid: quoteData.providerId,
            };
          } else {
            // It's an individual
            providerInfo = {
              name:
                `${providerUserData.firstName || ''} ${providerUserData.lastName || ''}`.trim() ||
                'Unbekannter Anbieter',
              type: 'user',
              email: providerUserData.email,
              avatar: providerUserData.photoURL || providerUserData.profilePictureURL,
              uid: quoteData.providerId,
            };
          }
        }
      }

      quotes.push({
        id: doc.id,
        ...quoteData,
        provider: providerInfo,
        createdAt: quoteData.createdAt?.toDate?.() || new Date(quoteData.createdAt),
        // Map quote fields to expected structure
        title: quoteData.projectTitle || quoteData.projectDescription || 'Angebot',
        description: quoteData.projectDescription,
        category: quoteData.projectCategory,
        subcategory: quoteData.projectSubcategory,
        budget: quoteData.budgetRange,
        location: quoteData.location,
        postalCode: quoteData.postalCode,
        urgency: quoteData.urgency,
        estimatedDuration: quoteData.estimatedDuration,
        preferredStartDate: quoteData.preferredStartDate,
        additionalNotes: quoteData.additionalNotes,
        response: quoteData.response, // Contains the provider's response
        hasResponse: !!quoteData.response,
        responseDate: quoteData.response?.respondedAt
          ? new Date(quoteData.response.respondedAt)
          : null,
      });
    }

    console.log('[Received Quotes API] Returning received quotes:', quotes.length);

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error) {
    console.error('[Received Quotes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
