import { NextResponse } from 'next/server';
import { auth, db } from '../../../firebase/server';

export async function POST(request: Request) {
  try {
    if (!db || !auth) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userType = 'customer', limit = 20, lastOrderId: _lastOrderId } = body;

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
    } catch {
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

      const kundeIdQuery = db.collection('auftraege').where('kundeId', '==', userId);
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
          const data = doc.data();
          orders.push(mapOrderData(doc.id, data));
          seenOrderIds.add(doc.id);
        }
      });

      customerUidSnapshot.forEach(doc => {
        if (!seenOrderIds.has(doc.id)) {
          const data = doc.data();
          orders.push(mapOrderData(doc.id, data));
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
      orders.push(mapOrderData(doc.id, doc.data()));
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

// Gemeinsame Mapping-Funktion für Order-Daten
function mapOrderData(docId: string, data: FirebaseFirestore.DocumentData) {
  // Preis-Logik: Zuerst jobCalculatedPriceInCents, dann totalPriceInCents, dann price * 100
  let priceInCents = 0;
  if (data.jobCalculatedPriceInCents && typeof data.jobCalculatedPriceInCents === 'number') {
    priceInCents = data.jobCalculatedPriceInCents;
  } else if (data.totalPriceInCents && typeof data.totalPriceInCents === 'number') {
    priceInCents = data.totalPriceInCents;
  } else if (data.totalAmountPaidByBuyer && typeof data.totalAmountPaidByBuyer === 'number') {
    priceInCents = data.totalAmountPaidByBuyer;
  } else if (data.price && typeof data.price === 'number') {
    // price ist in Euro, also * 100 für Cents
    priceInCents = Math.round(data.price * 100);
  } else if (data.totalAmount && typeof data.totalAmount === 'number') {
    priceInCents = Math.round(data.totalAmount * 100);
  }

  // Datum-Logik: paidAt > createdAt > orderCreatedAt
  const dateField = data.paidAt || data.createdAt || data.orderCreatedAt || null;

  // Kategorie-Logik: selectedSubcategory > unterkategorie
  const category = data.selectedSubcategory || data.unterkategorie || '';

  return {
    id: docId,
    selectedSubcategory: category,
    providerName: data.providerName || data.selectedAnbieterName || '',
    totalAmountPaidByBuyer: priceInCents,
    status: mapStatus(data.status),
    selectedAnbieterId: data.selectedAnbieterId || '',
    currency: 'EUR',
    paidAt: dateField,
    projectName: data.description || data.projectName || '',
    // Zusätzliche Felder
    originalStatus: data.status,
    paymentStatus: data.paymentStatus,
    orderId: data.orderId,
  };
}
