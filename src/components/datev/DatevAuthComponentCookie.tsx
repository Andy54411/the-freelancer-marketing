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

    // Handle OAuth callback results
    if (authStatus === 'success') {
      if (callbackCompany === companyId) {
        toast.success('DATEV-Authentifizierung erfolgreich abgeschlossen!');

        // Fetch and store organization data in cookie
        fetchAndStoreOrganizationData();
      } else {
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
      // Small delay to ensure cookies are set after redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call our API to get organization data - USING USERINFO TEST API (FUNKTIONIERT)
      const response = await fetch(
        `/api/datev/userinfo-test?companyId=${encodeURIComponent(companyId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Transform UserInfo result to match expected organization format
        const organizationData = {
          id: result.userInfo?.account_id || result.userInfo?.sub || 'unknown',
          name: result.userInfo?.name || result.userInfo?.preferred_username || 'DATEV User',
          email: result.userInfo?.email,
          accountId: result.userInfo?.account_id,
          environment: result.tokenEnvironment || 'sandbox',
          apiUrl: result.apiUrl,
          // Required fields for DatevOrganization interface
          type: 'client' as const,
          address: {
            street: 'N/A',
            city: 'N/A',
            zipCode: 'N/A',
            country: 'DE',
          },
          status: 'active' as const,
        };

        // Reload connection status to show new data
        loadConnectionStatus();

        if (onAuthSuccess && organizationData.id) {
          onAuthSuccess(organizationData as DatevOrganization);
        }
      } else {
        const errorData = await response.json().catch(() => null);

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
          toast.error('Fehler beim Laden der DATEV-Organisationsdaten');
        }
      }
    } catch (error) {
      toast.error('Netzwerkfehler beim Laden der DATEV-Daten');
    }
  };

  const loadConnectionStatus = async () => {
    try {
      if (!companyId || companyId.trim() === '' || companyId === 'unknown') {
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

      // Call userinfo-test API directly to check connection status - FUNKTIONIERT GARANTIERT
      const response = await fetch(
        `/api/datev/userinfo-test?companyId=${encodeURIComponent(companyId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Check if we got userinfo data back (indicates connection is working)
        const isConnected = !!(result.success && result.userInfo);

        const organizationData = isConnected
          ? {
              id: result.userInfo?.account_id || result.userInfo?.sub || 'unknown',
              name: result.userInfo?.name || result.userInfo?.preferred_username || 'DATEV User',
              email: result.userInfo?.email,
              accountId: result.userInfo?.account_id,
              environment: result.tokenEnvironment || 'sandbox',
              // Required fields for DatevOrganization interface
              type: 'client' as const,
              address: {
                street: 'N/A',
                city: 'N/A',
                zipCode: 'N/A',
                country: 'DE',
              },
              status: 'active' as const,
            }
          : undefined;

        setConnection({
          isConnected: isConnected,
          organization: organizationData,
          connectedAt: result.timestamp || new Date().toISOString(),
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
          // Clear from localStorage if present (but HTTP-only cookies are cleared server-side)
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`datev_connection_${companyId}`);
            localStorage.removeItem(getDatevClientCookieName(companyId));
          }
        }

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
      toast.error('Ungültige Firmen-ID - kann keine DATEV-Verbindung herstellen');
      return;
    }

    try {
      setConnecting(true);

      // Redirect to OAuth authorization
      const authUrl = `/api/datev/auth-cookie?company_id=${encodeURIComponent(companyId)}`;
      window.location.href = authUrl;
    } catch (error) {
      toast.error('Fehler beim Verbinden mit DATEV');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
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
      } catch (e) {}

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
    } catch (error) {
      toast.error('Fehler beim Trennen der DATEV-Verbindung');
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);

      // Simply reload connection status - server will handle token validation and refresh
      await loadConnectionStatus();

      if (connection?.isConnected) {
        toast.success('DATEV-Verbindung aktualisiert');
      } else {
        toast.error('Verbindung nicht aktiv. Bitte erneut verbinden.');
      }
    } catch (error) {
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
