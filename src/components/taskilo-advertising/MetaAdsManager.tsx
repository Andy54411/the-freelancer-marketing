'use client';

// 🎯 META ADS MANAGER - Component
// Spezialisierte Meta (Facebook/Instagram) Ads Verwaltung

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
  AlertTriangle 
} from 'lucide-react';

interface MetaAdsManagerProps {
  companyId: string;
}

export default function MetaAdsManager({ companyId }: MetaAdsManagerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleConnect = async () => {
    try {
      window.location.href = `/api/multi-platform-advertising/auth/meta?companyId=${companyId}`;
    } catch (error) {
      console.error('Meta Ads connection failed:', error);
    }
  };

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <div className="p-2 rounded bg-teal-600 mr-3">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              Meta Ads Verbindung
            </CardTitle>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Verbunden
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1 text-gray-400" />
                  Nicht verbunden
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-teal-500 mr-2" />
                <span className="text-teal-700">
                  Verbinden Sie Ihr Facebook und Instagram Ads Konto.
                </span>
              </div>
            </div>
            
            <Button 
              onClick={handleConnect}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Mit Meta Ads verbinden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}