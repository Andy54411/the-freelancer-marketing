/**
 * Zentrale URL-Utility fuer Webmail-Apps
 * Nur Pfad-basierte URLs: taskilo.de/webmail, taskilo.de/kalender, etc.
 */

// Pfad-Mapping fuer Apps
const APP_PATHS: Record<string, string> = {
  webmail: '/webmail',
  calendar: '/webmail/calendar',
  meet: '/webmail/meet',
  drive: '/webmail/drive',
  tasks: '/webmail/tasks',
  contacts: '/webmail/contacts',
};

/**
 * Prueft ob wir in Produktion sind (taskilo.de Domain)
 */
export function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('taskilo.de');
}

/**
 * Gibt die aktuelle App basierend auf dem Pfad zurueck
 */
export function getCurrentApp(): string {
  if (typeof window === 'undefined') return '/webmail';
  
  const pathname = window.location.pathname;
  
  // Pfad pruefen
  for (const path of Object.values(APP_PATHS)) {
    if (pathname.startsWith(path)) {
      return path;
    }
  }
  
  return '/webmail';
}

/**
 * Gibt den Pfad zurueck (keine Subdomain-Umwandlung mehr)
 */
export function getAppUrl(path: string): string {
  // Einfach den Pfad zurueckgeben - keine Subdomain-Umwandlung
  return path;
}

/**
 * Cookie-Domain fuer alle Subdomains
 */
export function getCookieDomain(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.includes('taskilo.de') ? '; domain=.taskilo.de' : '';
}

/**
 * Setzt ein Cookie mit korrekter Domain
 */
export function setWebmailCookie(name: string, value: string, maxAge?: number): void {
  const domain = getCookieDomain();
  const expires = maxAge ? `; max-age=${maxAge}` : '';
  document.cookie = `${name}=${value}${expires}; path=/${domain}; SameSite=Lax; Secure`;
}

/**
 * Loescht ein Cookie auf allen Subdomains
 */
export function deleteWebmailCookie(name: string): void {
  const domain = getCookieDomain();
  document.cookie = `${name}=; path=/${domain}; max-age=0`;
}
