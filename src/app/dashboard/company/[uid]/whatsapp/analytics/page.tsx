/**
 * WhatsApp Analytics Page
 * 
 * Dashboard für WhatsApp-Statistiken und Auswertungen
 */
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { 
  MessageSquare, 
  Send, 
  CheckCheck, 
  Eye, 
  TrendingUp, 
  Clock, 
  ArrowUp,
  ArrowDown,
  FileText,
  RefreshCcw,
  Download
} from 'lucide-react';

interface AnalyticsData {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  deliveryRate: number;
  readRate: number;
  avgResponseTime: number;
  templatesUsed: Array<{ name: string; count: number }>;
  messagesByDay: Array<{ date: string; sent: number; received: number }>;
  period: { start: string; end: string };
}

export default function AnalyticsPage() {
  const params = useParams();
  const companyId = params.uid as string;

  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const loadAnalytics = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/whatsapp/analytics', window.location.origin);
      url.searchParams.set('companyId', companyId);
      url.searchParams.set('startDate', dateRange.startDate);
      url.searchParams.set('endDate', dateRange.endDate);
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, dateRange]);

  React.useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} Min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours} Std ${mins} Min`;
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue,
    color = 'teal'
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType; 
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: 'teal' | 'blue' | 'green' | 'orange' | 'purple';
  }) => {
    const colorClasses = {
      teal: 'bg-[#14ad9f]/10 text-[#14ad9f]',
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      purple: 'bg-purple-100 text-purple-600',
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{title}</p>
        </div>
      </div>
    );
  };

  if (isLoading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">
            Übersicht über Ihre WhatsApp-Kommunikation
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Datumsauswahl */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-2 py-1 text-sm border-0 focus:ring-0"
            />
            <span className="text-gray-400">–</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-2 py-1 text-sm border-0 focus:ring-0"
            />
          </div>
          
          <button
            onClick={loadAnalytics}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCcw className={`w-5 h-5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {analytics && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Gesamt Nachrichten"
              value={analytics.totalMessages.toLocaleString('de-DE')}
              icon={MessageSquare}
              color="teal"
            />
            <StatCard
              title="Gesendet"
              value={analytics.sentMessages.toLocaleString('de-DE')}
              icon={Send}
              color="blue"
            />
            <StatCard
              title="Empfangen"
              value={analytics.receivedMessages.toLocaleString('de-DE')}
              icon={Eye}
              color="green"
            />
            <StatCard
              title="Durchschn. Antwortzeit"
              value={formatTime(analytics.avgResponseTime)}
              icon={Clock}
              color="orange"
            />
          </div>

          {/* Delivery & Read Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Zustellrate</h3>
              <div className="flex items-end gap-4">
                <span className="text-4xl font-bold text-gray-900">
                  {Math.round(analytics.deliveryRate)}%
                </span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#14ad9f] rounded-full transition-all"
                    style={{ width: `${analytics.deliveryRate}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <CheckCheck className="w-4 h-4 text-[#14ad9f]" />
                Erfolgreich zugestellt
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Leserate</h3>
              <div className="flex items-end gap-4">
                <span className="text-4xl font-bold text-gray-900">
                  {Math.round(analytics.readRate)}%
                </span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${analytics.readRate}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Eye className="w-4 h-4 text-blue-500" />
                Nachrichten gelesen
              </div>
            </div>
          </div>

          {/* Chart & Templates */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Messages by Day Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Nachrichten pro Tag</h3>
              
              {analytics.messagesByDay.length > 0 ? (
                <div className="h-64 flex items-end justify-between gap-1">
                  {analytics.messagesByDay.slice(-14).map((day, idx) => {
                    const maxValue = Math.max(
                      ...analytics.messagesByDay.map(d => d.sent + d.received)
                    );
                    const height = ((day.sent + day.received) / maxValue) * 100;
                    const sentHeight = (day.sent / (day.sent + day.received)) * 100;
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full relative rounded-t-lg overflow-hidden bg-gray-100"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                        >
                          <div 
                            className="absolute bottom-0 w-full bg-[#14ad9f]"
                            style={{ height: `${sentHeight}%` }}
                          />
                          <div 
                            className="absolute top-0 w-full bg-blue-400"
                            style={{ height: `${100 - sentHeight}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  Keine Daten für den ausgewählten Zeitraum
                </div>
              )}
              
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-[#14ad9f]" />
                  <span className="text-sm text-gray-500">Gesendet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-400" />
                  <span className="text-sm text-gray-500">Empfangen</span>
                </div>
              </div>
            </div>

            {/* Top Templates */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Top Templates</h3>
              
              {analytics.templatesUsed.length > 0 ? (
                <div className="space-y-4">
                  {analytics.templatesUsed.slice(0, 5).map((template, idx) => (
                    <div key={template.name} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {template.name}
                        </p>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                          <div 
                            className="h-full bg-[#14ad9f] rounded-full"
                            style={{ 
                              width: `${(template.count / analytics.templatesUsed[0].count) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-500">
                        {template.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine Templates verwendet</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 bg-linear-to-br from-[#14ad9f] to-teal-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Zusammenfassung</h3>
                <p className="text-teal-100 text-sm">
                  {new Date(analytics.period.start).toLocaleDateString('de-DE')} – {new Date(analytics.period.end).toLocaleDateString('de-DE')}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-teal-200" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div>
                <p className="text-3xl font-bold">{analytics.totalMessages}</p>
                <p className="text-teal-100 text-sm">Nachrichten gesamt</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{Math.round(analytics.deliveryRate)}%</p>
                <p className="text-teal-100 text-sm">Zustellrate</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{formatTime(analytics.avgResponseTime)}</p>
                <p className="text-teal-100 text-sm">Antwortzeit</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
