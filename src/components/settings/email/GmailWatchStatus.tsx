'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wifi, WifiOff, RefreshCw, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface GmailWatchStatusProps {
  companyId: string;
}

interface WatchStatus {
  userEmail: string;
  pushNotificationsEnabled: boolean;
  watchExpiration: string | null;
  lastSync: string | null;
  setupAt: string | null;
  hoursUntilExpiration: number | null;
}

interface WatchStatusResponse {
  watchActive: boolean;
  totalWatches: number;
  activeWatches: number;
  expiredWatches: number;
  watches: WatchStatus[];
  error?: string;
  message?: string;
}

export function GmailWatchStatus({ companyId }: GmailWatchStatusProps) {
  const [watchStatus, setWatchStatus] = useState<WatchStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);

  const loadWatchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/company/${companyId}/gmail-watch-status`);
      const data = await response.json();
      setWatchStatus(data);
    } catch (error) {
      console.error('Fehler beim Laden des Watch Status:', error);
    } finally {
      setLoading(false);
    }
  };

  const renewWatch = async () => {
    try {
      setRenewing(true);
      const response = await fetch(`/api/company/${companyId}/gmail-watch-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'renew' }),
      });

      if (response.ok) {
        // Status neu laden nach Renewal
        await loadWatchStatus();
      }
    } catch (error) {
      console.error('Fehler beim Erneuern des Watch:', error);
    } finally {
      setRenewing(false);
    }
  };

  useEffect(() => {
    loadWatchStatus();
  }, [companyId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Real-time E-Mail Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {watchStatus?.watchActive ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          Real-time E-Mail Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {watchStatus?.error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {watchStatus.message || watchStatus.error}
            </AlertDescription>
          </Alert>
        )}

        {watchStatus?.watchActive ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Real-time Aktiv
              </Badge>
              <Button
                onClick={renewWatch}
                disabled={renewing}
                size="sm"
                variant="outline"
              >
                {renewing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Watch Erneuern
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>Aktive Watches: {watchStatus.activeWatches} von {watchStatus.totalWatches}</p>
              {watchStatus.expiredWatches > 0 && (
                <p className="text-amber-600">
                  Abgelaufene Watches: {watchStatus.expiredWatches}
                </p>
              )}
              {(watchStatus as any).configuredButNoWatch > 0 && (
                <p className="text-blue-600">
                  Gmail konfiguriert aber Watch fehlt: {(watchStatus as any).configuredButNoWatch}
                </p>
              )}
            </div>

            {watchStatus.watches.map((watch, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{watch.userEmail}</span>
                  <Badge variant={watch.pushNotificationsEnabled ? "default" : "secondary"}>
                    {watch.pushNotificationsEnabled ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  {watch.hoursUntilExpiration !== null && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {watch.hoursUntilExpiration > 0 ? (
                        <span>Läuft ab in {watch.hoursUntilExpiration} Stunden</span>
                      ) : (
                        <span className="text-red-500">Abgelaufen</span>
                      )}
                    </div>
                  )}
                  {watch.lastSync && (
                    <p>Letzter Sync: {new Date(watch.lastSync).toLocaleString('de-DE')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Badge className="bg-red-100 text-red-800">
              <WifiOff className="h-3 w-3 mr-1" />
              Real-time Inaktiv
            </Badge>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Für Real-time E-Mails muss Gmail verbunden werden. 
                Nach der Verbindung werden neue E-Mails automatisch synchronisiert.
              </AlertDescription>
            </Alert>

            <Button
              onClick={renewWatch}
              disabled={renewing}
              size="sm"
              variant="outline"
              className="w-full"
            >
              {renewing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Watch Setup Versuchen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}