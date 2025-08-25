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

        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // Get the order from Firestore
    const orderDoc = await db.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();

    // Get provider details
    const provider = {
      id: orderData?.selectedAnbieterId || orderData?.providerFirebaseUid || '',
      name: orderData?.providerName || orderData?.companyName || 'Unbekannter Anbieter',
      avatarUrl: null,
    };

    // Get customer details
    const customer = {
      id: orderData?.kundeId || orderData?.customerFirebaseUid || '',
      name:
        orderData?.customerName ||
        `${orderData?.customerFirstName || ''} ${orderData?.customerLastName || ''}`.trim() ||
        'Unbekannter Kunde',
      avatarUrl: null,
    };

    // Try to get additional details from users collections if needed
    try {
      const providerId = orderData?.selectedAnbieterId || orderData?.providerFirebaseUid;
      if (providerId) {

        const providerDoc = await db.collection('users').doc(providerId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();

          // For providers, prioritize companyName for businesses, then displayName, then constructed name
          const providerName =
            providerData?.companyName ||
            providerData?.displayName ||
            providerData?.name ||
            (providerData?.firstName && providerData?.lastName
              ? `${providerData.firstName} ${providerData.lastName}`.trim()
              : '') ||
            provider.name;

          provider.name = providerName;
          provider.avatarUrl =
            providerData?.profilePictureURL ||
            providerData?.photoURL ||
            providerData?.avatarUrl ||
            null;
        } else {

        }
      } else {

      }

      const customerId = orderData?.kundeId || orderData?.customerFirebaseUid;
      if (customerId) {

        const customerDoc = await db.collection('users').doc(customerId).get();
        if (customerDoc.exists) {
          const customerData = customerDoc.data();

          // For customers, prioritize displayName, then constructed name from firstName/lastName
          const customerName =
            customerData?.displayName ||
            customerData?.name ||
            (customerData?.firstName && customerData?.lastName
              ? `${customerData.firstName} ${customerData.lastName}`.trim()
              : '') ||
            customer.name;

          customer.name = customerName;
          customer.avatarUrl =
            customerData?.profilePictureURL ||
            customerData?.photoURL ||
            customerData?.avatarUrl ||
            null;
        } else {

        }
      } else {

      }
    } catch (error) {

      // Continue with basic info from order
    }

    return NextResponse.json({
      success: true,
      provider,
      customer,
    });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
