'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Eye, 
  ShoppingCart, 
  Video, 
  Target,
  Play,
  Pause,
  Edit,
} from 'lucide-react';
import Link from 'next/link';

interface Campaign {
  id: string;
  resource_name: string;
  name: string;
  type: string;
  status: 'ENABLED' | 'PAUSED' | 'DRAFT' | 'REMOVED';
  budget: {
    dailyBudget: number;
    currency: string;
  };
  createdAt: any;
  platform: string;
  customerId: string;
  stats?: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    ctr: number;
    cpc: number;
  };
}

interface CampaignsOverviewProps {
  companyId: string;
}

const campaignTypeIcons = {
  'SEARCH': Search,
  'DISPLAY': Eye,
  'SHOPPING': ShoppingCart,
  'VIDEO': Video,
  'PERFORMANCE_MAX': Target,
};

const statusColors = {
  'ENABLED': 'bg-green-100 text-green-800',
  'PAUSED': 'bg-yellow-100 text-yellow-800',
  'DRAFT': 'bg-gray-100 text-gray-800',
  'REMOVED': 'bg-red-100 text-red-800',
};

const statusLabels = {
  'ENABLED': 'Aktiv',
  'PAUSED': 'Pausiert',
  'DRAFT': 'Entwurf',
  'REMOVED': 'Entfernt',
};

export default function CampaignsOverview({ companyId }: CampaignsOverviewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadCampaigns();
  }, [companyId]);

  const loadCampaigns = async () => {
    try {
      const response = await fetch(`/api/multi-platform-advertising/campaigns/list?companyId=${companyId}`);
      const result = await response.json();

      if (result.success) {
        setCampaigns(result.data);
      } else {
        console.error('Failed to load campaigns:', result.error);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: 'ENABLED' | 'PAUSED') => {
    try {
      const response = await fetch('/api/multi-platform-advertising/campaigns/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          campaignId,
          status: newStatus,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Kampagnenliste aktualisieren
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, status: newStatus }
            : campaign
        ));
      } else {
        alert(`Fehler beim Ändern des Status: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      alert('Fehler beim Ändern des Kampagnenstatus');
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesType = typeFilter === 'all' || campaign.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Google Ads Kampagnen</h1>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Google Ads Kampagnen</h1>
        <Link href={`/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Neue Kampagne
          </Button>
        </Link>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Suchen</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Kampagnenname..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="ENABLED">Aktiv</SelectItem>
                  <SelectItem value="PAUSED">Pausiert</SelectItem>
                  <SelectItem value="DRAFT">Entwurf</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Typ</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="SEARCH">Suchnetzwerk</SelectItem>
                  <SelectItem value="DISPLAY">Displaynetzwerk</SelectItem>
                  <SelectItem value="SHOPPING">Shopping</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="PERFORMANCE_MAX">Performance Max</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Aktionen</label>
              <Button variant="outline" onClick={loadCampaigns} className="w-full">
                Aktualisieren
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kampagnen Grid */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {campaigns.length === 0 ? 'Keine Kampagnen vorhanden' : 'Keine Kampagnen gefunden'}
              </h3>
              <p className="text-gray-500 mb-6">
                {campaigns.length === 0 
                  ? 'Erstellen Sie Ihre erste Google Ads Kampagne, um loszulegen.'
                  : 'Versuchen Sie, Ihre Suchkriterien anzupassen.'
                }
              </p>
              {campaigns.length === 0 && (
                <Link href={`/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new`}>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Erste Kampagne erstellen
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => {
            const TypeIcon = campaignTypeIcons[campaign.type as keyof typeof campaignTypeIcons] || Target;
            
            return (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <TypeIcon className="w-5 h-5 text-teal-600" />
                      <CardTitle className="text-lg truncate">{campaign.name}</CardTitle>
                    </div>
                    <Badge className={statusColors[campaign.status]}>
                      {statusLabels[campaign.status]}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Typ</p>
                      <p className="font-medium">{campaign.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tägliches Budget</p>
                      <p className="font-medium">{formatCurrency(campaign.budget.dailyBudget)}</p>
                    </div>
                  </div>

                  {campaign.stats && (
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Impressionen</p>
                          <p className="font-medium">{campaign.stats.impressions.toLocaleString('de-DE')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Klicks</p>
                          <p className="font-medium">{campaign.stats.clicks.toLocaleString('de-DE')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">CTR</p>
                          <p className="font-medium">{formatPercentage(campaign.stats.ctr)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Kosten</p>
                          <p className="font-medium">{formatCurrency(campaign.stats.cost)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-4 border-t">
                    {campaign.status === 'ENABLED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(campaign.id, 'PAUSED')}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pausieren
                      </Button>
                    ) : campaign.status === 'PAUSED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(campaign.id, 'ENABLED')}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Aktivieren
                      </Button>
                    ) : null}

                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      Bearbeiten
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}