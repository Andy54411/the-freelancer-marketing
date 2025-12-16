import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
  companyId: string
) {
  const { uid } = await params;

  try {
    // Check if this is a request for a specific quote (has quoteId in URL)
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const receivedIndex = pathSegments.findIndex(segment => segment === 'received');

    // If there's a segment after 'received', this is for a specific quote - return 404 to let the specific route handle it
    if (receivedIndex !== -1 && pathSegments[receivedIndex + 1]) {
      return new NextResponse(null, { status: 404 });
    }

    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    // Inhaber ODER Mitarbeiter dieser Company dürfen zugreifen
    const isOwner = decodedToken.uid === uid;
    const isEmployee = decodedToken.role === 'mitarbeiter' && decodedToken.companyId === uid;
    
    if (!isOwner && !isEmployee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get company data to verify it exists and get email for customer lookup
    // For B2B quotes, check companies collection first, then users as fallback
    let customerEmail: string | undefined;

    // Try companies collection first (for B2B)
    const companyDoc = await db!.collection('companies').doc(uid).get();
    if (companyDoc.exists) {
      const companyData = companyDoc.data();
      customerEmail = companyData?.email || companyData?.ownerEmail;
    } else {
      // Fallback to users collection (for B2C)
      const userDoc = await db!.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        customerEmail = userData?.email;
      } else {
        return NextResponse.json({ error: 'Company not found in any collection' }, { status: 404 });
      }
    }

    if (!customerEmail) {
      return NextResponse.json({ error: 'No email found for company' }, { status: 400 });
    }

    // Query for quotes where this company is the customer (received quotes)
    // Use both customerEmail and customerUid for comprehensive search
    let quotesSnapshot;

    try {
      // First try to find by customerUid (more reliable)
      quotesSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('quotes')
        .where('customerUid', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();
    } catch (error) {
      // Fallback to customerEmail query
      quotesSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('quotes')
        .where('customerEmail', '==', customerEmail)
        .orderBy('createdAt', 'desc')
        .get();
    }

    // If no results with first query, try the other field
    if (quotesSnapshot.docs.length === 0) {
      try {
        const fallbackSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('quotes')
          .where('customerEmail', '==', customerEmail)
          .orderBy('createdAt', 'desc')
          .get();

        if (fallbackSnapshot.docs.length > 0) {
          quotesSnapshot = fallbackSnapshot;
        }
      } catch (error) {}
    }

    // Define quote type
    type QuoteWithProvider = {
      id: string;
      provider: {
        name: string;
        type: 'company' | 'user';
        email: string;
        avatar: string | null;
        uid: string;
      } | null;
      [key: string]: any; // Allow any additional properties from quoteData
    };

    const quotes: QuoteWithProvider[] = [];

    for (const doc of quotesSnapshot.docs) {
      const quoteData = doc.data();

      // Load proposals from subcollection if they exist
      let proposals: any[] = [];
      let hasProposals = false;

      try {
        // ALWAYS check subcollection for proposals, regardless of proposalsInSubcollection flag

        const proposalsSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('quotes')
          .doc(doc.id)
          .collection('proposals')
          .get();

        proposals = proposalsSnapshot.docs.map(proposalDoc => ({
          id: proposalDoc.id,
          ...proposalDoc.data(),
          createdAt:
            proposalDoc.data().createdAt?.toDate?.() || new Date(proposalDoc.data().createdAt),
        }));

        hasProposals = proposals.length > 0;

        // If no proposals in subcollection, check legacy response field as fallback
        if (!hasProposals) {
          hasProposals = !!quoteData.response;
        }
      } catch (error) {
        // Fallback to legacy response check
        hasProposals = !!quoteData.response;
      }

      // Get provider information (who sent the quote)
      let providerInfo: {
        name: string;
        type: 'company' | 'user';
        email: string;
        avatar: string | null;
        uid: string;
      } | null = null;

      if (quoteData.providerId) {
        // FIXED: First try companies collection, then users as fallback
        const companyDoc = await db!.collection('companies').doc(quoteData.providerId).get();
        if (companyDoc.exists) {
          const companyData = companyDoc.data();
          // It's a company from companies collection
          providerInfo = {
            name: companyData?.companyName || 'Unbekanntes Unternehmen',
            type: 'company',
            email: companyData?.ownerEmail || companyData?.email || '',
            avatar: companyData?.profilePictureURL || companyData?.companyLogo || null,
            uid: quoteData.providerId,
          };
        } else {
          // No company found - provider no longer exists
          providerInfo = {
            name: 'Unbekannter Anbieter',
            type: 'company',
            email: '',
            avatar: null,
            uid: quoteData.providerId,
          };
        }
      }

      quotes.push({
        id: doc.id,
        ...quoteData,
        provider: providerInfo,
        proposals: proposals,
        hasProposals: hasProposals,
        contactExchange: quoteData.contactExchange || null, // Explizit hinzufügen
        customerDecision: quoteData.customerDecision || null, // Explizit hinzufügen
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
        response: quoteData.response, // Contains the provider's response (legacy)
        hasResponse: !!quoteData.response || hasProposals, // Check both legacy and new format
        responseDate: quoteData.response?.respondedAt
          ? new Date(quoteData.response.respondedAt)
          : proposals.length > 0
            ? proposals[0].createdAt
            : null,
      });
    }

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
