'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from 'react-icons/fi';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  permissions: string[];
}

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<StaffUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Prüfen ob bereits angemeldet
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/staff');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
          // Weiterleitung basierend auf Rolle
          if (data.user.role === 'admin') {
            router.push('/dashboard/admin');
          } else {
            router.push('/dashboard/admin/email');
          }
        }
      }
    } catch (error) {

    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);

        // Erfolgreiche Anmeldung - Weiterleitung
        if (data.user.role === 'admin') {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard/admin/email');
        }
      } else {
        setError(data.error || 'Anmeldung fehlgeschlagen');
      }
    } catch (error) {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'logout',
        }),
      });

      setUser(null);
      setEmail('');
      setPassword('');
    } catch (error) {

    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Willkommen zurück!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold">{user.name}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
              <div className="text-sm text-gray-500">{user.department}</div>
              <div className="mt-2">
                <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => {
                  if (user.role === 'admin') {
                    router.push('/dashboard/admin');
                  } else {
                    router.push('/dashboard/admin/email');
                  }
                }}
              >
                Zum Dashboard
              </Button>
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                Abmelden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Taskilo Staff Login</CardTitle>
          <p className="text-gray-600">Melden Sie sich mit Ihren Mitarbeiter-Zugangsdaten an</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="mitarbeiter@taskilo.de"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ihr Passwort"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Anmelden...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FiLogIn className="h-4 w-4" />
                  Anmelden
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <div className="text-sm text-center text-gray-500">
              <p>Für Zugang wenden Sie sich an den Administrator</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
