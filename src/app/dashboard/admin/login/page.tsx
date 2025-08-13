'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FiMail, FiLock, FiLogIn, FiShield, FiCloud, FiServer } from 'react-icons/fi';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<'aws' | 'mock'>('aws'); // AWS by default
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Choose endpoint based on auth mode
      const endpoint = authMode === 'aws' ? '/api/admin/auth/aws' : '/api/admin/auth';

      const response = await fetch(endpoint, {
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

      if (data.success) {
        // Store auth mode for future reference
        localStorage.setItem('taskilo_admin_auth_mode', authMode);

        // Show success message
        console.log(`✅ ${authMode.toUpperCase()} Login successful:`, data.user);
        if (authMode === 'aws') {
          console.log('🔐 AWS Cognito Authentication - Enterprise Security Active');
        }

        router.push('/dashboard/admin/email-management');
      } else {
        setError(data.error || 'Login fehlgeschlagen');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-[#14ad9f] rounded-full flex items-center justify-center">
            <FiShield className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Admin Dashboard</h2>
          <p className="mt-2 text-sm text-gray-600">
            Melden Sie sich an, um das E-Mail-Verwaltungssystem zu verwenden
          </p>
        </div>

        {/* Authentication Mode Selector */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm text-gray-800">Authentifizierungsmodus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setAuthMode('aws')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  authMode === 'aws'
                    ? 'border-[#14ad9f] bg-[#14ad9f]/10 text-[#14ad9f]'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-[#14ad9f]/50'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <FiCloud className="h-5 w-5" />
                  <span className="text-sm font-medium">AWS Cognito</span>
                  <span className="text-xs">Enterprise Security</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('mock')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  authMode === 'mock'
                    ? 'border-[#14ad9f] bg-[#14ad9f]/10 text-[#14ad9f]'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-[#14ad9f]/50'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <FiServer className="h-5 w-5" />
                  <span className="text-sm font-medium">Mock Auth</span>
                  <span className="text-xs">Development Mode</span>
                </div>
              </button>
            </div>

            {authMode === 'aws' && (
              <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
                🔐 AWS Cognito bietet Enterprise-Grade Sicherheit mit MFA, Audit-Logs und Compliance
              </div>
            )}

            {authMode === 'mock' && (
              <div className="text-xs text-orange-700 bg-orange-50 p-2 rounded">
                ⚠️ Mock Authentication nur für Development - keine echte Sicherheit
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center space-x-2">
              {authMode === 'aws' ? (
                <>
                  <FiCloud className="h-5 w-5 text-[#14ad9f]" />
                  <span>AWS Cognito Login</span>
                </>
              ) : (
                <>
                  <FiServer className="h-5 w-5 text-orange-500" />
                  <span>Mock Authentication</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ihre@email.com"
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
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Ihr Passwort"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className={`w-full ${authMode === 'aws' ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {authMode === 'aws' ? 'AWS Login läuft...' : 'Anmeldung läuft...'}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <FiLogIn className="h-4 w-4 mr-2" />
                    {authMode === 'aws' ? 'Mit AWS anmelden' : 'Anmelden'}
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* AWS Login-Hilfe */}
        {authMode === 'aws' && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-sm text-green-800 flex items-center">
                <FiCloud className="h-4 w-4 mr-2" />
                AWS Cognito Zugangsdaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-green-800">
                <p className="font-medium">AWS Master Admin:</p>
                <p className="font-mono text-xs bg-green-100 p-2 rounded mt-1">
                  E-Mail: andy.staudinger@taskilo.de
                  <br />
                  Passwort: TaskiloAdmin2024!
                </p>
                <p className="mt-2 text-xs text-green-600">
                  ✅ Enterprise Security mit AWS Cognito User Pool
                  <br />
                  ✅ Multi-Factor Authentication (MFA) bereit
                  <br />✅ Audit-Logs und Compliance-Ready
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mock Login-Hilfe */}
        {authMode === 'mock' && (
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-sm text-orange-800 flex items-center">
                <FiServer className="h-4 w-4 mr-2" />
                Development Mock Login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-orange-800">
                <p className="font-medium">Mock Admin:</p>
                <p className="font-mono text-xs bg-orange-100 p-2 rounded mt-1">
                  E-Mail: andy.staudinger@taskilo.de
                  <br />
                  Passwort: master123
                </p>
                <p className="mt-2 text-xs text-orange-600">
                  ⚠️ Nur für Development - keine echte Sicherheit
                  <br />
                  ⚠️ Hardcoded Credentials in Code
                  <br />
                  ⚠️ Nicht für Production verwenden
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live-System Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm text-blue-800">Administrator-Zugang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-blue-800">
              <p>
                {authMode === 'aws'
                  ? 'AWS Cognito bietet Enterprise-Grade Sicherheit für das Taskilo Admin Panel.'
                  : 'Mock Authentication ist nur für Development-Zwecke gedacht.'}
              </p>
              <p className="mt-2 text-xs text-blue-600">
                Nur autorisierte Mitarbeiter haben Zugang zum E-Mail-Management-System.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
