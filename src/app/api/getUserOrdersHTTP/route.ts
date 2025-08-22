import { NextResponse } from 'next/server';
import { db } from '../../../firebase/server';

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

    // Für den Test nehmen wir die bekannte User ID
    const userId = '8WACaOZv3EYwaxksJoYx7R8dgLK2';

    console.log('[getUserOrdersHTTP] Suche Orders für User:', userId, 'Type:', userType);

    // Query je nach userType
    let query;
    if (userType === 'customer') {
      query = db.collection('auftraege').where('kundeId', '==', userId);
    } else {
      query = db.collection('auftraege').where('selectedAnbieterId', '==', userId);
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

    console.log('[getUserOrdersHTTP] Gefunden:', orders.length, 'Orders');
    console.log('[getUserOrdersHTTP] Orders:', orders);

    return NextResponse.json({
      success: true,
      orders: orders,
    });
  } catch (error) {
    console.error('[getUserOrdersHTTP] Fehler:', error);
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
