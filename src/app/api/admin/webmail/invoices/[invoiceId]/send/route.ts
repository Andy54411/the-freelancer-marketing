/**
 * Admin API - Send Invoice Email
 * Uses Firebase Admin SDK for server-side access
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Datenbank nicht verfügbar',
      }, { status: 500 });
    }

    const { invoiceId } = await params;
    
    // Lade Rechnung
    const invoiceDoc = await db.collection('webmailInvoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Rechnung nicht gefunden',
      }, { status: 404 });
    }
    
    const invoice = invoiceDoc.data();
    if (!invoice) {
      return NextResponse.json({
        success: false,
        error: 'Rechnungsdaten nicht gefunden',
      }, { status: 404 });
    }
    
    // Sende E-Mail über interne API
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webmail/send-invoice-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoiceId,
        customerEmail: invoice.customerEmail,
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        dueDate: invoice.dueDate,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
      }),
    });
    
    if (!emailResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'E-Mail-Versand fehlgeschlagen',
      }, { status: 500 });
    }
    
    // Markiere als versendet
    await db.collection('webmailInvoices').doc(invoiceId).update({
      status: 'sent',
      sentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
