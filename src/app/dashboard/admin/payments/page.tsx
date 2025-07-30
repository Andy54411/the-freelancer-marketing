'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FiRefreshCw,
  FiDownload,
  FiFilter,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertTriangle,
  FiDollarSign,
  FiCreditCard,
  FiUsers,
  FiActivity,
  FiTrendingUp,
  FiEye,
  FiCalendar,
  FiSend,
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
  // Stripe Connect Account Information
  stripeAccount?: {
    id: string;
    type: string;
    isConnectedAccount: boolean;
  };
  rawStripeData?: {
    object_id: string;
    object_type: string;
    source: string;
    account_id: string;
    account_type: string;
    full_object?: any;
  };
}

interface StripeDataSources {
  mainAccount: {
    events: number;
    paymentIntents: number;
    charges: number;
    transfers: number;
    payouts: number;
    invoices: number;
    subscriptions: number;
    balanceTransactions: number;
    customers: number;
    setupIntents: number;
    refunds: number;
    disputes: number;
    applicationFees: number;
  };
  connectedAccounts: {
    total: number;
    accounts: Array<{
      id: string;
      type: string;
      country: string;
      business_type: string;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      hasData: boolean;
      error?: string;
      dataLoaded?: {
        events: number;
        paymentIntents: number;
        charges: number;
        transfers: number;
        payouts: number;
        balanceTransactions: number;
      };
    }>;
  };
  totalUniqueObjects: number;
  completeCoverage: boolean;
  connectEnabled: boolean;
  note: string;
}

