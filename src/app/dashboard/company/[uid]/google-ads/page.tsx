// ✅ PHASE 1: Google Ads Dashboard Page
// Hauptübersicht für Google Ads Integration

'use client';

import { useParams } from 'next/navigation';
import { GoogleAdsOverview } from '@/components/google-ads/GoogleAdsOverview';
import { GoogleAdsLayout } from '@/components/google-ads/GoogleAdsLayout';
import { GoogleAdsLogo } from '@/components/google-ads/GoogleAdsIcons';

export default function GoogleAdsPage() {
  const params = useParams();
  const companyId = params.uid as string;

  return (
    <GoogleAdsLayout
      title="Google Ads Marketing"
      description="Erweitern Sie Ihre Reichweite und gewinnen Sie neue Kunden mit professionellen Google Ads Kampagnen"
      badge={{
        icon: <GoogleAdsLogo />,
        text: 'Google Ads',
      }}
    >
      <GoogleAdsOverview companyId={companyId} />
    </GoogleAdsLayout>
  );
}
