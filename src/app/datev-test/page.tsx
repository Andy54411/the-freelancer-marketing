'use client';

import { useState } from 'react';

export default function DatevTestPage() {
  const [loading, setLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [error, setError] = useState('');

  const startDatevAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/datev/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: 'test-company-123',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAuthUrl(data.authUrl);
        // Automatisch zur DATEV Auth-Seite weiterleiten
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Fehler beim Generieren der Auth-URL');
      }
    } catch (err) {
      setError('Netzwerk-Fehler beim Verbinden zur API');
      console.error('DATEV Auth Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            DATEV OAuth Test
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Teste die DATEV OpenID Connect Integration
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={startDatevAuth}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Lädt...
              </div>
            ) : (
              'DATEV OAuth Starten'
            )}
          </button>

          {authUrl && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-sm font-medium text-green-800">Auth URL generiert:</h3>
              <p className="mt-1 text-xs text-green-700 break-all">{authUrl}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800">Fehler:</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">DATEV Credentials Status:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Client ID:</span>
                <span className="font-mono text-green-600">6111ad8e8cae82d1a805950f2ae4adc4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client Secret:</span>
                <span className="font-mono text-green-600">8caca150047703ca73ab6f9a789482ec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sandbox URL:</span>
                <span className="font-mono text-blue-600">secure8.datev.de/openidsandbox</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800">PKCE Flow:</h3>
            <ul className="mt-2 text-xs text-blue-700 space-y-1">
              <li>✅ Code Verifier generiert (128 Zeichen)</li>
              <li>✅ Code Challenge (SHA256)</li>
              <li>✅ State Parameter (20+ Zeichen)</li>
              <li>✅ Nonce für OpenID Connect</li>
              <li>✅ Windows SSO aktiviert</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
