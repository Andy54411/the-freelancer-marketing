'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { WebmailThemeProvider, useWebmailTheme } from '@/contexts/WebmailThemeContext';

// Cookie helper functions
const COOKIE_NAME = 'webmail_session';

function decodeCredentials(encoded: string): { email: string; password: string } | null {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

function getCookie(): { email: string; password: string } | null {
  if (typeof document === 'undefined') {
    console.log('[getCookie] SSR - no document');
    return null;
  }
  console.log('[getCookie] All cookies:', document.cookie);
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    console.log('[getCookie] Checking:', name, '=', value ? value.substring(0, 20) + '...' : 'empty');
    if (name === COOKIE_NAME && value) {
      const decoded = decodeCredentials(value);
      console.log('[getCookie] Found webmail_session, decoded:', decoded ? 'SUCCESS' : 'FAILED');
      return decoded;
    }
  }
  console.log('[getCookie] webmail_session NOT found');
  return null;
}

function deleteCookie(): void {
  // Cookie auf ALLEN moeglichen Domains loeschen (alte + neue Varianten)
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_NAME}=; path=/; domain=.taskilo.de; max-age=0`;
  document.cookie = `${COOKIE_NAME}=; path=/; domain=taskilo.de; max-age=0`;
  // Auch auf aktueller Subdomain
  if (typeof window !== 'undefined') {
    document.cookie = `${COOKIE_NAME}=; path=/; domain=${window.location.hostname}; max-age=0`;
  }
}

// Webmail Session Context
interface WebmailSession {
  email: string;
  password: string;
  isAuthenticated: boolean;
}

const WebmailContext = createContext<{
  session: WebmailSession | null;
  logout: () => void;
}>({
  session: null,
  logout: () => {},
});

export const useWebmailSession = () => useContext(WebmailContext);

export default function WebmailLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<WebmailSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // DEBUG: Log beim Mount (nur client-side)
  useEffect(() => {
    setIsMounted(true);
    // Subdomain-Erkennung nur im Client
    const hostname = window.location.hostname;
    const subdomain = hostname !== 'taskilo.de' && 
      hostname !== 'www.taskilo.de' &&
      hostname.endsWith('.taskilo.de');
    setIsSubdomain(subdomain);
    console.log('[WebmailLayout] Mount - pathname:', pathname, 'hostname:', hostname, 'isSubdomain:', subdomain);
  }, [pathname]);

  // Load session from cookie
  useEffect(() => {
    if (!isMounted) return;
    console.log('[WebmailLayout] useEffect - checking cookie...');
    console.log('[WebmailLayout] document.cookie:', document.cookie);
    const credentials = getCookie();
    console.log('[WebmailLayout] credentials:', credentials ? 'FOUND' : 'NOT FOUND');
    if (credentials) {
      console.log('[WebmailLayout] Setting session for:', credentials.email);
      setSession({
        email: credentials.email,
        password: credentials.password,
        isAuthenticated: true,
      });
    }
    setIsLoading(false);
  }, [isMounted]);

  // Public pages that don't require authentication
  const publicPaths = ['/webmail', '/webmail/pricing', '/webmail/pricing/checkout', '/webmail/pricing/success'];
  const isPublicPage = publicPaths.some(path => pathname === path || pathname?.startsWith('/webmail/pricing'));
  
  // Bei Subdomain ist die Root-Seite (/) auch eine public/login page
  const isSubdomainRoot = isSubdomain && pathname === '/';
  
  // Login-URL basierend auf Kontext - NICHT auf gleiche URL redirecten!
  const loginUrl = '/webmail';

  // Redirect to login if not authenticated and not on public page
  // WICHTIG: Bei Subdomain-Root NICHT redirecten (das IST die Login-Seite)
  useEffect(() => {
    if (!isLoading && !session?.isAuthenticated && !isPublicPage && !isSubdomainRoot) {
      // Nur von taskilo.de zum Webmail-Login redirecten, nicht von Subdomains
      if (!isSubdomain) {
        router.push('/webmail');
      }
      // Bei Subdomains zeigen wir die Login-Required Page (kein Redirect-Loop)
    }
  }, [isLoading, session?.isAuthenticated, pathname, router, isPublicPage, isSubdomain, isSubdomainRoot]);

  const handleLogout = () => {
    deleteCookie();
    setSession(null);
    router.push('/webmail');
    router.refresh();
  };

  // Don't show layout for login page when not authenticated
  // Auf Subdomain ist '/' die Login-Seite, auf Hauptdomain '/webmail'
  const isLoginPage = (pathname === '/webmail' || isSubdomainRoot) && !session?.isAuthenticated;

  console.log('[WebmailLayout] Render decision:', {
    isMounted,
    isLoading,
    isAuthenticated: session?.isAuthenticated,
    isPublicPage,
    isLoginPage,
    isSubdomain,
    isSubdomainRoot,
    pathname,
  });

  // WICHTIG: Während SSR und erstem Client-Render immer Loading Spinner zeigen
  // Das verhindert Hydration Mismatch
  if (!isMounted || isLoading) {
    console.log('[WebmailLayout] Returning: LOADING SPINNER');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  // Show children directly for login page and public pages
  if (isLoginPage || (isPublicPage && !session?.isAuthenticated)) {
    console.log('[WebmailLayout] Returning: PUBLIC PAGE / LOGIN');
    return (
      <WebmailThemeProvider>
        {children}
      </WebmailThemeProvider>
    );
  }

  // Zeige Login-Aufforderung statt leere Seite bei fehlender Session
  if (!session?.isAuthenticated && !isPublicPage) {
    console.log('[WebmailLayout] Returning: LOGIN REQUIRED PAGE');
    return (
      <WebmailThemeProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Anmeldung erforderlich</h1>
            <p className="text-gray-600 mb-6">
              Bitte melde dich an, um auf diese App zuzugreifen.
            </p>
            <a 
              href="https://mail.taskilo.de" 
              className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              Zur Anmeldung
            </a>
          </div>
        </div>
      </WebmailThemeProvider>
    );
  }

  console.log('[WebmailLayout] Returning: AUTHENTICATED LAYOUT with children');
  return (
    <WebmailContext.Provider value={{ session, logout: handleLogout }}>
      <WebmailThemeProvider>
        <ThemedWebmailContainer>
          {children}
        </ThemedWebmailContainer>
      </WebmailThemeProvider>
    </WebmailContext.Provider>
  );
}

function ThemedWebmailContainer({ children }: { children: ReactNode }) {
  const { isDark } = useWebmailTheme();
  
  return (
    <div className={`min-h-screen w-full ${isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]'}`}>
      {children}
    </div>
  );
}
