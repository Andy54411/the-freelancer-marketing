'use client';

// 🎯 CAMPAIGN MANAGER - Component
// Plattformübergreifende Kampagnen-Verwaltung

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Plus, 
  Settings, 
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Edit
} from 'lucide-react';

interface CampaignManagerProps {
  companyId: string;
}

export default function CampaignManager({ companyId }: CampaignManagerProps) {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
      // Mock campaigns
      setCampaigns([
        {
          id: '1',
          name: 'Demo Kampagne 1',
          platform: 'Google Ads',
          status: 'active',
          budget: '€500',
          clicks: 245,
          impressions: 12500
        }
      ] as any);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Kampagnen Übersicht</h2>
        <Button className="bg-[#14ad9f] hover:bg-[#0f8a7e] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Neue Kampagne
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktive Kampagnen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Noch keine Kampagnen erstellt</p>
                <p className="text-sm text-gray-500 mt-2">
                  Verbinden Sie zuerst Ihre Advertising-Plattformen
                </p>
              </div>
            ) : (
              campaigns.map((campaign: any) => (
                <div key={campaign.id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{campaign.name}</h3>
                    <p className="text-sm text-gray-500">{campaign.platform}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{campaign.budget}</p>
                      <p className="text-xs text-gray-500">Budget</p>
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        {campaign.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}