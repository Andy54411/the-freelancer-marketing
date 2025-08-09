// ✅ PHASE 1: Google Ads Dashboard Page
// Hauptübersicht für Google Ads Integration

import { Metadata } from 'next';
import { GoogleAdsOverview } from '@/components/google-ads/GoogleAdsOverview';

export const metadata: Metadata = {
  title: 'Google Ads - Taskilo',
  description: 'Verwalten Sie Ihre Google Ads Kampagnen direkt aus Ihrem Taskilo Dashboard',
};

interface GoogleAdsPageProps {
  params: Promise<{
    uid: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
    accounts?: string;
  }>;
}

export default async function GoogleAdsPage({ params, searchParams }: GoogleAdsPageProps) {
  const { uid: companyId } = await params;
  const { success, error, accounts } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Google Ads Marketing</h1>
              <p className="mt-2 text-gray-600">
                Erweitern Sie Ihre Reichweite und gewinnen Sie neue Kunden mit professionellen
                Google Ads Kampagnen
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Google Ads Logo */}
              <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#34A853" />
                  <path d="M2 7v10l10 5V12L2 7z" fill="#4285F4" />
                  <path d="M22 7v10l-10 5V12l10-5z" fill="#EA4335" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Google Ads</span>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success === 'connected' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Google Ads erfolgreich verbunden!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    {accounts
                      ? `${accounts} Account(s) gefunden und verknüpft.`
                      : 'Accounts wurden erfolgreich verknüpft.'}{' '}
                    Sie können jetzt Ihre Kampagnen verwalten.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Verbindungsfehler</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    {error === 'missing_parameters' && 'Fehlende Parameter bei der Autorisierung.'}
                    {error === 'token_exchange_failed' && 'Token-Austausch fehlgeschlagen.'}
                    {error === 'fetch_customers_failed' &&
                      'Laden der Google Ads Accounts fehlgeschlagen.'}
                    {error === 'save_failed' && 'Speichern der Konfiguration fehlgeschlagen.'}
                    {error === 'callback_failed' && 'Callback-Verarbeitung fehlgeschlagen.'}
                    {![
                      'missing_parameters',
                      'token_exchange_failed',
                      'fetch_customers_failed',
                      'save_failed',
                      'callback_failed',
                    ].includes(error) && `Unbekannter Fehler: ${error}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <GoogleAdsOverview companyId={companyId} />
      </div>
    </div>
  );
}
