'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiCheckCircle } from 'react-icons/fi';

function NewsletterConfirmedContent() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <FiCheckCircle className="mx-auto h-16 w-16 text-green-500" />

            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Newsletter-Anmeldung bestätigt!
            </h1>

            <div className="mt-6 text-sm text-gray-600">
              <p className="mb-4">Vielen Dank! Ihre E-Mail-Adresse wurde erfolgreich bestätigt.</p>

              {email && (
                <p className="mb-4 font-medium">
                  <span className="text-gray-500">E-Mail:</span> {email}
                </p>
              )}

              <div className="bg-green-50 p-4 rounded-md">
                <div className="text-sm text-green-800">
                  <h3 className="font-medium mb-2">Was passiert jetzt?</h3>
                  <ul className="space-y-1 text-left">
                    <li>• Sie erhalten regelmäßig Updates zu neuen Features</li>
                    <li>• Wichtige Ankündigungen und Verbesserungen</li>
                    <li>• Exklusive Tipps für Taskilo</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link
                  href="/"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Zurück zur Startseite
                </Link>

                <a
                  href="/newsletter/unsubscribe"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Newsletter-Einstellungen verwalten
                </a>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>DSGVO-Hinweis:</strong> Sie können sich jederzeit vom Newsletter abmelden.
                Ihre Daten werden DSGVO-konform verarbeitet und gespeichert.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewsletterConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Lädt...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewsletterConfirmedContent />
    </Suspense>
  );
}
