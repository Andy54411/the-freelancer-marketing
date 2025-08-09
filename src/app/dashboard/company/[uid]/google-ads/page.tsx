// ✅ PHASE 1: Google Ads Dashboard Page
// Hauptübersicht für Google Ads Integration

'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { GoogleAdsOverview } from '@/components/google-ads/GoogleAdsOverview';

export default function GoogleAdsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const companyId = params.uid as string;
  const success = searchParams.get('success') || undefined;
  const error = searchParams.get('error') || undefined;
  const accounts = searchParams.get('accounts') || undefined;
  const details = searchParams.get('details') || undefined;

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
                    {error === 'invalid_company_id' && 'Ungültige Unternehmens-ID.'}
                    {error === 'missing_developer_token' && 'Fehlender Developer Token.'}
                    {![
                      'missing_parameters',
                      'token_exchange_failed',
                      'fetch_customers_failed',
                      'save_failed',
                      'callback_failed',
                      'invalid_company_id',
                      'missing_developer_token',
                    ].includes(error) && `Unbekannter Fehler: ${error}`}
                  </p>
                  {/* Show additional error details if available */}
                  {details && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border">
                      <strong>Details:</strong> {decodeURIComponent(details)}
                    </div>
                  )}
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
