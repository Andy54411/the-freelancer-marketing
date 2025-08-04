// src/app/api/finapi/setup-integration/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getClientToken,
  createFinapiUser,
  storeFinapiCredentials,
  getFinapiCredentials,
} from '@/lib/finapi-server-utils';
import { admin } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Benutzer-ID fehlt.' }, { status: 400 });
    }

    // 0. Autorisierung prüfen (optional, aber empfohlen)
    // Hier könnten Sie prüfen, ob der anfragende Benutzer die Berechtigung hat.
    // Fürs Erste gehen wir davon aus, dass der aufrufende Client autorisiert ist.

    // 1. Prüfen, ob bereits eine finAPI-Verbindung für diesen Benutzer besteht
    const existingCredentials = await getFinapiCredentials(userId);
    if (existingCredentials) {
      return NextResponse.json({
        success: true,
        message: 'Für diesen Benutzer existiert bereits eine finAPI-Verbindung.',
        finapiUserId: existingCredentials.finapiUserId,
      });
    }

    // 2. Client-Token für die API-Authentifizierung abrufen
    const clientToken = await getClientToken();

    // 3. Neuen finAPI-Benutzer erstellen
    const { id: finapiUserId, password_hash: finapiUserPassword } = await createFinapiUser(
      clientToken,
      userId
    );

    // 4. Die neuen finAPI-Anmeldeinformationen sicher in Firestore speichern
    await storeFinapiCredentials(userId, {
      finapiUserId,
      finapiUserPassword, // Wichtig: Passwort im Klartext speichern für zukünftige Token-Anfragen
    });

    // 5. Erfolg zurückmelden
    return NextResponse.json({
      success: true,
      message: 'finAPI-Benutzer erfolgreich erstellt und Anmeldeinformationen gespeichert.',
      finapiUserId: finapiUserId,
    });
  } catch (error) {
    console.error('Fehler bei der finAPI-Setup-Integration:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    return NextResponse.json(
      { error: 'Fehler bei der finAPI-Integration.', details: errorMessage },
      { status: 500 }
    );
  }
}
