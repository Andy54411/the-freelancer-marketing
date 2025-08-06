'use client';

import React, { useState, useEffect } from 'react';

// Client-side environment helper
const getEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

const getDatevClientCookieName = (companyId: string) => {
  return `datev_tokens_${getEnvironment()}_${companyId}`;
};

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
    // Early return if companyId is invalid
    if (!companyId || companyId.trim() === '' || companyId === 'unknown') {
      console.log(
        '🚫 [DATEV Cookie Auth] Invalid company ID provided, skipping initialization:',
        companyId
      );
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

      // Small delay to ensure cookies are set after redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call our API to get organization data - using GET with companyId query param
      const response = await fetch(
        `/api/datev/organizations?companyId=${encodeURIComponent(companyId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [DATEV Cookie Auth] Organization data fetched successfully:', result);

        // Reload connection status to show new data
        loadConnectionStatus();

        if (onAuthSuccess && result.data && Array.isArray(result.data) && result.data.length > 0) {
          onAuthSuccess(result.data[0]); // Use first organization from the array
        }
      } else {
        const errorData = await response.json().catch(() => null);
        console.error('❌ [DATEV Cookie Auth] Failed to fetch organization data:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        // Check if it's a token error that requires re-authentication
        if (
          response.status === 401 &&
          (errorData?.error === 'invalid_tokens' ||
            errorData?.error === 'token_expired' ||
            errorData?.error === 'no_tokens' ||
            errorData?.error === 'invalid_token' ||
            errorData?.clearTokens === true ||
            errorData?.requiresAuth === true ||
            (errorData?.error_description &&
              (errorData.error_description.includes('Token issued to another client') ||
                errorData.error_description.includes('Token malformed') ||
                errorData.error_description.includes('invalid_token'))))
        ) {
          console.warn(
            '⚠️ [DATEV Cookie Auth] Token invalid, clearing stored tokens...',
            errorData
          );

          // Clear invalid tokens from all storage locations - HTTP-only cookies cleared server-side
          // Clear from localStorage if present
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`datev_connection_${companyId}`);
            localStorage.removeItem(getDatevClientCookieName(companyId));
          }

          // Show user-friendly message based on error type
          const errorMessage = errorData?.error_description || 'DATEV-Token ungültig';
          if (errorMessage.includes('Token issued to another client')) {
            toast.error(
              'DATEV-Sitzung von anderem Client übernommen. Bitte verbinden Sie sich erneut.'
            );
          } else if (errorMessage.includes('Token malformed')) {
            toast.error('DATEV-Token beschädigt. Bitte verbinden Sie sich erneut.');
          } else {
            toast.error('DATEV-Verbindung ungültig. Bitte verbinden Sie sich erneut.');
          }

          // Force reload connection status to show disconnected state
          setConnection({
            isConnected: false,
            features: {
              accountingData: false,
              documents: false,
              masterData: false,
              cashRegister: false,
            },
          });
        } else {
          console.error(
            '❌ [DATEV Cookie Auth] Failed to fetch organization data:',
            response.status,
            errorData
          );
          toast.error('Fehler beim Laden der DATEV-Organisationsdaten');
        }
      }
    } catch (error) {
      console.error('❌ [DATEV Cookie Auth] Error fetching organization data:', error);
      toast.error('Netzwerkfehler beim Laden der DATEV-Daten');
    }
  };

  const loadConnectionStatus = async () => {
    try {
      console.log('🔍 [DATEV Cookie Auth] Loading connection status for company:', companyId);
      console.log(
        '🔍 [DATEV Cookie Auth] Company ID type:',
        typeof companyId,
        'Value:',
        JSON.stringify(companyId)
      );

      if (!companyId || companyId.trim() === '' || companyId === 'unknown') {
        console.log(
          '🚫 [DATEV Cookie Auth] No valid company ID provided (empty or unknown):',
          companyId
        );
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

      // Call organizations API directly to check connection status - using GET with query params (same as fetchAndStoreOrganizationData)
      const response = await fetch(
        `/api/datev/organizations?companyId=${encodeURIComponent(companyId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('📊 [DATEV Cookie Auth] Connection status:', result);

        // Check if we got organization data back (indicates connection is working)
        const isConnected = !!(
          result.success &&
          result.data &&
          Array.isArray(result.data) &&
          result.data.length > 0
        );
        const organization = isConnected ? result.data[0] : undefined;

        setConnection({
          isConnected: isConnected,
          organization: organization,
          connectedAt: result.timestamp,
          expiresAt: undefined, // Will be calculated from token if needed
          features: {
            accountingData: isConnected,
            documents: isConnected,
            masterData: isConnected,
            cashRegister: isConnected,
          },
        });
      } else {
        const errorData = await response.json().catch(() => null);

        // Check if it's a token error - tokens will be cleared server-side
        if (
          response.status === 401 &&
          errorData &&
          (errorData.error === 'invalid_token' ||
            errorData.error === 'token_expired' ||
            errorData.error === 'no_tokens' ||
            errorData.clearTokens === true ||
            errorData.requiresAuth === true ||
            (errorData.error_description &&
              (errorData.error_description.includes('Token issued to another client') ||
                errorData.error_description.includes('Token malformed') ||
                errorData.error_description.includes('invalid_token'))))
        ) {
          console.warn(
            '⚠️ [DATEV Cookie Auth] Invalid tokens detected in status check - tokens cleared server-side',
            errorData
          );

          // Clear from localStorage if present (but HTTP-only cookies are cleared server-side)
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`datev_connection_${companyId}`);
            localStorage.removeItem(getDatevClientCookieName(companyId));
          }
        }

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
    // Validate companyId before connecting
    if (!companyId || companyId.trim() === '' || companyId === 'unknown') {
      console.error('❌ [DATEV Cookie Auth] Cannot connect - invalid company ID:', companyId);
      toast.error('Ungültige Firmen-ID - kann keine DATEV-Verbindung herstellen');
      return;
    }

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

      // Clear stored tokens from localStorage (HTTP-only cookies are server-managed)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`datev_connection_${companyId}`);
        localStorage.removeItem(getDatevClientCookieName(companyId));
      }

      // Call server to clear HTTP-only cookies
      try {
        await fetch('/api/datev/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ companyId: companyId }),
        });
      } catch (e) {
        console.warn('Failed to call disconnect API, clearing locally only');
      }

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

      // Simply reload connection status - server will handle token validation and refresh
      await loadConnectionStatus();

      if (connection?.isConnected) {
        toast.success('DATEV-Verbindung aktualisiert');
      } else {
        toast.error('Verbindung nicht aktiv. Bitte erneut verbinden.');
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
            Sie werden zu DATEV weitergeleitet, um sich sicher anzumelden. Ihre Zugangsdaten werden
            nie von Taskilo gespeichert. Alle Daten werden DSGVO-konform und ausschließlich in
            Deutschland verarbeitet.
          </p>
          <div className="text-xs text-gray-500 mt-2">
            🇩🇪 Datenschutz: Nach deutschem Recht • 🔒 Verschlüsselt • 📋
            Auftragsverarbeitungsvertrag verfügbar
          </div>
        </div>
      </div>
    </div>
  );
}
