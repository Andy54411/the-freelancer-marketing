import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/firebase/server';

// CORS Headers für Preflight
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS für CORS Preflight
export async function OPTIONS() {
  console.log('[getorderparticipantdetails] OPTIONS request received');
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET als Fallback falls POST nicht funktioniert
export async function GET(request: NextRequest) {
  console.log('[getorderparticipantdetails] GET request received - redirecting to POST logic');
  // Für GET: orderId aus URL-Parametern
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  
  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required as query param' }, { status: 400, headers: corsHeaders });
  }
  
  // Weiterleitung an die gleiche Logik
  return handleRequest(orderId, request);
}

export async function POST(request: NextRequest) {
  console.log('[getorderparticipantdetails] POST request received');
  console.log('[getorderparticipantdetails] Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const body = await request.json();
    console.log('[getorderparticipantdetails] Body:', body);
    const { orderId } = body;
    
    if (!orderId) {
      console.log('[getorderparticipantdetails] ERROR: No orderId in body');
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400, headers: corsHeaders });
    }
    
    return handleRequest(orderId, request);
  } catch (parseError) {
    console.log('[getorderparticipantdetails] ERROR parsing body:', parseError);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }
}

async function handleRequest(orderId: string, request: NextRequest) {
  console.log('[getorderparticipantdetails] handleRequest for orderId:', orderId);
  
  try {
    if (!db || !auth) {
      console.log('[getorderparticipantdetails] ERROR: db or auth not available');
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500, headers: corsHeaders }
      );
    }

    // For local development, skip token verification
    const isLocalDevelopment = process.env.NODE_ENV === 'development';
    console.log('[getorderparticipantdetails] isLocalDevelopment:', isLocalDevelopment);

    if (!isLocalDevelopment) {
      // Verify authentication in production
      const authHeader = request.headers.get('Authorization');
      console.log('[getorderparticipantdetails] authHeader:', authHeader ? 'Bearer ...' : 'MISSING');
      
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('[getorderparticipantdetails] ERROR: No Bearer token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }

      const idToken = authHeader.substring(7);
      try {
        await auth.verifyIdToken(idToken);
        console.log('[getorderparticipantdetails] Token verified successfully');
      } catch (authError) {
        console.log('[getorderparticipantdetails] ERROR: Token verification failed:', authError);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
      }
    }

    // Get the order from Firestore
    console.log('[getorderparticipantdetails] Fetching order:', orderId);
    const orderDoc = await db.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      console.log('[getorderparticipantdetails] ERROR: Order not found');
      return NextResponse.json({ error: 'Order not found' }, { status: 404, headers: corsHeaders });
    }
    
    console.log('[getorderparticipantdetails] Order found');
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
        const customerDoc = await db!.collection('users').doc(customerId).get();
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
      console.log('[getorderparticipantdetails] Error fetching user details:', error);
      // Continue with basic info from order
    }

    console.log('[getorderparticipantdetails] SUCCESS - returning provider:', provider.name, 'customer:', customer.name);
    return NextResponse.json({
      success: true,
      provider,
      customer,
    }, { headers: corsHeaders });
  } catch (error) {
    console.log('[getorderparticipantdetails] FATAL ERROR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
