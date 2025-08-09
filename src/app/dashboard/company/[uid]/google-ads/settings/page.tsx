// ✅ Google Ads Einstellungen Page

import { Metadata } from 'next';
import { GoogleAdsSettings } from '@/components/google-ads/GoogleAdsSettings';

export const metadata: Metadata = {
  title: 'Google Ads Einstellungen - Taskilo',
  description: 'Konfigurieren Sie Ihre Google Ads Integration und Kontoeinstellungen',
};

interface GoogleAdsSettingsPageProps {
  params: Promise<{
    uid: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
    tab?: string;
  }>;
}

export default async function GoogleAdsSettingsPage({
  params,
  searchParams,
}: GoogleAdsSettingsPageProps) {
  const { uid: companyId } = await params;
  const { success, error, tab = 'connection' } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Google Ads Einstellungen</h1>
              <p className="mt-2 text-gray-600">
                Verwalten Sie Ihre Google Ads Integration und Kontoeinstellungen
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Settings Badge */}
              <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                    stroke="#14ad9f"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                    stroke="#14ad9f"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">Konfiguration</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Settings Component */}
        <GoogleAdsSettings companyId={companyId} activeTab={tab} />
      </div>
    </div>
  );
}
