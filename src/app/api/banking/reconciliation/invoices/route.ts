import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

interface InvoiceForReconciliation {
  id: string;
  invoiceNumber: string;
  amount: number;
  total: number;
  status: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  description: string;
  isReconciled?: boolean;
  reconciledTransactionId?: string;
  reconciledAt?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const status = searchParams.get('status') || 'all';

  if (!companyId) {
    return NextResponse.json(
      { success: false, error: 'Company ID ist erforderlich' },
      { status: 400 }
    );
  }

  try {
    // Debug: Hole erst alle Rechnungen ohne Filter
    const allInvoicesSnapshot = await db
      .collection('invoices')
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();

    const invoices: InvoiceForReconciliation[] = [];
    const debugInfo: any[] = [];

    allInvoicesSnapshot.forEach(doc => {
      const data = doc.data();

      debugInfo.push({
        id: doc.id,
        status: data.status,
        invoiceNumber: data.invoiceNumber || data.number,
        total: data.total,
        companyId: data.companyId,
      });

      // Erweiterte Filter: Akzeptiere ALLE Rechnungen unabhängig vom Status
      // Damit alle 10 Rechnungen aus der Datenbank angezeigt werden
      invoices.push({
        id: doc.id,
        invoiceNumber: data.invoiceNumber || data.number,
        amount: data.amount || 0,
        total: data.total || 0,
        status: data.status,
        issueDate: data.issueDate || data.date,
        dueDate: data.dueDate,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        description: data.description,
        isReconciled: data.isReconciled || false,
        reconciledTransactionId: data.reconciledTransactionId,
        reconciledAt: data.reconciledAt,
      });
    });

    // Filter nach Status wenn gewünscht
    let filteredInvoices = invoices;
    if (status === 'unreconciled') {
      filteredInvoices = invoices.filter(inv => !inv.isReconciled);
    } else if (status === 'reconciled') {
      filteredInvoices = invoices.filter(inv => inv.isReconciled);
    }

    return NextResponse.json({
      success: true,
      invoices: filteredInvoices,
      total: filteredInvoices.length,
      unreconciled: invoices.filter(inv => !inv.isReconciled).length,
      reconciled: invoices.filter(inv => inv.isReconciled).length,
    });
  } catch (error: any) {

    return NextResponse.json(
      { success: false, error: `Fehler beim Laden der Rechnungen: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST-Route für den Abgleich von Rechnungen mit Transaktionen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, transactionId, companyId, action } = body;

    if (!invoiceId || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID und Company ID sind erforderlich' },
        { status: 400 }
      );
    }

    const invoiceRef = db.collection('invoices').doc(invoiceId);

    if (action === 'reconcile') {
      // Rechnung mit Transaktion abgleichen
      if (!transactionId) {
        return NextResponse.json(
          { success: false, error: 'Transaction ID ist erforderlich für Abgleich' },
          { status: 400 }
        );
      }

      await invoiceRef.update({
        isReconciled: true,
        reconciledTransactionId: transactionId,
        reconciledAt: new Date().toISOString(),
        status: 'paid', // ✅ Status auf "bezahlt" setzen
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Rechnung erfolgreich abgeglichen',
        invoiceId,
        transactionId,
      });
    } else if (action === 'unreconcile') {
      // Abgleich rückgängig machen
      await invoiceRef.update({
        isReconciled: false,
        reconciledTransactionId: null,
        reconciledAt: null,
        status: 'open', // ✅ Status zurück auf "offen" setzen
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Abgleich erfolgreich rückgängig gemacht',
        invoiceId,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Ungültige Aktion. Verwende "reconcile" oder "unreconcile"' },
        { status: 400 }
      );
    }
  } catch (error: any) {

    return NextResponse.json(
      { success: false, error: `Fehler beim Abgleich: ${error.message}` },
      { status: 500 }
    );
  }
}
