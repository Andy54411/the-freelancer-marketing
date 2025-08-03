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
import { DatevTokenManager } from '@/lib/datev-token-manager';
import { DatevService, DatevOrganization } from '@/services/datevService';
import { toast } from 'sonner';

interface DatevConnection {
  isConnected: boolean;
  organization?: DatevOrganization;
  user?: {
    name: string;
    email: string;
    id: string;
  };
  connectedAt?: string;
  lastSync?: string;
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

    // Handle OAuth callback results
    if (authStatus === 'success') {
      toast.success('DATEV-Authentifizierung erfolgreich abgeschlossen!');
      // Clean the URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (authStatus === 'error' || errorType) {
      const message = errorMessage
        ? decodeURIComponent(errorMessage)
        : 'DATEV-Authentifizierung fehlgeschlagen';
      toast.error(`DATEV-Fehler: ${message}`);
      // Clean the URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    loadDatevConnection();
  }, [companyId]);

  const loadDatevConnection = async () => {
    try {
      setLoading(true);

      // First check if we have a stored token
      const token = DatevTokenManager.getUserToken();

      if (!token) {
        console.log('No DATEV token found');
        setConnection({
          isConnected: false,
          features: {
            accountingData: false,
            documents: false,
            masterData: false,
            cashRegister: false,
          },
        });
        return;
      }

      // Validate the token by trying to fetch organizations
      try {
        const organizations = await DatevService.getOrganizations();

        if (organizations && organizations.length > 0) {
          const org = organizations[0]; // Use first available organization
          setConnection({
            isConnected: true,
            organization: org,
            user: {
              name: org.name || 'DATEV User',
              email: 'user@datev.de', // DATEV doesn't expose user email in this endpoint
              id: org.id,
            },
            connectedAt: new Date().toISOString(),
            lastSync: new Date().toISOString(),
            features: {
              accountingData: true,
              documents: true,
              masterData: true,
              cashRegister: true,
            },
          });

          if (onAuthSuccess) {
            onAuthSuccess(org);
          }

          toast.success('DATEV-Verbindung erfolgreich überprüft');
        } else {
          console.log('No DATEV organizations found');
          handleAuthError('Keine DATEV-Organisationen gefunden');
        }
      } catch (apiError) {
        console.error('DATEV API error during connection check:', apiError);

        // If API call fails, the token is likely invalid
        if (apiError instanceof Error && apiError.message.includes('authentication')) {
          DatevTokenManager.clearUserToken();
          toast.error('DATEV-Authentifizierung abgelaufen. Bitte erneut verbinden.');
        } else {
          toast.error('Fehler beim Überprüfen der DATEV-Verbindung');
        }

        handleAuthError(apiError instanceof Error ? apiError.message : 'API-Fehler');
      }
    } catch (error) {
      console.error('DATEV connection check failed:', error);
      handleAuthError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (errorMessage: string) => {
    setConnection({
      isConnected: false,
      features: {
        accountingData: false,
        documents: false,
        masterData: false,
        cashRegister: false,
      },
    });
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);

      // Generate OAuth URL via API route to avoid environment variable issues on client side
      const state = `company:${companyId}:${Date.now()}`;

      const response = await fetch('/api/datev/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          state,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate auth URL');
      }

      // WICHTIG: Vollständige Seitenweiterleitung statt Popup
      // DATEV OAuth funktioniert nicht korrekt mit Popups
      console.log('Redirecting to DATEV OAuth:', result.authUrl);
      window.location.href = result.authUrl;
    } catch (error) {
      console.error('DATEV connection failed:', error);
      toast.error(
        'Fehler beim Verbinden mit DATEV: ' +
          (error instanceof Error ? error.message : 'Unbekannter Fehler')
      );
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      DatevTokenManager.clearUserToken();
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
      console.error('Error disconnecting from DATEV:', error);
      toast.error('Fehler beim Trennen der DATEV-Verbindung');
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await loadDatevConnection();
      toast.success('DATEV-Verbindung aktualisiert');
    } catch (error) {
      console.error('Error refreshing DATEV connection:', error);
      toast.error('Fehler beim Aktualisieren der DATEV-Verbindung');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <FiRefreshCw className="animate-spin" />
            DATEV-Verbindung wird überprüft...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Fehler</CardTitle>
          <CardDescription>
            Es ist ein Fehler beim Laden der DATEV-Verbindung aufgetreten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <FiRefreshCw className="mr-2" />
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FiShield className="text-[#14ad9f]" />
                DATEV-Integration
                {connection.isConnected ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <FiCheck className="mr-1" size={12} />
                    Verbunden
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <FiAlertCircle className="mr-1" size={12} />
                    Nicht verbunden
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Verbindung zu DATEV für automatische Buchhaltung und Steuerberatung
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={loading}>
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {connection.isConnected && connection.organization ? (
            <div className="space-y-4">
              {/* Organization Info */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Verbundene Organisation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {connection.organization.name}
                  </div>
                  <div>
                    <span className="font-medium">Typ:</span>{' '}
                    {connection.organization.type === 'client' ? 'Mandant' : 'Berater'}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    {connection.organization.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                  </div>
                  {connection.organization.taxNumber && (
                    <div>
                      <span className="font-medium">Steuernummer:</span>{' '}
                      {connection.organization.taxNumber}
                    </div>
                  )}
                </div>
              </div>

              {/* Available Features */}
              <div>
                <h4 className="font-medium mb-3">Verfügbare Features</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <FiDatabase className="text-[#14ad9f]" />
                    <span className="text-sm">Buchhaltungsdaten</span>
                    <FiCheck className="text-green-600 ml-auto" size={16} />
                  </div>
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-[#14ad9f]" />
                    <span className="text-sm">Dokumente</span>
                    <FiCheck className="text-green-600 ml-auto" size={16} />
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUsers className="text-[#14ad9f]" />
                    <span className="text-sm">Stammdaten</span>
                    <FiCheck className="text-green-600 ml-auto" size={16} />
                  </div>
                  <div className="flex items-center gap-2">
                    <FiShield className="text-[#14ad9f]" />
                    <span className="text-sm">Kassenbuch</span>
                    <FiCheck className="text-green-600 ml-auto" size={16} />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleDisconnect} variant="outline" className="flex-1">
                  Verbindung trennen
                </Button>
                <Button
                  onClick={() => window.open('https://www.datev.de', '_blank')}
                  variant="outline"
                  className="flex-1"
                >
                  <FiExternalLink className="mr-2" />
                  DATEV öffnen
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Benefits Section */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-3">Vorteile der DATEV-Integration</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-center gap-2">
                    <FiCheck size={16} />
                    Automatische Synchronisation von Rechnungen und Zahlungen
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck size={16} />
                    Nahtlose Zusammenarbeit mit Ihrem Steuerberater
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck size={16} />
                    Rechtssichere Dokumentenarchivierung
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck size={16} />
                    Automatische Umsatzsteuer-Voranmeldung
                  </li>
                </ul>
              </div>

              {/* Connect Button */}
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {connecting ? (
                  <>
                    <FiRefreshCw className="mr-2 animate-spin" />
                    Verbindung wird hergestellt...
                  </>
                ) : (
                  <>
                    <FiExternalLink className="mr-2" />
                    Mit DATEV verbinden
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Sie werden sicher zu DATEV weitergeleitet, um die Verbindung zu autorisieren.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FiShield className="text-gray-400 mt-1" />
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Sicherheit & Datenschutz</p>
              <p>
                Ihre DATEV-Zugangsdaten werden sicher verschlüsselt und nur für die autorisierten
                Integrationen verwendet. Die Verbindung erfolgt über DATEV&apos;s offizielle
                OAuth2-Schnittstelle.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
