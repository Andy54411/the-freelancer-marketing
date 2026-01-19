/**
 * E2E Key Registry Service - Öffentliche Schlüsselverwaltung
 * ===========================================================
 * 
 * Speichert und verwaltet öffentliche Schlüssel der Nutzer.
 * Die öffentlichen Schlüssel werden auf dem Server gespeichert,
 * damit andere Nutzer Nachrichten verschlüsseln können.
 * 
 * WICHTIG: Nur PUBLIC Keys werden hier gespeichert!
 * Private Keys verlassen NIEMALS das Gerät des Nutzers.
 */

export interface PublicKeyRecord {
  email: string;
  publicKey: string; // Base64-encoded ECDH public key
  deviceId: string;  // Für Multi-Device Support
  createdAt: string;
  updatedAt: string;
}

/**
 * Registriert den öffentlichen Schlüssel eines Nutzers
 */
export async function registerPublicKey(
  email: string,
  publicKey: string,
  deviceId: string = 'default'
): Promise<void> {
  const response = await fetch('/api/webmail/chat/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, publicKey, deviceId }),
  });
  
  if (!response.ok) {
    throw new Error('Öffentlicher Schlüssel konnte nicht registriert werden');
  }
}

/**
 * Holt den öffentlichen Schlüssel eines Nutzers
 */
export async function getPublicKey(email: string): Promise<string | null> {
  const response = await fetch(`/api/webmail/chat/keys/${encodeURIComponent(email)}`);
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    throw new Error('Öffentlicher Schlüssel konnte nicht abgerufen werden');
  }
  
  const data = await response.json();
  return data.publicKey;
}

/**
 * Holt die öffentlichen Schlüssel mehrerer Nutzer
 */
export async function getPublicKeys(emails: string[]): Promise<Map<string, string>> {
  const response = await fetch('/api/webmail/chat/keys/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails }),
  });
  
  if (!response.ok) {
    throw new Error('Öffentliche Schlüssel konnten nicht abgerufen werden');
  }
  
  const data = await response.json();
  return new Map(Object.entries(data.keys));
}

/**
 * Löscht den öffentlichen Schlüssel (z.B. beim Account-Löschen)
 */
export async function deletePublicKey(email: string): Promise<void> {
  const response = await fetch(`/api/webmail/chat/keys/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Öffentlicher Schlüssel konnte nicht gelöscht werden');
  }
}
