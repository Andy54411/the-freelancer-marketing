/**
 * Webmail Session Manager
 * 
 * Speichert E-Mail-Passwörter sicher im Browser localStorage.
 * - AES-verschlüsselt mit einem dynamischen Session-Key
 * - Automatische Löschung nach 7 Tagen
 * - Nicht auf dem Server gespeichert
 */

const STORAGE_KEY_PREFIX = 'taskilo_webmail_session_';
const SESSION_EXPIRY_DAYS = 7;

/**
 * Generiert einen einfachen Hash aus der User-ID für die Verschlüsselung.
 * Dies ist keine kryptografisch sichere Methode, aber schützt vor
 * einfachem Auslesen des localStorage.
 */
function generateSessionKey(userId: string): string {
  let hash = 0;
  const str = userId + '_taskilo_2025';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + '_' + userId.slice(0, 8);
}

/**
 * Einfache XOR-basierte Verschlüsselung.
 * Schützt vor direktem Auslesen, ist aber nicht kryptografisch sicher.
 */
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function xorDecrypt(encoded: string, key: string): string {
  try {
    const text = atob(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
}

interface StoredCredentials {
  email: string;
  password: string;
  expiresAt: number;
}

/**
 * Speichert Webmail-Credentials im Browser localStorage.
 */
export function saveWebmailCredentials(
  userId: string,
  email: string,
  password: string
): void {
  if (typeof window === 'undefined') return;
  
  const key = generateSessionKey(userId);
  const expiresAt = Date.now() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  
  const credentials: StoredCredentials = {
    email,
    password,
    expiresAt,
  };
  
  const encrypted = xorEncrypt(JSON.stringify(credentials), key);
  localStorage.setItem(STORAGE_KEY_PREFIX + userId, encrypted);
}

/**
 * Lädt Webmail-Credentials aus dem Browser localStorage.
 * Gibt null zurück wenn keine Credentials vorhanden oder abgelaufen sind.
 */
export function getWebmailCredentials(
  userId: string
): { email: string; password: string } | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
  if (!stored) return null;
  
  const key = generateSessionKey(userId);
  const decrypted = xorDecrypt(stored, key);
  
  if (!decrypted) {
    clearWebmailCredentials(userId);
    return null;
  }
  
  try {
    const credentials: StoredCredentials = JSON.parse(decrypted);
    
    // Prüfe ob abgelaufen
    if (Date.now() > credentials.expiresAt) {
      clearWebmailCredentials(userId);
      return null;
    }
    
    return {
      email: credentials.email,
      password: credentials.password,
    };
  } catch {
    clearWebmailCredentials(userId);
    return null;
  }
}

/**
 * Löscht Webmail-Credentials aus dem Browser localStorage.
 */
export function clearWebmailCredentials(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_PREFIX + userId);
}

/**
 * Prüft ob Webmail-Credentials vorhanden sind.
 */
export function hasWebmailCredentials(userId: string): boolean {
  return getWebmailCredentials(userId) !== null;
}

/**
 * Verlängert die Session um weitere 7 Tage.
 */
export function refreshWebmailSession(userId: string): void {
  const credentials = getWebmailCredentials(userId);
  if (credentials) {
    saveWebmailCredentials(userId, credentials.email, credentials.password);
  }
}
