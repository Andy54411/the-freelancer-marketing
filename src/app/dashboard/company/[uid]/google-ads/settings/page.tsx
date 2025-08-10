// ✅ Google Ads Einstellungen Page

'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { GoogleAdsSettings } from '@/components/google-ads/GoogleAdsSettings';
import { GoogleAdsLayout } from '@/components/google-ads/GoogleAdsLayout';
import { SettingsIcon } from '@/components/google-ads/GoogleAdsIcons';

export default function GoogleAdsSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const companyId = params.uid as string;
  const tab = searchParams.get('tab') || 'connection';

  return (
    <GoogleAdsLayout
      title="Google Ads Einstellungen"
      description="Verwalten Sie Ihre Google Ads Integration und Kontoeinstellungen"
      badge={{
        icon: <SettingsIcon />,
        text: 'Konfiguration',
      }}
    >
      <GoogleAdsSettings companyId={companyId} activeTab={tab} />
    </GoogleAdsLayout>
  );
}
