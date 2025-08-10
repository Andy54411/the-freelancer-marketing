// ✅ Google Ads Settings Component
// Konfiguration und Verbindungsmanagement

'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Link as LinkIcon,
  Unlink,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  Key,
  User,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface GoogleAdsSettingsProps {
  companyId: string;
  activeTab: string;
}

interface ConnectionStatus {
  connected: boolean;
  hasValidTokens: boolean;
  hasCustomerAccess: boolean;
  customerCount: number;
  lastChecked: string;
  error?: string;
}

interface AccountInfo {
  customerId?: string;
  managerAccount?: boolean;
  currency?: string;
  timezone?: string;
  accountName?: string;
}

export function GoogleAdsSettings({ companyId, activeTab }: GoogleAdsSettingsProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({});
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(activeTab || 'connection');

  // Lade Verbindungsstatus
  const loadConnectionStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/google-ads/status?companyId=${companyId}`);

      if (!response.ok) {
        throw new Error('Failed to load connection status');
      }

      const data = await response.json();

      // Die API gibt direkt die Connection-Daten zurück, nicht unter data.data
      const connectionData = {
        connected: data.connected || false,
        hasValidTokens:
          (data.tokenStatus?.hasRefreshToken && data.tokenStatus?.hasAccessToken) || false,
        hasCustomerAccess: data.accountsConnected || false,
        customerCount: data.accounts?.length || 0,
        lastChecked: data.lastChecked || new Date().toISOString(),
        error: data.error,
      };

      setConnectionStatus(connectionData);

      // Account-Informationen aus der Status-API extrahieren
      if (data.accounts && data.accounts.length > 0) {
        const firstAccount = data.accounts[0];
        setAccountInfo({
          customerId: firstAccount.id,
          accountName: firstAccount.name,
          currency: firstAccount.currency,
          timezone: 'Europe/Berlin', // Default
          managerAccount: false, // TODO: Detect from API
        });
      }

      // Lade zusätzliche Account-Informationen wenn verbunden
      if (data.connected) {
        await loadAccountInfo();
      }
    } catch (err: any) {
      console.error('Status loading error:', err);
      setError(err.message || 'Fehler beim Laden des Verbindungsstatus');
    } finally {
      setLoading(false);
    }
  };

  // Lade Account-Informationen
  const loadAccountInfo = async () => {
    try {
      // Versuche zusätzliche Account-Details von der Test-API zu holen
      const response = await fetch(`/api/google-ads/test-api?companyId=${companyId}`);

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.customerInfo) {
          setAccountInfo(prev => ({
            ...prev,
            customerId: data.customerInfo.customerId || prev.customerId,
            accountName: data.customerInfo.descriptiveName || prev.accountName,
            currency: data.customerInfo.currencyCode || prev.currency,
            timezone: data.customerInfo.timeZone || prev.timezone,
            managerAccount: data.customerInfo.isManagerAccount || false,
          }));
        }
      }
    } catch (err) {
      console.error('Account info loading error:', err);
      // Fallback zu bereits geladenen Daten von der Status-API
    }
  };

  // Google Ads verbinden
  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/google-ads/auth?companyId=${companyId}`);

      if (!response.ok) {
        throw new Error('Failed to initiate connection');
      }

      const data = await response.json();

      if (data.success && data.authUrl) {
        // Öffne OAuth-URL in neuem Tab
        window.open(data.authUrl, '_blank', 'width=600,height=700');

        // Überwache Verbindungsstatus
        const pollConnection = setInterval(async () => {
          await loadConnectionStatus();

          if (connectionStatus?.connected) {
            clearInterval(pollConnection);
            setConnecting(false);
          }
        }, 3000);

        // Stoppe Polling nach 5 Minuten
        setTimeout(() => {
          clearInterval(pollConnection);
          setConnecting(false);
        }, 300000);
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Fehler beim Verbinden mit Google Ads');
      setConnecting(false);
    }
  };

  // Google Ads trennen
  const handleDisconnect = async () => {
    if (!confirm('Möchten Sie die Google Ads Verbindung wirklich trennen?')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/google-ads/disconnect?companyId=${companyId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setConnectionStatus(null);
      setAccountInfo({});
      await loadConnectionStatus();
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Fehler beim Trennen der Verbindung');
    } finally {
      setLoading(false);
    }
  };

  // Verbindung testen
  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/google-ads/test-all?companyId=${companyId}&mode=auth`);

      if (!response.ok) {
        throw new Error('Connection test failed');
      }

      const data = await response.json();

      if (data.success) {
        await loadConnectionStatus();
      } else {
        setError(data.message || 'Verbindungstest fehlgeschlagen');
      }
    } catch (err: any) {
      console.error('Test connection error:', err);
      setError(err.message || 'Fehler beim Testen der Verbindung');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadConnectionStatus();
    }
  }, [companyId]);

  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connection">Verbindung</TabsTrigger>
          <TabsTrigger value="account">Konto</TabsTrigger>
          <TabsTrigger value="permissions">Berechtigungen</TabsTrigger>
          <TabsTrigger value="advanced">Erweitert</TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="w-5 h-5" />
                <span>Google Ads Verbindung</span>
              </CardTitle>
              <CardDescription>
                Verbinden Sie Ihr Google Ads Konto für automatisiertes Kampagnen-Management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {connectionStatus?.connected ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                  )}
                  <div>
                    <h3 className="font-medium">
                      {connectionStatus?.connected ? 'Verbunden' : 'Nicht verbunden'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {connectionStatus?.connected
                        ? `${connectionStatus.customerCount} Konten verfügbar`
                        : 'Google Ads Konto noch nicht verbunden'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {connectionStatus?.connected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestConnection}
                        disabled={loading}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Testen
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={loading}
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Trennen
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="bg-[#14ad9f] hover:bg-[#129488]"
                    >
                      {connecting ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LinkIcon className="w-4 h-4 mr-2" />
                      )}
                      {connecting ? 'Verbinde...' : 'Mit Google Ads verbinden'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Connection Details */}
              {connectionStatus && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">Tokens</span>
                    </div>
                    <Badge
                      variant={connectionStatus.hasValidTokens ? 'default' : 'destructive'}
                      className={
                        connectionStatus.hasValidTokens
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {connectionStatus.hasValidTokens ? 'Gültig' : 'Ungültig'}
                    </Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">Konten-Zugriff</span>
                    </div>
                    <Badge
                      variant={connectionStatus.hasCustomerAccess ? 'default' : 'destructive'}
                      className={
                        connectionStatus.hasCustomerAccess
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {connectionStatus.hasCustomerAccess ? 'Aktiv' : 'Kein Zugriff'}
                    </Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Database className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">Konten</span>
                    </div>
                    <span className="text-2xl font-bold">{connectionStatus.customerCount}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Konto-Informationen</CardTitle>
              <CardDescription>Details zu Ihrem verbundenen Google Ads Konto</CardDescription>
            </CardHeader>
            <CardContent>
              {connectionStatus?.connected ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Kunden-ID</Label>
                      <Input
                        value={accountInfo.customerId || 'Nicht verfügbar'}
                        readOnly
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Konto-Name</Label>
                      <Input
                        value={accountInfo.accountName || 'Nicht verfügbar'}
                        readOnly
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Währung</Label>
                      <Input value={accountInfo.currency || 'EUR'} readOnly className="mt-1" />
                    </div>

                    <div>
                      <Label>Zeitzone</Label>
                      <Input
                        value={accountInfo.timezone || 'Europe/Berlin'}
                        readOnly
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch checked={accountInfo.managerAccount || false} disabled />
                    <Label>Manager-Konto</Label>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">
                    Verbinden Sie zuerst Ihr Google Ads Konto um Konto-Details anzuzeigen
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API-Berechtigungen</CardTitle>
              <CardDescription>
                Übersicht der verfügbaren Google Ads API Berechtigungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Kampagnen lesen</h4>
                    <p className="text-sm text-gray-600">Kampagnen-Daten abrufen</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Kampagnen verwalten</h4>
                    <p className="text-sm text-gray-600">Kampagnen erstellen und bearbeiten</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Performance-Daten</h4>
                    <p className="text-sm text-gray-600">Klicks, Impressionen und Kosten-Daten</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Konto-Verwaltung</h4>
                    <p className="text-sm text-gray-600">
                      Konto-Einstellungen und Budget-Management
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Erweiterte Einstellungen</CardTitle>
              <CardDescription>Erweiterte Konfiguration und Debugging-Optionen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Debug-Modus</h4>
                    <p className="text-sm text-gray-600">Aktiviert ausführliches Logging</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-Sync</h4>
                    <p className="text-sm text-gray-600">
                      Automatische Synchronisation alle 6 Stunden
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Webhook-Benachrichtigungen</h4>
                    <p className="text-sm text-gray-600">
                      Benachrichtigungen bei Kampagnen-Änderungen
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">API-Konfiguration</h4>
                <div className="space-y-4">
                  <div>
                    <Label>Developer Token</Label>
                    <Input
                      type="password"
                      placeholder="•••••••••••••••••••••••••••••••••••••"
                      className="mt-1"
                      readOnly
                    />
                  </div>

                  <div>
                    <Label>Client ID</Label>
                    <Input
                      type="password"
                      placeholder="•••••••••••••••••••••••••••••••••••••"
                      className="mt-1"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
