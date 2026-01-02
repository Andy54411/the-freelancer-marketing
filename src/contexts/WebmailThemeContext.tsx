'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Debug-Logging für Hydration
const themeContextLog = (step: string, data?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    console.log(`[HYDRATION-DEBUG][WebmailThemeContext] ${step}`, data ? JSON.stringify(data, null, 2) : '');
  } else {
    console.log(`[HYDRATION-DEBUG][WebmailThemeContext-SERVER] ${step}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

type Theme = 'light' | 'dark';

interface WebmailThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isMounted: boolean; // NEU: Zeigt an ob Client gemountet ist
}

const WebmailThemeContext = createContext<WebmailThemeContextType>({
  theme: 'light', // KRITISCH: Default auf 'light' für SSR
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false, // KRITISCH: Default auf false für SSR
  isMounted: false,
});

export const useWebmailTheme = () => useContext(WebmailThemeContext);

const STORAGE_KEY = 'webmail_theme';

export function WebmailThemeProvider({ children }: { children: ReactNode }) {
  themeContextLog('PROVIDER_RENDER_START', { isServer: typeof window === 'undefined' });
  
  // KRITISCH: Initial auf 'light' setzen für SSR-Konsistenz
  const [theme, setThemeState] = useState<Theme>('light');
  const [isMounted, setIsMounted] = useState(false);
  
  themeContextLog('STATE_INITIALIZED', { theme, isMounted });

  // KRITISCH: Erst nach Mount aus localStorage laden
  useEffect(() => {
    themeContextLog('MOUNT_EFFECT_START');
    setIsMounted(true);
    
    const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    themeContextLog('LOCALSTORAGE_READ', { savedTheme });
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
      themeContextLog('THEME_SET_FROM_STORAGE', { savedTheme });
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    themeContextLog('SET_THEME_CALLED', { newTheme });
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    themeContextLog('TOGGLE_THEME', { from: theme, to: newTheme });
    setTheme(newTheme);
  };

  themeContextLog('BEFORE_PROVIDER_RETURN', { theme, isDark: theme === 'dark', isMounted });

  return (
    <WebmailThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === 'dark',
        isMounted,
      }}
    >
      {children}
    </WebmailThemeContext.Provider>
  );
}
