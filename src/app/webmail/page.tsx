'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreateEmailForm } from '@/components/email/CreateEmailForm';
import { WebmailClient } from '@/components/webmail/WebmailClient';
import { Loader2 } from 'lucide-react';
import { HeroHeader } from '@/components/hero8-header';

// Cookie helper functions
const COOKIE_NAME = 'webmail_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function encodeCredentials(email: string, password: string): string {
  // Base64 encode the credentials (in production, use proper encryption)
  return btoa(JSON.stringify({ email, password }));
}

function decodeCredentials(encoded: string): { email: string; password: string } | null {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

function setCookie(email: string, password: string, remember: boolean): void {
  const encoded = encodeCredentials(email, password);
  const maxAge = remember ? COOKIE_MAX_AGE : 0; // Session cookie if not remember
  const expires = remember 
    ? `; max-age=${maxAge}` 
    : ''; // Session cookie expires when browser closes
  document.cookie = `${COOKIE_NAME}=${encoded}${expires}; path=/webmail; SameSite=Strict; Secure`;
}

function getCookie(): { email: string; password: string } | null {
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

export default function WebmailPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const savedCredentials = getCookie();
      if (savedCredentials) {
        // Verify credentials are still valid
        try {
          const response = await fetch('/api/webmail/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: savedCredentials.email,
              password: savedCredentials.password,
              imapHost: 'mail.taskilo.de',
              imapPort: 993,
            }),
          });

          const data = await response.json();

          if (data.success) {
            setEmail(savedCredentials.email);
            setPassword(savedCredentials.password);
            setIsConnected(true);
          } else {
            // Invalid credentials, remove cookie
            deleteCookie();
          }
        } catch {
          // Network error, but keep credentials for retry
          setEmail(savedCredentials.email);
          setPassword(savedCredentials.password);
        }
      }
      setIsCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleConnect = async () => {
    if (!email || !password) return;
    
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const response = await fetch('/api/webmail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          imapHost: 'mail.taskilo.de',
          imapPort: 993,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Save credentials to cookie
        setCookie(email, password, rememberMe);
        setIsConnected(true);
      } else {
        setConnectionError(data.error || 'Verbindung fehlgeschlagen');
      }
    } catch {
      setConnectionError('Netzwerkfehler');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = useCallback(() => {
    deleteCookie();
    setIsConnected(false);
    setPassword('');
  }, []);

  const handleEmailCreated = (createdEmail: string) => {
    setEmail(createdEmail);
    setShowCreateForm(false);
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f6f8fc]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <span className="text-gray-600">Sitzung wird geprüft...</span>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <WebmailClient 
        email={email} 
        password={password} 
        onLogout={handleLogout}
      />
    );
  }

  return (
    <>
      <style jsx>{`
        .webmail-body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .webmail-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 20px 60px;
          margin-top: 60px;
        }
        
        .webmail-login-container { width: 100%; max-width: 500px; }
        
        .webmail-login-title-small {
          font-size: 18px;
          font-weight: 400;
          color: #1e293b;
          margin-bottom: 4px;
        }
        
        .webmail-login-title-big {
          font-size: 48px;
          font-weight: 800;
          color: #0d9488;
          margin-bottom: 40px;
          letter-spacing: -1px;
        }
        
        .webmail-form-group { margin-bottom: 16px; }
        
        .webmail-input-wrapper {
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }
        
        .webmail-input-wrapper:focus-within {
          border-color: #0d9488;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
        }
        
        .webmail-input-wrapper .input-icon {
          padding: 16px 20px;
          color: #64748b;
        }
        .webmail-input-wrapper .input-icon svg {
          width: 20px;
          height: 20px;
        }
        
        .webmail-input-wrapper .toggle-password {
          padding: 16px 20px;
          color: #64748b;
          cursor: pointer;
          user-select: none;
        }
        .webmail-input-wrapper .toggle-password:hover {
          color: #0d9488;
        }
        .webmail-input-wrapper .toggle-password svg {
          width: 20px;
          height: 20px;
        }
        
        .webmail-input-wrapper input {
          flex: 1;
          border: none;
          outline: none;
          padding: 16px 0;
          font-size: 16px;
          font-family: inherit;
          background: transparent;
        }
        
        .webmail-input-wrapper input::placeholder { color: #94a3b8; }
        
        .webmail-forgot-link {
          display: inline-block;
          margin: 12px 0 20px;
          color: #1e293b;
          text-decoration: underline;
          font-size: 14px;
          background: none;
          border: none;
          cursor: pointer;
        }
        .webmail-forgot-link:hover { color: #0d9488; }
        
        .webmail-checkbox-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 30px;
        }
        .webmail-checkbox-wrapper input[type="checkbox"] {
          width: 20px;
          height: 20px;
          accent-color: #0d9488;
        }
        .webmail-checkbox-wrapper label { font-size: 14px; color: #1e293b; }
        
        .webmail-submit-btn {
          width: 100%;
          padding: 18px 32px;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%);
          border: none;
          border-radius: 50px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(13, 148, 136, 0.35);
        }
        .webmail-submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(13, 148, 136, 0.45);
        }
        .webmail-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .webmail-create-link {
          display: block;
          text-align: center;
          margin-top: 30px;
          color: #0d9488;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        .webmail-create-link:hover { text-decoration: underline; }
        
        .webmail-alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        
        @media (max-width: 600px) {
          .webmail-login-title-big { font-size: 36px; }
        }
      `}</style>

      <div className="webmail-body">
        <HeroHeader />

        <main className="webmail-main">
          {showCreateForm ? (
            <div className="webmail-login-container">
              <CreateEmailForm onEmailCreated={handleEmailCreated} />
              <button 
                className="webmail-create-link"
                onClick={() => setShowCreateForm(false)}
              >
                Bereits eine @taskilo.de Adresse? Anmelden
              </button>
            </div>
          ) : (
            <div className="webmail-login-container">
              <p className="webmail-login-title-small">Taskilo Webmail</p>
              <h1 className="webmail-login-title-big">LOGIN</h1>
              
              {connectionError && (
                <div className="webmail-alert">{connectionError}</div>
              )}
              
              <form onSubmit={(e) => { e.preventDefault(); handleConnect(); }}>
                <div className="webmail-form-group">
                  <div className="webmail-input-wrapper">
                    <span className="input-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-Mail-Adresse"
                      required
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                </div>
                
                <div className="webmail-form-group">
                  <div className="webmail-input-wrapper">
                    <span className="input-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Passwort"
                      required
                      autoComplete="current-password"
                    />
                    <span 
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      title="Passwort anzeigen"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </span>
                  </div>
                </div>
                
                <button type="button" className="webmail-forgot-link">
                  Passwort vergessen
                </button>
                
                <div className="webmail-checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember">Angemeldet bleiben</label>
                </div>
                
                <button
                  type="submit"
                  className="webmail-submit-btn"
                  disabled={!email || !password || isConnecting}
                >
                  {isConnecting ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Verbinde...
                    </span>
                  ) : (
                    'Anmelden'
                  )}
                </button>
              </form>
              
              <button 
                className="webmail-create-link"
                onClick={() => setShowCreateForm(true)}
              >
                Neue @taskilo.de Adresse erstellen
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
