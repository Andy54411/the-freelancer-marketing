// ✅ Google Ads Kampagnen Management Page

'use client';

import { useParams } from 'next/navigation';
import { CampaignManagement } from '@/components/google-ads/CampaignManagement';
import { GoogleAdsLayout } from '@/components/google-ads/GoogleAdsLayout';
import { GoogleAdsLogo } from '@/components/google-ads/GoogleAdsIcons';

export default function GoogleAdsCampaignsPage() {
  const params = useParams();
  const companyId = params.uid as string;

  return (
    <GoogleAdsLayout
      title="Kampagnen Management"
      description="Erstellen, bearbeiten und überwachen Sie Ihre Google Ads Kampagnen"
      badge={{
        icon: <GoogleAdsLogo />,
        text: 'Google Ads API',
      }}
    >
      <CampaignManagement
        companyId={companyId}
        onCampaignUpdate={() => {
          // Optional: Refresh campaign data
          console.log('Campaign updated');
        }}
      />
    </GoogleAdsLayout>
  );
}
