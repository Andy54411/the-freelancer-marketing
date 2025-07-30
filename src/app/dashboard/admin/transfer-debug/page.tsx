'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlertHelpers } from '@/components/ui/AlertProvider';
import {
  FiSearch,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiDollarSign,
  FiClock,
  FiArrowRight,
  FiInfo,
} from 'react-icons/fi';

interface DebugResult {
  searchCriteria: {
    orderId?: string;
    paymentIntentId?: string;
    connectAccountId?: string;
  };
  results: {
    orderData?: any;
    paymentIntent?: any;
    transfers?: any;
    connectAccount?: any;
    failedTransfers?: any;
    company?: any;
  };
}

interface FailedTransfer {
  id: string;
  orderId: string;
  paymentIntentId: string;
  providerStripeAccountId: string;
  amount: number;
  error: string;
  status: string;
  retryCount: number;
  createdAt: string;
  lastRetryAt?: string;
  completedAt?: string;
}

export default function TransferDebugPage() {
  const { showSuccess, showError } = useAlertHelpers();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'orderId' | 'paymentIntentId' | 'connectAccountId'>(
    'orderId'
  );
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [failedTransfers, setFailedTransfers] = useState<FailedTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set(searchType, searchQuery.trim());

      const response = await fetch(`/api/admin/debug-transfers?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setDebugResult(data.debug);
      } else {
        showError('Fehler beim Suchen', data.error);
      }
    } catch (error) {
      console.error('Search error:', error);
      showError('Suchfehler', 'Fehler beim Suchen der Debug-Informationen');
    } finally {
      setLoading(false);
    }
  };

  const loadFailedTransfers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/retry-failed-transfers?status=pending_retry');
      const data = await response.json();

      if (data.success) {
        setFailedTransfers(data.failedTransfers);
      } else {
        showError('Ladefehler', data.error);
      }
    } catch (error) {
      console.error('Failed transfers loading error:', error);
      showError('Ladefehler', 'Fehler beim Laden der fehlgeschlagenen Transfers');
    } finally {
      setLoading(false);
    }
  };

  const retryFailedTransfer = async (transferId: string) => {
    setRetryLoading(transferId);
    try {
      const response = await fetch('/api/admin/retry-failed-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferIds: [transferId] }),
      });

      const data = await response.json();

      if (data.success && data.results[0]?.success) {
        showSuccess(
          'Transfer erfolgreich wiederholt',
          `Neue Transfer-ID: ${data.results[0].newTransferId}`
        );
        loadFailedTransfers(); // Reload list
      } else {
        showError('Retry fehlgeschlagen', data.results[0]?.error || data.error);
      }
    } catch (error) {
      console.error('Retry error:', error);
      showError('Retry-Fehler', 'Fehler beim Wiederholen des Transfers');
    } finally {
      setRetryLoading(null);
    }
  };

  React.useEffect(() => {
    loadFailedTransfers();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Transfer Debug & Retry</h1>
        <button
          onClick={loadFailedTransfers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Aktualisieren
        </button>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiSearch />
            Transfer-Suche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <select
              value={searchType}
              onChange={e => setSearchType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            >
              <option value="orderId">Auftrags-ID</option>
              <option value="paymentIntentId">Payment Intent ID</option>
              <option value="connectAccountId">Connect Account ID</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`${searchType === 'orderId' ? 'z.B. 4bMTQQzVWsHyKhkbkRRu' : searchType === 'paymentIntentId' ? 'z.B. pi_3Rqc72D5Lvjon30a08o23TEY' : 'z.B. acct_1RoSL4DlTKEWRrRh'}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors disabled:opacity-50"
            >
              {loading ? <FiRefreshCw className="animate-spin" /> : 'Suchen'}
            </button>
          </div>

          {debugResult && (
            <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-lg">Debug-Ergebnisse</h3>

              {/* Order Data */}
              {debugResult.results.orderData && (
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">📋 Auftragsdaten</h4>
                  {debugResult.results.orderData.exists ? (
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>Status:</strong> {debugResult.results.orderData.status}
                      </p>
                      <p>
                        <strong>Payment Intent:</strong>{' '}
                        {debugResult.results.orderData.paymentIntentId || 'Nicht vorhanden'}
                      </p>
                      <p>
                        <strong>TimeTracking Status:</strong>{' '}
                        {debugResult.results.orderData.timeTracking?.status || 'Nicht vorhanden'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-red-600">❌ Auftrag nicht gefunden</p>
                  )}
                </div>
              )}

              {/* Payment Intent */}
              {debugResult.results.paymentIntent && (
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">💳 Payment Intent</h4>
                  {debugResult.results.paymentIntent.error ? (
                    <p className="text-red-600">❌ {debugResult.results.paymentIntent.error}</p>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>ID:</strong> {debugResult.results.paymentIntent.id}
                      </p>
                      <p>
                        <strong>Status:</strong> {debugResult.results.paymentIntent.status}
                      </p>
                      <p>
                        <strong>Betrag:</strong>{' '}
                        {(debugResult.results.paymentIntent.amount / 100).toFixed(2)}€
                      </p>
                      <p>
                        <strong>Typ:</strong>{' '}
                        {debugResult.results.paymentIntent.metadata?.type || 'Nicht definiert'}
                      </p>
                      <p>
                        <strong>Provider Account:</strong>{' '}
                        {debugResult.results.paymentIntent.metadata?.providerStripeAccountId ||
                          'Nicht vorhanden'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Transfers */}
              {debugResult.results.transfers && (
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">
                    🔄 Transfers ({debugResult.results.transfers.found})
                  </h4>
                  {debugResult.results.transfers.error ? (
                    <p className="text-red-600">❌ {debugResult.results.transfers.error}</p>
                  ) : debugResult.results.transfers.found === 0 ? (
                    <p className="text-yellow-600">⚠️ Keine Transfers gefunden</p>
                  ) : (
                    <div className="space-y-2">
                      {debugResult.results.transfers.transfers.map(
                        (transfer: any, index: number) => (
                          <div key={index} className="p-2 bg-gray-50 rounded border">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{transfer.id}</span>
                              <span className="text-green-600">
                                {(transfer.amount / 100).toFixed(2)}€
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{transfer.description}</p>
                            <p className="text-xs text-gray-500">
                              Destination: {transfer.destination}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Connect Account */}
              {debugResult.results.connectAccount && (
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">🏢 Connect Account</h4>
                  {debugResult.results.connectAccount.error ? (
                    <p className="text-red-600">❌ {debugResult.results.connectAccount.error}</p>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>ID:</strong> {debugResult.results.connectAccount.id}
                      </p>
                      <p>
                        <strong>Charges Enabled:</strong>{' '}
                        {debugResult.results.connectAccount.charges_enabled ? '✅' : '❌'}
                      </p>
                      <p>
                        <strong>Payouts Enabled:</strong>{' '}
                        {debugResult.results.connectAccount.payouts_enabled ? '✅' : '❌'}
                      </p>
                      <p>
                        <strong>Details Submitted:</strong>{' '}
                        {debugResult.results.connectAccount.details_submitted ? '✅' : '❌'}
                      </p>
                      <p>
                        <strong>Type:</strong> {debugResult.results.connectAccount.type}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Failed Transfers for this search */}
              {debugResult.results.failedTransfers && (
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">
                    🚫 Fehlgeschlagene Transfers ({debugResult.results.failedTransfers.found})
                  </h4>
                  {debugResult.results.failedTransfers.error ? (
                    <p className="text-red-600">❌ {debugResult.results.failedTransfers.error}</p>
                  ) : debugResult.results.failedTransfers.found === 0 ? (
                    <p className="text-green-600">✅ Keine fehlgeschlagenen Transfers</p>
                  ) : (
                    <div className="space-y-2">
                      {debugResult.results.failedTransfers.transfers.map(
                        (transfer: any, index: number) => (
                          <div key={index} className="p-2 bg-red-50 rounded border border-red-200">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-red-800">{transfer.id}</span>
                              <span className="text-red-600">
                                {(transfer.amount / 100).toFixed(2)}€
                              </span>
                            </div>
                            <p className="text-sm text-red-700">Fehler: {transfer.error}</p>
                            <p className="text-xs text-red-600">
                              Status: {transfer.status} | Versuche: {transfer.retryCount}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failed Transfers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiAlertTriangle className="text-red-500" />
            Fehlgeschlagene Transfers ({failedTransfers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failedTransfers.length === 0 ? (
            <div className="text-center py-8">
              <FiCheckCircle className="mx-auto text-green-500 mb-2" size={48} />
              <p className="text-gray-600">Keine fehlgeschlagenen Transfers vorhanden</p>
            </div>
          ) : (
            <div className="space-y-4">
              {failedTransfers.map(transfer => (
                <div key={transfer.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-red-800">
                          Transfer #{transfer.id.slice(-8)}
                        </span>
                        <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full">
                          {transfer.status}
                        </span>
                        <span className="text-red-600 font-medium">
                          {(transfer.amount / 100).toFixed(2)}€
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p>
                            <strong>Auftrag:</strong> {transfer.orderId}
                          </p>
                          <p>
                            <strong>Payment Intent:</strong>{' '}
                            {transfer.paymentIntentId?.slice(-12) || 'N/A'}
                          </p>
                          <p>
                            <strong>Connect Account:</strong> {transfer.providerStripeAccountId}
                          </p>
                        </div>
                        <div>
                          <p>
                            <strong>Erstellt:</strong>{' '}
                            {new Date(transfer.createdAt).toLocaleString('de-DE')}
                          </p>
                          <p>
                            <strong>Versuche:</strong> {transfer.retryCount}
                          </p>
                          {transfer.lastRetryAt && (
                            <p>
                              <strong>Letzter Versuch:</strong>{' '}
                              {new Date(transfer.lastRetryAt).toLocaleString('de-DE')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                        <strong>Fehler:</strong> {transfer.error}
                      </div>
                    </div>

                    <button
                      onClick={() => retryFailedTransfer(transfer.id)}
                      disabled={retryLoading === transfer.id}
                      className="ml-4 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {retryLoading === transfer.id ? (
                        <FiRefreshCw className="animate-spin" />
                      ) : (
                        <FiArrowRight />
                      )}
                      Wiederholen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
