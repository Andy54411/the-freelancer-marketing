'use client';

import { useState, useEffect } from 'react';
import {
  FiDollarSign,
  FiUsers,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiEye,
  FiClock,
  FiActivity,
  FiDatabase,
  FiServer,
  FiCreditCard,
} from 'react-icons/fi';

interface B2BProviderDebugInfo {
  id: string;
  type: 'firma' | 'user';
  companyName?: string;
  userName?: string;
  email?: string;
  stripeAccountId?: string;
  stripeAccountStatus?: 'valid' | 'invalid' | 'missing';
  lastUpdated?: string;
  totalPayments?: number;
}

interface B2BPaymentDebugInfo {
  id: string;
  projectId: string;
  projectTitle: string;
  paymentType: string;
  status: string;
  grossAmount: number;
  platformFee: number;
  providerAmount: number;
  currency: string;
  createdAt: string;
  providerInfo: {
    id: string;
    name: string;
    stripeAccountId: string;
  };
  customerInfo: {
    id: string;
    name: string;
  };
}

interface B2BDebugResponse {
  success: boolean;
  timestamp: string;
  summary: {
    providers: {
      total: number;
      valid: number;
      invalid: number;
      missing: number;
    };
    payments: {
      total: number;
      successful: number;
      pending: number;
      failed: number;
    };
  };
  data: {
    providers: B2BProviderDebugInfo[];
    payments: B2BPaymentDebugInfo[];
  };
}

