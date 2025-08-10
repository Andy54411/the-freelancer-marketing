// ✅ Google Ads Debug & Test Page (Development Only)

'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { GoogleAdsDebug } from '@/components/google-ads/GoogleAdsDebug';
import { GoogleAdsLayout } from '@/components/google-ads/GoogleAdsLayout';
import { DebugIcon } from '@/components/google-ads/GoogleAdsIcons';
import { redirect } from 'next/navigation';

export default function GoogleAdsDebugPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const companyId = params.uid as string;
  const test = searchParams.get('test') || undefined;
  const mode = searchParams.get('mode') || 'all';

  // Debug page only available in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment) {
    redirect(`/dashboard/company/${companyId}/google-ads`);
  }

  return (
    <GoogleAdsLayout
      title="Google Ads Debug & Test"
      description="Umfassende Test-Suite und Debug-Tools für die Google Ads Client Library (Development Only)"
      badge={{
        icon: <DebugIcon />,
        text: 'Debug Console',
      }}
      showStatusMessages={false}
    >
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          🚧 <strong>Development Mode:</strong> Diese Debug-Seite ist nur in der
          Entwicklungsumgebung verfügbar.
        </p>
      </div>

      <GoogleAdsDebug companyId={companyId} initialTest={test} testMode={mode} />
    </GoogleAdsLayout>
  );
}
