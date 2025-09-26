/**
 * API Route für E-Invoice XML Download
 * GET /api/einvoices/[id]/xml
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check if Firebase is properly initialized
    if (!isFirebaseAvailable() || !db) {
      console.error('Firebase not initialized');
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'E-Invoice ID is required' }, { status: 400 });
    }

    console.log('Loading E-Invoice XML for ID:', id);

    // Lade die E-Invoice Daten direkt aus Firebase Admin SDK
    const docRef = db!.collection('eInvoices').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log('E-Invoice not found:', id);
      return NextResponse.json({ error: 'E-Invoice not found' }, { status: 404 });
    }

    const eInvoiceData = {
      id: docSnap.id,
      ...docSnap.data(),
    } as any;

    if (!eInvoiceData.xmlContent) {
      console.log('No XML content found for E-Invoice:', id);
      return NextResponse.json({ error: 'XML content not available' }, { status: 404 });
    }

    console.log(
      'Returning XML content for E-Invoice:',
      id,
      'Length:',
      eInvoiceData.xmlContent.length
    );

    // Return XML content mit korrekten Headers
    return new NextResponse(eInvoiceData.xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="einvoice-${id}.xml"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('❌ Error loading E-Invoice XML:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
