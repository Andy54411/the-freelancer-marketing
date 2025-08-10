// 🚀 PHASE 2: Campaign Management Dashboard
// UI für Kampagnen-Verwaltung, Erstellung und Performance-Übersicht

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Play,
  Pause,
  BarChart3,
  TrendingUp,
  Eye,
  Settings,
  Calendar,
  DollarSign,
  MousePointer,
  Target,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AccountSelector } from './AccountSelector';
import type { GoogleAdsCampaign, GoogleAdsMetrics } from '@/types/googleAds';

interface CampaignManagementProps {
  companyId: string;
  customerId?: string;
  onCampaignUpdate?: () => void;
}

export function CampaignManagement({
  companyId,
  customerId,
  onCampaignUpdate,
}: CampaignManagementProps) {
  // Campaign Loading State
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Campaign Management State
  const [selectedCampaign, setSelectedCampaign] = useState<GoogleAdsCampaign | null>(null);

  // Account Selection State
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(customerId);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  // Kampagnen laden mit Retry-Limitierung
  const fetchCampaigns = async () => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;

    // Verhindere zu häufige API-Calls (mindestens 5 Sekunden zwischen Calls)
    if (timeSinceLastFetch < 5000 && lastFetchTime > 0) {
      console.log('⏳ Skipping fetch - too soon since last attempt');
      return;
    }

    // Verhindere mehr als 3 Retry-Versuche
    if (retryCount >= 3) {
      console.log('🛑 Max retry attempts reached, stopping');
      setError('Max retry attempts reached. Please check your Google Ads configuration.');
      return;
    }

    try {
      setLoading(true);
      setLastFetchTime(now);
      console.log('🔍 Fetching campaigns for:', { companyId, selectedAccountId, retryCount });

      // ✅ EINFACHE LÖSUNG: Lasse die API automatisch den richtigen Account wählen
      // Sende keine customerId mehr - die API verwendet denselben Algorithmus wie test-all
      const url = `/api/google-ads/campaigns?companyId=${companyId}`;

      console.log('📊 Fetching from:', url);
      const response = await fetch(url);
      const result = await response.json();

      console.log('✅ Campaign fetch result:', result);

      if (result.success && result.data) {
        // result.data enthält bereits die campaigns structure
        const campaigns = result.data.campaigns || [];
        setCampaigns(campaigns);
        setError(null);
        setRetryCount(0); // Reset retry count on success
        console.log('📊 Loaded campaigns:', campaigns.length);
      } else {
        setRetryCount(prev => prev + 1);
        throw new Error(result.error || 'Failed to fetch campaigns');
      }
    } catch (err) {
      console.error('❌ Campaign fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
      setCampaigns([]);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // Reset retry count für manuelle Wiederholung
  const resetRetryAndFetch = () => {
    setRetryCount(0);
    setError(null);
    fetchCampaigns();
  };

  // Account-Auswahl Handler
  const handleAccountSelect = (accountId: string, account: any) => {
    console.log('🎯 Account selected:', { accountId, account });
    setSelectedAccountId(accountId);
    setSelectedAccount(account);
    // Setze Loading - useEffect wird fetchCampaigns() aufrufen
    setLoading(true);
  };

  // Kampagne-Status ändern
  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ENABLED' ? 'PAUSED' : 'ENABLED';
      console.log('🔄 Toggling campaign status:', { campaignId, currentStatus, newStatus });

      // ✅ EINFACHE LÖSUNG: Lasse die API automatisch den richtigen Account wählen
      // Sende companyId, aber keine customerId - die API wählt automatisch

      const response = await fetch('/api/google-ads/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          status: newStatus,
          companyId,
        }),
      });

      const result = await response.json();
      console.log('✅ Campaign status update result:', result);

      if (result.success) {
        await fetchCampaigns();
        onCampaignUpdate?.();
      } else {
        throw new Error(result.error || 'Failed to update campaign status');
      }
    } catch (err) {
      console.error('❌ Campaign status update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update campaign');
    }
  };

  // Metriken formatieren
  const formatMetric = (value: number, type: 'currency' | 'percentage' | 'number' = 'number') => {
    switch (type) {
      case 'currency':
        return `€${(value / 1000000).toFixed(2)}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      default:
        return value.toLocaleString();
    }
  };

  useEffect(() => {
    // Verhindere useEffect-basierte Fetches wenn bereits retries stattgefunden haben
    if (retryCount >= 3) {
      console.warn('🛑 useEffect: Max retries reached, skipping fetch');
      setLoading(false);
      return;
    }

    // Lade Kampagnen nur wenn companyId und selectedAccountId vorhanden sind
    if (companyId && selectedAccountId) {
      console.log('� useEffect triggering fetchCampaigns:', {
        companyId,
        selectedAccountId,
        retryCount,
      });
      fetchCampaigns();
    } else {
      // Stoppe Loading wenn kein Account ausgewählt ist
      setLoading(false);
    }
  }, [companyId, selectedAccountId]); // WICHTIG: retryCount NICHT in Dependencies!

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#14ad9f]" />
            Campaign Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Lade Kampagnen...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#14ad9f]" />
            Campaign Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Fehler beim Laden der Kampagnen: {error}
              {retryCount >= 3 && (
                <div className="mt-2">
                  <span className="text-sm text-gray-500">
                    Max. Wiederholungsversuche erreicht ({retryCount}/3). Bitte überprüfen Sie Ihre
                    Google Ads Konfiguration.
                  </span>
                </div>
              )}
            </AlertDescription>
          </Alert>
          <Button
            onClick={resetRetryAndFetch}
            className="mt-4 bg-[#14ad9f] hover:bg-[#129488] text-white"
            disabled={loading}
          >
            {retryCount >= 3 ? 'Konfiguration zurücksetzen & erneut versuchen' : 'Erneut versuchen'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Selector */}
      <AccountSelector
        companyId={companyId}
        selectedAccountId={selectedAccountId}
        onAccountSelect={handleAccountSelect}
      />

      {/* Header mit Create Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#14ad9f]" />
                Campaign Management
              </CardTitle>
              <CardDescription>
                Verwalte deine Google Ads Kampagnen und überwache deren Performance
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/dashboard/company/${companyId}/google-ads/campaigns/create`}
                className={`inline-flex items-center px-4 py-2 bg-[#14ad9f] hover:bg-[#129488] text-white rounded-lg transition-colors ${
                  !selectedAccountId ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Target className="h-4 w-4 mr-2" />
                Kampagne erstellen
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Kampagnen Übersicht */}
      {!selectedAccountId ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center max-w-md mx-auto">
              <div className="bg-[#14ad9f]/10 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Users className="h-12 w-12 text-[#14ad9f]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Google Ads Account auswählen
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Wählen Sie zuerst einen Google Ads Account aus, um Kampagnen anzuzeigen und zu
                erstellen.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center max-w-md mx-auto">
              <div className="bg-[#14ad9f]/10 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <BarChart3 className="h-12 w-12 text-[#14ad9f]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Noch keine Kampagnen vorhanden
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Starte deine erste Google Ads Kampagne und erreiche neue Kunden. Mit unserem
                einfachen Setup bist du in wenigen Minuten bereit.
              </p>
              <div className="space-y-3">
                <Link
                  href={`/dashboard/company/${companyId}/google-ads/campaigns/create`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-[#14ad9f] hover:bg-[#129488] text-white rounded-lg transition-colors w-full sm:w-auto text-lg font-medium"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Erste Kampagne erstellen
                </Link>
                <div className="text-sm text-gray-500 flex items-center justify-center gap-2">
                  <Target className="h-4 w-4" />
                  Beginne mit einem Tagesbudget ab 10€
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(campaign => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <Badge variant={campaign.status === 'ENABLED' ? 'default' : 'secondary'}>
                        {campaign.status === 'ENABLED' ? 'Aktiv' : 'Pausiert'}
                      </Badge>
                      <Badge variant="outline">{campaign.advertisingChannelType}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {campaign.startDate} {campaign.endDate && `- ${campaign.endDate}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Budget: {formatMetric(campaign.budget.amount, 'currency')}/Tag
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                      className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                    >
                      {campaign.status === 'ENABLED' ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pausieren
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Aktivieren
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Performance Metriken */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Eye className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">Impressionen</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatMetric(campaign.metrics.impressions)}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <MousePointer className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">Klicks</span>
                    </div>
                    <p className="text-lg font-semibold">{formatMetric(campaign.metrics.clicks)}</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">CTR</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatMetric(campaign.metrics.ctr || 0, 'percentage')}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">Kosten</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatMetric(campaign.metrics.cost, 'currency')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign Details Dialog */}
      {selectedCampaign && (
        <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedCampaign.name}</DialogTitle>
              <DialogDescription>
                Detaillierte Kampagnen-Informationen und Performance-Metriken
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Übersicht</TabsTrigger>
                <TabsTrigger value="metrics">Metriken</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <p className="text-sm">{selectedCampaign.status}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Typ</Label>
                    <p className="text-sm">{selectedCampaign.advertisingChannelType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Startdatum</Label>
                    <p className="text-sm">{selectedCampaign.startDate}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Enddatum</Label>
                    <p className="text-sm">{selectedCampaign.endDate || 'Unbegrenzt'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tagesbudget</Label>
                    <p className="text-sm">
                      {formatMetric(selectedCampaign.budget.amount, 'currency')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Gebotsstrategie</Label>
                    <p className="text-sm">
                      {selectedCampaign.biddingStrategy?.type || 'Nicht verfügbar'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-gray-600">Impressionen</Label>
                    <p className="text-2xl font-bold text-[#14ad9f]">
                      {formatMetric(selectedCampaign.metrics.impressions)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-gray-600">Klicks</Label>
                    <p className="text-2xl font-bold text-[#14ad9f]">
                      {formatMetric(selectedCampaign.metrics.clicks)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-gray-600">CTR</Label>
                    <p className="text-2xl font-bold text-[#14ad9f]">
                      {formatMetric(selectedCampaign.metrics.ctr || 0, 'percentage')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-gray-600">CPC</Label>
                    <p className="text-2xl font-bold text-[#14ad9f]">
                      {formatMetric(selectedCampaign.metrics.cpc || 0, 'currency')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-gray-600">Kosten</Label>
                    <p className="text-2xl font-bold text-[#14ad9f]">
                      {formatMetric(selectedCampaign.metrics.cost, 'currency')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-gray-600">Conversions</Label>
                    <p className="text-2xl font-bold text-[#14ad9f]">
                      {formatMetric(selectedCampaign.metrics.conversions)}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
