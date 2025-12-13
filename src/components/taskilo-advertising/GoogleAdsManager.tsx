'use client';

// 🎯 GOOGLE ADS MANAGER - Component
// Spezialisierte Google Ads Verwaltung

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

interface GoogleAdsManagerProps {
  companyId: string;
}

export default function GoogleAdsManager({ companyId }: GoogleAdsManagerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionData, setConnectionData] = useState<any>(null);

  useEffect(() => {
    loadConnectionStatus();
    
    // Check für OAuth-Callback Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const account = urlParams.get('account');
    
    if (success === 'connected') {
      console.log('✅ OAuth success detected, account:', account);
      // Lade Status neu nach erfolgreicher OAuth-Verbindung
      setTimeout(() => {
        loadConnectionStatus();
      }, 1000);
    } else if (error) {
      console.log('❌ OAuth error detected:', error);
      let errorMessage = 'OAuth-Verbindung fehlgeschlagen';
      
      switch (error) {
        case 'oauth_failed':
          errorMessage = 'Google OAuth wurde abgebrochen oder fehlgeschlagen';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Token-Austausch mit Google fehlgeschlagen';
          break;
        case 'callback_failed':
          errorMessage = 'OAuth-Callback-Verarbeitung fehlgeschlagen';
          break;
      }
      
      alert('❌ ' + errorMessage);
    }
  }, [companyId]);

  const loadConnectionStatus = async () => {
    console.log('🔍 GoogleAdsManager: Loading connection status for company:', companyId);
    try {
      const response = await fetch(`/api/multi-platform-advertising/connections?companyId=${companyId}&platform=google-ads`);
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Connection data received:', data);
        
        // Prüfe echte OAuth-Verbindung
        const hasConnection = data.success && data.connection;
        const hasRealOAuth = hasConnection && data.connection.isRealConnection === true;
        const isOAuthConnected = hasRealOAuth && data.connection.status === 'connected';
        
        // Zusätzlich: Customer IDs die mit "oauth-" beginnen sind echte OAuth-Verbindungen
        const hasOAuthCustomerId = hasConnection && data.connection.customerId && data.connection.customerId.startsWith('oauth-');
        const isTrueOAuthConnection = isOAuthConnected || hasOAuthCustomerId;
        
        console.log('🔗 Connection analysis:', {
          hasConnection,
          hasRealOAuth,
          isOAuthConnected,
          hasOAuthCustomerId,
          isTrueOAuthConnection,
          status: data.connection?.status,
          customerId: data.connection?.customerId,
          authMethod: data.connection?.authMethod,
          isRealConnection: data.connection?.isRealConnection
        });
        
        // OAuth-Verbindung ist ECHT - zeige als connected
        setIsConnected(isTrueOAuthConnection);
        setConnectionData(hasConnection ? data.connection : null);
      } else {
        setIsConnected(false);
        setConnectionData(null);
      }
    } catch (error) {
      setIsConnected(false);
      setConnectionData(null);
    } finally {
      setIsLoading(false);
    }
  };


  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    console.log('🚀 Starting Google Ads OAuth flow for company:', companyId);
    setIsConnecting(true);
    
    try {
      // Weiterleitung zu Google OAuth
      const oauthUrl = `/api/multi-platform-advertising/auth/google-ads?companyId=${companyId}`;
      console.log('🔗 Redirecting to OAuth:', oauthUrl);
      
      // Vollständige Weiterleitung zu Google OAuth
      window.location.href = oauthUrl;
      
    } catch (error) {
      console.error('🚨 OAuth redirect failed:', error);
      alert('OAuth-Weiterleitung fehlgeschlagen');
      setIsConnecting(false);
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
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <div className="p-2 rounded bg-teal-500 mr-3">
                <span className="text-white font-bold">G</span>
              </div>
              Google Ads Verbindung
            </CardTitle>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  OAuth Verbunden
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1 text-red-500" />
                  {connectionData && !connectionData.isRealConnection ? "Mock-Verbindung" : "Nicht verbunden"}
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isConnected && connectionData ? (
            <div className="space-y-4">
              {/* ERFOLGREICHE OAUTH-VERBINDUNG */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-green-700 font-medium block mb-2">
                      ✅ GOOGLE ACCOUNT VERBUNDEN
                    </span>
                    <div className="text-green-600 text-sm space-y-2">
                      <p><strong>Account:</strong> {connectionData?.accountName}</p>
                      <p><strong>Verbindungstyp:</strong> OAuth {connectionData?.authMethod}</p>
                      <p><strong>Status:</strong> {connectionData?.accountStatus}</p>
                      
                      <div className="mt-3 p-3 bg-teal-100 rounded">
                        <p className="text-teal-800 font-medium text-xs">
                          🎯 Echte Google OAuth-Verbindung aktiv. Account-Zugriff über Google APIs verfügbar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : connectionData && connectionData.isRealConnection !== true ? (
            <div className="space-y-4">
              {/* ALTE MOCK-VERBINDUNG */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <XCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-red-700 font-medium block mb-2">
                      ❌ MOCK-VERBINDUNG ERKANNT
                    </span>
                    <div className="text-red-600 text-sm space-y-2">
                      <p><strong>Customer ID {connectionData?.customerId} ist nur lokal gespeichert</strong></p>
                      <p><strong>WICHTIG:</strong> Diese Verbindung ist nicht funktional!</p>
                      
                      <div className="mt-3 p-3 bg-yellow-100 rounded">
                        <p className="text-yellow-800 font-medium text-xs">
                          ⚠️ Löschen Sie diese Mock-Verbindung und erstellen Sie eine echte OAuth-Verbindung.
                        </p>
                        <Button
                          onClick={async () => {
                            if (window.confirm('Mock-Verbindung löschen?')) {
                              try {
                                await fetch(`/api/multi-platform-advertising/connections/connect`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    companyId,
                                    platform: 'google-ads'
                                  })
                                });
                                setConnectionData(null);
                                setIsConnected(false);
                              } catch (error) {
                                console.error('Delete error:', error);
                              }
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          Löschen
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : isConnected ? (
            <div className="space-y-4">
              {/* NUR BEI ECHTER VERBINDUNG */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <div>
                    <span className="text-green-700 font-medium block">
                      ✅ Echte Manager-Verbindung aktiv
                    </span>
                    <span className="text-green-600 text-sm">
                      Customer ID: {connectionData?.customerId} → Manager: 655-923-8498
                    </span>
                  </div>
                </div>
              </div>

              {connectionData && (
                <div className="text-sm text-gray-600 bg-teal-50 p-3 rounded-lg">
                  <p className="font-medium">Verbindungsdetails:</p>
                  <p>Verbunden am: {new Date(connectionData.connectedAt || connectionData.requestedAt || Date.now()).toLocaleDateString('de-DE')}</p>
                  {connectionData.userInfo?.name && (
                    <p>Google-Konto: {connectionData.userInfo.name}</p>
                  )}
                </div>
              )}
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700 text-sm">
                  ℹ️ Kampagnen-Daten werden geladen, sobald die Google Ads API vollständig konfiguriert ist.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <div>
                    <span className="text-green-700 font-medium block">
                      Google Ads Konto verbinden
                    </span>
                    <span className="text-green-600 text-sm">
                      Sichere OAuth-Verbindung zu Ihrem Google Ads Account
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="text-teal-800 text-sm font-medium mb-2">🔐 OAuth-Authentifizierung</p>
                  <p className="text-teal-700 text-xs">
                    Sie werden zu Google weitergeleitet, wo Sie Ihr Google Ads Konto auswählen und den Zugriff autorisieren können. 
                    Nach der Bestätigung werden Sie automatisch zurückgeleitet.
                  </p>
                </div>
                
                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting}
                  className="w-full bg-[#14ad9f] hover:bg-[#0f8a7e] text-white disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>Weiterleitung zu Google...</>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Mit Google Ads verbinden
                    </>
                  )}
                </Button>
              </div>
            
              <div className="text-sm text-gray-600">
                <p><strong>Was passiert beim Verbinden?</strong></p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Sie loggen sich in Ihr eigenes Google-Konto ein</li>
                  <li>Google fragt nach Berechtigung für Taskilo</li>
                  <li>Taskilo kann dann Ihre Kampagnen verwalten</li>
                  <li>Ihre Daten bleiben in Ihrem Google-Konto</li>
                </ul>
                
                <p className="mt-3 text-xs text-gray-500">
                  🔒 Sicher: Taskilo erhält nur Zugriff auf Google Ads, nicht auf andere Google-Dienste
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-16 flex items-center justify-start"
              disabled={!isConnected}
              onClick={() => {
                if (isConnected) {
                  // Navigation zur Kampagnen-Erstellung
                  window.location.href = `/dashboard/company/${companyId}/taskilo-advertising/google-ads/campaigns/new`;
                }
              }}
            >
              <Plus className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Neue Kampagne</div>
                <div className="text-sm text-gray-500">Kampagne erstellen</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex items-center justify-start"
              disabled={!isConnected}
              onClick={() => {
                if (isConnected) {
                  // Navigation zu Performance-Dashboard
                  window.location.href = `/dashboard/company/${companyId}/taskilo-advertising/google-ads/analytics`;
                }
              }}
            >
              <TrendingUp className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Performance</div>
                <div className="text-sm text-gray-500">Berichte anzeigen</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex items-center justify-start"
              disabled={!isConnected}
              onClick={() => {
                if (isConnected) {
                  // Navigation zu Account-Einstellungen
                  window.location.href = `/dashboard/company/${companyId}/taskilo-advertising/google-ads/settings`;
                }
              }}
            >
              <Settings className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Einstellungen</div>
                <div className="text-sm text-gray-500">Konto verwalten</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex items-center justify-start"
              disabled={!isConnected}
              onClick={() => {
                if (isConnected) {
                  // Öffne Google Ads in neuem Tab
                  window.open('https://ads.google.com', '_blank');
                }
              }}
            >
              <ExternalLink className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Google Ads öffnen</div>
                <div className="text-sm text-gray-500">Externe Verwaltung</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}