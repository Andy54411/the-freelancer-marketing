'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, Plus } from 'lucide-react';

interface GoogleAdsCampaignCreatorProps {
  companyId: string;
}

interface BusinessData {
  businessName: string;
  landingDestination: 'website' | 'other';
  websiteUrl: string;
}

export default function GoogleAdsCampaignCreator({ companyId }: GoogleAdsCampaignCreatorProps) {
  const router = useRouter();
  const [businessData, setBusinessData] = useState<BusinessData>({
    businessName: '',
    landingDestination: 'website',
    websiteUrl: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = () => {
    console.log('🚀 NEUE VERSION - handleContinue gestartet!', businessData);

    // Einfache Navigation ohne komplizierte Logik
    const queryParams = new URLSearchParams({
      businessName: businessData.businessName || 'Test',
      landingDestination: businessData.landingDestination || 'website',
      websiteUrl: businessData.websiteUrl || 'https://example.com',
    });

    const targetUrl = `/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new/objectives?${queryParams}`;
    console.log('🎯 Navigation zur URL:', targetUrl);

    // Clientseitige Navigation ohne Reload
    router.push(targetUrl);
  };

  const handleSkip = () => {
    console.log('handleSkip called');

    try {
      const targetUrl = `/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new/objectives`;
      console.log('Skipping to:', targetUrl);
      router.push(targetUrl);
    } catch (error) {
      console.error('Skip navigation error:', error);
      alert('Fehler beim Überspringen. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card - Taskilo Style */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#14ad9f] rounded-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Neue Google Ads Kampagne erstellen
            </h1>
          </div>
          <p className="text-gray-600">
            Erstellen Sie eine neue Kampagne für Ihr Unternehmen und erreichen Sie potenzielle
            Kunden über Google Ads.
          </p>
        </div>
      </div>

      {/* Business Information Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Angaben zu Ihrem Unternehmen</h2>
          <p className="text-gray-600 mb-6">
            Diese Informationen helfen uns dabei, passende Vorschläge für Ihre Kampagne zu
            erstellen.
          </p>

          <div className="space-y-6">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unternehmensname (optional)
              </label>
              <Input
                value={businessData.businessName}
                onChange={e => setBusinessData(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="Geben Sie den Namen Ihres Unternehmens ein"
                className="w-full focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
              />
            </div>

            {/* Landing Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Ziel-URL für Ihre Anzeigen
              </label>

              <div className="space-y-4">
                {/* Website Option */}
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    businessData.landingDestination === 'website'
                      ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() =>
                    setBusinessData(prev => ({ ...prev, landingDestination: 'website' }))
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          businessData.landingDestination === 'website'
                            ? 'border-[#14ad9f] bg-[#14ad9f]'
                            : 'border-gray-400'
                        }`}
                      >
                        {businessData.landingDestination === 'website' && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">Website</h3>
                      <p className="text-sm text-gray-600">
                        Leiten Sie Nutzer zu Ihrer Website oder einer spezifischen Seite weiter
                      </p>

                      {businessData.landingDestination === 'website' && (
                        <div className="mt-4">
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                              <Link className="w-4 h-4 text-gray-400" />
                            </div>
                            <Input
                              value={businessData.websiteUrl}
                              onChange={e =>
                                setBusinessData(prev => ({ ...prev, websiteUrl: e.target.value }))
                              }
                              placeholder="https://beispiel.de"
                              className="pl-10 focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                              type="url"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Geben Sie die vollständige URL ein, zu der Nutzer weitergeleitet werden
                            sollen.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Other Option */}
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    businessData.landingDestination === 'other'
                      ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() =>
                    setBusinessData(prev => ({ ...prev, landingDestination: 'other' }))
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          businessData.landingDestination === 'other'
                            ? 'border-[#14ad9f] bg-[#14ad9f]'
                            : 'border-gray-400'
                        }`}
                      >
                        {businessData.landingDestination === 'other' && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">Sonstiges</h3>
                      <p className="text-sm text-gray-600">
                        Andere Ziele wie App-Downloads oder Telefonanrufe
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card - Taskilo Style */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-teal-100 rounded">
            <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-teal-900 mb-1">Information</h3>
            <p className="text-sm text-teal-800">
              Diese Angaben werden verwendet, um Ihnen passende Kampagnenvorschläge zu erstellen.
              Sie können alle Einstellungen später noch anpassen.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Zurück
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Überspringen
          </Button>
          <Button
            onClick={handleContinue}
            className="bg-[#14ad9f] hover:bg-[#129a8f] text-white px-6"
          >
            {isSubmitting ? 'Weiter...' : 'Weiter'}
          </Button>
        </div>
      </div>
    </div>
  );
}
