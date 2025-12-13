'use client';

// 🎯 ADVERTISING ANALYTICS - Component
// Detaillierte Performance-Berichte und Statistiken

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Eye,
  MousePointer,
  Target,
  BarChart3
} from 'lucide-react';

interface AdvertisingAnalyticsProps {
  companyId: string;
}

export default function AdvertisingAnalytics({ companyId }: AdvertisingAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
      // Mock analytics data
      setAnalytics({
        totalSpent: 2450,
        totalClicks: 1250,
        totalImpressions: 45000,
        ctr: 2.8,
        platforms: [
          { name: 'Google Ads', spent: 1200, performance: '+15%' },
          { name: 'LinkedIn Ads', spent: 800, performance: '+8%' },
          { name: 'Meta Ads', spent: 450, performance: '-2%' }
        ]
      });
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg mt-6"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Keine Analytics-Daten verfügbar</p>
            <p className="text-sm text-gray-500 mt-2">
              Verbinden Sie Ihre Advertising-Plattformen um Daten zu sehen
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Performance Analytics</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gesamtausgaben</p>
                <p className="text-2xl font-bold">€{analytics.totalSpent}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+12% vs. letzter Monat</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gesamte Klicks</p>
                <p className="text-2xl font-bold">{analytics.totalClicks}</p>
              </div>
              <MousePointer className="w-8 h-8 text-teal-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+8% vs. letzter Monat</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Impressionen</p>
                <p className="text-2xl font-bold">{analytics.totalImpressions.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-purple-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+22% vs. letzter Monat</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CTR</p>
                <p className="text-2xl font-bold">{analytics.ctr}%</p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-sm text-red-600">-0.3% vs. letzter Monat</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance nach Plattform</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.platforms.map((platform: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium">{platform.name}</h3>
                  <p className="text-sm text-gray-600">Ausgaben: €{platform.spent}</p>
                </div>
                <Badge variant={platform.performance.includes('+') ? 'default' : 'destructive'}>
                  {platform.performance}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}