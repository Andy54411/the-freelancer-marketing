/**
 * Admin API - Webmail Invoices
 * Uses Firebase Admin SDK for server-side access
 */

import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Datenbank nicht verfügbar',
      }, { status: 500 });
    }

    const snapshot = await db.collection('webmailInvoices').get();
    
    const invoices = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        periodStart: data.periodStart?.toDate?.()?.toISOString(),
        periodEnd: data.periodEnd?.toDate?.()?.toISOString(),
        dueDate: data.dueDate?.toDate?.()?.toISOString(),
        paidAt: data.paidAt?.toDate?.()?.toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
        sentAt: data.sentAt?.toDate?.()?.toISOString(),
        pdfGeneratedAt: data.pdfGeneratedAt?.toDate?.()?.toISOString(),
      };
    });
    
    return NextResponse.json({
      success: true,
      invoices,
      count: invoices.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
