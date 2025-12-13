'use client';

// 🎯 LINKEDIN ADS MANAGER - Component
// Spezialisierte LinkedIn Ads Verwaltung

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

interface LinkedInAdsManagerProps {
  companyId: string;
}

export default function LinkedInAdsManager({ companyId }: LinkedInAdsManagerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleConnect = async () => {
    try {
      window.location.href = `/api/multi-platform-advertising/auth/linkedin?companyId=${companyId}`;
    } catch (error) {
      console.error('LinkedIn Ads connection failed:', error);
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
              <div className="p-2 rounded bg-teal-700 mr-3">
                <span className="text-white font-bold text-sm">Li</span>
              </div>
              LinkedIn Ads Verbindung
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
                  Verbinden Sie Ihr LinkedIn Ads Konto fuer B2B-Marketing.
                </span>
              </div>
            </div>
            
            <Button 
              onClick={handleConnect}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Mit LinkedIn Ads verbinden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}