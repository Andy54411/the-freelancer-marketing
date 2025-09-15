import { NextRequest, NextResponse } from 'next/server';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(companyId: string): Promise<any> {
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
 * API Route für Invoices
 * GET /api/companies/[uid]/invoices
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }, companyId: string) {
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
export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }, companyId: string) {
  try {
    const { uid } = await params;
    const body = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // 🧾 KRITISCH: Automatische fortlaufende Rechnungsnummer generieren
    let finalInvoiceNumber = body.invoiceNumber || '';
    let sequentialNumber = 1;

    if (!finalInvoiceNumber) {
      // 1. Lade Company-Einstellungen für lastInvoiceNumber
      try {
        const companyDoc = await db.collection('companies').doc(uid).get();
        const companyData = companyDoc.data();
        const lastInvoiceNumber = companyData?.step3?.lastInvoiceNumber;

        // 2. Ermittle nächste Nummer basierend auf lastInvoiceNumber
        const currentYear = new Date().getFullYear();

        if (lastInvoiceNumber) {
          // Extrahiere Nummer aus Format R-2024-123 oder 2024-123
          const match = lastInvoiceNumber.match(/(\d+)$/);
          if (match) {
            sequentialNumber = parseInt(match[1]) + 1;
          }
        }

        // 3. Prüfe, ob diese Nummer bereits existiert (Safety Check)
        let numberExists = true;
        while (numberExists) {
          const testNumber = `R-${currentYear}-${sequentialNumber.toString().padStart(3, '0')}`;
          const existingInvoice = await db
            .collection('invoices')
            
            .where('invoiceNumber', '==', testNumber)
            .limit(1)
            .get();

          if (existingInvoice.empty) {
            numberExists = false;
            finalInvoiceNumber = testNumber;
          } else {
            sequentialNumber++;
          }
        }

        // 4. Update Company lastInvoiceNumber
        await db.collection('companies').doc(uid).update({
          'step3.lastInvoiceNumber': finalInvoiceNumber,
        });
      } catch (error) {
        // Fallback: Zeitstempel-basierte Nummer
        const fallbackNumber = Date.now() % 10000;
        finalInvoiceNumber = `R-${new Date().getFullYear()}-${fallbackNumber.toString().padStart(3, '0')}`;
      }
    }

    // Berechne Totalsumme
    const subtotal =
      body.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
    const taxRate = parseFloat(body.taxRate) || 19;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    // Erstelle neue Rechnung
    const newInvoice = {
      companyId: uid,
      invoiceNumber: finalInvoiceNumber,
      sequentialNumber: sequentialNumber,
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
      status: body.status || 'draft', // Fixed: Use status from request body
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
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Erstellen der Rechnung' },
      { status: 500 }
    );
  }
}
