// src/app/api/finapi/connect-bank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserTokenForTaskiloUser, importBankConnection } from '@/lib/finapi-server-utils';

export async function POST(req: NextRequest) {
  try {
    const { userId, bankId } = await req.json();

    if (!userId || !bankId) {
      return NextResponse.json({ error: 'Benutzer-ID oder Bank-ID fehlt.' }, { status: 400 });
    }

    // 1. Benutzer-Token für den Taskilo-Benutzer abrufen
    const userToken = await getUserTokenForTaskiloUser(userId);

    // 2. Redirect-URL für nach dem finAPI Web-Formular definieren
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/dashboard/company/${userId}/finance/banking/callback`;

    // 3. Bankverbindungsprozess bei finAPI starten
    const importData = await importBankConnection(userToken, bankId, redirectUrl);

    // 4. Token für das Web-Formular an den Client zurückgeben
    // Der Client muss dann zu `https://webform.finapi.io/token/{web_form_token}` weiterleiten
    return NextResponse.json({
      success: true,
      webFormToken: importData.token,
      redirectUrl: `https://webform.finapi.io/?token=${importData.token}`,
    });
  } catch (error) {
    console.error('Fehler beim Starten der Bankverbindung:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    return NextResponse.json(
      { error: 'Fehler beim Verbinden der Bank.', details: errorMessage },
      { status: 500 }
    );
  }
}
