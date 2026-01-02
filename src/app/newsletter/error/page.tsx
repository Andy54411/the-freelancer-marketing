'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, Home, RefreshCw, Mail } from 'lucide-react';

function NewsletterErrorContent() {
  const searchParams = useSearchParams();
  const errorType = searchParams?.get('type') || 'unknown';
  const errorMessage = searchParams?.get('message') || '';

  const getErrorDetails = () => {
    switch (errorType) {
      case 'expired':
        return {
          title: 'Link abgelaufen',
          description: 'Der Bestätigungslink ist leider abgelaufen. Bitte melden Sie sich erneut an.',
          showRetry: true,
        };
      case 'invalid':
        return {
          title: 'Ungültiger Link',
          description: 'Der Link ist ungültig oder beschädigt. Bitte überprüfen Sie die URL.',
          showRetry: true,
        };
      case 'already_subscribed':
        return {
          title: 'Bereits angemeldet',
          description: 'Sie sind bereits für unseren Newsletter angemeldet.',
          showRetry: false,
        };
      case 'not_found':
        return {
          title: 'Nicht gefunden',
          description: 'Die angeforderte Ressource wurde nicht gefunden.',
          showRetry: true,
        };
      default:
        return {
          title: 'Ein Fehler ist aufgetreten',
          description: errorMessage || 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
          showRetry: true,
        };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-10 px-6 shadow-xl rounded-2xl sm:px-12 border border-gray-100">
          <div className="text-center">
            {/* Error Icon */}
            <div className="mx-auto w-20 h-20 bg-linear-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg mb-6">
              <XCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              {errorDetails.title}
            </h1>
            
            <p className="mt-3 text-gray-600">
              {errorDetails.description}
            </p>

            {/* Error Details Box */}
            <div className="mt-8 bg-red-50 border border-red-100 p-5 rounded-xl text-left">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Was können Sie tun?
              </h3>
              <ul className="space-y-2 text-sm text-red-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  Überprüfen Sie, ob der Link vollständig kopiert wurde
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  Versuchen Sie, sich erneut anzumelden
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  Kontaktieren Sie unseren Support bei anhaltenden Problemen
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              {errorDetails.showRetry && (
                <Link
                  href="/#newsletter"
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-white font-semibold bg-linear-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <RefreshCw className="w-4 h-4" />
                  Erneut anmelden
                </Link>
              )}

              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-gray-700 font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Zur Startseite
              </Link>
            </div>

            {/* Support Contact */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Benötigen Sie Hilfe? Kontaktieren Sie uns unter{' '}
                <a href="mailto:support@taskilo.de" className="text-teal-600 hover:underline font-medium">
                  support@taskilo.de
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Powered by <span className="font-semibold text-teal-600">Taskilo</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NewsletterErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-lg">
            <div className="bg-white py-10 px-6 shadow-xl rounded-2xl text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Wird geladen...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewsletterErrorContent />
    </Suspense>
  );
}
