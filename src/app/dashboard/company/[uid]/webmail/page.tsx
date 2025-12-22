'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { WebmailClient } from '@/components/webmail/WebmailClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, AlertCircle, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function WebmailPage() {
  const { uid } = useParams<{ uid: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCredentials() {
      if (!user || authLoading) return;

      try {
        // Try to load saved email credentials from user's company
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          
          // Check if email credentials are stored
          if (companyData.emailCredentials?.email && companyData.emailCredentials?.password) {
            setCredentials({
              email: companyData.emailCredentials.email,
              password: companyData.emailCredentials.password,
            });
          } else if (companyData.email) {
            // Pre-fill email if available
            setManualEmail(companyData.email);
          }
        }
      } catch {
        setError('Fehler beim Laden der Zugangsdaten');
      } finally {
        setLoading(false);
      }
    }

    loadCredentials();
  }, [user, uid, authLoading]);

  const testConnection = async () => {
    if (!manualEmail || !manualPassword) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/webmail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manualEmail, password: manualPassword }),
      });
      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: 'Verbindung erfolgreich!' });
        // Save credentials and open webmail
        setCredentials({ email: manualEmail, password: manualPassword });
      } else {
        setTestResult({ 
          success: false, 
          message: `Verbindung fehlgeschlagen. IMAP: ${data.imap ? 'OK' : 'Fehler'}, SMTP: ${data.smtp ? 'OK' : 'Fehler'}` 
        });
      }
    } catch {
      setTestResult({ success: false, message: 'Verbindungsfehler' });
    } finally {
      setTesting(false);
    }
  };

  const handleLogout = () => {
    setCredentials(null);
    setManualPassword('');
    setTestResult(null);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // Show webmail client if credentials are available
  if (credentials) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-600" />
            <span className="font-medium">Taskilo Webmail</span>
            <span className="text-sm text-gray-500">({credentials.email})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Abmelden
          </Button>
        </div>
        <div className="flex-1">
          <WebmailClient email={credentials.email} password={credentials.password} />
        </div>
      </div>
    );
  }

  // Show login form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold">Taskilo Webmail</h1>
          <p className="text-gray-600 mt-2">
            Melden Sie sich mit Ihren E-Mail-Zugangsdaten an
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {testResult && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            testResult.success 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {testResult.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">E-Mail-Adresse</label>
            <Input
              type="email"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              placeholder="ihre.email@taskilo.de"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Passwort</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={manualPassword}
                onChange={(e) => setManualPassword(e.target.value)}
                placeholder="Ihr E-Mail-Passwort"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={testConnection}
            disabled={testing || !manualEmail || !manualPassword}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verbindung wird getestet...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Anmelden
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Server: mail.taskilo.de</p>
          <p>IMAP: Port 993 (SSL) | SMTP: Port 587 (STARTTLS)</p>
        </div>
      </div>
    </div>
  );
}
