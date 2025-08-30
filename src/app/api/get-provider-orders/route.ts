import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Direct Firebase initialization using environment variables (like getSingleOrder API)
async function initializeFirebase() {
  console.log('Initializing Firebase for get-provider-orders API - NO JSON FILES...');

  // If already initialized, return existing instances
  if (admin.apps.length > 0) {
    console.log('Using existing Firebase app');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');
    return {
      auth: getAuth(),
      db: getFirestore(),
    };
  }

  // Initialize with individual environment variables
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error('Missing Firebase configuration environment variables');
  }

  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey: privateKey.replace(/\\n/g, '\n'),
      clientEmail,
    }),
    projectId,
    storageBucket: 'tilvo-f142f.firebasestorage.app',
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });

  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');

  console.log('Firebase services initialized successfully for get-provider-orders API');

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

export async function GET(request: NextRequest) {
  try {
    // Initialize Firebase services dynamically
    const { auth, db } = await initializeFirebase();

    // CORS Headers setzen
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers });
    }

    // Verify token
    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403, headers });
    }

    // Get providerId from query params
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId parameter' }, { status: 400, headers });
    }

    // Authorization check - user can only access their own orders
    if (decodedToken.uid !== providerId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403, headers });
    }

    // DIRECT FIRESTORE ACCESS - Bypass Firebase Functions billing issue
    try {
      // Fetch orders directly from Firestore
      const ordersSnapshot = await db
        .collection('auftraege')
        .where('selectedAnbieterId', '==', providerId)
        .orderBy('createdAt', 'desc')
        .get();

      if (ordersSnapshot.empty) {
        return NextResponse.json({ orders: [] }, { headers });
      }

      // Process orders and fetch customer details
      const orders = await Promise.all(
        ordersSnapshot.docs.map(async doc => {
          const orderData = doc.data();

          // Fetch customer details - check multiple possible fields
          let customerName = 'Unbekannter Kunde';
          let customerAvatarUrl = null;

          // Try multiple fields for customer ID
          const customerId =
            orderData.customerFirebaseUid || orderData.orderedBy || orderData.customerUid;

          if (customerId) {
            try {
              // First try users collection
              const customerDoc = await db.collection('users').doc(customerId).get();
              if (customerDoc.exists) {
                const customerData = customerDoc.data();
                const firstName = customerData?.firstName || '';
                const lastName = customerData?.lastName || '';
                customerName =
                  `${firstName} ${lastName}`.trim() ||
                  customerData?.displayName ||
                  'Unbekannter Kunde';
                customerAvatarUrl =
                  customerData?.profilePictureURL || customerData?.profilePictureFirebaseUrl;
              } else {
                // Fallback: try companies collection for B2B orders
                const companyDoc = await db.collection('companies').doc(customerId).get();
                if (companyDoc.exists) {
                  const companyData = companyDoc.data();
                  customerName =
                    companyData?.companyName || companyData?.name || 'Unbekannte Firma';
                  customerAvatarUrl = companyData?.logoUrl || companyData?.profilePictureURL;
                }
              }
            } catch (customerError) {
              console.error('Error fetching customer data:', customerError);
            }
          }

          return {
            id: doc.id,
            ...orderData,
            customerName,
            customerAvatarUrl,
            // Ensure orderDate is properly mapped
            orderDate: orderData.orderDate || orderData.createdAt || orderData.paidAt,
            // Convert Firestore timestamps to ISO strings for JSON serialization
            createdAt: orderData.createdAt?.toDate?.()?.toISOString() || orderData.createdAt,
            updatedAt: orderData.updatedAt?.toDate?.()?.toISOString() || orderData.updatedAt,
            paidAt: orderData.paidAt?.toDate?.()?.toISOString() || orderData.paidAt,
            clearingPeriodEndsAt:
              orderData.clearingPeriodEndsAt?.toDate?.()?.toISOString() ||
              orderData.clearingPeriodEndsAt,
            buyerApprovedAt:
              orderData.buyerApprovedAt?.toDate?.()?.toISOString() || orderData.buyerApprovedAt,
          };
        })
      );

      return NextResponse.json(
        {
          orders,
          success: true,
          source: 'next-api-direct-firestore',
        },
        { headers }
      );
    } catch (firestoreError) {
      // Fallback: Try Firebase Function (if billing gets activated)

      const functionUrl = `https://europe-west1-tilvo-f142f.cloudfunctions.net/getProviderOrders?providerId=${providerId}`;

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
          Origin: 'https://taskilo.de',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firebase Function error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return NextResponse.json(
        {
          ...data,
          source: 'firebase-function-fallback',
        },
        { headers }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(_request: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new NextResponse(null, { status: 200, headers });
}
