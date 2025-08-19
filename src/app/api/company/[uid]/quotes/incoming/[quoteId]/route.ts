import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

export async function GET(
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
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the quote document
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    // Verify that this quote is for this company
    if (quoteData?.providerUid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get customer information
    let customerInfo = null;

    if (quoteData.customerCompanyUid) {
      // B2B request - get company data
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
      const customerDoc = await db.collection('users').doc(quoteData.customerUid).get();

      if (customerDoc.exists) {
        const customerData = customerDoc.data();
        customerInfo = {
          name:
            `${customerData?.firstName || ''} ${customerData?.lastName || ''}`.trim() ||
            'Unbekannter Kunde',
          type: 'user',
          email: customerData?.email,
          avatar: customerData?.avatar,
          uid: quoteData.customerUid,
        };
      }
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: quoteId,
        ...quoteData,
        customer: customerInfo,
        createdAt: quoteData.createdAt?.toDate?.() || new Date(quoteData.createdAt),
      },
    });
  } catch (error) {
    console.error('Error fetching quote details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, message } = body;

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the quote document
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    // Verify that this quote is for this company
    if (quoteData?.providerUid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the quote status
    await quoteRef.update({
      status: action === 'accept' ? 'accepted' : 'declined',
      providerResponse: message || '',
      respondedAt: new Date(),
      lastUpdated: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Quote ${action === 'accept' ? 'accepted' : 'declined'} successfully`,
    });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
