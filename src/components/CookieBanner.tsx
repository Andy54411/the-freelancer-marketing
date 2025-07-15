'use client';

import { useState } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { X, Cookie, Shield, BarChart3, Settings, Users } from 'lucide-react';

export default function CookieBanner() {
  const { consent, bannerVisible, updateConsent, acceptAll, rejectAll, setBannerVisible } = useCookieConsent();
  const [showDetails, setShowDetails] = useState(false);

  if (!bannerVisible) return null;

  const handleCustomConsent = () => {
    updateConsent(consent);
  };

  const toggleAnalytics = () => {
    updateConsent({ analytics: !consent.analytics });
  };

  const toggleFunctional = () => {
    updateConsent({ functional: !consent.functional });
  };

  const toggleMarketing = () => {
    updateConsent({ marketing: !consent.marketing });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Cookie className="text-[#14ad9f] w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-900">Cookie-Einstellungen</h2>
            </div>
            <button
              onClick={() => setBannerVisible(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-gray-600">
              Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten.
              Einige Cookies sind für die Grundfunktionen erforderlich, während andere uns helfen,
              die Website zu verbessern und Ihnen relevante Inhalte anzuzeigen.
            </p>

            {/* Cookie Categories */}
            <div className="space-y-3">
              {/* Necessary Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="text-green-600 w-5 h-5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Notwendige Cookies</h3>
                    <p className="text-sm text-gray-600">
                      Erforderlich für die Grundfunktionen der Website
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Immer aktiv</div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="text-blue-600 w-5 h-5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Analytics Cookies</h3>
                    <p className="text-sm text-gray-600">
                      Helfen uns zu verstehen, wie die Website genutzt wird
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={consent.analytics}
                    onChange={toggleAnalytics}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                </label>
              </div>

              {/* Functional Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Settings className="text-purple-600 w-5 h-5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Funktionale Cookies</h3>
                    <p className="text-sm text-gray-600">
                      Erweiterte Funktionen und Personalisierung
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={consent.functional}
                    onChange={toggleFunctional}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                </label>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="text-orange-600 w-5 h-5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Marketing Cookies</h3>
                    <p className="text-sm text-gray-600">
                      Personalisierte Werbung und Inhalte
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={consent.marketing}
                    onChange={toggleMarketing}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                </label>
              </div>
            </div>

            {/* Details Link */}
            <div className="text-center">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-[#14ad9f] hover:text-[#0f8b7f] text-sm font-medium"
              >
                {showDetails ? 'Weniger Details' : 'Mehr Details'}
              </button>
            </div>

            {/* Detailed Information */}
            {showDetails && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-2">
                <h4 className="font-medium text-gray-900">Verwendete Cookies im Detail:</h4>
                <ul className="space-y-1">
                  <li><strong>_ga:</strong> Google Analytics - Eindeutige Benutzer-ID (2 Jahre)</li>
                  <li><strong>_ga_*:</strong> Google Analytics 4 - Sitzungsstatus (2 Jahre)</li>
                  <li><strong>_gid:</strong> Google Analytics - Kurzzeitige Benutzer-ID (24 Stunden)</li>
                  <li><strong>__session:</strong> Firebase Authentication Session Cookie</li>
                  <li><strong>googtrans:</strong> Google Translate Cookie für Sprachauswahl</li>
                </ul>
                <p className="mt-2">
                  Weitere Informationen finden Sie in unserer{' '}
                  <a href="/cookies" className="text-[#14ad9f] hover:underline">Cookie-Richtlinie</a>
                  {' '}und{' '}
                  <a href="/datenschutz" className="text-[#14ad9f] hover:underline">Datenschutzerklärung</a>.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={rejectAll}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Alle ablehnen
            </button>
            <button
              onClick={handleCustomConsent}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Auswahl speichern
            </button>
            <button
              onClick={acceptAll}
              className="flex-1 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#0f8b7f] transition-colors"
            >
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
