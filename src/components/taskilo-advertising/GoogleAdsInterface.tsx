'use client';

// Google Ads Interface - Kontodiagnose wie bei Google Ads mit Entwurf-Fortsetzung

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  CreditCard,
  HelpCircle,
  Settings,
  Lock,
  FileEdit,
  TrendingUp,
  MoreVertical,
  Trash2,
  Play,
  ArrowRight,
} from 'lucide-react';
import GoogleAdsHeader from './GoogleAdsHeader';
import GoogleAdsFilterBar from './GoogleAdsFilterBar';

interface GoogleAdsInterfaceProps {
  companyId: string;
}

interface CampaignDraft {
  id: string;
  name: string;
  type: string;
  objective: string;
  budget?: number;
  createdAt: string;
  updatedAt: string;
  step: number;
  stepName: string;
}

export default function GoogleAdsInterface({ companyId }: GoogleAdsInterfaceProps) {
  const router = useRouter();
  const [managerApproved, setManagerApproved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [showDraftMenu, setShowDraftMenu] = useState<string | null>(null);

  useEffect(() => {
    checkManagerStatus();
    loadCampaignDrafts();
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

  const loadCampaignDrafts = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/advertising/campaign-drafts`);
      const data = await response.json();
      
      if (data.success && data.drafts) {
        setDrafts(data.drafts);
      }
    } catch (error) {
      console.error('Failed to load campaign drafts:', error);
    } finally {
      setDraftsLoading(false);
    }
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/advertising/campaign-drafts/${draftId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setDrafts(prev => prev.filter(d => d.id !== draftId));
      }
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
    setShowDraftMenu(null);
  };

  const continueDraft = (draftId: string) => {
    router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new?draft=${draftId}`);
  };

  const handleCreateCampaign = () => {
    if (!managerApproved) {
      alert('Bitte verknuepfen Sie zuerst Ihren Account mit dem Taskilo Manager Account.');
      return;
    }
    router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
      {/* Blockiere alles wenn nicht approved */}
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

      {/* Kontodiagnose Card - Google Ads Style */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-[#14ad9f]" />
            <h2 className="text-lg font-semibold text-gray-900">Kontodiagnose</h2>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Welcome Message */}
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                Willkommen bei Google Ads! Hier können Sie Kampagnenentwürfe fertigstellen oder neue erstellen, um Anzeigen zu schalten
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Mit einer auf Ihre Geschäftsziele abgestimmten Kampagne können Sie im gesamten
                Google-Werbenetzwerk neue Leads finden und potenzielle Kunden erreichen. Nutzen Sie
                die Vorteile von Google AI, um Ihre Creative-Assets zu optimieren und Anzeigen in
                der Google Suche, auf YouTube, im Displaynetzwerk und auf anderen Plattformen zu
                schalten.
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Neue Kampagne erstellen */}
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 hover:border-[#14ad9f] transition-colors">
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
                      className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#14ad9f] text-[#14ad9f] rounded-lg text-sm font-medium hover:bg-[#14ad9f] hover:text-white transition-colors"
                    >
                      Kampagne erstellen
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Entwurf fortsetzen - nur wenn Entwuerfe vorhanden */}
              {draftsLoading ? (
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ) : drafts.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 hover:border-[#14ad9f] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <FileEdit className="w-6 h-6 text-[#14ad9f]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Erstellung der Kampagne fertigstellen</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        {drafts.length === 1 
                          ? 'Sie haben 1 unvollständigen Kampagnenentwurf'
                          : `Sie haben ${drafts.length} unvollständige Kampagnenentwürfe`
                        }
                      </p>
                      <button
                        onClick={() => continueDraft(drafts[0].id)}
                        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#14ad9f] text-[#14ad9f] rounded-lg text-sm font-medium hover:bg-[#14ad9f] hover:text-white transition-colors"
                      >
                        Entwurf fortsetzen
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Drafts List - wenn mehrere vorhanden */}
            {drafts.length > 1 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Alle Kampagnenentwürfe</h4>
                <div className="space-y-2">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileEdit className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{draft.name || 'Unbenannter Entwurf'}</p>
                          <p className="text-xs text-gray-500">
                            Schritt {draft.step}: {draft.stepName} - Zuletzt bearbeitet am {formatDate(draft.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => continueDraft(draft.id)}
                          className="px-3 py-1.5 text-sm text-[#14ad9f] hover:bg-[#14ad9f]/10 rounded-lg transition-colors"
                        >
                          Fortsetzen
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setShowDraftMenu(showDraftMenu === draft.id ? null : draft.id)}
                            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {showDraftMenu === draft.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-32">
                              <button
                                onClick={() => deleteDraft(draft.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Löschen
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
