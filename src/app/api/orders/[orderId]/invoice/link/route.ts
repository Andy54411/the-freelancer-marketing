/**
 * API zum Verknüpfen einer bestehenden Rechnung mit einem Auftrag
 * POST /api/orders/[orderId]/invoice/link
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse } from '@/lib/apiAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { orderId } = await params;
    const body = await request.json();
    const { invoiceId, invoiceNumber, invoiceUrl } = body;

    if (!invoiceId || !invoiceUrl) {
      return NextResponse.json(
        { error: 'Rechnungs-ID und URL erforderlich' },
        { status: 400 }
      );
    }

    // Firebase Admin importieren
    const { admin } = await import('@/firebase/server');
    if (!admin) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const adminDb = admin.firestore();

    // Prüfe ob der Auftrag existiert
    const orderDoc = await adminDb.collection('auftraege').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;

    // Prüfe ob der User der Provider ist
    const providerId = orderData.selectedAnbieterId;
    if (authResult.userId !== providerId) {
      return NextResponse.json(
        { error: 'Nur der Anbieter kann Rechnungen verknüpfen' },
        { status: 403 }
      );
    }

    // Prüfe ob die Rechnung existiert und dem Provider gehört
    const invoiceDoc = await adminDb
      .collection('companies')
      .doc(providerId)
      .collection('invoices')
      .doc(invoiceId)
      .get();

    if (!invoiceDoc.exists) {
      return NextResponse.json(
        { error: 'Rechnung nicht gefunden' },
        { status: 404 }
      );
    }

    // Update den Auftrag mit der verknüpften Rechnung
    await adminDb.collection('auftraege').doc(orderId).update({
      'invoice.status': 'uploaded',
      'invoice.uploadedAt': admin.firestore.FieldValue.serverTimestamp(),
      'invoice.invoiceUrl': invoiceUrl,
      'invoice.invoiceFileName': `${invoiceNumber || invoiceId}.pdf`,
      'invoice.linkedInvoiceId': invoiceId,
      'invoice.linkedInvoiceNumber': invoiceNumber,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Optional: Update die Rechnung mit der Auftrags-Referenz
    await adminDb
      .collection('companies')
      .doc(providerId)
      .collection('invoices')
      .doc(invoiceId)
      .update({
        linkedOrderId: orderId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      message: `Rechnung ${invoiceNumber} wurde erfolgreich mit dem Auftrag verknüpft`,
    });

  } catch (error) {
    console.error('[Invoice Link] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
