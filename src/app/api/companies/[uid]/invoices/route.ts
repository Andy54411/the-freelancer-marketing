import { NextRequest, NextResponse } from 'next/server';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(): Promise<any> {
  try {
    // Dynamically import Firebase services
    const firebaseModule = await import('@/firebase/server');

    // Check if we have valid db service
    if (!firebaseModule.db) {
      console.error('Firebase database not initialized properly');
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
    console.error('Firebase initialization failed:', error);
    throw new Error('Firebase database unavailable');
  }
}

/**
 * API Route für Invoices
 * GET /api/companies/[uid]/invoices
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Lade Invoices aus Firestore
    const invoicesQuery = await db
      .collection('invoices')
      .where('companyId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const invoices: any[] = [];

    invoicesQuery.forEach((doc: any) => {
      const data = doc.data();
      invoices.push({
        id: doc.id,
        invoiceNumber: data.invoiceNumber || '',
        customerName: data.customerName || '',
        customerEmail: data.customerEmail || '',
        amount: data.amount || 0,
        status: data.status || 'draft',
        issueDate: data.issueDate || '',
        dueDate: data.dueDate || '',
        items: data.items || [],
        taxRate: data.taxRate || '19',
        taxNote: data.taxNote || 'none',
        notes: data.notes || '',
        template: data.template || 'german-standard',
        pdfUrl: data.pdfUrl || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        companyId: data.companyId || uid,
      });
    });

    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Rechnungen:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Laden der Rechnungen' },
      { status: 500 }
    );
  }
}

/**
 * API Route für neue Invoice
 * POST /api/companies/[uid]/invoices
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

    // Berechne Totalsumme
    const subtotal =
      body.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
    const taxRate = parseFloat(body.taxRate) || 19;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    // Erstelle neue Rechnung
    const newInvoice = {
      companyId: uid,
      invoiceNumber: body.invoiceNumber || '',
      customerName: body.customerName || '',
      customerEmail: body.customerEmail || '',
      customerAddress: body.customerAddress || '',
      customerVatId: body.customerVatId || '',
      description: body.description || '',
      issueDate: body.issueDate || new Date().toISOString().split('T')[0],
      dueDate: body.dueDate || '',
      items: body.items || [],
      subtotal,
      taxRate: body.taxRate || '19',
      taxAmount,
      total,
      taxNote: body.taxNote || 'none',
      notes: body.notes || '',
      template: body.template || 'german-standard',
      status: 'draft',
      pdfUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('invoices').add(newInvoice);

    return NextResponse.json({
      success: true,
      invoice: {
        id: docRef.id,
        ...newInvoice,
      },
      message: 'Rechnung erfolgreich erstellt',
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Rechnung:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Erstellen der Rechnung' },
      { status: 500 }
    );
  }
}
