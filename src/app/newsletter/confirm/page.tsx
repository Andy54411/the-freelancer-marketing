'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '../../../components/logo';

function NewsletterConfirmContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const confirmNewsletter = async () => {
      const token = searchParams?.get('token');
      const email = searchParams?.get('email');

      if (!token || !email) {
        setStatus('invalid');
        setMessage('Ungültiger Bestätigungslink. Token oder E-Mail fehlt.');
        return;
      }

      try {
        const response = await fetch('/api/newsletter/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, email }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Newsletter-Anmeldung erfolgreich bestätigt!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Fehler bei der Bestätigung.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Netzwerkfehler bei der Bestätigung.');

      }
    };

    confirmNewsletter();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Logo variant="default" className="scale-110" />
            </div>

            {/* Status Content */}
            {status === 'loading' && (
              <>
                <div className="relative mx-auto mb-6 w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#14ad9f]/20 border-t-[#14ad9f]"></div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Newsletter-Anmeldung bestätigen
                </h1>
                <p className="text-gray-600">Bestätigung wird verarbeitet...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">🎉 Erfolgreich bestätigt!</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-r-lg p-4 mb-6">
                  <p className="text-green-800 text-sm font-medium">
                    ✅ Du erhältst ab sofort unseren Newsletter mit Updates zu Taskilo
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-20 h-20 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  ❌ Bestätigung fehlgeschlagen
                </h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-400 rounded-r-lg p-4 mb-6">
                  <p className="text-red-800 text-sm font-medium">
                    Der Bestätigungslink ist möglicherweise abgelaufen oder ungültig.
                  </p>
                </div>
              </>
            )}

            {status === 'invalid' && (
              <>
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">⚠️ Ungültiger Link</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 rounded-r-lg p-4 mb-6">
                  <p className="text-yellow-800 text-sm font-medium">
                    Bitte überprüfen Sie den Link oder fordern Sie eine neue Bestätigungs-E-Mail an.
                  </p>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              <Link
                href="/"
                className="w-full bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:from-teal-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 block"
              >
                Zur Startseite
              </Link>

              {(status === 'error' || status === 'invalid') && (
                <Link
                  href="/#newsletter"
                  className="w-full border-2 border-[#14ad9f] text-[#14ad9f] py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-[#14ad9f] hover:text-white transition-all duration-300 block"
                >
                  Erneut anmelden
                </Link>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                © 2025 Taskilo. Powered by{' '}
                <span className="text-[#14ad9f] font-semibold">Resend</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                🚀 Sichere E-Mail-Bestätigung über moderne API-Technologie
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewsletterConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
          <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
          <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
            <div className="max-w-md w-full">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center">
                <div className="relative mx-auto mb-6 w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#14ad9f]/20 border-t-[#14ad9f]"></div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Newsletter-Anmeldung bestätigen
                </h1>
                <p className="text-gray-600">Lädt...</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <NewsletterConfirmContent />
    </Suspense>
  );
}
