import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // For local development, skip token verification
    const isLocalDevelopment = process.env.NODE_ENV === 'development';
    let userId = '8WACaOZv3EYwaxksJoYx7R8dgLK2'; // Default for local testing
    
    if (!isLocalDevelopment) {
      // Verify authentication in production
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const idToken = authHeader.substring(7);
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (authError) {
        console.error('Token verification failed:', authError);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // First check if user has access to this order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();
    
    // Check if user has permission to view this order's chat
    if (orderData?.kundeId !== userId && orderData?.selectedAnbieterId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get chat messages for this order
    const messagesSnapshot = await db
      .collection('auftraege')
      .doc(orderId)
      .collection('nachrichten')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ 
      success: true, 
      messages 
    });

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
