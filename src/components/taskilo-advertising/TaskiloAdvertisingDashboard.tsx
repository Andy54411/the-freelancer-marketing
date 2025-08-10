// 🎯 WHITE-LABEL TASKILO ADVERTISING - Main Dashboard Component
// Vollständiges Google Ads Interface mit Taskilo Branding

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Target,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  Settings,
  Plus,
  BarChart3,
  Zap,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface TaskiloAdvertisingDashboardProps {
  companyId: string;
}

interface CampaignData {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  type: string;
  metrics: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    roas: number;
    ctr: number;
  };
  taskiloInsights: {
    performanceScore: number;
    status: 'excellent' | 'good' | 'average' | 'needs-attention';
    recommendations: string[];
  };
}

interface AnalyticsData {
  summary: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    roas: number;
    ctr: number;
  };
  taskiloInsights: {
    efficiency: string;
    recommendedActions: string[];
  };
}

export default function TaskiloAdvertisingDashboard({
  companyId,
}: TaskiloAdvertisingDashboardProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [companyId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Lade Kampagnen
      const campaignsResponse = await fetch(
        `/api/taskilo-advertising/campaigns?companyId=${companyId}`
      );
      const campaignsResult = await campaignsResponse.json();

      if (campaignsResult.success) {
        setCampaigns(campaignsResult.data.campaigns || []);
      }

      // Lade Analytics
      const analyticsResponse = await fetch(
        `/api/taskilo-advertising/analytics?companyId=${companyId}`
      );
      const analyticsResult = await analyticsResponse.json();

      if (analyticsResult.success) {
        setAnalytics(analyticsResult.data);
      }
    } catch (err: any) {
      console.error('❌ Dashboard loading error:', err);
      setError('Fehler beim Laden des Advertising Dashboards');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'average':
        return 'bg-yellow-500';
      case 'needs-attention':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Taskilo Advertising Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Dashboard Fehler</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadDashboardData} variant="outline" className="border-red-300">
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Taskilo Advertising</h1>
          <p className="text-gray-600 mt-1">Zentrale Werbeverwaltung für Ihr Business</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setActiveTab('create-campaign')}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neue Kampagne
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Einstellungen
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressionen</CardTitle>
              <Eye className="h-4 w-4 text-[#14ad9f]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.summary.impressions.toLocaleString('de-DE')}
              </div>
              <p className="text-xs text-gray-600">Sichtbarkeit Ihrer Anzeigen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Klicks</CardTitle>
              <MousePointer className="h-4 w-4 text-[#14ad9f]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.summary.clicks.toLocaleString('de-DE')}
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <span>CTR: {formatPercentage(analytics.summary.ctr)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kosten</CardTitle>
              <DollarSign className="h-4 w-4 text-[#14ad9f]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.summary.cost)}</div>
              <p className="text-xs text-gray-600">Advertising Investition</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROAS</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#14ad9f]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.roas.toFixed(1)}x</div>
              <div className="flex items-center text-xs">
                <Badge
                  variant="secondary"
                  className={`${
                    analytics.taskiloInsights.efficiency === 'Excellent'
                      ? 'bg-green-100 text-green-800'
                      : analytics.taskiloInsights.efficiency === 'Good'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {analytics.taskiloInsights.efficiency}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Überblick</TabsTrigger>
          <TabsTrigger value="campaigns">Kampagnen</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="optimization">Optimierung</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Campaigns Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#14ad9f]" />
                Aktive Kampagnen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.slice(0, 3).map(campaign => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{campaign.name}</h3>
                        <Badge
                          variant={campaign.status === 'ENABLED' ? 'default' : 'secondary'}
                          className={
                            campaign.status === 'ENABLED' ? 'bg-green-100 text-green-800' : ''
                          }
                        >
                          {campaign.status === 'ENABLED' ? 'Aktiv' : 'Pausiert'}
                        </Badge>
                        <div
                          className={`h-2 w-2 rounded-full ${getStatusColor(campaign.taskiloInsights.status)}`}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <span>Klicks: {campaign.metrics.clicks}</span>
                        <span>Kosten: {formatCurrency(campaign.metrics.cost)}</span>
                        <span>ROAS: {campaign.metrics.roas.toFixed(1)}x</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-[#14ad9f]">
                        {campaign.taskiloInsights.performanceScore.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-500">Performance Score</div>
                    </div>
                  </div>
                ))}

                {campaigns.length > 3 && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('campaigns')}
                    className="w-full"
                  >
                    Alle {campaigns.length} Kampagnen anzeigen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {analytics?.taskiloInsights.recommendedActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#14ad9f]" />
                  Taskilo Empfehlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.taskiloInsights.recommendedActions.map((action, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-900">{action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Alle Kampagnen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Detaillierte Kampagnen-Verwaltung wird geladen...</p>
                <p className="text-sm mt-2">
                  Hier können Sie alle Ihre Taskilo Advertising Kampagnen verwalten
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Erweiterte Analytics werden geladen...</p>
                <p className="text-sm mt-2">
                  Detaillierte Performance-Insights für Ihre Advertising-Aktivitäten
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization">
          <Card>
            <CardHeader>
              <CardTitle>Automatische Optimierung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Optimierungs-Tools werden geladen...</p>
                <p className="text-sm mt-2">
                  Taskilo AI-basierte Optimierung für maximale Performance
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
