'use client';

// 🎯 MULTI-PLATFORM ADVERTISING DASHBOARD
// Zentrale Verwaltung für Google Ads, LinkedIn, Meta, Taboola, Outbrain

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Plus,
  Settings,
  ExternalLink,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

import {
  AdvertisingPlatform,
  PlatformConnection,
  UnifiedCampaign,
  UnifiedAnalytics,
  UnifiedMetrics,
} from '@/types/advertising';

// Platform Icons Component
const PlatformIcon = ({
  platform,
  size = 24,
}: {
  platform: AdvertisingPlatform;
  size?: number;
}) => {
  const iconStyle = { width: size, height: size };

  switch (platform) {
    case 'google-ads':
      return (
        <div className="p-1 rounded bg-blue-500" style={iconStyle}>
          <span className="text-white font-bold text-xs">G</span>
        </div>
      );
    case 'linkedin':
      return (
        <div className="p-1 rounded bg-blue-700" style={iconStyle}>
          <span className="text-white font-bold text-xs">Li</span>
        </div>
      );
    case 'meta':
      return (
        <div className="p-1 rounded bg-blue-600" style={iconStyle}>
          <span className="text-white font-bold text-xs">M</span>
        </div>
      );
    case 'taboola':
      return (
        <div className="p-1 rounded bg-purple-600" style={iconStyle}>
          <span className="text-white font-bold text-xs">T</span>
        </div>
      );
    case 'outbrain':
      return (
        <div className="p-1 rounded bg-orange-600" style={iconStyle}>
          <span className="text-white font-bold text-xs">O</span>
        </div>
      );
    default:
      return <div style={iconStyle} className="bg-gray-400 rounded" />;
  }
};

// Connection Status Icon
const ConnectionStatus = ({ status }: { status: PlatformConnection['status'] }) => {
  switch (status) {
    case 'connected':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'disconnected':
      return <XCircle className="w-4 h-4 text-gray-400" />;
    case 'error':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return <XCircle className="w-4 h-4 text-gray-400" />;
  }
};

interface MultiPlatformAdvertisingDashboardProps {
  companyId: string;
}

