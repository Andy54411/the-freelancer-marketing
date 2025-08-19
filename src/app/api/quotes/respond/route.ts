import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * API Route zum Bearbeiten von Angebotsanfragen
 * POST /api/quotes/respond
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteId, action, response } = body;

    if (!quoteId || !action) {
      return NextResponse.json({ error: 'Quote ID und Aktion sind erforderlich' }, { status: 400 });
    }

    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Angebotsanfrage nicht gefunden' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    switch (action) {
      case 'respond':
        if (!response || !response.message) {
          return NextResponse.json(
            { error: 'Antwort-Nachricht ist erforderlich' },
            { status: 400 }
          );
        }

        updateData.status = 'responded';
        updateData.response = {
          ...response,
          respondedAt: new Date().toISOString(),
        };
        break;

      case 'accept':
        updateData.status = 'accepted';
        updateData.acceptedAt = new Date().toISOString();
        break;

      case 'decline':
        updateData.status = 'declined';
        updateData.declinedAt = new Date().toISOString();
        break;

      default:
        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }

    // Update in Firestore
    await quoteRef.update(updateData);

    // Erfolgsmeldung zurückgeben
    return NextResponse.json({
      success: true,
      message: `Angebotsanfrage erfolgreich ${
        action === 'respond' ? 'beantwortet' : action === 'accept' ? 'angenommen' : 'abgelehnt'
      }`,
    });
  } catch (error) {
    console.error('Fehler beim Bearbeiten der Angebotsanfrage:', error);
    return NextResponse.json(
      { error: 'Fehler beim Bearbeiten der Angebotsanfrage' },
      { status: 500 }
    );
  }
}
