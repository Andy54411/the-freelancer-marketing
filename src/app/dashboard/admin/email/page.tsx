'use client';

import { useState, useEffect, useCallback } from 'react';
import { WebmailClient } from '@/components/webmail/WebmailClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, KeyRound, AlertCircle, CheckCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface SavedCredentials {
  email: string;
  password: string;
}

export default function AdminEmailPage() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<SavedCredentials | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Lade Admin-User und gespeicherte Webmail-Credentials
  useEffect(() => {
    const loadAdminAndCredentials = async () => {
      try {
        // 1. Admin-User verifizieren
        const authResponse = await fetch('/api/admin/auth/verify');
        if (!authResponse.ok) {
          setLoading(false);
          return;
        }
        
        const authData = await authResponse.json();
        setAdminUser(authData.user);

        // 2. Gespeicherte Webmail-Credentials aus Firebase laden
        const credsResponse = await fetch('/api/admin/webmail-credentials');
        
        if (credsResponse.ok) {
          const credsData = await credsResponse.json();
          if (credsData.success && credsData.credentials) {
            // Automatisch verbinden mit gespeicherten Credentials
            setCredentials(credsData.credentials);
            setLoading(false);
            return;
          }
        }

        // Keine Credentials gespeichert - E-Mail vorausfuellen
        setLoginForm(prev => ({ ...prev, email: authData.user.email }));
        setIsFirstTimeSetup(true);
      } catch {
        // Fehler ignorieren
      } finally {
        setLoading(false);
      }
    };

    loadAdminAndCredentials();
  }, []);

  const handleConnect = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Credentials in Firebase speichern (testet auch die Verbindung)
      const response = await fetch('/api/admin/webmail-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          webmailEmail: loginForm.email, 
          webmailPassword: loginForm.password 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCredentials({ email: loginForm.email, password: loginForm.password });
        setIsFirstTimeSetup(false);
        toast.success('Webmail verbunden und gespeichert');
      } else {
        setConnectionError(data.error);
        toast.error(data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setConnectionError(errorMessage);
      toast.error('Verbindungsfehler');
    } finally {
      setIsConnecting(false);
    }
  }, [loginForm]);

  const handleDisconnect = useCallback(async () => {
    try {
      // Credentials aus Firebase loeschen
      await fetch('/api/admin/webmail-credentials', { method: 'DELETE' });
      
      setCredentials(null);
      setLoginForm(prev => ({ ...prev, password: '' }));
      setIsFirstTimeSetup(true);
      toast.success('Webmail-Verbindung getrennt');
    } catch {
      toast.error('Fehler beim Trennen');
    }
  }, []);

  const handleReconnect = useCallback(async () => {
    if (!credentials) return;
    
    setIsConnecting(true);
    try {
      const response = await fetch('/api/webmail/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: credentials.email, 
          password: credentials.password 
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Verbindung wiederhergestellt');
      } else {
        toast.error('Verbindung fehlgeschlagen - bitte erneut anmelden');
        setCredentials(null);
        setIsFirstTimeSetup(true);
      }
    } catch {
      toast.error('Verbindungsfehler');
    } finally {
      setIsConnecting(false);
    }
  }, [credentials]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-gray-500">Lade Webmail-Verbindung...</p>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-sm text-red-700">Nicht autorisiert. Bitte erneut anmelden.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (credentials) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-600" />
            <span className="font-medium text-gray-900">Admin E-Mail</span>
            <span className="text-sm text-gray-500">({credentials.email})</span>
            <div className="flex items-center gap-1 ml-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600">Verbunden</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReconnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Trennen
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <WebmailClient 
            email={credentials.email} 
            password={credentials.password}
            onLogout={handleDisconnect}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-teal-600" />
          </div>
          <CardTitle className="text-xl">
            {isFirstTimeSetup ? 'Webmail einmalig verbinden' : 'Webmail verbinden'}
          </CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            {isFirstTimeSetup 
              ? 'Verbinden Sie einmalig Ihren Webmail-Account. Die Zugangsdaten werden sicher gespeichert.'
              : 'Verbinden Sie Ihren Taskilo Webmail-Account, um E-Mails zu verwalten.'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre.email@taskilo.de"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Webmail-Passwort</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ihr Webmail-Passwort"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Das Webmail-Passwort kann vom Admin-Passwort abweichen.
              </p>
            </div>

            {connectionError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-sm text-red-700">{connectionError}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-teal-600 hover:bg-teal-700"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verbinde...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isFirstTimeSetup ? 'Verbinden und speichern' : 'Verbinden'}
                </>
              )}
            </Button>
          </form>

          {isFirstTimeSetup && (
            <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <h4 className="text-sm font-medium text-teal-700 mb-2">Einmalige Einrichtung</h4>
              <p className="text-xs text-teal-600">
                Nach erfolgreicher Verbindung werden Ihre Webmail-Zugangsdaten sicher gespeichert. 
                Bei zukuenftigen Besuchen erfolgt die Verbindung automatisch.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
