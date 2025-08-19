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

    // Get the quote document
    const quoteDoc = await db.collection('quotes').doc(quoteId).get();
    if (!quoteDoc.exists) {
      console.log('[Quote Action API] Quote not found:', quoteId);
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();
    console.log('[Quote Action API] Quote found:', {
      customerEmail: quoteData.customerEmail,
      providerId: quoteData.providerId,
      projectTitle: quoteData.projectTitle,
      status: quoteData.status,
    });

    // Verify this company is the customer for this quote
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      console.log('[Quote Action API] User not found:', uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (userData.email !== quoteData.customerEmail) {
      console.log('[Quote Action API] User not authorized for this quote');
      return NextResponse.json({ error: 'Not authorized for this quote' }, { status: 403 });
    }

    // Update the quote status
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const updateData = {
      status: newStatus,
      customerDecision: {
        action: newStatus,
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        decidedBy: uid,
      },
    };

    await db.collection('quotes').doc(quoteId).update(updateData);

    console.log('[Quote Action API] Quote status updated to:', newStatus);

    // TODO: Send notification to provider about the decision
    // TODO: If accepted, create order/contract entry
    // TODO: Send confirmation email to both parties

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
