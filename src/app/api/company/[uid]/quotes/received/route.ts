import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;

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

    // Get company data to verify it exists and get email for customer lookup

    const companyDoc = await db.collection('users').doc(uid).get();
    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    // Also get user data to find email
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const customerEmail = userData?.email;

    if (!customerEmail) {
      return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
    }

    // Query for quotes where this company is the customer (received quotes)

    const quotesSnapshot = await db
      .collection('quotes')
      .where('customerEmail', '==', customerEmail)
      .orderBy('createdAt', 'desc')
      .get();

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
        const companyDoc = await db.collection('companies').doc(quoteData.providerId).get();
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
        response: quoteData.response, // Contains the provider's response
        hasResponse: !!quoteData.response,
        responseDate: quoteData.response?.respondedAt
          ? new Date(quoteData.response.respondedAt)
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
