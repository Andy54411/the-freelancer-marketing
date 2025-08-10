// ✅ Google Ads Analytics & Performance Page

'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { GoogleAdsAnalytics } from '@/components/google-ads/GoogleAdsAnalytics';
import { GoogleAdsLayout } from '@/components/google-ads/GoogleAdsLayout';
import { AnalyticsIcon } from '@/components/google-ads/GoogleAdsIcons';

export default function GoogleAdsAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const companyId = params.uid as string;
  const period = searchParams.get('period') || '30';
  const campaign_id = searchParams.get('campaign_id') || undefined;

  return (
    <GoogleAdsLayout
      title="Google Ads Analytics"
      description="Detaillierte Performance-Analyse Ihrer Google Ads Kampagnen"
      badge={{
        icon: <AnalyticsIcon />,
        text: 'Analytics Dashboard',
      }}
      showStatusMessages={false}
    >
      <GoogleAdsAnalytics companyId={companyId} period={period} selectedCampaignId={campaign_id} />
    </GoogleAdsLayout>
  );
}
