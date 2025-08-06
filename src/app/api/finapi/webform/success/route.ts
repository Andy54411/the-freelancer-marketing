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
    const bankId = searchParams.get('bankId');
    const userId = searchParams.get('userId');
    const isMock = searchParams.get('mock') === 'true';

    console.log('✅ WebForm Success Callback:', { webFormId, connectionId, bankId, userId, isMock });

    if (isMock) {
      // Mock mode - simulate successful bank connection
      console.log('🎭 Mock mode: Simulating successful bank connection');
      
      // Redirect back to banking dashboard with success message
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/company/${userId}/finance/banking?connection=success&mode=mock&bank=${bankId}`;
      
      return NextResponse.redirect(redirectUrl);
    }

    // Real finAPI WebForm success
    // Hier könnten wir zusätzliche Verarbeitung machen:
    // - Bank-Connection-Status in der Datenbank aktualisieren
    // - Benachrichtigungen senden
    // - Logging für Analytics

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/company/${userId || 'unknown'}/finance/banking?connection=success&webFormId=${webFormId}&connectionId=${connectionId}`;
    
    return NextResponse.redirect(redirectUrl);
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
