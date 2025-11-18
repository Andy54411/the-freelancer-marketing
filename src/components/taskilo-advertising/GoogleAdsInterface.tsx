'use client';

// 🎯 GOOGLE ADS INTERFACE - Korrekt mit kleiner Schrift und Abständen

import React from 'react';
import { 
  Plus,
  Download,
  MessageSquare,
  Search, 
  CreditCard, 
  HelpCircle,
  Settings,
  MoreVertical
} from 'lucide-react';
import GoogleAdsHeader from './GoogleAdsHeader';
import GoogleAdsFilterBar from './GoogleAdsFilterBar';

interface GoogleAdsInterfaceProps {
  companyId: string;
}

export default function GoogleAdsInterface({ companyId }: GoogleAdsInterfaceProps) {
  return (
    <div className="space-y-0">


      {/* Filter Bar */}
      <GoogleAdsFilterBar companyId={companyId} />

      {/* Page Content */}
      <div className="px-6 py-6">
        {/* Google Ads Header */}
        <GoogleAdsHeader companyId={companyId} />

        {/* Action Button */}
        <div className="mb-8">
          <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Neue Kampagne</span>
          </button>
        </div>

        {/* Kontodiagnose Card - Über beide Spalten */}
        <div className="mb-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="w-5 h-5 text-gray-600" />
                  <h1 className="text-lg font-medium text-gray-900">Kontodiagnose</h1>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <h2 className="text-xl font-medium text-gray-900 mb-4">
                Willkommen bei Google Ads! Neue Kampagnen erstellen, um Anzeigen zu schalten
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Mit einer auf Ihre Geschäftsziele abgestimmten Kampagne können Sie im gesamten Google-Werbenetzwerk neue Leads finden und potenzielle Kunden erreichen. Nutzen Sie die Vorteile von Google AI, um Ihre Creative-Assets zu optimieren und Anzeigen in der Google Suche, auf YouTube, im Displaynetzwerk und auf anderen Plattformen zu schalten.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-center justify-between">
                <div className="flex items-start space-x-4">
                  <Settings className="w-8 h-8 text-gray-600 shrink-0 mt-1" />
                  <div>
                    <div className="text-lg font-medium text-gray-900 mb-2">Neue Kunden erreichen</div>
                    <div className="text-sm text-gray-600 mb-4">Kanalübergreifende Performance Max-Kampagne erstellen</div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded text-sm font-medium">
                      Kampagne erstellen
                    </button>
                  </div>
                </div>
                
                {/* Illustration rechts */}
                <div className="ml-8 shrink-0">
                  <svg width="120" height="80" viewBox="0 0 120 80" className="text-gray-400">
                    {/* Trichter */}
                    <path d="M20 10 L60 10 L50 40 L30 40 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
                    {/* Sanduhr */}
                    <ellipse cx="80" cy="25" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <ellipse cx="80" cy="55" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <path d="M68 25 L92 55 M92 25 L68 55" stroke="currentColor" strokeWidth="2"/>
                    {/* Tasse */}
                    <rect x="100" y="45" width="15" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <path d="M115 50 Q120 52 120 58 Q120 64 115 66" fill="none" stroke="currentColor" strokeWidth="2"/>
                    {/* Dampf */}
                    <path d="M105 42 Q107 38 105 34 M110 42 Q112 38 110 34" fill="none" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zwei einzelne Cards mit Abstand */}
        <div className="grid grid-cols-2 gap-4">
          {/* Billing Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <h1 className="text-lg font-medium text-gray-900">Abrechnung</h1>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Kontostand am 18. Nov. 2025</div>
                    <div className="text-lg font-bold text-gray-900">0,00 €</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600 mb-1">Nächste automatische Zahlung</div>
                    <div className="text-xs text-gray-500">Es sind keine anstehenden Zahlungen vorhanden</div>
                  </div>
                </div>
                
                <hr className="border-gray-200" />
                
                <div>
                  <div className="text-xs text-gray-600 mb-2">Zahlungsmethoden</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500">Primäre Zahlungsmethode</div>
                      <button className="text-xs text-teal-600 hover:underline">Visa •••• 2755</button>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Alternativ</div>
                      <button className="text-xs text-teal-600 hover:underline">Sekundäre Zahlungsmethode hinzufügen</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex space-x-3">
                <button className="text-xs text-teal-600 hover:underline">Abrechnung ansehen</button>
                <button className="text-xs text-teal-600 hover:underline">Auszüge und Steuerdokumente ansehen</button>
              </div>
            </div>
          </div>

          {/* Support Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                  <h1 className="text-lg font-medium text-gray-900">Unsere Spezialisten sind für Sie da</h1>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    Kostenlose, personalisierte Beratung durch Google Ads-Fachleute
                  </h3>
                  <p className="text-xs text-gray-600">
                    Als Nutzer von Google Ads erhalten Sie eventuell telefonisch oder per Messaging-App personalisierte Hilfe und Vorschläge zur Leistungsoptimierung.
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <select className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                    <option>USA</option>
                    <option>Deutschland</option>
                  </select>
                  <div className="flex-1">
                    <input 
                      type="tel" 
                      placeholder="Telefonnummer eingeben"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Beispiel: ‪(201) 555-0123‬</p>
                  </div>
                </div>
                
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-xs">
                  Senden
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 py-8 border-t border-gray-200 text-sm text-gray-600">
          <div className="space-y-2">
            <p>
              Die Berichterstellung erfolgt nicht in Echtzeit. 
              <a href="#" className="text-teal-600 hover:underline ml-1">Weitere Informationen</a>
            </p>
            <p>Zeitzone für alle Datums- und Uhrzeitangaben: (GMT+02:00) Osteuropäische Zeit.</p>
            <p>Unter Umständen wird ein Teil des Inventars von einem Drittanbieter bereitgestellt, der als Vermittler agiert.</p>
            <p>© Google 2025.</p>
          </div>
        </footer>
      </div>

    </div>
  );
}