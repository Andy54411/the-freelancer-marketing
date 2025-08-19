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
    console.log('[Incoming Quotes API] Querying quotes for provider:', uid);

    // First, let's check what collections exist
    const allQuotesSnapshot = await db.collection('quotes').limit(5).get();
    console.log('[Incoming Quotes API] Total quotes in collection:', allQuotesSnapshot.size);

    if (allQuotesSnapshot.size > 0) {
      allQuotesSnapshot.docs.forEach((doc, index) => {
        console.log(`[Incoming Quotes API] Sample quote ${index + 1}:`, {
          id: doc.id,
          data: doc.data(),
        });
      });
    }

    // Query quotes collection for incoming quote requests using providerId (from database structure)
    const quotesSnapshot = await db
      .collection('quotes')
      .where('providerId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    console.log('[Incoming Quotes API] Found quotes with providerId:', quotesSnapshot.size);

    // Try alternative query patterns for quotes
    const altQuotes1 = await db.collection('quotes').where('providerUid', '==', uid).get();
    console.log('[Incoming Quotes API] Found quotes with providerUid:', altQuotes1.size);

    const altQuotes2 = await db.collection('quotes').where('companyId', '==', uid).get();
    console.log('[Incoming Quotes API] Found quotes with companyId:', altQuotes2.size);

    const altQuotes3 = await db.collection('quotes').where('serviceProviderId', '==', uid).get();
    console.log('[Incoming Quotes API] Found quotes with serviceProviderId:', altQuotes3.size);

    const quotes = [];

    for (const doc of quotesSnapshot.docs) {
      const quoteData = doc.data();
      console.log('[Incoming Quotes API] Processing quote:', doc.id, 'with data:', {
        customerEmail: quoteData.customerEmail,
        customerName: quoteData.customerName,
        projectTitle: quoteData.projectTitle,
        status: quoteData.status,
        projectDescription: quoteData.projectDescription,
        projectCategory: quoteData.projectCategory,
        projectSubcategory: quoteData.projectSubcategory,
        budgetRange: quoteData.budgetRange,
        providerId: quoteData.providerId,
      });

      // For quotes collection, customer info is stored directly in the quote
      let customerInfo = null;

      if (quoteData.customerEmail && quoteData.customerName) {
        // First check if this customer is also a company (user_type: "firma")
        let isCompanyCustomer = false;
        let companyName = null;

        // Search for user by email to check user_type
        const userQuery = await db
          .collection('users')
          .where('email', '==', quoteData.customerEmail)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          const userData = userQuery.docs[0].data();
          if (userData.user_type === 'firma') {
            isCompanyCustomer = true;
            companyName = userData.companyName || userData.onboarding?.companyName;
          }
        }

        customerInfo = {
          name: companyName || quoteData.customerName || 'Unbekannter Kunde',
          type: isCompanyCustomer ? 'company' : 'user',
          email: quoteData.customerEmail,
          phone: quoteData.customerPhone,
          avatar: null, // Not available in quote structure
          uid: userQuery.empty ? null : userQuery.docs[0].id,
        };
      }

      // Check if this quote has been responded to
      const hasResponse =
        quoteData.response &&
        typeof quoteData.response === 'object' &&
        (quoteData.response.message ||
          quoteData.response.items ||
          quoteData.response.estimatedDuration);

      // Determine the correct status based on response and customer decision
      let finalStatus = quoteData.status || 'pending';
      let customerDecision = null;

      // Check if customer has made a decision (accepted/declined)
      if (quoteData.customerDecision) {
        customerDecision = quoteData.customerDecision;
        finalStatus =
          quoteData.customerDecision.action || quoteData.customerDecision.status || finalStatus; // 'accepted' or 'declined'
      } else if (hasResponse && finalStatus === 'pending') {
        finalStatus = 'responded';
      }

      quotes.push({
        id: doc.id,
        // Spread quoteData but exclude status to avoid duplication
        ...Object.fromEntries(Object.entries(quoteData).filter(([key]) => key !== 'status')),
        customer: customerInfo,
        status: finalStatus,
        customerDecision: customerDecision,
        contactExchange: quoteData.contactExchange || null,
        createdAt: quoteData.createdAt?.toDate?.() || new Date(quoteData.createdAt),
        // Map quote fields to expected structure
        title: quoteData.projectTitle || quoteData.projectDescription || 'Anfrage',
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
        response: quoteData.response, // Contains the company's response if answered
        hasResponse: hasResponse, // Add explicit flag for frontend
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
