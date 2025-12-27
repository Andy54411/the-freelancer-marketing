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
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME && value) {
      return decodeCredentials(value);
    }
  }
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

  // Load session from cookie
  useEffect(() => {
    const credentials = getCookie();
    if (credentials) {
      setSession({
        email: credentials.email,
        password: credentials.password,
        isAuthenticated: true,
      });
    }
    setIsLoading(false);
  }, []);

  // Public pages that don't require authentication
  const publicPaths = ['/webmail', '/webmail/pricing', '/webmail/pricing/checkout', '/webmail/pricing/success'];
  const isPublicPage = publicPaths.some(path => pathname === path || pathname?.startsWith('/webmail/pricing'));
  
  // Subdomain-Erkennung: Bei Subdomain-Zugriff ist Login-Seite unter /webmail
  const isSubdomain = typeof window !== 'undefined' && 
    window.location.hostname !== 'taskilo.de' && 
    window.location.hostname.endsWith('.taskilo.de');
  
  // Login-URL basierend auf Kontext
  const loginUrl = isSubdomain ? 'https://email.taskilo.de' : '/webmail';

  // Redirect to login if not authenticated and not on public page
  useEffect(() => {
    if (!isLoading && !session?.isAuthenticated && !isPublicPage) {
      if (isSubdomain) {
        // Bei Subdomain zur Email-Login-Seite weiterleiten
        window.location.href = loginUrl;
      } else {
        router.push('/webmail');
      }
    }
  }, [isLoading, session?.isAuthenticated, pathname, router, isPublicPage, isSubdomain, loginUrl]);

  const handleLogout = () => {
    deleteCookie();
    setSession(null);
    router.push('/webmail');
    router.refresh();
  };

  // Don't show layout for login page when not authenticated
  const isLoginPage = pathname === '/webmail' && !session?.isAuthenticated;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  // Show children directly for login page and public pages
  if (isLoginPage || (isPublicPage && !session?.isAuthenticated)) {
    return (
      <WebmailThemeProvider>
        {children}
      </WebmailThemeProvider>
    );
  }

  // Zeige Login-Aufforderung statt leere Seite bei fehlender Session
  if (!session?.isAuthenticated && !isPublicPage) {
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
