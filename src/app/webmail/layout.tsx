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
  document.cookie = `${COOKIE_NAME}=; path=/webmail; max-age=0`;
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

  // Show nothing while redirecting
  if (!session?.isAuthenticated && !isPublicPage) {
    return null;
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
