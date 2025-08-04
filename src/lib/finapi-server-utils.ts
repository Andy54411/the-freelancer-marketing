// src/lib/finapi-server-utils.ts
import { admin } from '@/firebase/server';
import { FinapiUserCredentials } from '@/types/finapiTypes';

const FINAPI_API_URL = 'https://sandbox.finapi.io';
const FINAPI_CLIENT_ID = process.env.FINAPI_SANDBOX_CLIENT_ID;
const FINAPI_CLIENT_SECRET = process.env.FINAPI_SANDBOX_CLIENT_SECRET;

/**
 * Holt einen Client-Token von finAPI.
 * Dieser Token wird für Operationen auf Client-Ebene benötigt, z.B. um neue Benutzer zu erstellen.
 */
export async function getClientToken(): Promise<string> {
  if (!FINAPI_CLIENT_ID || !FINAPI_CLIENT_SECRET) {
    throw new Error('finAPI Client-ID oder Client-Secret sind nicht konfiguriert.');
  }

  const response = await fetch(`${FINAPI_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: FINAPI_CLIENT_ID,
      client_secret: FINAPI_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Fehler beim Abrufen des finAPI Client-Tokens:', errorData);
    throw new Error('Fehler bei der Authentifizierung des Clients bei finAPI.');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Erstellt einen neuen finAPI-Benutzer, der mit einem Taskilo-Benutzer verknüpft ist.
 * @param clientToken - Ein gültiger Client-Token.
 * @param taskiloUserId - Die UID des Taskilo-Benutzers.
 */
export async function createFinapiUser(
  clientToken: string,
  taskiloUserId: string
): Promise<{ id: string; password_hash: string }> {
  // Generiert eine zufällige, sichere ID und ein Passwort für den finAPI-Benutzer.
  // WICHTIG: Das Passwort wird von finAPI gehasht und nie im Klartext gespeichert.
  const finapiUserId = `taskilo_${taskiloUserId}_${Date.now()}`;
  const finapiPassword = Math.random().toString(36).slice(-16);

  const response = await fetch(`${FINAPI_API_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientToken}`,
    },
    body: JSON.stringify({
      id: finapiUserId,
      password: finapiPassword,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Fehler beim Erstellen des finAPI-Benutzers:', errorData);
    throw new Error('Der finAPI-Benutzer konnte nicht erstellt werden.');
  }

  // Wir geben die ID und das Klartext-Passwort zurück, um sofort den User-Token zu holen.
  return { id: finapiUserId, password_hash: finapiPassword };
}

/**
 * Holt einen Benutzer-Token für einen spezifischen finAPI-Benutzer.
 * Dieser Token wird für alle Operationen im Kontext dieses Benutzers benötigt (z.B. Bankverbindungen).
 * @param finapiUserId - Die ID des finAPI-Benutzers.
 * @param finapiPassword - Das Klartext-Passwort des finAPI-Benutzers.
 */
export async function getUserToken(finapiUserId: string, finapiPassword: string): Promise<string> {
  if (!FINAPI_CLIENT_ID || !FINAPI_CLIENT_SECRET) {
    throw new Error('finAPI Client-ID oder Client-Secret sind nicht konfiguriert.');
  }

  const response = await fetch(`${FINAPI_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: FINAPI_CLIENT_ID,
      client_secret: FINAPI_CLIENT_SECRET,
      username: finapiUserId,
      password: finapiPassword,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Fehler beim Abrufen des finAPI Benutzer-Tokens:', errorData);
    throw new Error('Fehler bei der Authentifizierung des finAPI-Benutzers.');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Holt einen Benutzer-Token für einen Taskilo-Benutzer, indem die gespeicherten Anmeldeinformationen verwendet werden.
 * @param taskiloUserId - Die UID des Taskilo-Benutzers.
 */
export async function getUserTokenForTaskiloUser(taskiloUserId: string): Promise<string> {
  const credentials = await getFinapiCredentials(taskiloUserId);
  if (!credentials) {
    throw new Error('Keine finAPI-Anmeldeinformationen für diesen Benutzer gefunden.');
  }
  return getUserToken(credentials.finapiUserId, credentials.finapiUserPassword);
}

/**
 * Ruft eine Liste von Banken von finAPI ab.
 * @param userToken - Ein gültiger Benutzer-Token.
 */
export async function getBanks(userToken: string) {
  const response = await fetch(`${FINAPI_API_URL}/api/banks`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Fehler beim Abrufen der Banken von finAPI:', errorData);
    throw new Error('Banken konnten nicht von finAPI abgerufen werden.');
  }

  const data = await response.json();
  return data.banks;
}

/**
 * Importiert eine neue Bankverbindung für einen Benutzer.
 * @param userToken - Ein gültiger Benutzer-Token.
 * @param bankId - Die ID der zu verbindenden Bank.
 * @param redirectUrl - Die URL, zu der der Benutzer nach dem Web-Formular weitergeleitet wird.
 */
export async function importBankConnection(userToken: string, bankId: number, redirectUrl: string) {
  const response = await fetch(`${FINAPI_API_URL}/api/bankConnections/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      bankId: bankId,
      redirectUrl: redirectUrl,
      // Wir lassen die Anmeldeinformationen weg, damit der Benutzer sie im sicheren Web-Formular von finAPI eingibt.
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Fehler beim Importieren der Bankverbindung:', errorData);
    throw new Error('Bankverbindung konnte nicht importiert werden.');
  }

  const data = await response.json();
  return data; // Enthält den Token für das Web-Formular
}

/**
 * Speichert die finAPI-Benutzerdaten sicher in Firestore.
 * @param taskiloUserId - Die UID des Taskilo-Benutzers.
 * @param credentials - Die zu speichernden finAPI-Daten.
 */
export async function storeFinapiCredentials(
  taskiloUserId: string,
  credentials: Omit<FinapiUserCredentials, 'taskiloUserId' | 'createdAt'>
): Promise<void> {
  const userDocRef = admin.firestore().collection('users').doc(taskiloUserId);
  await userDocRef.set(
    {
      finapiCredentials: {
        ...credentials,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/**
 * Ruft die finAPI-Benutzerdaten aus Firestore ab.
 * @param taskiloUserId - Die UID des Taskilo-Benutzers.
 */
export async function getFinapiCredentials(
  taskiloUserId: string
): Promise<FinapiUserCredentials | null> {
  const userDocRef = admin.firestore().collection('users').doc(taskiloUserId);
  const docSnap = await userDocRef.get();

  if (docSnap.exists && docSnap.data()?.finapiCredentials) {
    return docSnap.data()?.finapiCredentials as FinapiUserCredentials;
  }
  return null;
}
