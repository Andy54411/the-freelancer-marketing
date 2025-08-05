'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FiExternalLink,
  FiCheck,
  FiAlertCircle,
  FiRefreshCw,
  FiShield,
  FiDatabase,
  FiUsers,
  FiFileText,
} from 'react-icons/fi';
import { DatevCookieManager } from '@/lib/datev-cookie-manager';
import { DatevService, DatevOrganization } from '@/services/datevService';
import { toast } from 'sonner';

interface DatevConnection {
  isConnected: boolean;
  organization?: DatevOrganization;
  connectedAt?: string;
  expiresAt?: string;
  features: {
    accountingData: boolean;
    documents: boolean;
    masterData: boolean;
    cashRegister: boolean;
  };
}

interface DatevAuthComponentProps {
  companyId: string;
  onAuthSuccess?: (organization: DatevOrganization) => void;
}

export function DatevAuthComponent({ companyId, onAuthSuccess }: DatevAuthComponentProps) {
  const [connection, setConnection] = useState<DatevConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check URL parameters for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('datev_auth');
    const errorMessage = urlParams.get('message');
    const errorType = urlParams.get('error');
    const callbackCompany = urlParams.get('company');

    console.log('🔍 [DATEV Cookie Auth] Checking callback params:', {
      authStatus,
      errorType,
      callbackCompany,
      currentCompanyId: companyId,
    });

    // Handle OAuth callback results
    if (authStatus === 'success') {
      if (callbackCompany === companyId) {
        toast.success('DATEV-Authentifizierung erfolgreich abgeschlossen!');
        console.log('✅ [DATEV Cookie Auth] Successful auth for correct company');

        // Fetch and store organization data in cookie
        fetchAndStoreOrganizationData();
      } else {
        console.warn('⚠️ [DATEV Cookie Auth] Company ID mismatch in callback:', {
          expected: companyId,
          received: callbackCompany,
        });
      }

      // Clean URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (authStatus === 'error' || errorType) {
      const message = errorMessage
        ? decodeURIComponent(errorMessage)
        : 'DATEV-Authentifizierung fehlgeschlagen';
      toast.error(`DATEV-Fehler: ${message}`);

      // Clean URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Load connection status
    loadConnectionStatus();
  }, [companyId]);

  const fetchAndStoreOrganizationData = async () => {
    try {
      console.log('🔍 [DATEV Cookie Auth] Fetching organization data after OAuth...');

      // Call our API to get organization data and store it
      const response = await fetch('/api/datev/organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: companyId }),
      });

      if (response.ok) {
        const orgData = await response.json();
        console.log('✅ [DATEV Cookie Auth] Organization data stored successfully');

        // Reload connection status to show new data
        loadConnectionStatus();

        if (onAuthSuccess && orgData.organization) {
          onAuthSuccess(orgData.organization);
        }
      } else {
        console.error('❌ [DATEV Cookie Auth] Failed to fetch organization data');
      }
    } catch (error) {
      console.error('❌ [DATEV Cookie Auth] Error fetching organization data:', error);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      console.log('🔍 [DATEV Cookie Auth] Loading connection status for company:', companyId);

      if (!companyId || companyId.trim() === '') {
        console.log('🚫 [DATEV Cookie Auth] No valid company ID provided');
        setConnection({
          isConnected: false,
          features: {
            accountingData: false,
            documents: false,
            masterData: false,
            cashRegister: false,
          },
        });
        setLoading(false);
        return;
      }

      // Call server-side status API
      const response = await fetch('/api/datev/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: companyId }),
      });

      if (response.ok) {
        const status = await response.json();
        console.log('📊 [DATEV Cookie Auth] Connection status:', status);

        setConnection({
          isConnected: status.isConnected,
          organization: status.organization,
          connectedAt: status.connectedAt,
          expiresAt: status.expiresAt,
          features: status.features,
        });
      } else {
        console.error('❌ [DATEV Cookie Auth] Failed to fetch connection status');
        setConnection({
          isConnected: false,
          features: {
            accountingData: false,
            documents: false,
            masterData: false,
            cashRegister: false,
          },
        });
      }
    } catch (error) {
      console.error('❌ [DATEV Cookie Auth] Error loading connection status:', error);
      setConnection({
        isConnected: false,
        features: {
          accountingData: false,
          documents: false,
          masterData: false,
          cashRegister: false,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      console.log('🔗 [DATEV Cookie Auth] Starting OAuth flow for company:', companyId);

      // Redirect to OAuth authorization
      const authUrl = `/api/datev/auth-cookie?company_id=${encodeURIComponent(companyId)}`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ [DATEV Cookie Auth] Connection error:', error);
      toast.error('Fehler beim Verbinden mit DATEV');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('🔌 [DATEV Cookie Auth] Disconnecting company:', companyId);

      // Clear stored tokens
      DatevCookieManager.clearTokens(companyId);

      // Update UI
      setConnection({
        isConnected: false,
        features: {
          accountingData: false,
          documents: false,
          masterData: false,
          cashRegister: false,
        },
      });

      toast.success('DATEV-Verbindung getrennt');
      console.log('✅ [DATEV Cookie Auth] Successfully disconnected');
    } catch (error) {
      console.error('❌ [DATEV Cookie Auth] Disconnect error:', error);
      toast.error('Fehler beim Trennen der DATEV-Verbindung');
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      console.log('🔄 [DATEV Cookie Auth] Refreshing connection...');

      // Try to refresh tokens
      const refreshed = await DatevCookieManager.refreshTokens(companyId);

      if (refreshed) {
        toast.success('DATEV-Verbindung aktualisiert');
        loadConnectionStatus();
      } else {
        toast.error('Token-Erneuerung fehlgeschlagen. Bitte erneut verbinden.');
        setConnection({
          isConnected: false,
          features: {
            accountingData: false,
            documents: false,
            masterData: false,
            cashRegister: false,
          },
        });
      }
    } catch (error) {
      console.error('❌ [DATEV Cookie Auth] Refresh error:', error);
      toast.error('Fehler beim Aktualisieren der Verbindung');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#14ad9f] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Authentifizierung wird geprüft...</p>
        </div>
      </div>
    );
  }

  if (connection?.isConnected) {
    return (
      <div className="space-y-6">
        {/* Connected Status */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <FiCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">DATEV erfolgreich verbunden</h3>
                  {connection.organization && (
                    <div className="space-y-1">
                      <p className="text-green-700">
                        <strong>Organisation:</strong> {connection.organization.name}
                      </p>
                      {connection.organization.id && (
                        <p className="text-green-700">
                          <strong>ID:</strong> {connection.organization.id}
                        </p>
                      )}
                      {connection.organization.type && (
                        <p className="text-green-700">
                          <strong>Typ:</strong>{' '}
                          {connection.organization.type === 'client' ? 'Mandant' : 'Berater'}
                        </p>
                      )}
                    </div>
                  )}
                  {connection.connectedAt && (
                    <p className="text-sm text-green-600 mt-2">
                      Verbunden seit: {new Date(connection.connectedAt).toLocaleString('de-DE')}
                    </p>
                  )}
                  {connection.expiresAt && (
                    <p className="text-sm text-green-600">
                      Token gültig bis: {new Date(connection.expiresAt).toLocaleString('de-DE')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <FiRefreshCw className="w-4 h-4 mr-2" />
                  Aktualisieren
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Trennen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verfügbare DATEV-Funktionen</CardTitle>
            <CardDescription>
              Diese Funktionen sind jetzt für Ihr Unternehmen aktiviert
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Features Grid */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#14ad9f]/10 rounded-full">
                  <FiFileText className="w-4 h-4 text-[#14ad9f]" />
                </div>
                <div>
                  <p className="font-medium">Automatischer Rechnungsexport</p>
                  <p className="text-sm text-gray-600">Rechnungen werden automatisch übertragen</p>
                </div>
                <FiCheck className="w-5 h-5 text-green-500 ml-auto" />
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#14ad9f]/10 rounded-full">
                  <FiDatabase className="w-4 h-4 text-[#14ad9f]" />
                </div>
                <div>
                  <p className="font-medium">Stammdaten-Synchronisation</p>
                  <p className="text-sm text-gray-600">Kunden- und Lieferantendaten sync</p>
                </div>
                <FiCheck className="w-5 h-5 text-green-500 ml-auto" />
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#14ad9f]/10 rounded-full">
                  <FiUsers className="w-4 h-4 text-[#14ad9f]" />
                </div>
                <div>
                  <p className="font-medium">Steuerberater-Zugang</p>
                  <p className="text-sm text-gray-600">Direkter Zugriff für Ihren Steuerberater</p>
                </div>
                <FiCheck className="w-5 h-5 text-green-500 ml-auto" />
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#14ad9f]/10 rounded-full">
                  <FiShield className="w-4 h-4 text-[#14ad9f]" />
                </div>
                <div>
                  <p className="font-medium">Sichere Datenübertragung</p>
                  <p className="text-sm text-gray-600">
                    Verschlüsselte und DSGVO-konforme Übertragung
                  </p>
                </div>
                <FiCheck className="w-5 h-5 text-green-500 ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not connected - show connection button
  return (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center gap-3 mb-3">
            <FiDatabase className="w-6 h-6 text-[#14ad9f]" />
            <h3 className="font-semibold text-gray-900">DATEV-Konto verbinden</h3>
          </div>
          <p className="text-gray-700 mb-4">
            Verbinden Sie Ihr DATEV-Konto für automatische Buchhaltung und nahtlose Integration mit
            Ihrem Steuerberater.
          </p>
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white px-8 py-2"
          >
            {connecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Verbinde...
              </>
            ) : (
              <>
                <FiExternalLink className="w-4 h-4 mr-2" />
                Mit DATEV verbinden
              </>
            )}
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <FiShield className="w-4 h-4 text-green-600" />
            <span>Sichere OAuth2-Authentifizierung nach sevdesk-Standard</span>
          </div>
          <p>
            Sie werden zu DATEV weitergeleitet, um sich sicher anzumelden. Ihre Zugangsdaten
            werden nie von Taskilo gespeichert. Alle Daten werden DSGVO-konform und 
            ausschließlich in Deutschland verarbeitet.
          </p>
          <div className="text-xs text-gray-500 mt-2">
            🇩🇪 Datenschutz: Nach deutschem Recht • 🔒 Verschlüsselt • 
            📋 Auftragsverarbeitungsvertrag verfügbar
          </div>
        </div>
      </div>
    </div>
  );
}
