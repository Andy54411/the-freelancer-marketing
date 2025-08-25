import { NextRequest, NextResponse } from 'next/server';

/**
 * finAPI WebForm 2.0 Error Callback
 * Wird aufgerufen, wenn bei der Bankverbindung ein Fehler aufgetreten ist
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const webFormId = searchParams.get('webFormId');
    const errorCode = searchParams.get('errorCode');
    const errorMessage = searchParams.get('errorMessage');

    // Hier könnten wir zusätzliche Fehlerbehandlung machen:
    // - Fehler in der Datenbank protokollieren
    // - Benutzer über den Fehler informieren
    // - Retry-Mechanismus anbieten

    return NextResponse.json({
      success: false,
      error: 'Bankverbindung fehlgeschlagen',
      details: {
        webFormId,
        errorCode,
        errorMessage,
      },
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten des Error Callbacks' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Some WebForm implementations use POST for callbacks
  return GET(req);
}
