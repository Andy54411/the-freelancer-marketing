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
    const trimmed = cookie.trim();
    const [name, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');
    if (name === COOKIE_NAME && value) {
      return decodeCredentials(value);
    }
  }
  return null;
}

function deleteCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
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
  const [isMounted, setIsMounted] = useState(false);
  
    pathname, 
    hasSession: !!session, 
    isLoading, 
    isMounted 
  });

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load session from cookie
  useEffect(() => {
    if (!isMounted) return;
    
    const credentials = getCookie();
    if (credentials) {
      setSession({
        email: credentials.email,
        password: credentials.password,
        isAuthenticated: true,
      });
    }
    setIsLoading(false);
  }, [isMounted]);

  // Public pages that don't require authentication
  const publicPaths = ['/webmail', '/webmail/pricing', '/webmail/pricing/checkout', '/webmail/pricing/success', '/webmail/register'];
  // Meet-Seiten sind IMMER öffentlich - Gäste können jederzeit beitreten
  // Die Authentifizierung wird auf der Meet-Seite selbst gehandhabt (Gast-Name-Modal)
  const isMeetPage = pathname?.startsWith('/webmail/meet');
  const isPublicPage = publicPaths.some(path => pathname === path || pathname?.startsWith('/webmail/pricing')) || isMeetPage;

  // Redirect to login if not authenticated and not on public page
  useEffect(() => {
    if (!isLoading && !session?.isAuthenticated && !isPublicPage) {
      router.push('/webmail');
    }
  }, [isLoading, session?.isAuthenticated, pathname, router, isPublicPage]);

  const handleLogout = () => {
    deleteCookie();
    setSession(null);
    router.push('/webmail');
    router.refresh();
  };

  // Login page detection
  const isLoginPage = pathname === '/webmail' && !session?.isAuthenticated;
  
    isMounted, 
    isLoading, 
    isLoginPage, 
    isPublicPage, 
    isAuthenticated: session?.isAuthenticated 
  });

  // KRITISCH: Immer denselben Wrapper rendern um Hydration-Mismatch zu vermeiden!
  // Der Loading-State wird innerhalb des Wrappers gehandelt, nicht durch unterschiedliche Returns.
  return (
    <WebmailContext.Provider value={{ session, logout: handleLogout }}>
      <WebmailThemeProvider>
        <WebmailLayoutInner
          isMounted={isMounted}
          isLoading={isLoading}
          isLoginPage={isLoginPage}
          isPublicPage={isPublicPage}
          session={session}
        >
          {children}
        </WebmailLayoutInner>
      </WebmailThemeProvider>
    </WebmailContext.Provider>
  );
}

// Innere Komponente für bedingtes Rendering NACH der Hydration
function WebmailLayoutInner({ 
  children, 
  isMounted, 
  isLoading, 
  isLoginPage, 
  isPublicPage, 
  session 
}: { 
  children: ReactNode; 
  isMounted: boolean; 
  isLoading: boolean; 
  isLoginPage: boolean; 
  isPublicPage: boolean; 
  session: WebmailSession | null;
}) {
  const { isDark } = useWebmailTheme();
  

  // Loading state - aber mit konsistentem Container
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" suppressHydrationWarning>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  // Public/Login pages - direkt children rendern
  if (isLoginPage || (isPublicPage && !session?.isAuthenticated)) {
    return <>{children}</>;
  }

  // Not authenticated and not public
  if (!session?.isAuthenticated && !isPublicPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Anmeldung erforderlich</h1>
          <p className="text-gray-600 mb-6">
            Bitte melde dich an, um auf diese App zuzugreifen.
          </p>
          <a 
            href="/webmail" 
            className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            Zur Anmeldung
          </a>
        </div>
      </div>
    );
  }

  // Authenticated layout with theme
  return (
    <div className={`min-h-screen w-full ${isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]'}`}>
      {children}
    </div>
  );
}

// Webmail Session Interface für Export
interface WebmailSession {
  email: string;
  password: string;
  isAuthenticated: boolean;
}
