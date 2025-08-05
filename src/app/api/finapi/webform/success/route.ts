import { NextRequest, NextResponse } from 'next/server';

/**
 * finAPI WebForm 2.0 Success Callback
 * Wird aufgerufen, wenn die Bankverbindung erfolgreich hergestellt wurde
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const webFormId = searchParams.get('webFormId');
    const connectionId = searchParams.get('connectionId');

    console.log('✅ WebForm Success Callback:', { webFormId, connectionId });

    // Hier könnten wir zusätzliche Verarbeitung machen:
    // - Bank-Connection-Status in der Datenbank aktualisieren
    // - Benachrichtigungen senden
    // - Logging für Analytics

    return NextResponse.json({
      success: true,
      message: 'Bankverbindung erfolgreich hergestellt',
      webFormId,
      connectionId,
    });
  } catch (error) {
    console.error('❌ WebForm Success Callback Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten des Success Callbacks' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Some WebForm implementations use POST for callbacks
  return GET(req);
}
