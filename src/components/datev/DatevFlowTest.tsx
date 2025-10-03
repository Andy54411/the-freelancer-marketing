'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FiExternalLink,
  FiCheck,
  FiAlertCircle,
  FiRefreshCw,
  FiInfo,
  FiPlay,
  FiSettings,
  FiDatabase,
} from 'react-icons/fi';
import { toast } from 'sonner';

interface DatevFlowTestProps {
  companyId: string;
}

interface TokenInfo {
  exists: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenType?: string;
  scope?: string;
  isExpired: boolean;
  isActive?: boolean;
  expiresAt?: string;
  connectedAt?: string;
}

export function DatevFlowTest({ companyId }: DatevFlowTestProps) {
  const [testing, setTesting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [authUrl, setAuthUrl] = useState<string>('');

  const checkTokens = async () => {
    try {
      setTesting(true);
      const response = await fetch(`/api/datev/debug-tokens?companyId=${companyId}`);
      const data = await response.json();

      if (data.success) {
        setTokenInfo(data.tokens);
        toast.success('Token-Status erfolgreich abgerufen');
      } else {
        setTokenInfo(null);
        toast.error('Keine DATEV-Tokens gefunden');
      }
    } catch (error) {
      toast.error('Fehler beim Überprüfen der Tokens');
    } finally {
      setTesting(false);
    }
  };

  const generateAuthUrl = async () => {
    try {
      const response = await fetch(`/api/datev/debug-oauth-flow?companyId=${companyId}`);
      const data = await response.json();

      if (data.success) {
        setAuthUrl(data.debug.authUrl.fullUrl);
        navigator.clipboard.writeText(data.debug.authUrl.fullUrl);
        toast.success('OAuth-URL in Zwischenablage kopiert');
      }
    } catch (error) {
      toast.error('Fehler beim Generieren der OAuth-URL');
    }
  };

  const startOAuthFlow = async () => {
    try {
      const response = await fetch('/api/datev/auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      const result = await response.json();

      if (result.success) {
        window.location.href = result.authUrl;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        'OAuth-Flow konnte nicht gestartet werden: ' +
          (error instanceof Error ? error.message : 'Unbekannter Fehler')
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Token Status Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiDatabase className="text-[#14ad9f]" />
            DATEV Token-Status
          </CardTitle>
          <CardDescription>
            Überprüfen Sie den aktuellen Status der DATEV-Authentifizierung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={checkTokens} disabled={testing} variant="outline" className="flex-1">
              {testing ? (
                <>
                  <FiRefreshCw className="mr-2 animate-spin" />
                  Überprüfe...
                </>
              ) : (
                <>
                  <FiSettings className="mr-2" />
                  Token-Status prüfen
                </>
              )}
            </Button>
          </div>

          {tokenInfo && (
            <Alert
              className={
                tokenInfo.exists ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }
            >
              {tokenInfo.exists ? (
                <FiCheck className="h-4 w-4 text-green-600" />
              ) : (
                <FiAlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <div className={tokenInfo.exists ? 'text-green-800' : 'text-red-800'}>
                  <div className="font-medium mb-2">
                    {tokenInfo.exists ? 'DATEV-Tokens gefunden!' : 'Keine DATEV-Tokens vorhanden'}
                  </div>
                  {tokenInfo.exists && (
                    <div className="space-y-1 text-sm">
                      <div className="flex gap-4">
                        <Badge variant={tokenInfo.hasAccessToken ? 'default' : 'destructive'}>
                          Access Token: {tokenInfo.hasAccessToken ? 'Vorhanden' : 'Fehlt'}
                        </Badge>
                        <Badge variant={tokenInfo.hasRefreshToken ? 'default' : 'secondary'}>
                          Refresh Token: {tokenInfo.hasRefreshToken ? 'Vorhanden' : 'Fehlt'}
                        </Badge>
                      </div>
                      <div className="flex gap-4">
                        <Badge variant={tokenInfo.isExpired ? 'destructive' : 'default'}>
                          Status: {tokenInfo.isExpired ? 'Abgelaufen' : 'Gültig'}
                        </Badge>
                        {tokenInfo.scope && (
                          <Badge variant="outline">Scope: {tokenInfo.scope}</Badge>
                        )}
                      </div>
                      {tokenInfo.expiresAt && (
                        <div className="text-xs text-gray-600">
                          Läuft ab: {new Date(tokenInfo.expiresAt).toLocaleString('de-DE')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* OAuth Flow Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiPlay className="text-[#14ad9f]" />
            DATEV OAuth-Flow testen
          </CardTitle>
          <CardDescription>Starten Sie den DATEV OAuth-Authentifizierungsflow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <FiInfo className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="font-medium">Ihre DATEV Sandbox-APIs:</div>
              <div className="mt-1 text-sm space-y-1">
                • cashregister:import (2.6.0)
                <br />
                • master-data:master-clients (3)
                <br />
                • accounting:extf-files (2.0)
                <br />
                • accounting:dxso-jobs (2.0)
                <br />• accounting:documents (2.0)
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={startOAuthFlow}
              className="flex-1 bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              <FiExternalLink className="mr-2" />
              OAuth-Flow starten
            </Button>
            <Button onClick={generateAuthUrl} variant="outline">
              <FiSettings className="mr-2" />
              Debug-URL kopieren
            </Button>
          </div>

          {authUrl && (
            <div className="p-3 bg-gray-50 rounded text-xs font-mono break-all">{authUrl}</div>
          )}

          <p className="text-xs text-gray-500 text-center">
            Sie werden zu DATEV Sandbox weitergeleitet. Verwenden Sie Ihre DATEV
            Sandbox-Zugangsdaten.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
