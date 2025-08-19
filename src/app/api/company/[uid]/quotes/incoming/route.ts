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
    const quotesSnapshot = await db
      .collection('quotes')
      .where('providerUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    console.log('[Incoming Quotes API] Found quotes:', quotesSnapshot.size);

    const quotes = [];

    for (const doc of quotesSnapshot.docs) {
      const quoteData = doc.data();
      console.log('[Incoming Quotes API] Processing quote:', doc.id, 'with data:', {
        customerUid: quoteData.customerUid,
        customerCompanyUid: quoteData.customerCompanyUid,
        title: quoteData.title,
        status: quoteData.status,
      });

      // Get customer information (can be user or company)
      let customerInfo = null;

      if (quoteData.customerCompanyUid) {
        // B2B request - get company data
        console.log(
          '[Incoming Quotes API] Getting B2B customer data for:',
          quoteData.customerCompanyUid
        );
        const customerCompanyDoc = await db
          .collection('companies')
          .doc(quoteData.customerCompanyUid)
          .get();

        if (customerCompanyDoc.exists) {
          const customerCompanyData = customerCompanyDoc.data();
          customerInfo = {
            name: customerCompanyData?.companyName || 'Unbekanntes Unternehmen',
            type: 'company',
            email: customerCompanyData?.email,
            avatar: customerCompanyData?.logoUrl,
            uid: quoteData.customerCompanyUid,
          };
        }
      } else if (quoteData.customerUid) {
        // B2C request - get user data
        console.log('[Incoming Quotes API] Getting B2C customer data for:', quoteData.customerUid);
        const customerDoc = await db.collection('users').doc(quoteData.customerUid).get();

        if (customerDoc.exists) {
          const customerData = customerDoc.data();
          customerInfo = {
            name:
              `${customerData?.firstName || ''} ${customerData?.lastName || ''}`.trim() ||
              'Unbekannter Kunde',
            type: 'user',
            email: customerData?.email,
            avatar: customerData?.photoURL,
            uid: quoteData.customerUid,
          };
        }
      }

      quotes.push({
        id: doc.id,
        ...quoteData,
        customer: customerInfo,
        createdAt: quoteData.createdAt?.toDate?.() || new Date(quoteData.createdAt),
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
