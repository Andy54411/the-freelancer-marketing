/**
 * Multi-Session Management für Webmail Account Switcher
 * 
 * Ermöglicht Google-Style Kontowechsel zwischen mehreren E-Mail-Accounts
 */

const COOKIE_NAME = 'webmail_multi_session';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 Tage

export interface WebmailAccount {
  email: string;
  password: string;
  name?: string;
  profileImage?: string;
  addedAt: string;
}

export interface MultiSessionData {
  currentEmail: string;
  accounts: WebmailAccount[];
}

/**
 * Unicode-sichere Base64 Kodierung
 */
function encodeData(data: MultiSessionData): string {
  const jsonStr = JSON.stringify(data);
  const bytes = new TextEncoder().encode(jsonStr);
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}

/**
 * Unicode-sichere Base64 Dekodierung
 */
function decodeData(encoded: string): MultiSessionData | null {
  try {
    const binString = atob(encoded);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Prüft ob wir im Browser sind
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Lösche alle alten Session-Cookies (für Migration)
 */
function clearLegacyCookies(): void {
  if (!isBrowser()) return;
  
  const legacyName = 'webmail_session';
  
  // Ohne Domain
  document.cookie = `${legacyName}=; path=/; max-age=0`;
  document.cookie = `${legacyName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  
  // Mit verschiedenen Domains
  const domains = ['.taskilo.de', 'taskilo.de', 'mail.taskilo.de', 'www.taskilo.de'];
  domains.forEach(domain => {
    document.cookie = `${legacyName}=; path=/; domain=${domain}; max-age=0`;
  });
}

/**
 * Speichere Multi-Session Daten
 */
export function saveMultiSession(data: MultiSessionData): void {
  if (!isBrowser()) return;
  
  // Legacy Cookies löschen
  clearLegacyCookies();
  
  const encoded = encodeData(data);
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    document.cookie = `${COOKIE_NAME}=${encoded}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=${encoded}; max-age=${COOKIE_MAX_AGE}; path=/; domain=.taskilo.de; SameSite=Lax; Secure`;
  }
  
  // Auch in localStorage für schnelleren Zugriff
  try {
    localStorage.setItem(COOKIE_NAME, encoded);
  } catch {
    // localStorage nicht verfügbar
  }
}

/**
 * Lade Multi-Session Daten
 */
export function getMultiSession(): MultiSessionData | null {
  if (!isBrowser()) return null;
  
  // Erst localStorage prüfen (schneller)
  try {
    const localData = localStorage.getItem(COOKIE_NAME);
    if (localData) {
      const decoded = decodeData(localData);
      if (decoded && decoded.accounts.length > 0) {
        return decoded;
      }
    }
  } catch {
    // localStorage nicht verfügbar
  }
  
  // Fallback: Cookie prüfen
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');
    const value = valueParts.join('=');
    if (name === COOKIE_NAME && value) {
      return decodeData(value);
    }
  }
  
  // Legacy Cookie migrieren
  const legacyCookie = getLegacyCookie();
  if (legacyCookie) {
    const migrated: MultiSessionData = {
      currentEmail: legacyCookie.email,
      accounts: [{
        email: legacyCookie.email,
        password: legacyCookie.password,
        addedAt: new Date().toISOString(),
      }],
    };
    saveMultiSession(migrated);
    return migrated;
  }
  
  return null;
}

/**
 * Legacy Cookie auslesen (für Migration)
 */
function getLegacyCookie(): { email: string; password: string } | null {
  if (!isBrowser()) return null;
  
  const legacyName = 'webmail_session';
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');
    const value = valueParts.join('=');
    if (name === legacyName && value) {
      try {
        const binString = atob(value);
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
        const jsonStr = new TextDecoder().decode(bytes);
        return JSON.parse(jsonStr);
      } catch {
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Aktuellen Account abrufen
 */
export function getCurrentAccount(): WebmailAccount | null {
  const session = getMultiSession();
  if (!session) return null;
  
  return session.accounts.find(a => a.email === session.currentEmail) || null;
}

/**
 * Alle Accounts abrufen
 */
export function getAllAccounts(): WebmailAccount[] {
  const session = getMultiSession();
  return session?.accounts || [];
}

/**
 * Neuen Account hinzufügen
 */
export function addAccount(account: Omit<WebmailAccount, 'addedAt'>): MultiSessionData {
  const session = getMultiSession() || { currentEmail: account.email, accounts: [] };
  
  // Prüfen ob Account bereits existiert
  const existingIndex = session.accounts.findIndex(a => a.email === account.email);
  
  if (existingIndex >= 0) {
    // Update existing account
    session.accounts[existingIndex] = {
      ...session.accounts[existingIndex],
      ...account,
      addedAt: session.accounts[existingIndex].addedAt,
    };
  } else {
    // Add new account
    session.accounts.push({
      ...account,
      addedAt: new Date().toISOString(),
    });
  }
  
  saveMultiSession(session);
  return session;
}

/**
 * Zu anderem Account wechseln
 */
export function switchAccount(email: string): WebmailAccount | null {
  const session = getMultiSession();
  if (!session) return null;
  
  const account = session.accounts.find(a => a.email === email);
  if (!account) return null;
  
  session.currentEmail = email;
  saveMultiSession(session);
  
  return account;
}

/**
 * Account entfernen
 */
export function removeAccount(email: string): MultiSessionData | null {
  const session = getMultiSession();
  if (!session) return null;
  
  session.accounts = session.accounts.filter(a => a.email !== email);
  
  // Wenn aktueller Account entfernt wurde, zu anderem wechseln
  if (session.currentEmail === email && session.accounts.length > 0) {
    session.currentEmail = session.accounts[0].email;
  }
  
  if (session.accounts.length > 0) {
    saveMultiSession(session);
    return session;
  } else {
    // Alle Accounts entfernt - Session löschen
    clearAllSessions();
    return null;
  }
}

/**
 * Alle Sessions löschen (Logout von allen Konten)
 */
export function clearAllSessions(): void {
  if (!isBrowser()) return;
  
  // Multi-Session Cookie löschen
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_NAME}=; path=/; domain=.taskilo.de; max-age=0`;
  
  // Legacy Cookies löschen
  clearLegacyCookies();
  
  // localStorage löschen
  try {
    localStorage.removeItem(COOKIE_NAME);
    localStorage.removeItem('webmail_session');
  } catch {
    // localStorage nicht verfügbar
  }
}

/**
 * Prüft ob ein Account bereits verknüpft ist
 */
export function isAccountLinked(email: string): boolean {
  const session = getMultiSession();
  if (!session) return false;
  return session.accounts.some(a => a.email === email);
}

/**
 * Anzahl der verknüpften Accounts
 */
export function getAccountCount(): number {
  const session = getMultiSession();
  return session?.accounts.length || 0;
}

/**
 * Aktualisiere Account-Details (z.B. Name, Profilbild)
 */
export function updateAccountDetails(email: string, updates: Partial<Pick<WebmailAccount, 'name' | 'profileImage'>>): void {
  const session = getMultiSession();
  if (!session) return;
  
  const account = session.accounts.find(a => a.email === email);
  if (account) {
    if (updates.name !== undefined) account.name = updates.name;
    if (updates.profileImage !== undefined) account.profileImage = updates.profileImage;
    saveMultiSession(session);
  }
}
