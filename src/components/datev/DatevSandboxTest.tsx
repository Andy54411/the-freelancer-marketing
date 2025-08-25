'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FiExternalLink,
  FiCheck,
  FiAlertCircle,
  FiRefreshCw,
  FiShield,
  FiDatabase,
  FiUsers,
  FiFileText,
  FiInfo,
  FiSettings,
  FiZap,
} from 'react-icons/fi';
import { toast } from 'sonner';

interface DatevDebugInfo {
  success: boolean;
  error?: string;
  config?: {
    clientId: string;
    hasClientSecret: boolean;
    redirectUri: string;
    baseUrl: string;
    authUrl: string;
    tokenUrl: string;
    isSandbox: boolean;
  };
  tests?: {
    oidcDiscovery: {
      success: boolean;
      status: number;
      error?: string;
    };
    endpointValidation: {
      allMatch: boolean;
      details?: string[];
    };
    credentials: {
      configured: boolean;
      validSandboxId: boolean;
      issues?: string[];
    };
  };
}

interface DatevOAuthResponse {
  success: boolean;
  authUrl?: string;
  error?: string;
  debug?: {
    authUrl: {
      fullUrl: string;
      baseUrl: string;
      params: Record<string, string>;
    };
  };
}

interface DatevSandboxTestProps {
  companyId: string;
}

