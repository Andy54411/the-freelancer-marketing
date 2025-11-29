'use client';

// 🎯 GOOGLE ADS INTERFACE - Korrekt mit kleiner Schrift und Abständen

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Download,
  MessageSquare,
  Search,
  CreditCard,
  HelpCircle,
  Settings,
  MoreVertical,
  Lock,
} from 'lucide-react';
import GoogleAdsHeader from './GoogleAdsHeader';
import GoogleAdsFilterBar from './GoogleAdsFilterBar';

interface GoogleAdsInterfaceProps {
  companyId: string;
}

export default function GoogleAdsInterface({ companyId }: GoogleAdsInterfaceProps) {
  const router = useRouter();
  const [managerApproved, setManagerApproved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkManagerStatus();
  }, [companyId]);

  const checkManagerStatus = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/google-ads`);
      const data = await response.json();
      
      if (data.success) {
        setManagerApproved(
          data.managerApproved === true && 
          data.managerLinkStatus === 'ACTIVE'
        );
      }
    } catch (error) {
      console.error('Failed to check manager status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    if (!managerApproved) {
      alert('Bitte verknüpfen Sie zuerst Ihren Account mit dem Taskilo Manager Account.');
      return;
    }
    router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔒 BLOCKIERE ALLES wenn nicht approved */}
      {!managerApproved ? (
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-12 text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Google Ads Integration ausstehend
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            Ihre Google Ads Integration wird gerade vom Taskilo-Team eingerichtet. 
            Sie erhalten eine Benachrichtigung, sobald Sie Google Ads nutzen können.
          </p>
          <p className="text-sm text-gray-500">
            Status: Warten auf Manager-Verknüpfung
          </p>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <GoogleAdsFilterBar companyId={companyId} />

      {/* Google Ads Header */}
      <GoogleAdsHeader companyId={companyId} />

      {/* Action Button - Taskilo Style */}
      <div className="flex justify-start">
        <button
          onClick={handleCreateCampaign}
          className="bg-[#14ad9f] hover:bg-[#129a8f] text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Neue Kampagne</span>
        </button>
      </div>

      {/* Kontodiagnose Card - Taskilo Style */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Search className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Kontodiagnose</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                Willkommen bei Google Ads! Neue Kampagnen erstellen, um Anzeigen zu schalten
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Mit einer auf Ihre Geschäftsziele abgestimmten Kampagne können Sie im gesamten
                Google-Werbenetzwerk neue Leads finden und potenzielle Kunden erreichen. Nutzen Sie
                die Vorteile von Google AI, um Ihre Creative-Assets zu optimieren und Anzeigen in
                der Google Suche, auf YouTube, im Displaynetzwerk und auf anderen Plattformen zu
                schalten.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <Settings className="w-6 h-6 text-[#14ad9f]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Neue Kunden erreichen</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Kanalübergreifende Performance Max-Kampagne erstellen
                  </p>
                  <button
                    onClick={handleCreateCampaign}
                    className="bg-[#14ad9f] hover:bg-[#129a8f] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Kampagne erstellen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zwei Cards nebeneinander - Taskilo Style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Abrechnung</h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-2">Kontostand am 18. Nov. 2025</div>
                  <div className="text-2xl font-bold text-gray-900">0,00 €</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-2">Nächste automatische Zahlung</div>
                  <div className="text-sm text-gray-600">Keine anstehenden Zahlungen</div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Zahlungsmethoden</h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Primäre Zahlungsmethode</div>
                    <button className="text-sm text-[#14ad9f] hover:text-[#129a8f] hover:underline font-medium">
                      Visa •••• 2755
                    </button>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Alternativ</div>
                    <button className="text-sm text-[#14ad9f] hover:text-[#129a8f] hover:underline">
                      Sekundäre Zahlungsmethode hinzufügen
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                <button className="text-sm text-[#14ad9f] hover:text-[#129a8f] hover:underline">
                  Abrechnung ansehen
                </button>
                <button className="text-sm text-[#14ad9f] hover:text-[#129a8f] hover:underline">
                  Steuerdokumente ansehen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Support Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Unsere Spezialisten sind für Sie da
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Kostenlose, personalisierte Beratung durch Google Ads-Fachleute
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Als Nutzer von Google Ads erhalten Sie eventuell telefonisch oder per
                  Messaging-App personalisierte Hilfe und Vorschläge zur Leistungsoptimierung.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent">
                    <option>Deutschland</option>
                    <option>USA</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Telefonnummer eingeben"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500">Beispiel: ‪(201) 555-0123‬</p>

                <button className="bg-[#14ad9f] hover:bg-[#129a8f] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Senden
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Taskilo Style */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="text-sm text-gray-500 space-y-2">
          <p>
            Google Ads Integration über Taskilo. Die Berichterstellung erfolgt nicht in Echtzeit.
            <a href="#" className="text-[#14ad9f] hover:text-[#129a8f] hover:underline ml-1">
              Weitere Informationen
            </a>
          </p>
          <p>Zeitzone für alle Datums- und Uhrzeitangaben: (GMT+01:00) Mitteleuropäische Zeit.</p>
          <p>
            Google Ads™ ist ein Trademark von Google Inc. Taskilo ist ein unabhängiger
            Service-Provider.
          </p>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
