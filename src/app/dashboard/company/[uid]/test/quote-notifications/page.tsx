// Test-Seite für Quote Bell-Notification System
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import QuoteNotificationTest from '@/components/test/QuoteNotificationTest';

export default function QuoteNotificationTestPage() {
  const params = useParams();
  const companyId = params?.uid as string;

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Fehler</h2>
            <p className="text-red-700">Company ID nicht gefunden in URL-Parametern.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quote Bell-Notification System Test
          </h1>
          <p className="text-gray-600">
            Teste das Bell-Notification System für Angebotsanfragen und Status-Änderungen. Company
            ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{companyId}</span>
          </p>
        </div>

        <QuoteNotificationTest companyId={companyId} />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Anleitung zum Testen:</h3>
          <div className="space-y-3 text-blue-800">
            <div>
              <h4 className="font-medium">1. Neue Angebotsanfrage:</h4>
              <p className="text-sm">
                Simuliert eine neue Angebotsanfrage von einem Kunden. Der Provider sollte eine
                Bell-Notification erhalten.
              </p>
            </div>
            <div>
              <h4 className="font-medium">2. Quote Response:</h4>
              <p className="text-sm">
                Simuliert eine Antwort des Providers auf eine Anfrage. Der Kunde sollte eine
                Bell-Notification erhalten.
              </p>
            </div>
            <div>
              <h4 className="font-medium">3. Quote Acceptance:</h4>
              <p className="text-sm">
                Simuliert die Annahme eines Angebots durch den Kunden. Der Provider sollte eine
                Bell-Notification erhalten.
              </p>
            </div>
            <div>
              <h4 className="font-medium">4. Direkte Notification:</h4>
              <p className="text-sm">Erstellt direkt eine Test-Notification für diesen User.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-3">Was zu beachten ist:</h3>
          <ul className="space-y-2 text-amber-800 text-sm">
            <li>• Nach dem Test sollte das Bell-Icon im Header eine rote Badge zeigen</li>
            <li>• Klick auf das Bell-Icon öffnet das Notification-Dropdown</li>
            <li>• Neue Notifications erscheinen oben in der Liste</li>
            <li>• Klick auf eine Notification markiert sie als gelesen</li>
            <li>• Firebase Functions sollten automatisch bei Status-Änderungen triggern</li>
            <li>• Alle Tests erstellen echte Notifications in der Datenbank</li>
          </ul>
        </div>

        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Entwickler-Info:</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              • Notification Service: <code>/src/lib/quote-notifications.ts</code>
            </p>
            <p>
              • API Integration: <code>/src/app/api/quotes/*/route.ts</code>
            </p>
            <p>
              • Firebase Functions: <code>/firebase_functions/src/quote_notifications.ts</code>
            </p>
            <p>
              • Bell Component: <code>/src/components/layout/UserHeader.tsx</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
