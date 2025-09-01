import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '../../../firebase/server';

export async function POST(request: NextRequest) {
  let orderId: string = '';
  let userId: string = '';

  try {
    const requestBody = await request.json();
    orderId = requestBody.orderId;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Check if Firebase is properly initialized
    if (!auth || !db) {
      console.error('Firebase services not available:', { auth: !!auth, db: !!db });
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    // Verify authentication - required for all environments
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (authError) {
      console.error('Token verification failed:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the order from Firestore
    console.log(`Fetching order: ${orderId} for user: ${userId}`);

    const orderDoc = await db.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      console.log(`Order not found: ${orderId}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();
    console.log(`Order data retrieved for: ${orderId}`, {
      hasCustomerId: !!orderData?.kundeId || !!orderData?.customerFirebaseUid,
      hasProviderId: !!orderData?.selectedAnbieterId || !!orderData?.providerFirebaseUid,
    });

    // Check if user has permission to view this order (support multiple field names)
    const isCustomer = orderData?.kundeId === userId || orderData?.customerFirebaseUid === userId;
    const isProvider =
      orderData?.selectedAnbieterId === userId || orderData?.providerFirebaseUid === userId;

    if (!isCustomer && !isProvider) {
      console.log('Access denied - user not authorized for this order');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Return the order data
    return NextResponse.json({
      success: true,
      order: {
        id: orderDoc.id,
        ...orderData,
      },
    });
  } catch (error: any) {
    console.error('getSingleOrder API error:', {
      error: error.message,
      stack: error.stack,
      orderId: orderId || 'unknown',
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
    });

    // More specific error handling
    if (error.message?.includes('permission') || error.message?.includes('Access denied')) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Zugriff auf diese Bestellung' },
        { status: 403 }
      );
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    if (error.message?.includes('Invalid token') || error.message?.includes('auth')) {
      return NextResponse.json({ error: 'Authentifizierung fehlgeschlagen' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
