'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function RevolutOAuthSuccessContent() {
  const searchParams = useSearchParams();
  const connectionId = searchParams?.get('connectionId') || null;
  const error = searchParams?.get('error') || null;
  const success = searchParams?.get('success') || null;
  const accessToken = searchParams?.get('access_token') || null;
  const refreshToken = searchParams?.get('refresh_token') || null;
  const expiresIn = searchParams?.get('expires_in') || null;
  
  // Check if this is an admin token response
  const isAdminToken = success === 'admin_token_received' && accessToken;

  useEffect(() => {
    // Don't auto-close for admin tokens - user needs to copy them
    if (isAdminToken) return;
    
    // Prevent multiple executions
    let messageAlreadySent = false;

    const sendMessageAndClose = () => {
      if (messageAlreadySent) return;
      messageAlreadySent = true;

      try {
        if (error) {
          // Send error message to parent window
          window.opener?.postMessage(
            {
              type: 'REVOLUT_OAUTH_ERROR',
              error: decodeURIComponent(error),
            },
            '*' // Allow any origin for popup communication
          );
        } else if (connectionId) {
          // Send success message to parent window
          window.opener?.postMessage(
            {
              type: 'REVOLUT_OAUTH_SUCCESS',
              connectionId: connectionId,
            },
            '*' // Allow any origin for popup communication
          );
        } else {
          // Check for success parameter as fallback
          const success = searchParams?.get('success');
          if (success === 'revolut_connected') {
            window.opener?.postMessage(
              {
                type: 'REVOLUT_OAUTH_SUCCESS',
                connectionId: connectionId || 'unknown',
              },
              '*' // Allow any origin for popup communication
            );
          }
        }

        // Close the popup window
        setTimeout(() => {
          window.close();
        }, 1000);
      } catch (err) {
        // Fallback: just close the window
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    };

    // Send message immediately
    sendMessageAndClose();
  }, [connectionId, error, searchParams, isAdminToken]);

  // Admin Token Display
  if (isAdminToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="w-16 h-16 bg-[#14ad9f] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            Revolut Token erhalten!
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            Kopiere diese Tokens und speichere sie in .env.local und Vercel:
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                REVOLUT_ACCESS_TOKEN
              </label>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={accessToken}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(accessToken)}
                  className="px-4 py-2 bg-[#14ad9f] text-white rounded-r-md hover:bg-[#129187]"
                >
                  Kopieren
                </button>
              </div>
            </div>
            
            {refreshToken && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  REVOLUT_REFRESH_TOKEN
                </label>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={refreshToken}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(refreshToken)}
                    className="px-4 py-2 bg-[#14ad9f] text-white rounded-r-md hover:bg-[#129187]"
                  >
                    Kopieren
                  </button>
                </div>
              </div>
            )}
            
            {expiresIn && (
              <p className="text-sm text-gray-500">
                Token läuft ab in: {Math.round(Number(expiresIn) / 86400)} Tagen
              </p>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Wichtig:</strong> Speichere diese Tokens in:
            </p>
            <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
              <li>.env.local (lokal)</li>
              <li>Vercel Environment Variables (production)</li>
              <li>Hetzner /opt/taskilo/webmail-proxy/.env</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verbindung fehlgeschlagen</h2>
            <p className="text-gray-600 mb-4">{decodeURIComponent(error)}</p>
            <p className="text-sm text-gray-500">Dieses Fenster wird automatisch geschlossen...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-[#14ad9f] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Revolut erfolgreich verbunden!
            </h2>
            <p className="text-gray-600 mb-4">
              Ihre Revolut Business-Konten wurden erfolgreich mit Taskilo verknüpft.
            </p>
            <p className="text-sm text-gray-500">Dieses Fenster wird automatisch geschlossen...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function RevolutOAuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-[#14ad9f] rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Lädt...</h2>
          </div>
        </div>
      }
    >
      <RevolutOAuthSuccessContent />
    </Suspense>
  );
}