export function DatevSandboxTest({ companyId }: DatevSandboxTestProps) {
  const [debugInfo, setDebugInfo] = useState<DatevDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const runConnectionTest = async () => {
    try {
      setTestingConnection(true);
      const response = await fetch('/api/datev/test-sandbox-connection');
      const data = await response.json();
      setDebugInfo(data);

      if (data.success) {
        toast.success('DATEV Sandbox-Konfiguration erfolgreich überprüft');
      } else {
        toast.error('DATEV Sandbox-Test fehlgeschlagen');
      }
    } catch (error) {

      toast.error('Verbindungstest fehlgeschlagen');
      setDebugInfo({ success: false });
    } finally {
      setTestingConnection(false);
    }
  };

  const startOAuthFlow = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/datev/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate auth URL');
      }

      // Vollständige Seitenweiterleitung
      window.location.href = result.authUrl;
    } catch (error) {

      toast.error(
        'Fehler beim Starten des DATEV OAuth-Flows: ' +
          (error instanceof Error ? error.message : 'Unbekannter Fehler')
      );
      setLoading(false);
    }
  };

  const getDebugOAuthUrl = async () => {
    try {
      const response = await fetch(`/api/datev/debug-oauth-flow?companyId=${companyId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.debug?.authUrl?.fullUrl) {

        // Moderne Clipboard API mit Fallback
        try {
          await navigator.clipboard.writeText(data.debug.authUrl.fullUrl);
          toast.success('OAuth URL in die Zwischenablage kopiert');
        } catch (clipboardError) {
          // Fallback für ältere Browser oder unsichere Kontexte
          const textArea = document.createElement('textarea');
          textArea.value = data.debug.authUrl.fullUrl;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();

          try {
            document.execCommand('copy');
            toast.success('OAuth URL in die Zwischenablage kopiert (Fallback)');
          } catch (fallbackError) {

            toast.info('OAuth URL wurde in der Konsole ausgegeben');
          }

          document.body.removeChild(textArea);
        }
      } else {
        throw new Error('Ungültige API-Response: Fehlende OAuth URL');
      }
    } catch (error) {

      toast.error('Fehler beim Generieren der Debug-URL: ' +
        (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    }
  };

  return (
    <div className="space-y-6">
      {/* DATEV Sandbox Test Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiSettings className="text-[#14ad9f]" />
            DATEV Sandbox-Konfiguration testen
          </CardTitle>
          <CardDescription>
            Überprüfen Sie die DATEV Sandbox-Verbindung und -Konfiguration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runConnectionTest}
            disabled={testingConnection}
            variant="outline"
            className="w-full"
          >
            {testingConnection ? (
              <>
                <FiRefreshCw className="mr-2 animate-spin" />
                Teste Verbindung...
              </>
            ) : (
              <>
                <FiZap className="mr-2" />
                Sandbox-Verbindung testen
              </>
            )}
          </Button>

          {debugInfo && (
            <div className="space-y-3">
              {debugInfo.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <FiCheck className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>DATEV Sandbox-Konfiguration ist korrekt!</strong>
                    <div className="mt-2 space-y-1 text-sm">
                      {debugInfo.config && (
                        <>
                          <div>• Client ID: {debugInfo.config.clientId}</div>
                          <div>
                            • Sandbox-Modus:{' '}
                            {debugInfo.config.isSandbox ? '✅ Aktiv' : '❌ Inaktiv'}
                          </div>
                          <div>
                            • Credentials:{' '}
                            {debugInfo.config.hasClientSecret ? '✅ Konfiguriert' : '❌ Fehlt'}
                          </div>
                          <div>• Auth URL: {debugInfo.config.authUrl}</div>
                        </>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <FiAlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>DATEV Sandbox-Konfiguration fehlgeschlagen</strong>
                    <div className="mt-2 text-sm">
                      Überprüfen Sie Ihre DATEV-Credentials in den Vercel-Umgebungsvariablen.
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {debugInfo.tests && (
                <div className="text-sm space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">Test-Ergebnisse:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className={`flex items-center gap-2 ${debugInfo.tests.oidcDiscovery.success ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {debugInfo.tests.oidcDiscovery.success ? (
                        <FiCheck size={14} />
                      ) : (
                        <FiAlertCircle size={14} />
                      )}
                      OIDC Discovery
                    </div>
                    <div
                      className={`flex items-center gap-2 ${debugInfo.tests.endpointValidation.allMatch ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {debugInfo.tests.endpointValidation.allMatch ? (
                        <FiCheck size={14} />
                      ) : (
                        <FiAlertCircle size={14} />
                      )}
                      Endpoint-Validierung
                    </div>
                    <div
                      className={`flex items-center gap-2 ${debugInfo.tests.credentials.configured ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {debugInfo.tests.credentials.configured ? (
                        <FiCheck size={14} />
                      ) : (
                        <FiAlertCircle size={14} />
                      )}
                      Credentials
                    </div>
                    <div
                      className={`flex items-center gap-2 ${debugInfo.tests.credentials.validSandboxId ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {debugInfo.tests.credentials.validSandboxId ? (
                        <FiCheck size={14} />
                      ) : (
                        <FiAlertCircle size={14} />
                      )}
                      API-Zugriff
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OAuth Flow starten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiExternalLink className="text-[#14ad9f]" />
            DATEV Sandbox OAuth-Flow
          </CardTitle>
          <CardDescription>Starten Sie den DATEV OAuth-Authentifizierungsflow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <FiInfo className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Wichtiger Hinweis:</strong> Sie benötigen gültige DATEV Sandbox-Zugangsdaten.
              <div className="mt-2 text-sm space-y-1">
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[120px]">Consultant Number:</span>
                  <code className="bg-white px-2 py-0.5 rounded text-xs font-mono">455148</code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[120px]">Client Numbers:</span>
                  <code className="bg-white px-2 py-0.5 rounded text-xs font-mono">1-6 (Client 1 hat volle Berechtungen)</code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[120px]">Requirement:</span>
                  <span className="text-xs">Aktives DATEV Sandbox-Konto erforderlich</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={startOAuthFlow}
              disabled={loading}
              className="flex-1 bg-[#14ad9f] hover:bg-[#129488] text-white focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2"
              aria-describedby="oauth-flow-description"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Verbindung wird hergestellt...
                </>
              ) : (
                <>
                  <FiExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  Mit DATEV Sandbox verbinden
                </>
              )}
            </Button>

            <Button
              onClick={getDebugOAuthUrl}
              variant="outline"
              className="flex-shrink-0 border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2"
              aria-label="Debug OAuth URL in Zwischenablage kopieren"
            >
              <FiSettings className="mr-2 h-4 w-4" aria-hidden="true" />
              Debug URL kopieren
            </Button>
          </div>

          <p
            id="oauth-flow-description"
            className="text-xs text-gray-500 text-center"
          >
            Sie werden sicher zu DATEV Sandbox weitergeleitet, um die Verbindung zu autorisieren.
          </p>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiAlertCircle className="text-orange-500" />
            Fehlerbehebung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium text-gray-700">Häufige Probleme:</div>
              <ul className="mt-1 space-y-1 text-gray-600 list-disc list-inside">
                <li>Ungültige DATEV Sandbox-Zugangsdaten</li>
                <li>DATEV Sandbox-Konto nicht korrekt eingerichtet</li>
                <li>Browser blockiert Third-Party-Cookies</li>
                <li>DATEV Sandbox-Service temporär nicht verfügbar</li>
              </ul>
            </div>

            <div>
              <div className="font-medium text-gray-700">Lösungsansätze:</div>
              <ul className="mt-1 space-y-1 text-gray-600 list-disc list-inside">
                <li>Überprüfen Sie Ihr DATEV Sandbox-Konto im Developer Portal</li>
                <li>Versuchen Sie es in einem Inkognito-/Privaten Browser-Fenster</li>
                <li>Löschen Sie Browser-Cookies und -Cache</li>
                <li>Prüfen Sie den Status des DATEV Sandbox-Services</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
