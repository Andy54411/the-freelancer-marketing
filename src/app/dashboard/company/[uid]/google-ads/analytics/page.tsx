// ✅ Google Ads Analytics & Performance Page

import { Metadata } from 'next';
import { GoogleAdsAnalytics } from '@/components/google-ads/GoogleAdsAnalytics';

export const metadata: Metadata = {
  title: 'Google Ads Analytics - Taskilo',
  description:
    'Analysieren Sie die Performance Ihrer Google Ads Kampagnen mit detaillierten Metriken',
};

interface GoogleAdsAnalyticsPageProps {
  params: Promise<{
    uid: string;
  }>;
  searchParams: Promise<{
    period?: string;
    campaign_id?: string;
  }>;
}

export default async function GoogleAdsAnalyticsPage({
  params,
  searchParams,
}: GoogleAdsAnalyticsPageProps) {
  const { uid: companyId } = await params;
  const { period = '30', campaign_id } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Google Ads Analytics</h1>
              <p className="mt-2 text-gray-600">
                Detaillierte Performance-Analyse Ihrer Google Ads Kampagnen
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Analytics Badge */}
              <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3v18h18" stroke="#14ad9f" strokeWidth="2" fill="none" />
                  <path d="M7 12l4-4 4 4 4-4" stroke="#14ad9f" strokeWidth="2" fill="none" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Analytics Dashboard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Component */}
        <GoogleAdsAnalytics
          companyId={companyId}
          period={period}
          selectedCampaignId={campaign_id}
        />
      </div>
    </div>
  );
}
