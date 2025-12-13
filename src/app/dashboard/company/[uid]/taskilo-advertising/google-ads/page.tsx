'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import GoogleAdsInterface from '@/components/taskilo-advertising/GoogleAdsInterface';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface GoogleAdsAccount {
  customerId: string;
  accountName: string;
  currency: string;
  accountStatus: string;
  isManager: boolean;
}

export default function GoogleAdsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const companyId = params.uid as string;

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresSelection, setRequiresSelection] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<GoogleAdsAccount[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId) return;

    // Format ID: remove dashes
    const formattedId = manualId.replace(/-/g, '');

    handleAccountSelection({
      customerId: formattedId,
      accountName: `Manuell: ${manualId}`,
      currency: 'EUR',
      accountStatus: 'ENABLED',
      isManager: false,
    });
  };

  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        // Pruefe direkt in Firebase Collection, ob Google Ads Token existieren
        const response = await fetch(`/api/companies/${companyId}/integrations/google-ads`);
        const data = await response.json();

        if (data.success) {
          // Wenn Status pending_link ist UND noch nicht aktiv, zur Pending-Seite weiterleiten
          // WICHTIG: Nicht weiterleiten wenn bereits ACTIVE (vermeidet Redirect-Loop)
          if (
            (data.status === 'pending_link' || data.managerLinkStatus === 'PENDING') &&
            data.managerLinkStatus !== 'ACTIVE' &&
            !data.isConnected
          ) {
            router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads/pending`);
            return;
          }

          // Nutze isConnected direkt von der API
          if (
            data.status === 'requires_selection' ||
            searchParams.get('selection_required') === 'true' ||
            data.customerId === 'oauth-connected'
          ) {
            setRequiresSelection(true);
            setAvailableAccounts(data.availableAccounts || []);
            setIsConnected(false);
          } else {
            // API entscheidet ob verbunden (nur wenn managerApproved=true UND managerLinkStatus='ACTIVE')
            setIsConnected(data.isConnected === true);
          }
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Fehler beim Pruefen der Verbindung:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (companyId) {
      checkConnectionStatus();
    }
  }, [companyId, searchParams, router]);

  const handleAccountSelection = async (account: GoogleAdsAccount) => {
    setIsSelecting(true);
    setSelectionError(null);
    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/google-ads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: account.customerId,
          accountName: account.accountName,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // NICHT als verbunden markieren - redirect zur Warteseite
        router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads/pending`);
      } else {
        setSelectionError(result.message || result.error || 'Fehler bei der Auswahl des Accounts');
      }
    } catch (error) {
      console.error('Fehler beim Auswählen des Accounts:', error);
      setSelectionError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSelecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Prüfe Google Ads Verbindung...</p>
        </div>
      </div>
    );
  }

  // Wenn Auswahl erforderlich ist
  if (requiresSelection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <img
                src="https://www.gstatic.com/images/branding/product/1x/ads_48dp.png"
                alt="Google Ads"
                className="w-10 h-10"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Google Ads Account auswählen</h2>
            <p className="text-gray-600 mt-2">
              Wir haben mehrere Google Ads Accounts gefunden. Bitte wählen Sie den Account aus, den
              Sie mit Taskilo verbinden möchten.
            </p>
          </div>

          {selectionError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <p>{selectionError}</p>
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {availableAccounts.length > 0 ? (
              availableAccounts.map(account => {
                // Format ID: 123-456-7890
                const formattedId = account.customerId.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

                return (
                  <button
                    key={account.customerId}
                    onClick={() => handleAccountSelection(account)}
                    disabled={isSelecting}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-700 text-base mb-1">
                        {account.accountName}
                      </h3>
                      <div className="flex flex-col">
                        {account.accountStatus === 'CANCELED' && (
                          <span className="text-xs text-red-600 font-medium mb-1">(Aufgelöst)</span>
                        )}
                        {account.accountStatus === 'REMOVED' && (
                          <span className="text-xs text-gray-600 font-medium mb-1">
                            (Geschlossen)
                          </span>
                        )}
                        {account.accountStatus === 'SUSPENDED' && (
                          <span className="text-xs text-orange-600 font-medium mb-1">
                            (Gesperrt)
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
                          <span>{formattedId}</span>
                          {account.isManager && (
                            <span className="whitespace-nowrap">• Verwaltungskonto</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelecting ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-blue-500"></div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="mb-4">Keine Accounts automatisch gefunden.</p>

                <form onSubmit={handleManualSubmit} className="max-w-xs mx-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Customer ID manuell eingeben
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualId}
                      onChange={e => setManualId(e.target.value)}
                      placeholder="123-456-7890"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                    <button
                      type="submit"
                      disabled={!manualId || isSelecting}
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {isSelecting ? '...' : 'OK'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-left">Format: 123-456-7890</p>
                </form>
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() =>
                (window.location.href = `/api/multi-platform-advertising/auth/google-ads?companyId=${companyId}&force=true`)
              }
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Anderen Google Account verbinden
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wenn verbunden, zeige das vollständige Google Ads Interface
  if (isConnected) {
    return <GoogleAdsInterface companyId={companyId} />;
  }

  // Wenn nicht verbunden, zeige Verbindungsseite
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Google Ads noch nicht verbunden
            </h2>
            <p className="text-gray-600 text-lg">
              Sie müssen Ihren Google Ads Account erst mit Taskilo verbinden,
              bevor Sie Kampagnen schalten können.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              So verbinden Sie Ihren Account:
            </h3>
            <ol className="space-y-3 text-blue-900">
              <li className="flex gap-3">
                <span className="font-bold min-w-6">1.</span>
                <span>Klicken Sie unten auf "Integration beantragen"</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold min-w-6">2.</span>
                <span>Erstellen Sie ein Google Ads Test-Konto (wird weitergeleitet)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold min-w-6">3.</span>
                <span>Geben Sie Ihre Customer ID ein</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold min-w-6">4.</span>
                <span>Warten Sie auf die Freigabe vom Taskilo Manager Account</span>
              </li>
            </ol>
          </div>

          <button
            onClick={() => router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads/request`)}
            className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            Jetzt Integration beantragen →
          </button>

          <p className="text-sm text-gray-500 mt-6 text-center">
            ⚠️ Ohne Manager-Verknüpfung können Sie KEINE Google Ads schalten
          </p>
        </div>
      </div>
    </div>
  );
}
