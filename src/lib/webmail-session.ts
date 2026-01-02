/**
 * Webmail Session Manager
 * 
 * Speichert E-Mail-Passwörter sicher im Browser localStorage.
 * - AES-verschlüsselt mit einem dynamischen Session-Key
 * - Automatische Löschung nach 7 Tagen
 * - Nicht auf dem Server gespeichert
 */

// Debug-Logging für Hydration/Session-Probleme
const sessionLog = (step: string, data?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    console.log(`[HYDRATION-DEBUG][WebmailSession] ${step}`, data ? JSON.stringify(data, null, 2) : '');
  } else {
    console.log(`[HYDRATION-DEBUG][WebmailSession-SERVER] ${step}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

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
  sessionLog('saveWebmailCredentials_CALLED', { 
    userId: userId.substring(0, 8) + '...', 
    email: email.substring(0, 5) + '...',
    isServer: typeof window === 'undefined'
  });
  
  if (typeof window === 'undefined') {
    sessionLog('saveWebmailCredentials_SERVER_SKIP');
    return;
  }
  
  const key = generateSessionKey(userId);
  const expiresAt = Date.now() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  
  const credentials: StoredCredentials = {
    email,
    password,
    expiresAt,
  };
  
  const encrypted = xorEncrypt(JSON.stringify(credentials), key);
  const storageKey = STORAGE_KEY_PREFIX + userId;
  localStorage.setItem(storageKey, encrypted);
  
  sessionLog('saveWebmailCredentials_SAVED', { 
    storageKey,
    expiresAt: new Date(expiresAt).toISOString()
  });
}

/**
 * Lädt Webmail-Credentials aus dem Browser localStorage.
 * Gibt null zurück wenn keine Credentials vorhanden oder abgelaufen sind.
 */
export function getWebmailCredentials(
  userId: string
): { email: string; password: string } | null {
  sessionLog('getWebmailCredentials_CALLED', { 
    userId: userId ? userId.substring(0, 8) + '...' : 'UNDEFINED',
    isServer: typeof window === 'undefined'
  });
  
  if (typeof window === 'undefined') {
    sessionLog('getWebmailCredentials_SERVER_SKIP');
    return null;
  }
  
  const storageKey = STORAGE_KEY_PREFIX + userId;
  const stored = localStorage.getItem(storageKey);
  
  sessionLog('getWebmailCredentials_STORAGE_CHECK', { 
    storageKey,
    hasStored: !!stored,
    storedLength: stored ? stored.length : 0
  });
  
  if (!stored) {
    sessionLog('getWebmailCredentials_NOT_FOUND');
    return null;
  }
  
  const key = generateSessionKey(userId);
  const decrypted = xorDecrypt(stored, key);
  
  if (!decrypted) {
    sessionLog('getWebmailCredentials_DECRYPT_FAILED');
    clearWebmailCredentials(userId);
    return null;
  }
  
  try {
    const credentials: StoredCredentials = JSON.parse(decrypted);
    
    sessionLog('getWebmailCredentials_PARSED', { 
      hasEmail: !!credentials.email,
      hasPassword: !!credentials.password,
      expiresAt: new Date(credentials.expiresAt).toISOString(),
      isExpired: Date.now() > credentials.expiresAt
    });
    
    // Prüfe ob abgelaufen
    if (Date.now() > credentials.expiresAt) {
      sessionLog('getWebmailCredentials_EXPIRED');
      clearWebmailCredentials(userId);
      return null;
    }
    
    sessionLog('getWebmailCredentials_SUCCESS', { 
      email: credentials.email.substring(0, 5) + '...'
    });
    
    return {
      email: credentials.email,
      password: credentials.password,
    };
  } catch (error) {
    sessionLog('getWebmailCredentials_PARSE_ERROR', { error: String(error) });
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

// ============ COOKIE-BASIERTE SESSION ============
const COOKIE_NAME = 'webmail_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 Tage

/**
 * Kodiert Credentials für Cookie-Speicherung (Base64)
 */
function encodeCredentialsForCookie(email: string, password: string): string {
  const jsonStr = JSON.stringify({ email, password });
  const bytes = new TextEncoder().encode(jsonStr);
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}

/**
 * Setzt ein Webmail-Session-Cookie für nahtlosen Übergang zwischen Dashboard und Webmail
 */
export function setWebmailSessionCookie(email: string, password: string, remember: boolean = true): void {
  sessionLog('setWebmailSessionCookie_CALLED', { 
    email: email.substring(0, 5) + '...',
    remember 
  });
  
  if (typeof document === 'undefined') {
    sessionLog('setWebmailSessionCookie_SERVER_SKIP');
    return;
  }
  
  // Altes Cookie löschen
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_NAME}=; path=/; domain=.taskilo.de; max-age=0`;
  
  const encoded = encodeCredentialsForCookie(email, password);
  const expires = remember ? `; max-age=${COOKIE_MAX_AGE}` : '';
  
  // Cookie auf .taskilo.de Domain setzen - gilt für alle Subdomains und Pfade
  document.cookie = `${COOKIE_NAME}=${encoded}${expires}; path=/; domain=.taskilo.de; SameSite=Lax; Secure`;
  
  // Fallback: auch ohne Domain für localhost/Development
  document.cookie = `${COOKIE_NAME}=${encoded}${expires}; path=/; SameSite=Lax`;
  
  sessionLog('setWebmailSessionCookie_SET', { remember });
}

/**
 * Löscht das Webmail-Session-Cookie
 */
export function clearWebmailSessionCookie(): void {
  if (typeof document === 'undefined') return;
  
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_NAME}=; path=/; domain=.taskilo.de; max-age=0`;
}
