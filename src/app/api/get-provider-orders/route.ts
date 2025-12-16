import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
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

    // Authorization check - user can only access their own orders OR employee of the company
    const isOwner = decodedToken.uid === providerId;
    const isEmployee = decodedToken.role === 'mitarbeiter' && decodedToken.companyId === providerId;
    
    if (!isOwner && !isEmployee) {
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

      // Process orders and fetch customer details with CORRECT revenue calculation
      const orders = await Promise.all(
        ordersSnapshot.docs.map(async doc => {
          const orderData = doc.data();

          // CRITICAL: Calculate TOTAL revenue including timeTracking
          let totalRevenue = 0;

          // 1. Add base order amount
          if (
            orderData.totalAmountPaidByBuyer &&
            typeof orderData.totalAmountPaidByBuyer === 'number' &&
            orderData.totalAmountPaidByBuyer > 0
          ) {
            totalRevenue += orderData.totalAmountPaidByBuyer;
          }

          // 2. Add ALL billable amounts from timeTracking.timeEntries
          if (
            orderData.timeTracking &&
            orderData.timeTracking.timeEntries &&
            Array.isArray(orderData.timeTracking.timeEntries)
          ) {
            orderData.timeTracking.timeEntries.forEach((entry: any, index: number) => {
              if (
                entry.billableAmount &&
                typeof entry.billableAmount === 'number' &&
                entry.billableAmount > 0
              ) {
                // Only add if payment was successful (transferred status)
                if (entry.billingStatus === 'transferred' || entry.status === 'transferred') {
                  totalRevenue += entry.billableAmount;
                } else {
                }
              } else {
              }
            });
          } else {
          }

          // Fetch customer details - check multiple possible fields
          let customerName = 'Unbekannter Kunde';
          let customerAvatarUrl = null;

          // Try multiple fields for customer ID
          const customerId =
            orderData.customerFirebaseUid || orderData.orderedBy || orderData.customerUid;

          if (customerId) {
            try {
              // First try users collection
              const customerDoc = await db!.collection('users').doc(customerId).get();
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
                const companyDoc = await db!.collection('companies').doc(customerId).get();
                if (companyDoc.exists) {
                  const companyData = companyDoc.data();
                  customerName =
                    companyData?.companyName || companyData?.name || 'Unbekannte Firma';
                  customerAvatarUrl = companyData?.logoUrl || companyData?.profilePictureURL;
                }
              }
            } catch (customerError) {}
          }

          return {
            id: doc.id,
            ...orderData,
            // OVERRIDE totalAmountPaidByBuyer with correct calculated value
            totalAmountPaidByBuyer: totalRevenue,
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
