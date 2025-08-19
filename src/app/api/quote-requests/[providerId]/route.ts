import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * API Route zum Abrufen der Angebotsanfragen für einen Anbieter
 * GET /api/quote-requests/[providerId]
 */
export async function GET(request: NextRequest, { params }: { params: { providerId: string } }) {
  try {
    const { providerId } = params;

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID ist erforderlich' }, { status: 400 });
    }

    // Abrufen aller Angebotsanfragen für diesen Anbieter
    const quoteRequestsSnapshot = await db
      .collection('quote_requests')
      .where('providerId', '==', providerId)
      .orderBy('requestDate', 'desc')
      .get();

    const quoteRequests = quoteRequestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      quoteRequests,
      count: quoteRequests.length,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Angebotsanfragen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Angebotsanfragen' },
      { status: 500 }
    );
  }
}
