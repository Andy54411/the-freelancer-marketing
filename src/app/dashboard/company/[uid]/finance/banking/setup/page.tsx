'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, AlertCircle, Loader2, Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FinAPISetupPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params.uid as string;

  const [status, setStatus] = useState<'initial' | 'loading' | 'success' | 'error'>('initial');
  const [error, setError] = useState<string | null>(null);
  const [finapiUserId, setFinapiUserId] = useState<string | null>(null);

  // Check for existing connection on mount (optional, but good practice)
  useEffect(() => {
    // You could add a check here to see if credentials already exist
    // and automatically move to the success step if they do.
  }, [uid]);

  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  const setupFinapiIntegration = async () => {
    setStatus('loading');
    setError(null);

    try {
      const response = await fetch('/api/finapi/setup-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: uid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Ein unbekannter Fehler ist aufgetreten.');
      }

      setFinapiUserId(data.finapiUserId);
      setStatus('success');
    } catch (err) {
      console.error('Fehler bei der finAPI-Integration:', err);
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.');
      setStatus('error');
    }
  };

  const proceedToBankConnection = () => {
    // Redirect to the page where the user can actually connect their bank accounts
    // This page would now use the stored credentials to get a user token
    router.push(`/dashboard/company/${uid}/finance/banking/connect`);
  };

  const renderInitialStep = () => (
    <div className="text-center">
      <Building2 className="h-12 w-12 text-[#14ad9f] mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900">finAPI Banking-Integration</h2>
      <p className="text-gray-600 mt-2 mb-6">
        Richten Sie Ihr Taskilo-Konto für die sichere Anbindung an Ihr Online-Banking über finAPI
        ein.
        <br />
        Dieser einmalige Schritt erstellt einen dedizierten, sicheren Benutzer für Sie bei finAPI.
      </p>
      <button
        onClick={setupFinapiIntegration}
        disabled={status === 'loading'}
        className="w-full max-w-xs mx-auto bg-[#14ad9f] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            <span>Integration wird eingerichtet...</span>
          </>
        ) : (
          'Sichere Integration jetzt starten'
        )}
      </button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Einrichtung erfolgreich!</h2>
      <p className="text-gray-600 mb-6">
        Ihr Konto ist nun bereit für die Bank-Anbindung. Im nächsten Schritt können Sie Ihre erste
        Bankverbindung herstellen.
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6 max-w-md mx-auto">
        <h3 className="font-medium text-gray-900 mb-2">Integrationsdetails:</h3>
        <p className="text-sm text-gray-600 break-all">
          <strong>Status:</strong> Aktiv
          <br />
          <strong>Ihre finAPI Benutzer-ID:</strong> {finapiUserId}
        </p>
      </div>
      <button
        onClick={proceedToBankConnection}
        className="w-full max-w-xs mx-auto bg-[#14ad9f] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] flex items-center justify-center"
      >
        <span>Weiter zur Bank-Anbindung</span>
        <ArrowRight className="h-5 w-5 ml-2" />
      </button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="text-center">
      <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Fehler bei der Einrichtung</h2>
      <p className="text-gray-600 mb-6">
        Leider ist bei der Einrichtung der finAPI-Integration ein Fehler aufgetreten.
      </p>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-800 text-left max-w-md mx-auto">
          <p>
            <strong>Fehlermeldung:</strong> {error}
          </p>
        </div>
      )}
      <button
        onClick={setupFinapiIntegration}
        className="w-full max-w-xs mx-auto bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        Erneut versuchen
      </button>
    </div>
  );

  const renderContent = () => {
    switch (status) {
      case 'loading':
      case 'initial':
        return renderInitialStep();
      case 'success':
        return renderSuccessStep();
      case 'error':
        return renderErrorStep();
      default:
        return renderInitialStep();
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Banking Setup</h1>
        <p className="text-gray-600 mt-1">Sichere Verbindung zu finAPI herstellen</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 min-h-[300px] flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
}
