'use client';

import { useState, useEffect } from 'react';
import {
  FiDollarSign,
  FiAlertTriangle,
  FiInfo,
  FiXCircle,
  FiRefreshCw,
  FiFilter,
  FiDownload,
  FiEye,
  FiClock,
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
} from 'react-icons/fi';

interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  data?: any;
  orderId?: string;
  stripeEventId?: string;
}

interface PaymentEvent {
  id: string;
  timestamp: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  orderId?: string;
  customerId?: string;
  description?: string;
  metadata?: any;
}

interface MonitoringStats {
  totalPayments: number;
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  errorCount: number;
  warningCount: number;
}

export default function PaymentMonitoring() {
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
    totalPayments: 0,
    totalAmount: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    errorCount: 0,
    warningCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'logs'>('overview');
  const [selectedDateRange, setSelectedDateRange] = useState('24h');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedLog, setSelectedLog] = useState<DebugLog | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDateRange, selectedLevel]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Lade Debug Logs
      const logsResponse = await fetch(
        `/api/admin/debug-logs?date=${selectedDateRange}&level=${selectedLevel}&limit=200`
      );
      const logsData = await logsResponse.json();
      setDebugLogs(logsData.logs || []);

      // Lade Payment Events
      const paymentsResponse = await fetch(
        `/api/admin/payment-events?date=${selectedDateRange}&limit=100`
      );
      const paymentsData = await paymentsResponse.json();
      setPaymentEvents(paymentsData.events || []);

      // Berechne Statistiken
      calculateStats(paymentsData.events || [], logsData.logs || []);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (payments: PaymentEvent[], logs: DebugLog[]) => {
    const newStats: MonitoringStats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount / 100, 0),
      successfulPayments: payments.filter(p => p.status === 'succeeded').length,
      failedPayments: payments.filter(p => p.status === 'failed').length,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      errorCount: logs.filter(l => l.level === 'error').length,
      warningCount: logs.filter(l => l.level === 'warning').length,
    };
    setStats(newStats);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <FiXCircle className="text-red-500" />;
      case 'warning':
        return <FiAlertTriangle className="text-yellow-500" />;
      case 'info':
        return <FiInfo className="text-blue-500" />;
      default:
        return <FiActivity className="text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const exportData = () => {
    const data = {
      stats,
      debugLogs,
      paymentEvents,
      exportTimestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-monitoring-${selectedDateRange}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto"></div>
              <p className="mt-4 text-gray-600">Lade Monitoring-Daten...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#14ad9f]/10 to-teal-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#14ad9f] rounded-xl shadow-lg">
                  <FiActivity className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Payment & Debug Monitoring</h1>
                  <p className="text-gray-600 mt-1">
                    Echtzeitüberwachung aller Zahlungen und System-Events
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedDateRange}
                  onChange={e => setSelectedDateRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                >
                  <option value="1h">Letzte Stunde</option>
                  <option value="24h">Letzte 24h</option>
                  <option value="7d">Letzte 7 Tage</option>
                  <option value="30d">Letzte 30 Tage</option>
                </select>

                <button
                  onClick={loadData}
                  className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors"
                >
                  <FiRefreshCw size={16} />
                  Aktualisieren
                </button>

                <button
                  onClick={exportData}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FiDownload size={16} />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 border-b border-gray-100">
            <nav className="flex space-x-8">
              {[
                { key: 'overview', label: 'Übersicht', icon: FiTrendingUp },
                { key: 'payments', label: 'Zahlungen', icon: FiDollarSign },
                { key: 'logs', label: 'Debug Logs', icon: FiActivity },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === key
                      ? 'border-[#14ad9f] text-[#14ad9f]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Gesamtumsatz</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.totalAmount.toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FiTrendingUp className="text-green-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Erfolgreiche Zahlungen</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.successfulPayments}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FiDollarSign className="text-blue-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Fehlgeschlagene Zahlungen</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.failedPayments}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <FiTrendingDown className="text-red-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">System-Fehler</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.errorCount}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <FiAlertTriangle className="text-yellow-600" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Payments */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Neueste Zahlungen</h3>
                </div>
                <div className="p-6">
                  {paymentEvents.slice(0, 5).map(payment => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            payment.status === 'succeeded'
                              ? 'bg-green-500'
                              : payment.status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-yellow-500'
                          }`}
                        ></div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {(payment.amount / 100).toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {payment.description || payment.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{formatDateTime(payment.timestamp)}</p>
                        <p
                          className={`text-xs font-medium ${
                            payment.status === 'succeeded'
                              ? 'text-green-600'
                              : payment.status === 'failed'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                          }`}
                        >
                          {payment.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Errors */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Neueste Fehler & Warnungen
                  </h3>
                </div>
                <div className="p-6">
                  {debugLogs
                    .filter(log => log.level === 'error' || log.level === 'warning')
                    .slice(0, 5)
                    .map(log => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
                      >
                        {getLevelIcon(log.level)}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{log.message}</p>
                          <p className="text-sm text-gray-600 mt-1">{log.source}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDateTime(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Alle Zahlungen</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Zeit</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Betrag</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Typ</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Auftrag</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Beschreibung
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentEvents.map(payment => (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDateTime(payment.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {(payment.amount / 100).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              payment.status === 'succeeded'
                                ? 'bg-green-100 text-green-800'
                                : payment.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{payment.type}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {payment.orderId ? (
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {payment.orderId.substring(0, 8)}...
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {payment.description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Debug Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Debug Logs</h3>
                <select
                  value={selectedLevel}
                  onChange={e => setSelectedLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                >
                  <option value="all">Alle Level</option>
                  <option value="error">Nur Fehler</option>
                  <option value="warning">Nur Warnungen</option>
                  <option value="info">Nur Info</option>
                  <option value="debug">Nur Debug</option>
                </select>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {debugLogs.map(log => (
                  <div
                    key={log.id}
                    className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${getLevelColor(log.level)}`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getLevelIcon(log.level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-sm">{log.source}</span>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{log.message}</p>
                          {log.orderId && (
                            <span className="inline-flex items-center gap-1 text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                              Order: {log.orderId.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors">
                        <FiEye size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiXCircle size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timestamp
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatDateTime(selectedLog.timestamp)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                      <div className="flex items-center gap-2">
                        {getLevelIcon(selectedLog.level)}
                        <span className="text-sm text-gray-900">{selectedLog.level}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                      <p className="text-sm text-gray-900">{selectedLog.source}</p>
                    </div>
                    {selectedLog.orderId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Order ID
                        </label>
                        <p className="text-sm text-gray-900 font-mono">{selectedLog.orderId}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {selectedLog.message}
                    </p>
                  </div>

                  {selectedLog.data && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                      <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedLog.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
