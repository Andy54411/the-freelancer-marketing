// ✅ Google Ads Kampagnen Management Page

import { Metadata } from 'next';
import { CampaignManagement } from '@/components/google-ads/CampaignManagement';

export const metadata: Metadata = {
  title: 'Google Ads Kampagnen - Taskilo',
  description: 'Verwalten Sie Ihre Google Ads Kampagnen und überwachen Sie deren Performance',
};

interface GoogleAdsCampaignsPageProps {
  params: Promise<{
    uid: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
    campaign_id?: string;
  }>;
}

export default async function GoogleAdsCampaignsPage({
  params,
  searchParams,
}: GoogleAdsCampaignsPageProps) {
  const { uid: companyId } = await params;
  const { success, error, campaign_id } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kampagnen Management</h1>
              <p className="mt-2 text-gray-600">
                Erstellen, bearbeiten und überwachen Sie Ihre Google Ads Kampagnen
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Google Ads Badge */}
              <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#34A853" />
                  <path d="M2 7v10l10 5V12L2 7z" fill="#4285F4" />
                  <path d="M22 7v10l-10 5V12l10-5z" fill="#EA4335" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Google Ads API</span>
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

        {/* Campaign Management Component */}
        <CampaignManagement
          customerId={companyId}
          onCampaignUpdate={() => {
            // Optional: Refresh campaign data
            console.log('Campaign updated');
          }}
        />
      </div>
    </div>
  );
}
