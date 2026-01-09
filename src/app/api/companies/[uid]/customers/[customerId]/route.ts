import { NextRequest, NextResponse } from 'next/server';

async function getFirebaseDb(): Promise<any> {
  try {
    const firebaseModule = await import('@/firebase/server');

    if (!firebaseModule.db) {
      const { admin } = firebaseModule;
      if (admin && admin.apps.length > 0) {
        const { getFirestore } = await import('firebase-admin/firestore');
        return getFirestore();
      }
      throw new Error('Firebase database unavailable');
    }

    return firebaseModule.db;
  } catch {
    throw new Error('Firebase database unavailable');
  }
}

/**
 * PUT /api/companies/[uid]/customers/[customerId]
 * Update existing customer
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; customerId: string }> }
) {
  try {
    const { uid, customerId } = await params;

    if (!uid || !customerId) {
      return NextResponse.json(
        { success: false, error: 'UID und Customer-ID sind erforderlich' },
        { status: 400 }
      );
    }

    const customerData = await request.json();

    const db = await getFirebaseDb();

    const customerRef = db
      .collection('companies')
      .doc(uid)
      .collection('customers')
      .doc(customerId);

    // Check if customer exists
    const customerDoc = await customerRef.get();
    if (!customerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Kunde nicht gefunden' },
        { status: 404 }
      );
    }

    // Update customer with timestamp
    await customerRef.update({
      ...customerData,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Kunde erfolgreich aktualisiert',
      customerId,
    });
  } catch (error: unknown) {
    console.error('Fehler beim Aktualisieren des Kunden:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Interner Serverfehler beim Aktualisieren des Kunden',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companies/[uid]/customers/[customerId]
 * Get single customer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; customerId: string }> }
) {
  try {
    const { uid, customerId } = await params;

    if (!uid || !customerId) {
      return NextResponse.json(
        { success: false, error: 'UID und Customer-ID sind erforderlich' },
        { status: 400 }
      );
    }

    const db = await getFirebaseDb();

    const customerRef = db
      .collection('companies')
      .doc(uid)
      .collection('customers')
      .doc(customerId);

    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Kunde nicht gefunden' },
        { status: 404 }
      );
    }

    const data = customerDoc.data();

    return NextResponse.json({
      success: true,
      customer: {
        id: customerDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Fehler beim Laden des Kunden:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Interner Serverfehler beim Laden des Kunden',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
