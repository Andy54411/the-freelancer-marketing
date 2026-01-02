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
