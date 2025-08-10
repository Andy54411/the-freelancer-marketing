// ✅ Google Ads Analytics Component
// Umfassende Performance-Analyse mit Client Library

'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  Target,
  DollarSign,
  Calendar,
  Activity,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GoogleAdsAnalyticsProps {
  companyId: string;
  period: string;
  selectedCampaignId?: string;
}

interface MetricsData {
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  costPerConversion: number;
}

interface CampaignMetrics extends MetricsData {
  id: string;
  name: string;
  status: string;
}

export function GoogleAdsAnalytics({
  companyId,
  period,
  selectedCampaignId,
}: GoogleAdsAnalyticsProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  // Lade Analytics-Daten
  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading analytics for:', { companyId, selectedPeriod, selectedCampaignId });

      // Lade Gesamtmetriken über die Metrics API
      const metricsUrl = `/api/google-ads/metrics?companyId=${companyId}${
        selectedCampaignId ? `&campaignId=${selectedCampaignId}` : ''
      }`;

      console.log('📊 Fetching metrics from:', metricsUrl);
      const metricsResponse = await fetch(metricsUrl);

      if (!metricsResponse.ok) {
        const errorData = await metricsResponse.json();
        throw new Error(errorData.error || 'Failed to load metrics');
      }

      const metricsData = await metricsResponse.json();
      console.log('✅ Metrics loaded:', metricsData);

      if (metricsData.success) {
        // Sichere Verarbeitung der Metriken-Daten
        const metricsResult = metricsData.data?.metrics || metricsData.data || {};

        // Validiere dass es sich um ein Objekt mit erwarteten Eigenschaften handelt
        if (typeof metricsResult === 'object' && metricsResult !== null) {
          setMetrics(metricsResult);
        } else {
          console.warn('⚠️ Invalid metrics data structure:', metricsResult);
          // Sichere Fallback-Struktur für MetricsData
          setMetrics({
            clicks: 0,
            impressions: 0,
            cost: 0,
            conversions: 0,
            ctr: 0,
            cpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
          });
        }

        // Wenn auch campaigns in der response sind, setze sie
        if (metricsData.data?.campaigns) {
          setCampaignMetrics(metricsData.data.campaigns);
        }
      } else {
        throw new Error(metricsData.error || 'Failed to load metrics');
      }

      // Lade Kampagnen falls nicht schon in metrics enthalten
      if (!metricsData.data.campaigns) {
        console.log('🔍 Loading additional campaign data...');
        const campaignsResponse = await fetch(`/api/google-ads/campaigns?companyId=${companyId}`);

        if (campaignsResponse.ok) {
          const campaignsData = await campaignsResponse.json();
          if (campaignsData.success && campaignsData.data?.campaigns) {
            setCampaignMetrics(campaignsData.data.campaigns);
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Analytics loading error:', err);
      setError(err.message || 'Fehler beim Laden der Analytics-Daten');

      // Setze sichere Fallback-Werte für Metriken
      setMetrics({
        clicks: 0,
        impressions: 0,
        cost: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        conversionRate: 0,
        costPerConversion: 0,
      });
      setCampaignMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadAnalytics();
    }
  }, [companyId, selectedPeriod, selectedCampaignId]);

  // Formatierungs-Hilfsfunktionen
  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null || isNaN(amount)) return '€0,00';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num == null || isNaN(num)) return '0';
    return new Intl.NumberFormat('de-DE').format(num);
  };

  const formatPercentage = (value: number | undefined | null) => {
    if (value == null || isNaN(value)) return '0,00%';
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
        <span className="ml-2">Analytics werden geladen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 text-red-500">
              <BarChart3 className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics nicht verfügbar</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadAnalytics} className="bg-[#14ad9f] hover:bg-[#129488]">
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Performance Übersicht</h2>
          <p className="text-gray-600">Letzte {selectedPeriod} Tage</p>
        </div>

        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Zeitraum auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Letzte 7 Tage</SelectItem>
            <SelectItem value="30">Letzte 30 Tage</SelectItem>
            <SelectItem value="90">Letzte 90 Tage</SelectItem>
            <SelectItem value="365">Letztes Jahr</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Overview Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Klicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(metrics.clicks)}</div>
              <p className="text-xs text-muted-foreground">CTR: {formatPercentage(metrics.ctr)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressionen</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(metrics.impressions)}</div>
              <p className="text-xs text-muted-foreground">Sichtbarkeit & Reichweite</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kosten</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.cost)}</div>
              <p className="text-xs text-muted-foreground">CPC: {formatCurrency(metrics.cpc)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(metrics.conversions)}</div>
              <p className="text-xs text-muted-foreground">
                Rate: {formatPercentage(metrics.conversionRate)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kampagnen Performance</CardTitle>
          <CardDescription>Detaillierte Leistungsübersicht aller aktiven Kampagnen</CardDescription>
        </CardHeader>
        <CardContent>
          {campaignMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Kampagne</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">Klicks</th>
                    <th className="text-right p-2">Impressionen</th>
                    <th className="text-right p-2">CTR</th>
                    <th className="text-right p-2">Kosten</th>
                    <th className="text-right p-2">CPC</th>
                    <th className="text-right p-2">Conversions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignMetrics.map(campaign => (
                    <tr key={campaign.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{campaign.name}</td>
                      <td className="p-2">
                        <Badge
                          variant={campaign.status === 'ENABLED' ? 'default' : 'secondary'}
                          className={
                            campaign.status === 'ENABLED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">{formatNumber(campaign.clicks)}</td>
                      <td className="p-2 text-right">{formatNumber(campaign.impressions)}</td>
                      <td className="p-2 text-right">{formatPercentage(campaign.ctr)}</td>
                      <td className="p-2 text-right">{formatCurrency(campaign.cost)}</td>
                      <td className="p-2 text-right">{formatCurrency(campaign.cpc)}</td>
                      <td className="p-2 text-right">{formatNumber(campaign.conversions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Keine Kampagnen-Daten verfügbar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Automatische Analyse und Optimierungsvorschläge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics && (
              <>
                {/* CTR Analysis */}
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      metrics.ctr > 2
                        ? 'bg-green-500'
                        : metrics.ctr > 1
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <h4 className="font-medium">Click-Through-Rate (CTR)</h4>
                    <p className="text-sm text-gray-600">
                      Ihre CTR von {formatPercentage(metrics.ctr)} ist{' '}
                      {metrics.ctr > 2
                        ? 'sehr gut'
                        : metrics.ctr > 1
                          ? 'durchschnittlich'
                          : 'verbesserungswürdig'}
                      .{metrics.ctr <= 1 && ' Optimieren Sie Ihre Anzeigentexte für mehr Klicks.'}
                    </p>
                  </div>
                </div>

                {/* Cost Analysis */}
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      metrics.costPerConversion < 50
                        ? 'bg-green-500'
                        : metrics.costPerConversion < 100
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <h4 className="font-medium">Kosten pro Conversion</h4>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(metrics.costPerConversion)} pro Conversion.
                      {metrics.costPerConversion > 100 &&
                        ' Prüfen Sie Ihre Keyword-Strategie und Gebote.'}
                    </p>
                  </div>
                </div>

                {/* Conversion Rate Analysis */}
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      metrics.conversionRate > 5
                        ? 'bg-green-500'
                        : metrics.conversionRate > 2
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <h4 className="font-medium">Conversion Rate</h4>
                    <p className="text-sm text-gray-600">
                      {formatPercentage(metrics.conversionRate)} Ihrer Besucher konvertieren.
                      {metrics.conversionRate <= 2 &&
                        ' Optimieren Sie Ihre Landingpages für bessere Conversion-Raten.'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
