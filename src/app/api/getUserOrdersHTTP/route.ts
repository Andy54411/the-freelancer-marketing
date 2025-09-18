import { NextResponse } from 'next/server';
import { auth, db } from '../../../firebase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userType = 'customer', limit = 20, lastOrderId } = body;

    // Extrahiere User ID aus Authorization Header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authorization header fehlt',
        },
        { status: 401 }
      );
    }

    // Token verifizieren und echte User ID extrahieren
    const idToken = authHeader.replace('Bearer ', '');
    let userId: string;

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token',
        },
        { status: 401 }
      );
    }

    // Query je nach userType mit mehreren möglichen Feldern
    let query;
    if (userType === 'customer') {
      // Suche sowohl in kundeId als auch customerFirebaseUid

      const kundeIdQuery = db!.collection('auftraege').where('kundeId', '==', userId);
      const customerUidQuery = db
        .collection('auftraege')
        .where('customerFirebaseUid', '==', userId);

      // Führe beide Queries aus
      const [kundeIdSnapshot, customerUidSnapshot] = await Promise.all([
        kundeIdQuery.get(),
        customerUidQuery.get(),
      ]);

      const orders: any[] = [];
      const seenOrderIds = new Set();

      // Sammle Orders aus beiden Queries (vermeide Duplikate)
      kundeIdSnapshot.forEach(doc => {
        if (!seenOrderIds.has(doc.id)) {
          orders.push({
            id: doc.id,
            ...doc.data(),
          });
          seenOrderIds.add(doc.id);
        }
      });

      customerUidSnapshot.forEach(doc => {
        if (!seenOrderIds.has(doc.id)) {
          orders.push({
            id: doc.id,
            ...doc.data(),
          });
          seenOrderIds.add(doc.id);
        }
      });

      return NextResponse.json({
        success: true,
        orders,
        count: orders.length,
      });
    } else {
      query = db!.collection('auftraege').where('selectedAnbieterId', '==', userId);
    }

    // Limit anwenden
    if (limit) {
      query = query.limit(limit);
    }

    const ordersSnapshot = await query.get();

    const orders: any[] = [];
    ordersSnapshot.forEach(doc => {
      const data = doc.data();

      // Mappe Order-Daten auf das erwartete Format
      const mappedOrder = {
        id: doc.id,
        selectedSubcategory: data.selectedSubcategory || '',
        providerName: data.providerName || '',
        totalAmountPaidByBuyer: data.jobCalculatedPriceInCents || 0,
        status: mapStatus(data.status),
        selectedAnbieterId: data.selectedAnbieterId || '',
        currency: 'EUR',
        paidAt: data.createdAt || null,
        projectName: data.description || '',
        // Zusätzliche Felder für Debug
        originalStatus: data.status,
        paymentStatus: data.paymentStatus,
        orderId: data.orderId,
        paymentIntentId: data.paymentIntentId,
      };

      orders.push(mappedOrder);
    });

    return NextResponse.json({
      success: true,
      orders: orders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// Status-Mapping von Database zu Dashboard
function mapStatus(dbStatus: string): string {
  switch (dbStatus) {
    case 'confirmed':
      return 'AKTIV';
    case 'completed':
      return 'ABGESCHLOSSEN';
    case 'cancelled':
      return 'STORNIERT';
    case 'paid':
      return 'AKTIV';
    default:
      return 'IN BEARBEITUNG';
  }
}