export default function MultiPlatformAdvertisingDashboard({
  companyId,
}: MultiPlatformAdvertisingDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [platformConnections, setPlatformConnections] = useState<PlatformConnection[]>([]);
  const [campaigns, setCampaigns] = useState<UnifiedCampaign[]>([]);
  const [analytics, setAnalytics] = useState<UnifiedAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, [companyId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load platform connections
      const connectionsResponse = await fetch(
        `/api/multi-platform-advertising/connections?companyId=${companyId}`
      );
      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        if (connectionsData.success) {
          setPlatformConnections(connectionsData.data);
        }
      }

      // Load campaigns
      const campaignsResponse = await fetch(
        `/api/multi-platform-advertising/campaigns?companyId=${companyId}`
      );
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        if (campaignsData.success) {
          setCampaigns(campaignsData.data);
        }
      }

      // Load analytics
      const analyticsResponse = await fetch(
        `/api/multi-platform-advertising/analytics?companyId=${companyId}`
      );
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        if (analyticsData.success) {
          setAnalytics(analyticsData.data);
        }
      }
    } catch (error: any) {
      console.error('Dashboard loading error:', error);
      setError('Fehler beim Laden der Dashboard-Daten');
    } finally {
      setIsLoading(false);
    }
  };

  const connectPlatform = async (platform: AdvertisingPlatform) => {
    try {
      // Redirect to platform-specific OAuth
      const response = await fetch(
        `/api/multi-platform-advertising/auth/${platform}?companyId=${companyId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.authUrl) {
          window.location.href = data.authUrl;
        }
      }
    } catch (error: any) {
      console.error(`Error connecting to ${platform}:`, error);
      setError(`Fehler beim Verbinden mit ${platform}`);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Convert cents to euros
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('de-DE').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
          <p className="text-gray-600">Multi-Platform Dashboard wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h3 className="ml-3 text-sm font-medium text-red-800">Fehler</h3>
        </div>
        <div className="mt-2 text-sm text-red-700">{error}</div>
        <div className="mt-4">
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Platform Advertising</h1>
          <p className="mt-2 text-gray-600">
            Verwalten Sie Ihre Werbekampagnen zentral über alle Plattformen hinweg
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setActiveTab('create-campaign')}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Kampagne
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Einstellungen
          </Button>
        </div>
      </div>

      {/* Platform Connections Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-[#14ad9f]" />
            Platform-Verbindungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {platformConnections.map(connection => (
              <div
                key={connection.platform}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <PlatformIcon platform={connection.platform} />
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {connection.platform.replace('-', ' ')}
                    </p>
                    <div className="flex items-center space-x-1">
                      <ConnectionStatus status={connection.status} />
                      <span className="text-xs text-gray-500 capitalize">{connection.status}</span>
                    </div>
                  </div>
                </div>
                {connection.status === 'disconnected' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => connectPlatform(connection.platform)}
                    className="text-xs"
                  >
                    Verbinden
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gesamtausgaben</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics.summary.cost || 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">+12.5%</span>
                <span className="text-gray-500 ml-1">vs. letzter Monat</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Impressions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(analytics.summary.impressions || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">+8.2%</span>
                <span className="text-gray-500 ml-1">vs. letzter Monat</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Klicks</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(analytics.summary.clicks || 0)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Target className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">
                  CTR: {formatPercentage(analytics.summary.ctr || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ROAS</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(analytics.summary.roas || 0).toFixed(2)}x
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {(analytics.summary.roas || 0) > 2 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-600">Excellent</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-red-600">Needs optimization</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="campaigns">Kampagnen</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="platforms">Plattformen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Platform Performance */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.platformBreakdown.map(platform => (
                    <div
                      key={platform.platform}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <PlatformIcon platform={platform.platform} />
                        <div>
                          <p className="font-medium capitalize">
                            {platform.platform.replace('-', ' ')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {platform.campaignCount} Kampagnen
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(platform.metrics.cost || 0)}
                          </p>
                          <p className="text-sm text-gray-500">Ausgaben</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{(platform.metrics.roas || 0).toFixed(2)}x</p>
                          <p className="text-sm text-gray-500">ROAS</p>
                        </div>
                        <Badge variant={platform.isActive ? 'default' : 'secondary'}>
                          {platform.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {analytics?.insights.recommendations && analytics.insights.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-[#14ad9f]" />
                  Empfehlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.insights.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg"
                    >
                      <Zap className="w-4 h-4 text-blue-500 mt-0.5" />
                      <p className="text-sm text-blue-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Alle Kampagnen</h2>
            <Button
              onClick={() => setActiveTab('create-campaign')}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neue Kampagne
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kampagne
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plattform
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Budget
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaigns.map(campaign => (
                      <tr key={`${campaign.platform}-${campaign.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-medium text-gray-900">{campaign.name}</p>
                            <p className="text-sm text-gray-500">{campaign.type}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <PlatformIcon platform={campaign.platform} size={20} />
                            <span className="capitalize">
                              {campaign.platform.replace('-', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              campaign.status === 'ENABLED'
                                ? 'default'
                                : campaign.status === 'PAUSED'
                                  ? 'secondary'
                                  : campaign.status === 'DRAFT'
                                    ? 'outline'
                                    : 'destructive'
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-medium">
                              {formatCurrency((campaign.budget.amount || 0) * 100)}
                            </p>
                            <p className="text-sm text-gray-500">{campaign.budget.period}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm">
                              ROAS: {(campaign.metrics.roas || 0).toFixed(2)}x
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatNumber(campaign.metrics.clicks || 0)} Klicks
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detaillierte Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Detaillierte Analytics werden hier angezeigt...</p>
              {/* TODO: Implementiere detaillierte Analytics-Komponenten */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform-Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {platformConnections.map(connection => (
                  <Card key={connection.platform}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <PlatformIcon platform={connection.platform} />
                          <h3 className="font-medium capitalize">
                            {connection.platform.replace('-', ' ')}
                          </h3>
                        </div>
                        <ConnectionStatus status={connection.status} />
                      </div>

                      {connection.accountInfo && (
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-gray-600">
                            Account: {connection.accountInfo.name}
                          </p>
                          <p className="text-sm text-gray-600">ID: {connection.accountInfo.id}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        {connection.status === 'connected' ? (
                          <Button size="sm" variant="outline" className="w-full">
                            <Settings className="w-4 h-4 mr-2" />
                            Konfigurieren
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => connectPlatform(connection.platform)}
                            className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white"
                          >
                            Verbinden
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
