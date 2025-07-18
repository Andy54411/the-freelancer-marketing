'use client';

import { useState } from 'react';
import { useCookieConsentContext } from '@/contexts/CookieConsentContext';
import {
  Settings,
  Cookie,
  Shield,
  BarChart3,
  Users,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function CookieSettings() {
  const {
    consent,
    resetConsent,
    updateConsentState,
    isAnalyticsAllowed,
    isMarketingAllowed,
    isFunctionalAllowed,
  } = useCookieConsentContext();

  const [showModal, setShowModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleOpenSettings = () => {
    setShowModal(true);
    setShowTooltip(false);
  };

  const handleResetConsent = () => {
    resetConsent();
    setShowModal(false);
  };

  const toggleConsent = (type: keyof typeof consent) => {
    if (type === 'necessary') return; // Can't disable necessary cookies

    updateConsentState({
      [type]: !consent[type],
    });
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleOpenSettings}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="p-2 text-gray-600 hover:text-[#14ad9f] transition-colors rounded-lg hover:bg-gray-100"
          aria-label="Cookie-Einstellungen"
        >
          <Settings className="w-5 h-5" />
        </button>

        {showTooltip && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap z-10">
            Cookie-Einstellungen
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>

      {/* Cookie Settings Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Cookie className="text-[#14ad9f] w-6 h-6" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Cookie-Einstellungen verwalten
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Current Status */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Aktueller Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-gray-900">Notwendige Cookies: Aktiv</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isAnalyticsAllowed() ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-gray-900">
                      Analytics: {isAnalyticsAllowed() ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isFunctionalAllowed() ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-gray-900">
                      Funktional: {isFunctionalAllowed() ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isMarketingAllowed() ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-gray-900">
                      Marketing: {isMarketingAllowed() ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cookie Categories */}
              <div className="space-y-4">
                {/* Necessary Cookies */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="text-blue-600 w-5 h-5" />
                    <div>
                      <h3 className="font-medium text-gray-900">Analytics Cookies</h3>
                      <p className="text-sm text-gray-600">
                        Google Analytics für Website-Statistiken
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={consent.analytics}
                      onChange={() => toggleConsent('analytics')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                  </label>
                </div>

                {/* Functional Cookies */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
                      onChange={() => toggleConsent('functional')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                  </label>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="text-orange-600 w-5 h-5" />
                    <div>
                      <h3 className="font-medium text-gray-900">Marketing Cookies</h3>
                      <p className="text-sm text-gray-600">Personalisierte Werbung und Inhalte</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={consent.marketing}
                      onChange={() => toggleConsent('marketing')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                  </label>
                </div>

                {/* Personalization Cookies */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Eye className="text-indigo-600 w-5 h-5" />
                    <div>
                      <h3 className="font-medium text-gray-900">Personalisierung</h3>
                      <p className="text-sm text-gray-600">
                        Benutzerdefinierte Inhalte und Einstellungen
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={consent.personalization}
                      onChange={() => toggleConsent('personalization')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleResetConsent}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Alle Einstellungen zurücksetzen
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#0f8b7f] transition-colors"
                >
                  Einstellungen speichern
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-4 text-xs text-gray-500 text-center">
                Weitere Informationen in unserer{' '}
                <a href="/cookies" className="text-[#14ad9f] hover:underline">
                  Cookie-Richtlinie
                </a>{' '}
                und{' '}
                <a href="/datenschutz" className="text-[#14ad9f] hover:underline">
                  Datenschutzerklärung
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
