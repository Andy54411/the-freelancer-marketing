/**
 * Zentrale URL-Utility fuer Webmail-Apps
 * Unterstuetzt Subdomain-Routing in Produktion und Pfad-Routing in Entwicklung
 */

// Subdomain-Mapping
const SUBDOMAIN_MAP: Record<string, string> = {
  '/webmail': 'https://email.taskilo.de',
  '/webmail/calendar': 'https://kalender.taskilo.de',
  '/webmail/meet': 'https://meet.taskilo.de',
  '/webmail/drive': 'https://drive.taskilo.de',
  '/webmail/tasks': 'https://task.taskilo.de',
  '/webmail/contacts': 'https://kontakt.taskilo.de',
};

// Reverse Mapping: Subdomain -> Pfad
const PATH_MAP: Record<string, string> = {
  'email.taskilo.de': '/webmail',
  'kalender.taskilo.de': '/webmail/calendar',
  'meet.taskilo.de': '/webmail/meet',
  'drive.taskilo.de': '/webmail/drive',
  'task.taskilo.de': '/webmail/tasks',
  'kontakt.taskilo.de': '/webmail/contacts',
};

/**
 * Prueft ob wir in Produktion sind (taskilo.de Domain)
 */
export function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('taskilo.de');
}

/**
 * Gibt die aktuelle App basierend auf Subdomain oder Pfad zurueck
 */
export function getCurrentApp(): string {
  if (typeof window === 'undefined') return '/webmail';
  
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // Subdomain pruefen
  if (PATH_MAP[hostname]) {
    return PATH_MAP[hostname];
  }
  
  // Pfad pruefen
  for (const path of Object.keys(SUBDOMAIN_MAP)) {
    if (pathname.startsWith(path)) {
      return path;
    }
  }
  
  return '/webmail';
}

/**
 * Konvertiert einen internen Pfad zur korrekten URL (Subdomain in Produktion, Pfad in Entwicklung)
 */
export function getAppUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  
  if (!isProduction()) return path;
  
  // Exakter Match
  if (SUBDOMAIN_MAP[path]) {
    return SUBDOMAIN_MAP[path];
  }
  
  // Prefix Match (z.B. /webmail/drive/folder/123)
  for (const [prefix, subdomain] of Object.entries(SUBDOMAIN_MAP)) {
    if (path.startsWith(prefix + '/') || path === prefix) {
      // Subdomain + Rest des Pfads
      const subPath = path.slice(prefix.length);
      return subdomain + subPath;
    }
  }
  
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
