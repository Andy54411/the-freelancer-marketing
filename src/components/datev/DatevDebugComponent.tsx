'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FiRefreshCw,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiSettings,
  FiShield,
  FiClock,
  FiTrash2,
} from 'react-icons/fi';
import { DatevTokenManager } from '@/lib/datev-token-manager';
import { toast } from 'sonner';

interface DatevDebugInfo {
  config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    baseUrl: string;
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
  endpoints: Record<string, string>;
  environment: string;
  timestamp: string;
}

interface DatevConfigValidation {
  valid: boolean;
  issues: string[];
  recommendations: string[];
}

interface DatevTokenInfo {
  hasToken: boolean;
  tokenData?: {
    expires_at: number;
    scope: string;
    user_id: string;
    organization_id?: string;
  };
  isExpired?: boolean;
  expiresIn?: number;
}

export function DatevDebugComponent() {
  const [debugInfo, setDebugInfo] = useState<DatevDebugInfo | null>(null);
  const [validation, setValidation] = useState<DatevConfigValidation | null>(null);
  const [tokenInfo, setTokenInfo] = useState<DatevTokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadDebugInfo();
    loadTokenInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      setLoading(true);

      const [statusResponse, validationResponse] = await Promise.all([
        fetch('/api/datev/debug?action=status'),
        fetch('/api/datev/debug?action=validate-config'),
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setDebugInfo(statusData);
      }

      if (validationResponse.ok) {
        const validationData = await validationResponse.json();
        setValidation(validationData);
      }
    } catch (error) {
      console.error('Failed to load debug info:', error);
      toast.error('Fehler beim Laden der Debug-Informationen');
    } finally {
      setLoading(false);
    }
  };

  const loadTokenInfo = () => {
    try {
      const token = DatevTokenManager.getUserToken();
      const userData = DatevTokenManager.getUserData();

      if (token) {
        const now = Date.now();
        const isExpired = now >= token.expires_at;
        const expiresIn = Math.max(0, token.expires_at - now);

        setTokenInfo({
          hasToken: true,
          tokenData: {
            expires_at: token.expires_at,
            scope: token.scope,
            user_id: token.user_id,
            organization_id: token.organization_id,
          },
          isExpired,
          expiresIn,
        });
      } else {
        setTokenInfo({
          hasToken: false,
        });
      }
    } catch (error) {
      console.error('Failed to load token info:', error);
      setTokenInfo({
        hasToken: false,
      });
    }
  };

  const testToken = async () => {
    try {
      setTesting(true);
      const token = DatevTokenManager.getUserToken();

      if (!token) {
        toast.error('Kein Token vorhanden');
        return;
      }

      const response = await fetch('/api/datev/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test-token',
          token: token.access_token,
        }),
      });

      const result = await response.json();

      if (result.valid) {
        toast.success('Token ist gültig');
      } else {
        toast.error(`Token ungültig: ${result.error}`);
      }
    } catch (error) {
      console.error('Token test failed:', error);
      toast.error('Fehler beim Testen des Tokens');
    } finally {
      setTesting(false);
    }
  };

  const clearToken = async () => {
    try {
      DatevTokenManager.clearUserToken();
      loadTokenInfo();
      toast.success('Token gelöscht');
    } catch (error) {
      console.error('Failed to clear token:', error);
      toast.error('Fehler beim Löschen des Tokens');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('de-DE');
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">DATEV Debug Console</h2>
          <p className="text-gray-600">Diagnose und behebe DATEV-Integrationsprobleme</p>
        </div>
        <Button onClick={loadDebugInfo} disabled={loading} variant="outline">
          <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiSettings className="text-[#14ad9f]" />
            Konfigurationsstatus
            {validation?.valid ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <FiCheck className="mr-1" size={12} />
                Gültig
              </Badge>
            ) : (
              <Badge variant="destructive">
                <FiX className="mr-1" size={12} />
                Probleme
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {debugInfo && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Client ID:</span> {debugInfo.config.clientId}
              </div>
              <div>
                <span className="font-medium">Client Secret:</span> {debugInfo.config.clientSecret}
              </div>
              <div>
                <span className="font-medium">Redirect URI:</span> {debugInfo.config.redirectUri}
              </div>
              <div>
                <span className="font-medium">Environment:</span> {debugInfo.environment}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Scopes:</span> {debugInfo.config.scopes.join(', ')}
              </div>
            </div>
          )}

          {validation && validation.issues.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">Konfigurationsprobleme:</h4>
              <ul className="space-y-1 text-sm text-red-700">
                {validation.issues.map((issue, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <FiAlertTriangle size={16} />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiShield className="text-[#14ad9f]" />
            Token-Status
            {tokenInfo?.hasToken ? (
              tokenInfo.isExpired ? (
                <Badge variant="destructive">
                  <FiClock className="mr-1" size={12} />
                  Abgelaufen
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <FiCheck className="mr-1" size={12} />
                  Aktiv
                </Badge>
              )
            ) : (
              <Badge variant="secondary">Nicht vorhanden</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokenInfo?.hasToken && tokenInfo.tokenData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">User ID:</span> {tokenInfo.tokenData.user_id}
                </div>
                <div>
                  <span className="font-medium">Organization ID:</span>{' '}
                  {tokenInfo.tokenData.organization_id || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Ablaufzeit:</span>{' '}
                  {formatTime(tokenInfo.tokenData.expires_at)}
                </div>
                <div>
                  <span className="font-medium">Verbleibt:</span>{' '}
                  {tokenInfo.isExpired ? (
                    <span className="text-red-600">Abgelaufen</span>
                  ) : (
                    <span className="text-green-600">{formatDuration(tokenInfo.expiresIn!)}</span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Scopes:</span> {tokenInfo.tokenData.scope}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={testToken} disabled={testing} variant="outline" className="flex-1">
                  {testing ? (
                    <>
                      <FiRefreshCw className="mr-2 animate-spin" />
                      Teste Token...
                    </>
                  ) : (
                    <>
                      <FiCheck className="mr-2" />
                      Token testen
                    </>
                  )}
                </Button>
                <Button onClick={clearToken} variant="destructive" className="flex-1">
                  <FiTrash2 className="mr-2" />
                  Token löschen
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <FiShield className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">Kein DATEV-Token vorhanden</p>
              <p className="text-sm text-gray-500 mt-1">
                Benutzer muss sich zuerst mit DATEV authentifizieren
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Endpoints */}
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>API-Endpunkte</CardTitle>
            <CardDescription>Verfügbare DATEV-API-Endpunkte für diese Integration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm font-mono">
              {Object.entries(debugInfo.endpoints).map(([name, endpoint]) => (
                <div
                  key={name}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <span className="font-medium">{name}:</span>
                  <span className="text-gray-600">{endpoint}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {validation && validation.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Empfehlungen</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {validation.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <FiCheck className="text-[#14ad9f] mt-0.5 flex-shrink-0" size={16} />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
