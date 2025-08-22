import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Verify authentication - required for all environments
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    let userId: string;

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (authError) {
      console.error('Token verification failed:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the order from Firestore
    const orderDoc = await db.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();

    // Check if user has permission to view this order (support multiple field names)
    const isCustomer = orderData?.kundeId === userId || orderData?.customerFirebaseUid === userId;
    const isProvider =
      orderData?.selectedAnbieterId === userId || orderData?.providerFirebaseUid === userId;

    if (!isCustomer && !isProvider) {
      console.log(
        `Access denied for user ${userId}. Order customer: ${orderData?.kundeId || orderData?.customerFirebaseUid}, provider: ${orderData?.selectedAnbieterId || orderData?.providerFirebaseUid}`
      );
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
  } catch (error) {
    console.error('Error fetching single order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
