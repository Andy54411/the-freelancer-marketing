// ✅ Google Ads Debug & Test Page

import { Metadata } from 'next';
import { GoogleAdsDebug } from '@/components/google-ads/GoogleAdsDebug';

export const metadata: Metadata = {
  title: 'Google Ads Debug & Test - Taskilo',
  description: 'Umfassende Debug- und Test-Tools für die Google Ads Client Library Integration',
};

interface GoogleAdsDebugPageProps {
  params: Promise<{
    uid: string;
  }>;
  searchParams: Promise<{
    test?: string;
    mode?: string;
  }>;
}

export default async function GoogleAdsDebugPage({
  params,
  searchParams,
}: GoogleAdsDebugPageProps) {
  const { uid: companyId } = await params;
  const { test, mode = 'all' } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Google Ads Debug & Test</h1>
              <p className="mt-2 text-gray-600">
                Umfassende Test-Suite und Debug-Tools für die Google Ads Client Library
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Debug Badge */}
              <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
                    stroke="#14ad9f"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path d="M16 20v-6a4 4 0 00-8 0v6" stroke="#14ad9f" strokeWidth="2" fill="none" />
                  <path d="M9 9l4.5 4.5L18 9" stroke="#14ad9f" strokeWidth="2" fill="none" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Debug Console</span>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Component */}
        <GoogleAdsDebug companyId={companyId} initialTest={test} testMode={mode} />
      </div>
    </div>
  );
}
