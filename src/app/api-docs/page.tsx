import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Code, 
  Book, 
  Zap,
  Shield,
  Key,
  Database,
  Webhook,
  Terminal
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'API-Dokumentation | Taskilo',
  description: 'Entwickler-Dokumentation für die Taskilo API',
};

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-gray-900 to-gray-800 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-size-[20px_20px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Code className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Taskilo API Dokumentation
            </h1>
            <p className="text-xl text-gray-300">
              Integriere Taskilo in deine Anwendungen und automatisiere deine Workflows
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Schnellstart
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">1. API-Schlüssel erstellen</h3>
              <p className="text-sm text-gray-600 mb-4">
                Erstelle einen API-Schlüssel in den Einstellungen deines Taskilo-Accounts
              </p>
              <Link href="/dashboard" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                Zum Dashboard →
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Book className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Dokumentation lesen</h3>
              <p className="text-sm text-gray-600 mb-4">
                Mache dich mit den verfügbaren Endpunkten und Parametern vertraut
              </p>
              <a href="#endpoints" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                Zu den Endpunkten →
              </a>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Ersten Request senden</h3>
              <p className="text-sm text-gray-600 mb-4">
                Teste die API mit unserem interaktiven Playground
              </p>
              <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                Playground öffnen →
              </button>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Authentifizierung</h2>
          
          <div className="bg-gray-900 rounded-lg p-6 text-white font-mono text-sm overflow-x-auto">
            <div className="text-gray-400 mb-2"># Bearer Token Authentication</div>
            <div className="text-green-400">curl -H &quot;Authorization: Bearer YOUR_API_KEY&quot; \</div>
            <div className="text-teal-400 ml-4">https://api.taskilo.de/v1/calendars</div>
          </div>
        </section>

        {/* API Endpoints */}
        <section id="endpoints" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">API Endpunkte</h2>
          
          <div className="space-y-4">
            {/* Calendars */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Kalender</h3>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-mono rounded">GET</span>
                    <code className="text-sm text-gray-700">/v1/calendars</code>
                  </div>
                  <span className="text-sm text-gray-600">Liste aller Kalender</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono rounded">POST</span>
                    <code className="text-sm text-gray-700">/v1/calendars</code>
                  </div>
                  <span className="text-sm text-gray-600">Neuen Kalender erstellen</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-mono rounded">GET</span>
                    <code className="text-sm text-gray-700">/v1/calendars/:id</code>
                  </div>
                  <span className="text-sm text-gray-600">Kalender-Details</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-mono rounded">PUT</span>
                    <code className="text-sm text-gray-700">/v1/calendars/:id</code>
                  </div>
                  <span className="text-sm text-gray-600">Kalender aktualisieren</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-mono rounded">DELETE</span>
                    <code className="text-sm text-gray-700">/v1/calendars/:id</code>
                  </div>
                  <span className="text-sm text-gray-600">Kalender löschen</span>
                </div>
              </div>
            </div>

            {/* Bookings */}
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Buchungen</h3>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-mono rounded">GET</span>
                    <code className="text-sm text-gray-700">/v1/bookings</code>
                  </div>
                  <span className="text-sm text-gray-600">Liste aller Buchungen</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono rounded">POST</span>
                    <code className="text-sm text-gray-700">/v1/bookings</code>
                  </div>
                  <span className="text-sm text-gray-600">Neue Buchung erstellen</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Webhooks */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Webhooks</h2>
          
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                <Webhook className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Echtzeit-Benachrichtigungen</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Erhalte automatische Benachrichtigungen bei neuen Buchungen, Stornierungen und anderen Events
                </p>
                <div className="text-sm text-gray-700">
                  <strong>Verfügbare Events:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>booking.created</li>
                    <li>booking.updated</li>
                    <li>booking.cancelled</li>
                    <li>payment.completed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Rate Limits</h2>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">1000</div>
                    <div className="text-sm text-gray-600">Requests pro Stunde</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">10.000</div>
                    <div className="text-sm text-gray-600">Requests pro Tag</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">100 MB</div>
                    <div className="text-sm text-gray-600">Max. Request-Größe</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="bg-linear-to-r from-teal-50 to-blue-50 rounded-2xl p-8 border border-teal-200">
          <div className="text-center max-w-2xl mx-auto">
            <Terminal className="w-16 h-16 text-teal-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Brauchst du Hilfe?
            </h2>
            <p className="text-gray-600 mb-6">
              Unser Entwickler-Support hilft dir bei der Integration
            </p>
            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-medium"
            >
              Support kontaktieren
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
