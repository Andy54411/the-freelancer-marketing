'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function RevolutOAuthSuccessContent() {
  const searchParams = useSearchParams();
  const connectionId = searchParams?.get('connectionId') || null;
  const error = searchParams?.get('error') || null;

  useEffect(() => {
    console.log('🔍 OAuth Success Page loaded with params:', { connectionId, error });

    // Prevent multiple executions
    let messageAlreadySent = false;

    const sendMessageAndClose = () => {
      if (messageAlreadySent) return;
      messageAlreadySent = true;

      try {
        if (error) {
          console.log('❌ Sending error message to parent:', error);
          // Send error message to parent window
          window.opener?.postMessage(
            {
              type: 'REVOLUT_OAUTH_ERROR',
              error: decodeURIComponent(error),
            },
            '*' // Allow any origin for popup communication
          );
        } else if (connectionId) {
          console.log('✅ Sending success message to parent:', connectionId);
          // Send success message to parent window
          window.opener?.postMessage(
            {
              type: 'REVOLUT_OAUTH_SUCCESS',
              connectionId: connectionId,
            },
            '*' // Allow any origin for popup communication
          );
        } else {
          console.log('⚠️ No connectionId or error found, checking for success param');
          // Check for success parameter as fallback
          const success = searchParams?.get('success');
          if (success === 'revolut_connected') {
            console.log('✅ Found success parameter, sending generic success message');
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
          console.log('🔄 Closing popup window');
          window.close();
        }, 1000);
      } catch (err) {
        console.error('Error communicating with parent window:', err);
        // Fallback: just close the window
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    };

    // Send message immediately
    sendMessageAndClose();
  }, [connectionId, error, searchParams]);

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
