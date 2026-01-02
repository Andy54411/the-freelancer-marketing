'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { WebmailThemeProvider, useWebmailTheme } from '@/contexts/WebmailThemeContext';

// ============ HYDRATION DEBUG LOGGING ============
const HYDRATION_DEBUG = true;

function layoutLog(location: string, data?: Record<string, unknown>) {
  if (!HYDRATION_DEBUG) return;
  const isServer = typeof window === 'undefined';
  const prefix = isServer ? '[SERVER]' : '[CLIENT]';
  console.log(`${prefix} [HYDRATION-DEBUG][WebmailLayout] ${location}`, data ? JSON.stringify(data, null, 2) : '');
}

layoutLog('MODULE_LOAD', { isServer: typeof window === 'undefined' });

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
  layoutLog('LAYOUT_RENDER_START');
  
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<WebmailSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  layoutLog('STATE_INITIALIZED', { 
    pathname, 
    hasSession: !!session, 
    isLoading, 
    isMounted 
  });

  // Mount effect
  useEffect(() => {
    layoutLog('MOUNT_EFFECT_START');
    setIsMounted(true);
    layoutLog('MOUNT_EFFECT_COMPLETE');
  }, []);

  // Load session from cookie
  useEffect(() => {
    layoutLog('SESSION_LOAD_EFFECT', { isMounted });
    if (!isMounted) return;
    
    const credentials = getCookie();
    layoutLog('SESSION_LOAD_COOKIE_RESULT', { hasCredentials: !!credentials });
    if (credentials) {
      setSession({
        email: credentials.email,
        password: credentials.password,
        isAuthenticated: true,
      });
    }
    setIsLoading(false);
    layoutLog('SESSION_LOAD_COMPLETE', { hasSession: !!credentials });
  }, [isMounted]);

  // Public pages that don't require authentication
  const publicPaths = ['/webmail', '/webmail/pricing', '/webmail/pricing/checkout', '/webmail/pricing/success'];
  const isPublicPage = publicPaths.some(path => pathname === path || pathname?.startsWith('/webmail/pricing'));

  // Redirect to login if not authenticated and not on public page
  useEffect(() => {
    layoutLog('AUTH_REDIRECT_CHECK', { isLoading, isAuthenticated: session?.isAuthenticated, isPublicPage, pathname });
    if (!isLoading && !session?.isAuthenticated && !isPublicPage) {
      layoutLog('AUTH_REDIRECT_EXECUTING');
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
  
  layoutLog('RENDER_DECISION', { 
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
  
  layoutLog('INNER_RENDER', { isMounted, isLoading, isLoginPage, isPublicPage, hasSession: !!session, isDark });

  // Loading state - aber mit konsistentem Container
  if (!isMounted || isLoading) {
    layoutLog('INNER_RENDER_LOADING');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" suppressHydrationWarning>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  // Public/Login pages - direkt children rendern
  if (isLoginPage || (isPublicPage && !session?.isAuthenticated)) {
    layoutLog('INNER_RENDER_PUBLIC');
    return <>{children}</>;
  }

  // Not authenticated and not public
  if (!session?.isAuthenticated && !isPublicPage) {
    layoutLog('INNER_RENDER_AUTH_REQUIRED');
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
  layoutLog('INNER_RENDER_AUTHENTICATED');
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
