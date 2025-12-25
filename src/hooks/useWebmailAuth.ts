'use client';

import { useState, useEffect } from 'react';

// Cookie helper functions - shared across all webmail apps
const COOKIE_NAME = 'webmail_session';

function decodeCredentials(encoded: string): { email: string; password: string } | null {
  try {
    const binString = atob(encoded);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
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

export interface WebmailAuthState {
  email: string | null;
  password: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useWebmailAuth(): WebmailAuthState {
  const [state, setState] = useState<WebmailAuthState>({
    email: null,
    password: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const credentials = getCookie();
    if (credentials && credentials.email && credentials.password) {
      setState({
        email: credentials.email,
        password: credentials.password,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setState({
        email: null,
        password: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  return state;
}
