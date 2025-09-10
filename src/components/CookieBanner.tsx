'use client';

import { useState, useEffect } from 'react';
import { useCookieConsentContext } from '@/contexts/CookieConsentContext';
import { X, Cookie, Shield, BarChart3, Settings, Users, Eye } from 'lucide-react';
import { sendConsentToGTM } from '@/lib/gtm-dsgvo';

export default function CookieBanner() {
  const { consent, bannerVisible, updateConsentState, acceptAll, rejectAll, setBannerVisible } =
    useCookieConsentContext();

  const [showDetails, setShowDetails] = useState(false);

  // Lokaler State für temporäre Änderungen
  const [tempConsent, setTempConsent] = useState(consent);

  // Sync tempConsent mit consent wenn sich consent ändert
  useEffect(() => {
    setTempConsent(consent);
  }, [consent]);

  if (!bannerVisible) return null;

  const handleCustomConsent = () => {
    updateConsentState(tempConsent);
    // DSGVO-konforme GTM-Integration
    sendConsentToGTM(tempConsent);
  };

  const handleAcceptAll = () => {
    acceptAll();
    // DSGVO-konforme GTM-Integration
    sendConsentToGTM({
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      personalization: true,
    });
  };

  const handleRejectAll = () => {
    rejectAll();
    // DSGVO-konforme GTM-Integration
    sendConsentToGTM({
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      personalization: false,
    });
  };

  const toggleAnalytics = () => {
    setTempConsent(prev => ({ ...prev, analytics: !prev.analytics }));
  };

  const toggleFunctional = () => {
    setTempConsent(prev => ({ ...prev, functional: !prev.functional }));
  };

  const toggleMarketing = () => {
    setTempConsent(prev => ({ ...prev, marketing: !prev.marketing }));
  };

  const togglePersonalization = () => {
    setTempConsent(prev => ({ ...prev, personalization: !prev.personalization }));
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
              className="text-gray-400 hover:text-[#14ad9f] hover:bg-gray-100 p-2 rounded-lg transition-colors"
              aria-label="Cookie-Einstellungen schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-gray-600">
              Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu
              bieten. Einige Cookies sind für die Grundfunktionen erforderlich, während andere uns
              helfen, die Website zu verbessern und Ihnen relevante Inhalte anzuzeigen.
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
                    <h3 id="analytics-label" className="font-medium text-gray-900">
                      Analytics Cookies
                    </h3>
                    <p id="analytics-description" className="text-sm text-gray-600">
                      Helfen uns zu verstehen, wie die Website genutzt wird
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={tempConsent.analytics}
                    onChange={toggleAnalytics}
                    aria-labelledby="analytics-label"
                    aria-describedby="analytics-description"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                  <span className="sr-only">Analytics Cookies aktivieren/deaktivieren</span>
                </label>
              </div>

              {/* Functional Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Settings className="text-purple-600 w-5 h-5" />
                  <div>
                    <h3 id="functional-label" className="font-medium text-gray-900">
                      Funktionale Cookies
                    </h3>
                    <p id="functional-description" className="text-sm text-gray-600">
                      Erweiterte Funktionen und Personalisierung
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={tempConsent.functional}
                    onChange={toggleFunctional}
                    aria-labelledby="functional-label"
                    aria-describedby="functional-description"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                  <span className="sr-only">Funktionale Cookies aktivieren/deaktivieren</span>
                </label>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="text-orange-600 w-5 h-5" />
                  <div>
                    <h3 id="marketing-label" className="font-medium text-gray-900">
                      Marketing Cookies
                    </h3>
                    <p id="marketing-description" className="text-sm text-gray-600">
                      Personalisierte Werbung und Inhalte
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={tempConsent.marketing}
                    onChange={toggleMarketing}
                    aria-labelledby="marketing-label"
                    aria-describedby="marketing-description"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                  <span className="sr-only">Marketing Cookies aktivieren/deaktivieren</span>
                </label>
              </div>

              {/* Personalization Cookies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Eye className="text-indigo-600 w-5 h-5" />
                  <div>
                    <h3 id="personalization-label" className="font-medium text-gray-900">
                      Personalisierung
                    </h3>
                    <p id="personalization-description" className="text-sm text-gray-600">
                      Anpassung an Ihre Präferenzen
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={tempConsent.personalization}
                    onChange={togglePersonalization}
                    aria-labelledby="personalization-label"
                    aria-describedby="personalization-description"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                  <span className="sr-only">Personalisierung aktivieren/deaktivieren</span>
                </label>
              </div>
            </div>

            {/* Details Section */}
            {showDetails && (
              <div id="cookie-details" className="border-t pt-4 mt-4">
                <h3 className="font-medium text-gray-900 mb-3">
                  Detaillierte Cookie-Informationen
                </h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <div>
                    <h4 className="font-medium text-gray-800">Notwendige Cookies:</h4>
                    <p>
                      Diese Cookies sind für die Grundfunktionen der Website erforderlich und können
                      nicht deaktiviert werden.
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Session-ID für Benutzeranmeldung</li>
                      <li>CSRF-Schutz Token</li>
                      <li>Cookie-Einstellungen speichern</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800">Analytics Cookies:</h4>
                    <p>
                      Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website
                      interagieren.
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Google Analytics 4 (GA4)</li>
                      <li>Seitenzugriffe und Verweildauer</li>
                      <li>Anonymisierte Nutzungsstatistiken</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800">Funktionale Cookies:</h4>
                    <p>Diese Cookies ermöglichen erweiterte Funktionen und Personalisierung.</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Spracheinstellungen</li>
                      <li>Benutzereinstellungen</li>
                      <li>Formular-Fortschritt speichern</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800">Marketing Cookies:</h4>
                    <p>Diese Cookies werden verwendet, um Ihnen relevante Werbung zu zeigen.</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Zielgruppensegmentierung</li>
                      <li>Conversion-Tracking</li>
                      <li>Remarketing-Pixel</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800">Personalisierung:</h4>
                    <p>Diese Cookies ermöglichen es uns, Ihre Erfahrung zu personalisieren.</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Bevorzugte Inhalte</li>
                      <li>Personalisierte Empfehlungen</li>
                      <li>Benutzerverhalten-Analyse</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-800">Firebase & Authentication:</h5>
                    <p>Für Benutzeranmeldung und Datenspeicherung verwenden wir Firebase:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>__session (Session-Cookie)</li>
                      <li>__Secure-* (Sicherheits-Cookies)</li>
                      <li>firebase-auth-* (Authentifizierung)</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-800">Google Services:</h5>
                    <p>Für Analytics und Tag Management nutzen wir Google Services:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>_ga, _ga_* (Google Analytics)</li>
                      <li>_gid (Google Analytics)</li>
                      <li>_gtm_* (Google Tag Manager)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle Details Button */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[#14ad9f] hover:text-[#0f8b7f] text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center"
              aria-expanded={showDetails}
              aria-controls="cookie-details"
            >
              {showDetails ? 'Weniger Details' : 'Mehr Details'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
            <button
              onClick={handleRejectAll}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-600/25 transition-colors min-h-[48px] font-medium"
              aria-label="Alle Cookies ablehnen"
            >
              Alle ablehnen
            </button>
            <button
              onClick={handleCustomConsent}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-700/25 transition-colors min-h-[48px] font-medium"
              aria-label="Ausgewählte Cookie-Einstellungen speichern"
            >
              Auswahl speichern
            </button>
            <button
              onClick={handleAcceptAll}
              className="flex-1 px-6 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-[#0f8b7f] focus:outline-none focus:ring-4 focus:ring-[#14ad9f]/25 transition-colors min-h-[48px] font-medium"
              aria-label="Alle Cookies akzeptieren"
            >
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
