'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Mail, ArrowRight, Settings } from 'lucide-react';

function NewsletterConfirmedContent() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email');

  return (
    <div className="min-h-screen bg-linear-to-br from-teal-50 via-white to-cyan-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-10 px-6 shadow-xl rounded-2xl sm:px-12 border border-gray-100">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto w-20 h-20 bg-linear-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Anmeldung bestätigt!
            </h1>
            
            <p className="mt-3 text-gray-600">
              Vielen Dank! Ihre E-Mail-Adresse wurde erfolgreich bestätigt.
            </p>

            {email && (
              <div className="mt-4 inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-medium">
                <Mail className="w-4 h-4" />
                {email}
              </div>
            )}

            {/* Benefits Box */}
            <div className="mt-8 bg-linear-to-r from-teal-50 to-cyan-50 p-6 rounded-xl text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Das erwartet Sie:</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  Updates zu neuen Features und Verbesserungen
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  Exklusive Tipps zur Geschäftsoptimierung
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  Branchen-News und Best Practices
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-white font-semibold bg-linear-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
              >
                Zur Startseite
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/newsletter/unsubscribe"
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-gray-700 font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Newsletter-Einstellungen
              </Link>
            </div>

            {/* GDPR Notice */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                <strong>DSGVO-Hinweis:</strong> Sie können sich jederzeit vom Newsletter abmelden.
                Ihre Daten werden DSGVO-konform auf unseren deutschen Servern verarbeitet.
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

export default function NewsletterConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-br from-teal-50 via-white to-cyan-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-lg">
            <div className="bg-white py-10 px-6 shadow-xl rounded-2xl text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Wird geladen...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewsletterConfirmedContent />
    </Suspense>
  );
}
