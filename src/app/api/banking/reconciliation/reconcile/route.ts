import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

interface ReconcileRequest {
  invoiceId: string;
  transactionId: string;
  companyId: string;
  amount: number;
  matchType: 'exact' | 'partial' | 'manual';
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ReconcileRequest;
    const { invoiceId, transactionId, companyId, amount, matchType, notes } = body;

    if (!invoiceId || !transactionId || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID, Transaction ID und Company ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Rechnung aus der Datenbank holen
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Rechnung nicht gefunden' },
        { status: 404 }
      );
    }

    const invoiceData = invoiceDoc.data();

    // Prüfen ob die Rechnung zu dem Unternehmen gehört
    if (invoiceData?.companyId !== companyId) {
      return NextResponse.json(
        { success: false, error: 'Unberechtigter Zugriff auf die Rechnung' },
        { status: 403 }
      );
    }

    // Rechnung als abgeglichen markieren
    const reconciliationData = {
      isReconciled: true,
      reconciledTransactionId: transactionId,
      reconciledAt: Timestamp.now(),
      reconciledAmount: amount,
      reconciliationMatchType: matchType,
      reconciliationNotes: notes || '',
      updatedAt: Timestamp.now(),
    };

    await invoiceRef.update(reconciliationData);

    return NextResponse.json({
      success: true,
      message: 'Rechnung erfolgreich abgeglichen',
      invoiceId: invoiceId,
      transactionId: transactionId,
      reconciliationData: {
        ...reconciliationData,
        reconciledAt: reconciliationData.reconciledAt.toDate().toISOString(),
      },
    });

  } catch (error: any) {

    return NextResponse.json(
      { success: false, error: `Fehler beim Abgleich: ${error.message}` },
      { status: 500 }
    );
  }
}

// Abgleich rückgängig machen
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const companyId = searchParams.get('companyId');

    if (!invoiceId || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID und Company ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Rechnung aus der Datenbank holen
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Rechnung nicht gefunden' },
        { status: 404 }
      );
    }

    const invoiceData = invoiceDoc.data();

    // Prüfen ob die Rechnung zu dem Unternehmen gehört
    if (invoiceData?.companyId !== companyId) {
      return NextResponse.json(
        { success: false, error: 'Unberechtigter Zugriff auf die Rechnung' },
        { status: 403 }
      );
    }

    // Abgleich rückgängig machen
    const undoReconciliationData = {
      isReconciled: false,
      reconciledTransactionId: null,
      reconciledAt: null,
      reconciledAmount: null,
      reconciliationMatchType: null,
      reconciliationNotes: null,
      updatedAt: Timestamp.now(),
    };

    await invoiceRef.update(undoReconciliationData);

    return NextResponse.json({
      success: true,
      message: 'Abgleich erfolgreich rückgängig gemacht',
      invoiceId: invoiceId,
    });

  } catch (error: any) {

    return NextResponse.json(
      { success: false, error: `Fehler beim Rückgängigmachen: ${error.message}` },
      { status: 500 }
    );
  }
}
