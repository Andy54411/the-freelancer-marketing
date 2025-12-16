import { NextRequest, NextResponse } from 'next/server';

/**
 * Force Resync API - Lösche alle E-Mails und triggere kompletten Neu-Sync
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const body = await request.json().catch(() => ({}));
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Force Resync requested for company: ${uid}, userId: ${userId}`);

    // Rufe Firebase Function auf für Force Sync
    const functionUrl =
      process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL ||
      'https://europe-west1-tilvo-f142f.cloudfunctions.net';

    const syncUrl = `${functionUrl}/gmailSyncHttp`;

    console.log(`📡 Calling Firebase Function: ${syncUrl}`);

    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: uid,
        userId: userId, // Benutzer-spezifische E-Mails
        force: true, // Force = hole alle E-Mails neu
        action: 'force_sync',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Force Sync failed:', errorText);
      return NextResponse.json(
        {
          success: false,
          error: 'Force Sync fehlgeschlagen',
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Force Sync erfolgreich:', result);

    return NextResponse.json({
      success: true,
      message: 'E-Mails werden neu synchronisiert',
      ...result,
    });
  } catch (error) {
    console.error('❌ Force Resync Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Force Resync',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
