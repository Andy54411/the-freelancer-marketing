/**
 * Admin API - Mark Invoice as Paid
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
    
    await db.collection('webmailInvoices').doc(invoiceId).update({
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
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
