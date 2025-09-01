import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../firebase/server'; /**
 * API Route zum Abrufen der Angebotsanfragen für einen Anbieter
 * GET /api/quote-requests/[providerId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  let providerId: string = '';

  try {
    const resolvedParams = await params;
    providerId = resolvedParams.providerId;

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID ist erforderlich' }, { status: 400 });
    }

    // Check if Firebase is properly initialized
    if (!db) {
      console.error('Firebase database not available');
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    // Abrufen aller Angebotsanfragen für diesen Anbieter
    console.log(`Fetching quote requests for provider: ${providerId}`);

    const quoteRequestsSnapshot = await db
      .collection('quotes')
      .where('providerId', '==', providerId)
      .get();

    console.log(
      `Found ${quoteRequestsSnapshot.docs.length} quote requests for provider ${providerId}`
    );

    const quoteRequests = quoteRequestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      quoteRequests,
      count: quoteRequests.length,
    });
  } catch (error: any) {
    console.error('Quote Requests API error:', {
      error: error.message,
      stack: error.stack,
      providerId: providerId || 'unknown',
      timestamp: new Date().toISOString(),
    });

    // More specific error handling
    if (error.message?.includes('permission')) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Zugriff auf diese Daten' },
        { status: 403 }
      );
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Angebotsanfragen nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Angebotsanfragen',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
