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
    
    if (!isLocalDevelopment) {
      // Verify authentication in production
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const idToken = authHeader.substring(7);
      try {
        await auth.verifyIdToken(idToken);
      } catch (authError) {
        console.error('Token verification failed:', authError);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // Get the order from Firestore
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();
    
    // Get provider details
    let provider = {
      id: orderData?.selectedAnbieterId || '',
      name: orderData?.providerName || 'Unbekannter Anbieter',
      avatarUrl: null
    };

    // Get customer details
    let customer = {
      id: orderData?.kundeId || '',
      name: `${orderData?.customerFirstName || ''} ${orderData?.customerLastName || ''}`.trim() || 'Unbekannter Kunde',
      avatarUrl: null
    };

    // Try to get additional details from users collections if needed
    try {
      if (orderData?.selectedAnbieterId) {
        const providerDoc = await db.collection('users').doc(orderData.selectedAnbieterId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();
          provider.name = providerData?.displayName || providerData?.name || provider.name;
          provider.avatarUrl = providerData?.photoURL || providerData?.avatarUrl || null;
        }
      }

      if (orderData?.kundeId) {
        const customerDoc = await db.collection('users').doc(orderData.kundeId).get();
        if (customerDoc.exists) {
          const customerData = customerDoc.data();
          customer.name = customerData?.displayName || customerData?.name || customer.name;
          customer.avatarUrl = customerData?.photoURL || customerData?.avatarUrl || null;
        }
      }
    } catch (error) {
      console.log('Could not fetch additional user details:', error);
      // Continue with basic info from order
    }

    return NextResponse.json({ 
      success: true, 
      provider,
      customer
    });

  } catch (error) {
    console.error('Error fetching order participant details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