export default function B2BDebugPage() {
  const [debugData, setDebugData] = useState<B2BDebugResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchDebugData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/b2b-debug');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch B2B debug data');
      }

      setDebugData(data);
      setLastRefresh(new Date().toLocaleTimeString('de-DE'));
    } catch (err: any) {
      setError(err.message);
      console.error('B2B Debug fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
      case 'succeeded':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'invalid':
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'missing':
      case 'pending_payment':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
      case 'succeeded':
        return <FiCheckCircle className="w-4 h-4" />;
      case 'invalid':
      case 'failed':
        return <FiXCircle className="w-4 h-4" />;
      case 'missing':
      case 'pending_payment':
        return <FiClock className="w-4 h-4" />;
      default:
        return <FiActivity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiRefreshCw className="w-8 h-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
          <p className="text-gray-600">B2B Debug-Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <FiXCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-800">
              Fehler beim Laden der B2B Debug-Daten
            </h2>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchDebugData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">B2B Payment Debug</h1>
          <p className="text-gray-600 mt-1">Überwachung von B2B Zahlungen und Provider-Konten</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Letztes Update: {lastRefresh}</span>
          <button
            onClick={fetchDebugData}
            disabled={loading}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {debugData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Provider Stats */}
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {debugData.summary.providers.total}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Provider Gesamt</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-600">✓ Gültige Konten:</span>
                <span className="font-medium">{debugData.summary.providers.valid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">✗ Ungültige:</span>
                <span className="font-medium">{debugData.summary.providers.invalid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-600">⚠ Fehlende:</span>
                <span className="font-medium">{debugData.summary.providers.missing}</span>
              </div>
            </div>
          </div>

          {/* Payment Stats */}
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <FiDollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-green-600">
                {debugData.summary.payments.total}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">B2B Zahlungen</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-600">✓ Erfolgreich:</span>
                <span className="font-medium">{debugData.summary.payments.successful}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-600">⏳ Ausstehend:</span>
                <span className="font-medium">{debugData.summary.payments.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">✗ Fehlgeschlagen:</span>
                <span className="font-medium">{debugData.summary.payments.failed}</span>
              </div>
            </div>
          </div>

          {/* Valid Provider Ratio */}
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#14ad9f]/10 rounded-lg">
                <FiCheckCircle className="w-6 h-6 text-[#14ad9f]" />
              </div>
              <span className="text-2xl font-bold text-[#14ad9f]">
                {debugData.summary.providers.total > 0
                  ? Math.round(
                      (debugData.summary.providers.valid / debugData.summary.providers.total) * 100
                    )
                  : 0}
                %
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Provider Bereit</h3>
            <p className="text-sm text-gray-600">
              Anteil der Provider mit gültigen Stripe Connect Konten
            </p>
          </div>

          {/* Payment Success Rate */}
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FiCreditCard className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-emerald-600">
                {debugData.summary.payments.total > 0
                  ? Math.round(
                      (debugData.summary.payments.successful / debugData.summary.payments.total) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Erfolgsrate</h3>
            <p className="text-sm text-gray-600">
              Anteil erfolgreich abgeschlossener B2B Zahlungen
            </p>
          </div>
        </div>
      )}

      {/* Provider Debug Table */}
      {debugData && debugData.data.providers.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiDatabase className="w-5 h-5" />
              Provider Stripe Connect Status
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Echte Daten aus der Datenbank - {debugData.data.providers.length} Provider gefunden
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stripe Account ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Letztes Update
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {debugData.data.providers.map(provider => (
                  <tr key={provider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {provider.companyName || provider.userName || 'Unbekannt'}
                        </div>
                        <div className="text-sm text-gray-500">ID: {provider.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          provider.type === 'firma'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {provider.type === 'firma' ? 'Firma' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm">
                        {provider.stripeAccountId ? (
                          <span
                            className={
                              provider.stripeAccountId.startsWith('acct_')
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {provider.stripeAccountId}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Nicht gesetzt</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(provider.stripeAccountStatus || 'missing')}`}
                      >
                        {getStatusIcon(provider.stripeAccountStatus || 'missing')}
                        {provider.stripeAccountStatus === 'valid'
                          ? 'Gültig'
                          : provider.stripeAccountStatus === 'invalid'
                            ? 'Ungültig'
                            : 'Fehlend'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {provider.email || 'Keine Email'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {provider.lastUpdated
                        ? new Date(provider.lastUpdated).toLocaleDateString('de-DE')
                        : 'Unbekannt'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* B2B Payments Debug Table */}
      {debugData && debugData.data.payments.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiServer className="w-5 h-5" />
              B2B Payment Transaktionen
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Letzte {debugData.data.payments.length} B2B Zahlungen aus der Datenbank
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Projekt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kunde
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Betrag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Erstellt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {debugData.data.payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{payment.projectTitle}</div>
                        <div className="text-sm text-gray-500">
                          {payment.projectId} • {payment.paymentType}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{payment.providerInfo.name}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {payment.providerInfo.stripeAccountId || 'Keine Account ID'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{payment.customerInfo.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {(payment.grossAmount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Fee: {(payment.platformFee / 100).toFixed(2)} • Provider:{' '}
                          {(payment.providerAmount / 100).toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}
                      >
                        {getStatusIcon(payment.status)}
                        {payment.status === 'succeeded'
                          ? 'Erfolgreich'
                          : payment.status === 'pending_payment'
                            ? 'Ausstehend'
                            : payment.status === 'failed'
                              ? 'Fehlgeschlagen'
                              : payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(payment.createdAt).toLocaleString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data States */}
      {debugData && debugData.data.providers.length === 0 && (
        <div className="bg-white rounded-lg shadow border p-8 text-center">
          <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Provider gefunden</h3>
          <p className="text-gray-600">
            Es wurden noch keine Provider mit Kategorie-Daten in der Datenbank gefunden.
          </p>
        </div>
      )}

      {debugData && debugData.data.payments.length === 0 && (
        <div className="bg-white rounded-lg shadow border p-8 text-center">
          <FiDollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine B2B Zahlungen gefunden</h3>
          <p className="text-gray-600">
            Es wurden noch keine B2B Zahlungen in der Datenbank gefunden.
          </p>
        </div>
      )}
    </div>
  );
}
