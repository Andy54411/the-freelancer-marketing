import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * API Route zum Abrufen einer spezifischen Angebotsanfrage
 * GET /api/quotes/details/[quoteId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await params;

    if (!quoteId) {
      return NextResponse.json({ error: 'Quote ID ist erforderlich' }, { status: 400 });
    }

    // Abrufen der spezifischen Angebotsanfrage
    const quoteDoc = await db.collection('quotes').doc(quoteId).get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Angebotsanfrage nicht gefunden' }, { status: 404 });
    }

    const quote = {
      id: quoteDoc.id,
      ...quoteDoc.data(),
    };

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Angebotsanfrage:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Angebotsanfrage' }, { status: 500 });
  }
}
