import { NextRequest, NextResponse } from 'next/server';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(): Promise<any> {
  try {
    // Dynamically import Firebase services
    const firebaseModule = await import('@/firebase/server');

    // Check if we have valid db service
    if (!firebaseModule.db) {
      // Try to get from admin if needed
      const { admin } = firebaseModule;
      if (admin && admin.apps.length > 0) {
        const { getFirestore } = await import('firebase-admin/firestore');
        return getFirestore();
      }
      throw new Error('Firebase database unavailable');
    }

    return firebaseModule.db;
  } catch (error) {
    throw new Error('Firebase database unavailable');
  }
}

/**
 * API Route für Customers
 * GET /api/companies/[uid]/customers
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Lade nur echte Kunden aus Firestore (keine Lieferanten)
    const customersQuery = await db
      .collection('customers')
      .where('companyId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const customers: any[] = [];

    customersQuery.forEach((doc: any) => {
      const data = doc.data();

      // Filter: Nur echte Kunden, keine Lieferanten
      const isSupplier = data.isSupplier === true;
      const customerNumber = data.customerNumber || '';
      const isLieferantNumber = customerNumber.startsWith('LF-');

      // Überspringe Lieferanten basierend auf isSupplier Flag oder LF-Nummer
      if (isSupplier || isLieferantNumber) {
        return;
      }

      customers.push({
        id: doc.id,
        customerNumber: data.customerNumber || '',
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        // Legacy address fallback
        address: data.address || '',
        // Strukturierte Adresse
        street: data.street || '',
        city: data.city || '',
        postalCode: data.postalCode || '',
        country: data.country || '',
        taxNumber: data.taxNumber || '',
        vatId: data.vatId || '',
        vatValidated: data.vatValidated || false,
        totalInvoices: data.totalInvoices || 0,
        totalAmount: data.totalAmount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        contactPersons: data.contactPersons || [],
        companyId: data.companyId || uid,
      });
    });

    return NextResponse.json({
      success: true,
      customers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Laden der Kunden' },
      { status: 500 }
    );
  }
}

/**
 * API Route für neuen Customer
 * POST /api/companies/[uid]/customers
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const body = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Erstelle neuen Kunden
    const newCustomer = {
      companyId: uid,
      name: body.name || '',
      email: body.email || '',
      phone: body.phone || '',
      address: body.address || '',
      street: body.street || '',
      city: body.city || '',
      postalCode: body.postalCode || '',
      country: body.country || '',
      taxNumber: body.taxNumber || '',
      vatId: body.vatId || '',
      vatValidated: false,
      totalInvoices: 0,
      totalAmount: 0,
      contactPersons: body.contactPersons || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('customers').add(newCustomer);

    return NextResponse.json({
      success: true,
      customer: {
        id: docRef.id,
        ...newCustomer,
      },
      message: 'Kunde erfolgreich erstellt',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Erstellen des Kunden' },
      { status: 500 }
    );
  }
}
