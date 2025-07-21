'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Calendar, Home, MessageCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Erfolgs-Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          {/* Erfolgsmeldung */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Zahlung erfolgreich!</h1>

          <p className="text-gray-600 mb-6">
            Ihre Buchung wurde erfolgreich abgeschlossen. Sie erhalten in Kürze eine Bestätigung per
            E-Mail.
          </p>

          {/* Nächste Schritte */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-3">Was passiert als nächstes?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Der Anbieter wird über Ihre Buchung benachrichtigt
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Sie erhalten eine Buchungsbestätigung per E-Mail
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Der Anbieter wird sich zur Terminbestätigung melden
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-[#14ad9f] text-white py-3 px-4 rounded-lg font-semibold hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Zu meinen Buchungen
            </button>

            <button
              onClick={() => router.push('/dashboard/inbox')}
              className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Nachrichten öffnen
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Zurück zur Startseite
            </button>
          </div>

          {/* Support Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Fragen zu Ihrer Buchung? Kontaktieren Sie unseren Support unter{' '}
              <a href="mailto:support@taskilo.com" className="text-[#14ad9f] hover:underline">
                support@taskilo.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