interface PaymentsApiResponse {
  events: PaymentEvent[];
  total: number;
  dateRange: {
    from: string;
    to: string;
  };
  filters: {
    date: string;
    status: string;
    search: string;
  };
  stripeDataSources: StripeDataSources;
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

interface WebhookEvent {
  id: string;
  type: string;
  created: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  nextRetry?: string;
  lastError?: string;
  url: string;
  data: unknown;
  accountId: string;
  accountType: 'main' | 'connected';
}

interface WebhookStats {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
  retrying: number;
  endpoints: {
    main: number;
    connected: number;
  };
  accounts: {
    main: number;
    connected: number;
    withWebhooks: number;
  };
}

interface MonitoringMetrics {
  timestamp: string;
  payments: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    totalVolume: number;
    averageAmount: number;
  };
  webhooks: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    healthScore: number;
  };
  accounts: {
    main: {
      active: boolean;
      paymentsEnabled: boolean;
      payoutsEnabled: boolean;
    };
    connected: {
      total: number;
      active: number;
      withIssues: number;
    };
  };
  system: {
    apiLatency: number;
    errorRate: number;
    uptime: number;
  };
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
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [webhookStats, setWebhookStats] = useState<WebhookStats | null>(null);
  const [monitoringMetrics, setMonitoringMetrics] = useState<MonitoringMetrics | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [realTimeStatus, setRealTimeStatus] = useState<string>('Offline');
  const [stripeDataSources, setStripeDataSources] = useState<StripeDataSources | null>(null);
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
  const [activeTab, setActiveTab] = useState<
    'payments' | 'webhooks' | 'logs' | 'stats' | 'connect'
  >('payments');

  // Real-Time Monitoring mit erweiterten Features
  useEffect(() => {
    if (realTimeEnabled && typeof window !== 'undefined') {
      // Load Real-Time Monitor Script
      const script = document.createElement('script');
      script.src = '/real-time-monitor.js';
      script.onload = () => {
        const monitor = (window as any).RealTimeMonitor;
        if (monitor) {
          setRealTimeStatus('Connecting...');

          // Setup Real-Time Endpoints
          const endpoints = [
            `/api/admin/payments?date=${dateFilter}&status=${statusFilter}&search=${searchTerm}`,
            `/api/admin/webhooks?date=${dateFilter}&status=all`,
            `/api/admin/monitoring?realtime=true&interval=1min`,
          ];

          // Setup callbacks for each endpoint
          endpoints.forEach(endpoint => {
            monitor.startMonitoring(
              endpoint,
              (data: any, error: any) => {
                if (error) {
                  console.error('Real-time update error:', error);
                  setRealTimeStatus('Error - Retrying...');
                  return;
                }

                setRealTimeStatus('Live');

                // Update state based on endpoint
                if (endpoint.includes('/payments')) {
                  if (data.events) setPaymentEvents(data.events);
                  if (data.stripeDataSources) setStripeDataSources(data.stripeDataSources);
                } else if (endpoint.includes('/webhooks')) {
                  if (data.events) setWebhookEvents(data.events);
                  if (data.stats) setWebhookStats(data.stats);
                } else if (endpoint.includes('/monitoring')) {
                  if (data.metrics) setMonitoringMetrics(data.metrics);
                }
              },
              30000
            ); // 30 second intervals
          });

          // Setup event listeners
          window.addEventListener('realtime-error', (event: any) => {
            console.warn('Real-time monitoring error:', event.detail);
            setRealTimeStatus('Connection Issues');
          });

          window.addEventListener('realtime-stopped', (event: any) => {
            console.warn('Real-time monitoring stopped:', event.detail);
            setRealTimeStatus('Disconnected');
          });
        }
      };
      document.head.appendChild(script);

      return () => {
        // Cleanup
        if ((window as any).RealTimeMonitor) {
          (window as any).RealTimeMonitor.stopAll();
        }
        setRealTimeStatus('Offline');
      };
    } else if (!realTimeEnabled && (window as any).RealTimeMonitor) {
      (window as any).RealTimeMonitor.stopAll();
      setRealTimeStatus('Offline');
    }
  }, [realTimeEnabled, activeTab, dateFilter, statusFilter, searchTerm]);

  useEffect(() => {
    if (!realTimeEnabled) {
      loadData();
    }
  }, [dateFilter, statusFilter, searchTerm, realTimeEnabled]);

  // Auto-refresh für Real-Time Monitoring
  const toggleRealTime = () => {
    setRealTimeEnabled(!realTimeEnabled);
    if (!realTimeEnabled) {
      setRealTimeStatus('Initializing...');
      loadData(); // Immediate refresh when enabling
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Lade Payment Events, Debug Logs, Webhooks und Monitoring parallel
      const [paymentsResponse, logsResponse, webhooksResponse, monitoringResponse] =
        await Promise.all([
          fetch(
            `/api/admin/payments?date=${dateFilter}&status=${statusFilter}&search=${searchTerm}`
          ),
          fetch(`/api/admin/debug-logs?date=${dateFilter}`),
          fetch(`/api/admin/webhooks?date=${dateFilter}&status=all`),
          fetch(`/api/admin/monitoring?realtime=${realTimeEnabled}&interval=5min`),
        ]);

      const paymentsData = await paymentsResponse.json();
      const logsData = await logsResponse.json();
      const webhooksData = await webhooksResponse.json();
      const monitoringData = await monitoringResponse.json();

      if (paymentsData.events) {
        setPaymentEvents(paymentsData.events);
        setStripeDataSources(paymentsData.stripeDataSources);
      }

      if (logsData.logs) {
        setDebugLogs(logsData.logs || []);
      }

      if (webhooksData.events) {
        setWebhookEvents(webhooksData.events);
        setWebhookStats(webhooksData.stats);
      }

      if (monitoringData.metrics) {
        setMonitoringMetrics(monitoringData.metrics);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment & Debug Monitor</h1>
          <p className="text-gray-600 mt-1">
            Überwachung aller Zahlungen, Webhooks und System-Logs in Echtzeit
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Real-Time Toggle */}
          <button
            onClick={toggleRealTime}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              realTimeEnabled
                ? 'bg-[#14ad9f] text-white hover:bg-[#129488]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiActivity className={realTimeEnabled ? 'animate-pulse' : ''} size={16} />
            {realTimeEnabled ? 'Live Monitoring' : 'Real-Time Off'}
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} size={16} />
            Aktualisieren
          </button>

          {/* Auto-refresh indicator */}
          {realTimeEnabled && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 px-3 py-1 rounded-full">
              <div
                className={`w-2 h-2 rounded-full ${
                  realTimeStatus === 'Live'
                    ? 'bg-green-500 animate-pulse'
                    : realTimeStatus === 'Connecting...' || realTimeStatus === 'Initializing...'
                      ? 'bg-yellow-500 animate-pulse'
                      : realTimeStatus.includes('Error') || realTimeStatus === 'Connection Issues'
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-gray-500'
                }`}
              ></div>
              {realTimeStatus} {realTimeStatus === 'Live' && '(30s)'}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'stats', label: 'Übersicht', icon: FiTrendingUp },
            { key: 'payments', label: 'Zahlungen', icon: FiDollarSign },
            { key: 'connect', label: 'Connect Accounts', icon: FiActivity },
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
              {key === 'connect' && stripeDataSources?.connectedAccounts?.total && (
                <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-[#14ad9f] text-white rounded-full">
                  {stripeDataSources.connectedAccounts.total}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="p-6">
            {/* Real-Time System Health */}
            {monitoringMetrics && (
              <div className="mb-8">
                <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-lg p-6 text-white mb-6">
                  <h3 className="text-xl font-semibold mb-4">System Health Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiActivity size={20} />
                        <span className="font-medium">API Latenz</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {monitoringMetrics.system.apiLatency}ms
                      </div>
                      <div className="text-sm opacity-80">
                        {monitoringMetrics.system.apiLatency < 1000
                          ? 'Excellent'
                          : monitoringMetrics.system.apiLatency < 2000
                            ? 'Good'
                            : 'Slow'}
                      </div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiCheckCircle size={20} />
                        <span className="font-medium">Webhook Health</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {monitoringMetrics.webhooks.healthScore}%
                      </div>
                      <div className="text-sm opacity-80">
                        {monitoringMetrics.webhooks.healthScore >= 95
                          ? 'Excellent'
                          : monitoringMetrics.webhooks.healthScore >= 80
                            ? 'Good'
                            : 'Critical'}
                      </div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiXCircle size={20} />
                        <span className="font-medium">Error Rate</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {monitoringMetrics.system.errorRate.toFixed(1)}%
                      </div>
                      <div className="text-sm opacity-80">
                        {monitoringMetrics.system.errorRate < 5
                          ? 'Excellent'
                          : monitoringMetrics.system.errorRate < 10
                            ? 'Good'
                            : 'High'}
                      </div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiUsers size={20} />
                        <span className="font-medium">Connected Accounts</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {monitoringMetrics.accounts.connected.total}
                      </div>
                      <div className="text-sm opacity-80">
                        {monitoringMetrics.accounts.connected.withIssues} with issues
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                            {payment.stripeAccount && (
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  !payment.stripeAccount.isConnectedAccount
                                    ? 'bg-[#14ad9f] text-white'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {!payment.stripeAccount.isConnectedAccount
                                  ? 'Haupt-Account'
                                  : `Connected: ${payment.stripeAccount.id}`}
                              </span>
                            )}
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

                          {payment.rawStripeData && (
                            <div className="mt-2">
                              <details className="text-xs">
                                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                  Stripe Raw Data anzeigen
                                </summary>
                                <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(payment.rawStripeData, null, 2)}
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

        {/* Connect Accounts Tab */}
        {activeTab === 'connect' && (
          <div className="p-6">
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <FiRefreshCw className="animate-spin text-[#14ad9f] mx-auto mb-2" size={24} />
                  <p className="text-gray-500">Lade Connected Accounts...</p>
                </div>
              ) : !stripeDataSources ? (
                <div className="text-center py-12">
                  <FiAlertTriangle className="text-gray-400 mx-auto mb-2" size={24} />
                  <p className="text-gray-500">
                    Keine Daten verfügbar. Laden Sie zuerst die Zahlungsdaten.
                  </p>
                </div>
              ) : (
                <>
                  {/* Main Account Info */}
                  <Card className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Haupt-Account</h3>
                        <span className="px-3 py-1 bg-[#14ad9f] text-white rounded-full text-sm font-medium">
                          Haupt
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-gray-500 text-sm">Events:</span>
                          <div className="text-xl font-bold text-gray-900">
                            {stripeDataSources.mainAccount.events}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Payment Intents:</span>
                          <div className="text-xl font-bold text-blue-600">
                            {stripeDataSources.mainAccount.paymentIntents}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Charges:</span>
                          <div className="text-xl font-bold text-green-600">
                            {stripeDataSources.mainAccount.charges}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Customers:</span>
                          <div className="text-xl font-bold text-purple-600">
                            {stripeDataSources.mainAccount.customers}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Transfers:</span>
                            <div className="font-medium">
                              {stripeDataSources.mainAccount.transfers}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Payouts:</span>
                            <div className="font-medium">
                              {stripeDataSources.mainAccount.payouts}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Subscriptions:</span>
                            <div className="font-medium">
                              {stripeDataSources.mainAccount.subscriptions}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Connected Accounts */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Verbundene Accounts ({stripeDataSources.connectedAccounts.total})
                    </h3>
                    {stripeDataSources.connectedAccounts.accounts.length === 0 ? (
                      <Card className="border border-gray-200">
                        <CardContent className="p-6 text-center">
                          <FiUsers className="text-gray-400 mx-auto mb-2" size={24} />
                          <p className="text-gray-500">Keine verbundenen Accounts gefunden</p>
                        </CardContent>
                      </Card>
                    ) : (
                      stripeDataSources.connectedAccounts.accounts.map((account, index) => (
                        <Card key={account.id} className="border border-gray-200">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-md font-semibold text-gray-900">
                                {account.type} Account ({account.country})
                              </h4>
                              <div className="flex gap-2">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    account.charges_enabled
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  Charges {account.charges_enabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    account.payouts_enabled
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  Payouts {account.payouts_enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>

                            {account.error ? (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">Error: {account.error}</p>
                              </div>
                            ) : account.dataLoaded ? (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <span className="text-gray-500 text-sm">Events:</span>
                                  <div className="text-lg font-bold text-gray-900">
                                    {account.dataLoaded.events}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-sm">Payment Intents:</span>
                                  <div className="text-lg font-bold text-blue-600">
                                    {account.dataLoaded.paymentIntents}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-sm">Charges:</span>
                                  <div className="text-lg font-bold text-green-600">
                                    {account.dataLoaded.charges}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">Keine Daten geladen</p>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <span className="text-gray-500 text-sm">Account ID:</span>
                              <div className="font-mono text-sm text-gray-700">{account.id}</div>
                              <span className="text-gray-500 text-sm">Business Type:</span>
                              <div className="font-medium text-sm text-gray-700">
                                {account.business_type}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>

                  {/* Account Summary */}
                  <Card className="border border-gray-200 bg-gray-50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Gesamtübersicht</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-gray-500 text-sm">Total Accounts:</span>
                          <div className="text-xl font-bold text-gray-900">
                            {1 + stripeDataSources.connectedAccounts.total}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Total Events:</span>
                          <div className="text-xl font-bold text-gray-900">
                            {stripeDataSources.mainAccount.events +
                              stripeDataSources.connectedAccounts.accounts.reduce(
                                (sum, acc) => sum + (acc.dataLoaded?.events || 0),
                                0
                              )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Total Payment Intents:</span>
                          <div className="text-xl font-bold text-blue-600">
                            {stripeDataSources.mainAccount.paymentIntents +
                              stripeDataSources.connectedAccounts.accounts.reduce(
                                (sum, acc) => sum + (acc.dataLoaded?.paymentIntents || 0),
                                0
                              )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Total Charges:</span>
                          <div className="text-xl font-bold text-green-600">
                            {stripeDataSources.mainAccount.charges +
                              stripeDataSources.connectedAccounts.accounts.reduce(
                                (sum, acc) => sum + (acc.dataLoaded?.charges || 0),
                                0
                              )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="p-6">
            <div className="space-y-6">
              {/* Webhook Health Overview */}
              {webhookStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Gesamt Webhooks</p>
                          <p className="text-2xl font-bold text-gray-900">{webhookStats.total}</p>
                        </div>
                        <FiActivity className="text-gray-400" size={24} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Erfolgreich</p>
                          <p className="text-2xl font-bold text-green-600">
                            {webhookStats.delivered}
                          </p>
                        </div>
                        <FiCheckCircle className="text-green-400" size={24} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Ausstehend</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {webhookStats.pending}
                          </p>
                        </div>
                        <FiClock className="text-yellow-400" size={24} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Fehlgeschlagen</p>
                          <p className="text-2xl font-bold text-red-600">{webhookStats.failed}</p>
                        </div>
                        <FiAlertTriangle className="text-red-400" size={24} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Webhook Events List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Webhook Events ({webhookEvents.length})
                  </h3>

                  {/* Test Webhook Button */}
                  <button
                    onClick={async () => {
                      try {
                        await fetch('/api/admin/webhooks', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'test-webhook' }),
                        });
                        loadData(); // Refresh after test
                      } catch (error) {
                        console.error('Webhook test failed:', error);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1 bg-[#14ad9f] text-white rounded hover:bg-[#129488] text-sm"
                  >
                    <FiSend size={14} />
                    Test Webhook
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <FiRefreshCw className="animate-spin text-[#14ad9f] mx-auto mb-2" size={24} />
                    <p className="text-gray-500">Lade Webhook Events...</p>
                  </div>
                ) : webhookEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <FiActivity className="text-gray-400 mx-auto mb-2" size={24} />
                    <p className="text-gray-500">
                      Keine Webhook Events in diesem Zeitraum gefunden
                    </p>
                  </div>
                ) : (
                  webhookEvents.map(webhook => (
                    <Card key={webhook.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  webhook.status === 'delivered'
                                    ? 'bg-green-100 text-green-800'
                                    : webhook.status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : webhook.status === 'pending'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {webhook.status}
                              </span>
                              <span className="font-medium text-gray-900">{webhook.type}</span>
                              <span className="text-sm text-gray-500">#{webhook.id}</span>
                              <span className="text-xs text-gray-400">{webhook.created}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Account:</span>
                                <div className="font-medium">
                                  {webhook.accountType === 'main'
                                    ? 'Haupt-Account'
                                    : `Connected: ${webhook.accountId}`}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Versuche:</span>
                                <div className="font-medium">
                                  {webhook.attempts}/{webhook.maxAttempts}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">URL:</span>
                                <div className="font-medium text-xs truncate">{webhook.url}</div>
                              </div>
                            </div>

                            {webhook.lastError && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{webhook.lastError}</p>
                              </div>
                            )}

                            {webhook.nextRetry && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-700">
                                  Nächster Versuch: {webhook.nextRetry}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {webhook.status === 'failed' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch('/api/admin/webhooks', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'retry-webhook',
                                        webhookId: webhook.id,
                                        accountId: webhook.accountId,
                                      }),
                                    });
                                    loadData();
                                  } catch (error) {
                                    console.error('Webhook retry failed:', error);
                                  }
                                }}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
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
