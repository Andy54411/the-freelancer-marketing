'use server';

import { cookies } from 'next/headers';
import { admin } from '@/firebase/server';

/**
 * Verifiziert das Session-Cookie aus dem Request und prüft, ob der Benutzer
 * die Rolle 'master' oder 'support' hat. Wirft einen Fehler, wenn die Prüfung fehlschlägt.
 * Dies ist der empfohlene Weg, um Server Actions abzusichern.
 *
 * @param {string} [sessionCookieValue] - Optionaler Session-Cookie-Wert. Wenn nicht angegeben, wird er aus den Headern gelesen.
 * @returns {Promise<{uid: string, role: string}>} Die UID und Rolle des verifizierten Admin-Benutzers.
 */
export async function verifyAdmin(sessionCookieValue?: string) {
  try {
    const sessionCookie = sessionCookieValue || cookies().get('__session')?.value;

    if (!sessionCookie) {
      throw new Error('Nicht authentifiziert. Session-Cookie nicht gefunden.');
    }

    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
    if (decodedToken.role !== 'master' && decodedToken.role !== 'support') {
      throw new Error('Nicht autorisiert. Sie haben keine Berechtigung für diese Aktion.');
    }

    return { uid: decodedToken.uid, role: decodedToken.role as string };
  } catch (error) {
    console.error('[verifyAdmin] Fehler bei der Sitzungsüberprüfung:', error);
    throw new Error('Sitzung ungültig oder abgelaufen. Bitte melden Sie sich erneut an.');
  }
}
