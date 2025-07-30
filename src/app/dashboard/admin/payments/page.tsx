'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FiDollarSign,
  FiRefreshCw,
  FiFilter,
  FiDownload,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiActivity,
  FiTrendingUp,
  FiEye,
  FiSearch,
  FiCalendar,
} from 'react-icons/fi';

interface PaymentEvent {
  id: string;
  type: string;
  created: string;
  status: 'succeeded' | 'failed' | 'pending' | 'requires_action';
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  orderId?: string;
  customerId?: string;
  providerId?: string;
  error?: string;
  webhookStatus?: 'delivered' | 'failed' | 'pending';
}

interface DebugLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  source: string;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  orderId?: string;
  stripeEventId?: string;
}

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  avgTransactionValue: number;
  platformFees: number;
  payoutsTotal: number;
  pendingPayments: number;
  failedPayments: number;
}

export default function PaymentsAdminPage() {
  const [loading, setLoading] = useState(false);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    successRate: 0,
    avgTransactionValue: 0,
    platformFees: 0,
    payoutsTotal: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });

  // Filter states
  const [dateFilter, setDateFilter] = useState('24h');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'payments' | 'webhooks' | 'logs' | 'stats'>(
    'payments'
  );

  useEffect(() => {
    loadData();
  }, [dateFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Lade Payment Events und Debug Logs parallel
      const [paymentsResponse, logsResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/payments?date=${dateFilter}&status=${statusFilter}&search=${searchTerm}`),
        fetch(`/api/admin/debug-logs?date=${dateFilter}`),
        fetch(`/api/admin/payment-stats?date=${dateFilter}`),
      ]);

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPaymentEvents(paymentsData.events || []);
      }

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setDebugLogs(logsData.logs || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || stats);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = (type: 'payments' | 'logs') => {
    const data = type === 'payments' ? paymentEvents : debugLogs;
    const csvContent =
      type === 'payments'
        ? 'ID,Type,Created,Status,Amount,Currency,Order ID,Customer ID,Provider ID\n' +
          paymentEvents
            .map(
              p =>
                `${p.id},${p.type},${p.created},${p.status},${p.amount},${p.currency},${p.orderId || ''},${p.customerId || ''},${p.providerId || ''}`
            )
            .join('\n')
        : 'ID,Timestamp,Level,Source,Message,User ID,Order ID\n' +
          debugLogs
            .map(
              l =>
                `${l.id},${l.timestamp},${l.level},${l.source},"${l.message}",${l.userId || ''},${l.orderId || ''}`
            )
            .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taskilo_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <FiCheckCircle className="text-green-500" />;
      case 'failed':
        return <FiXCircle className="text-red-500" />;
      case 'pending':
        return <FiClock className="text-yellow-500" />;
      default:
        return <FiActivity className="text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment & Debug Monitor</h1>
          <p className="text-gray-600 mt-1">
            Überwachung aller Zahlungen, Webhooks und System-Logs in Echtzeit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'stats', label: 'Übersicht', icon: FiTrendingUp },
            { key: 'payments', label: 'Zahlungen', icon: FiDollarSign },
            { key: 'webhooks', label: 'Webhooks', icon: FiActivity },
            { key: 'logs', label: 'Debug Logs', icon: FiAlertTriangle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'text-[#14ad9f] border-b-2 border-[#14ad9f] bg-[#14ad9f]/5'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Gesamtumsatz</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Letzte {dateFilter}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Transaktionen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalTransactions}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Erfolgsrate: {stats.successRate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Platform Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#14ad9f]">
                    {formatCurrency(stats.platformFees)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Verdiente Provision</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Ausstehende Zahlungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Fehlgeschlagen: {stats.failedPayments}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-[#14ad9f]/20">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Stripe Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600 mb-3">
                    Direkt zu Stripe für detaillierte Transaktionsanalyse
                  </p>
                  <a
                    href="https://dashboard.stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-[#635bff] text-white rounded-lg text-sm hover:bg-[#5a52e5] transition-colors"
                  >
                    <FiEye size={14} />
                    Öffnen
                  </a>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Webhook Gesundheit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600 mb-3">
                    Überwachung der Webhook-Zustellung und -Fehler
                  </p>
                  <button
                    onClick={() => setActiveTab('webhooks')}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                  >
                    <FiActivity size={14} />
                    Prüfen
                  </button>
                </CardContent>
              </Card>

              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Daten Export</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600 mb-3">
                    Exportiere Zahlungs- und Debug-Daten als CSV
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportData('payments')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                    >
                      <FiDownload size={12} />
                      Zahlungen
                    </button>
                    <button
                      onClick={() => exportData('logs')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                    >
                      <FiDownload size={12} />
                      Logs
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="p-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FiCalendar size={16} className="text-gray-500" />
                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                >
                  <option value="1h">Letzte Stunde</option>
                  <option value="24h">Letzte 24 Stunden</option>
                  <option value="7d">Letzte 7 Tage</option>
                  <option value="30d">Letzte 30 Tage</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <FiFilter size={16} className="text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                >
                  <option value="all">Alle Status</option>
                  <option value="succeeded">Erfolgreich</option>
                  <option value="failed">Fehlgeschlagen</option>
                  <option value="pending">Ausstehend</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-md">
                <FiSearch size={16} className="text-gray-500" />
                <input
                  type="text"
                  placeholder="Suche nach Order ID, Customer ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                />
                <button
                  onClick={loadData}
                  className="px-3 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors text-sm"
                >
                  Suchen
                </button>
              </div>
            </div>

            {/* Payments List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <FiRefreshCw className="animate-spin text-[#14ad9f] mx-auto mb-2" size={24} />
                  <p className="text-gray-500">Lade Zahlungsdaten...</p>
                </div>
              ) : paymentEvents.length === 0 ? (
                <div className="text-center py-12">
                  <FiDollarSign className="text-gray-400 mx-auto mb-2" size={24} />
                  <p className="text-gray-500">Keine Zahlungen in diesem Zeitraum gefunden</p>
                </div>
              ) : (
                paymentEvents.map(payment => (
                  <Card key={payment.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(payment.status)}
                            <span className="font-medium text-gray-900">{payment.type}</span>
                            <span className="text-sm text-gray-500">#{payment.id}</span>
                            <span className="text-xs text-gray-400">{payment.created}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Betrag:</span>
                              <div className="font-medium">
                                {formatCurrency(payment.amount, payment.currency)}
                              </div>
                            </div>
                            {payment.orderId && (
                              <div>
                                <span className="text-gray-500">Auftrag:</span>
                                <div className="font-medium text-blue-600">{payment.orderId}</div>
                              </div>
                            )}
                            {payment.customerId && (
                              <div>
                                <span className="text-gray-500">Kunde:</span>
                                <div className="font-medium">{payment.customerId}</div>
                              </div>
                            )}
                            {payment.providerId && (
                              <div>
                                <span className="text-gray-500">Anbieter:</span>
                                <div className="font-medium">{payment.providerId}</div>
                              </div>
                            )}
                          </div>

                          {payment.description && (
                            <p className="text-sm text-gray-600 mt-2">{payment.description}</p>
                          )}

                          {payment.error && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-600">{payment.error}</p>
                            </div>
                          )}

                          {payment.metadata && Object.keys(payment.metadata).length > 0 && (
                            <div className="mt-2">
                              <details className="text-xs">
                                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                  Metadaten anzeigen
                                </summary>
                                <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(payment.metadata, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {payment.webhookStatus && (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                payment.webhookStatus === 'delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : payment.webhookStatus === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              Webhook {payment.webhookStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Webhook-Status und Zustellungsüberwachung wird hier angezeigt...
            </p>
            {/* TODO: Webhook monitoring implementation */}
          </div>
        )}

        {/* Debug Logs Tab */}
        {activeTab === 'logs' && (
          <div className="p-6">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <FiRefreshCw className="animate-spin text-[#14ad9f] mx-auto mb-2" size={24} />
                  <p className="text-gray-500">Lade Debug Logs...</p>
                </div>
              ) : debugLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FiAlertTriangle className="text-gray-400 mx-auto mb-2" size={24} />
                  <p className="text-gray-500">Keine Debug Logs in diesem Zeitraum gefunden</p>
                </div>
              ) : (
                debugLogs.map(log => (
                  <div key={log.id} className={`p-4 rounded-lg border ${getLevelColor(log.level)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${getLevelColor(log.level)}`}
                          >
                            {log.level}
                          </span>
                          <span className="font-medium">{log.source}</span>
                          <span className="text-xs text-gray-500">{log.timestamp}</span>
                        </div>

                        <p className="text-sm mb-2">{log.message}</p>

                        {(log.userId || log.orderId || log.stripeEventId) && (
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            {log.userId && (
                              <span>
                                <strong>User:</strong> {log.userId}
                              </span>
                            )}
                            {log.orderId && (
                              <span>
                                <strong>Order:</strong> {log.orderId}
                              </span>
                            )}
                            {log.stripeEventId && (
                              <span>
                                <strong>Stripe Event:</strong> {log.stripeEventId}
                              </span>
                            )}
                          </div>
                        )}

                        {log.data && Object.keys(log.data).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                              Zusätzliche Daten anzeigen
                            </summary>
                            <pre className="mt-1 p-2 bg-white/50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
