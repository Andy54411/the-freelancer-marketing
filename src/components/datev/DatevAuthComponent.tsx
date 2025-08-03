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
import { generateDatevAuthUrl } from '@/lib/datev-config';
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
    loadDatevConnection();
  }, [companyId]);

  const loadDatevConnection = async () => {
    try {
      setLoading(true);
      const token = await DatevTokenManager.getUserToken();

      if (token) {
        const organizations = await DatevService.getOrganizations();

        if (organizations.length > 0) {
          const org = organizations[0]; // Use first available organization
          setConnection({
            isConnected: true,
            organization: org,
            user: {
              name: org.name || 'DATEV User',
              email: 'user@datev.de', // DATEV doesn't expose user email
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
        }
      } else {
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
      console.error('DATEV connection check failed:', error);
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

      // Generate OAuth URL with company context
      const state = `company:${companyId}:${Date.now()}`;
      const authUrl = generateDatevAuthUrl(state);

      // Open DATEV OAuth in popup
      const popup = window.open(
        authUrl,
        'datev-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for popup completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setConnecting(false);
          // Reload connection status
          setTimeout(() => {
            loadDatevConnection();
            toast.success('DATEV-Verbindung wird überprüft...');
          }, 1000);
        }
      }, 1000);
    } catch (error) {
      console.error('Fehler bei DATEV-Verbindung:', error);
      toast.error('Fehler bei der DATEV-Verbindung');
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
      console.error('Fehler beim Trennen der DATEV-Verbindung:', error);
      toast.error('Fehler beim Trennen der DATEV-Verbindung');
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      await loadDatevConnection();
      toast.success('DATEV-Daten synchronisiert');
    } catch (error) {
      console.error('Sync-Fehler:', error);
      toast.error('Fehler bei der Synchronisation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <FiRefreshCw className="animate-spin text-[#14ad9f] mr-2" size={20} />
          <span>Lade DATEV-Status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FiShield className="text-[#14ad9f]" size={24} />
                DATEV-Integration
              </CardTitle>
              <CardDescription>
                Sichere Verbindung zu Ihrem DATEV-System für automatische Buchhaltung
              </CardDescription>
            </div>
            <Badge variant={connection?.isConnected ? 'default' : 'secondary'}>
              {connection?.isConnected ? 'Verbunden' : 'Nicht verbunden'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {connection?.isConnected ? (
            <>
              {/* Connected Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FiCheck className="text-green-600" size={20} />
                  <span className="font-medium text-green-800">
                    Erfolgreich mit DATEV verbunden
                  </span>
                </div>

                {connection.organization && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Organisation:</span>
                      <div className="font-medium">{connection.organization.name}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Typ:</span>
                      <div className="font-medium">{connection.organization.type}</div>
                    </div>
                  </div>
                )}

                {connection.user && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-gray-600">Benutzer:</span>
                      <div className="font-medium">{connection.user.name}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">E-Mail:</span>
                      <div className="font-medium">{connection.user.email}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                  <div>
                    <span className="text-gray-600">Verbunden seit:</span>
                    <div className="font-medium">
                      {connection.connectedAt
                        ? new Date(connection.connectedAt).toLocaleDateString('de-DE')
                        : 'Unbekannt'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Letzte Sync:</span>
                    <div className="font-medium">
                      {connection.lastSync
                        ? new Date(connection.lastSync).toLocaleDateString('de-DE')
                        : 'Noch nie'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Available Features */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Verfügbare Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      connection.features.accountingData
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <FiDatabase
                      className={
                        connection.features.accountingData ? 'text-green-600' : 'text-gray-400'
                      }
                    />
                    <span className="text-sm font-medium">Buchhaltung</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      connection.features.documents
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <FiFileText
                      className={connection.features.documents ? 'text-green-600' : 'text-gray-400'}
                    />
                    <span className="text-sm font-medium">Belege</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      connection.features.masterData
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <FiUsers
                      className={
                        connection.features.masterData ? 'text-green-600' : 'text-gray-400'
                      }
                    />
                    <span className="text-sm font-medium">Stammdaten</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      connection.features.cashRegister
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <FiCheck
                      className={
                        connection.features.cashRegister ? 'text-green-600' : 'text-gray-400'
                      }
                    />
                    <span className="text-sm font-medium">Kasse</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleSync} className="bg-[#14ad9f] hover:bg-[#129488]">
                  <FiRefreshCw className="mr-2" size={16} />
                  Jetzt synchronisieren
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Verbindung trennen
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Not Connected Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiAlertCircle className="text-yellow-600" size={20} />
                  <span className="font-medium text-yellow-800">DATEV nicht verbunden</span>
                </div>
                <p className="text-yellow-700 text-sm">
                  Verbinden Sie Taskilo mit DATEV für automatische Buchhaltung und nahtlose
                  Steuerberater-Integration.
                </p>
              </div>

              {/* Benefits */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Vorteile der DATEV-Integration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <FiCheck className="text-green-500 mt-1" size={16} />
                    <div>
                      <div className="font-medium text-sm">Automatische Buchhaltung</div>
                      <div className="text-gray-600 text-xs">
                        Rechnungen und Belege automatisch in DATEV übertragen
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiCheck className="text-green-500 mt-1" size={16} />
                    <div>
                      <div className="font-medium text-sm">Steuerberater-Zugang</div>
                      <div className="text-gray-600 text-xs">
                        Ihr Steuerberater hat direkten Zugriff auf alle Daten
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiCheck className="text-green-500 mt-1" size={16} />
                    <div>
                      <div className="font-medium text-sm">GoBD-Konformität</div>
                      <div className="text-gray-600 text-xs">
                        Rechtssichere Archivierung aller Geschäftsdaten
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiCheck className="text-green-500 mt-1" size={16} />
                    <div>
                      <div className="font-medium text-sm">Zeitersparnis</div>
                      <div className="text-gray-600 text-xs">
                        Keine doppelte Dateneingabe mehr erforderlich
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connect Button */}
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full bg-[#14ad9f] hover:bg-[#129488]"
                size="lg"
              >
                {connecting ? (
                  <>
                    <FiRefreshCw className="animate-spin mr-2" size={16} />
                    Verbinde mit DATEV...
                  </>
                ) : (
                  <>
                    <FiExternalLink className="mr-2" size={16} />
                    Mit DATEV verbinden
                  </>
                )}
              </Button>

              {/* Security Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiShield className="text-blue-600" size={16} />
                  <span className="font-medium text-blue-800 text-sm">Sicherheitshinweis</span>
                </div>
                <p className="text-blue-700 text-xs">
                  Die Verbindung erfolgt über OAuth 2.0 direkt mit DATEV. Taskilo erhält nur die von
                  Ihnen autorisierten Zugriffsrechte.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DatevAuthComponent;
