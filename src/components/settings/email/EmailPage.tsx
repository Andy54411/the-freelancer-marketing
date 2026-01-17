'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { EmailProviderGrid } from './EmailProviderGrid';
import { EmailConfig } from './types';
import { useAuth } from '@/contexts/AuthContext';

interface WebmailConfig {
  id: string;
  email: string;
  provider: 'taskilo-webmail';
  status: 'connected' | 'error' | 'disconnected' | 'requires_password';
  connectedAt: string;
  subscriptionPlan?: 'free' | 'domain' | 'pro' | 'business';
  displayName?: string;
}

interface EmailPageProps {
  companyId: string;
}

export function EmailPage({ companyId }: EmailPageProps) {
  const searchParams = useSearchParams();
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [webmailConfig, setWebmailConfig] = useState<WebmailConfig | null>(null);
  const [useMasterUser, setUseMasterUser] = useState(false);
  const [isConnectingWebmail, setIsConnectingWebmail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Die tatsächliche User-ID für die E-Mail-Konfiguration
  // Mitarbeiter haben ihre eigene Config, Inhaber nutzen die Company-ID
  const effectiveUserId = user?.uid || companyId;

  // URL Parameter für Fehlermeldungen
  const watchError = searchParams?.get('watchError');

  // Lade E-Mail-Konfiguration, Einstellungen und Vorlagen
  useEffect(() => {
    // Warte bis Auth geladen ist UND user/firebaseUser verfügbar
    if (authLoading) {
      return;
    }

    // Wenn kein User oder kein firebaseUser, beende das Laden
    if (!user || !firebaseUser) {
      setIsLoading(false);
      return;
    }

    // Verhindere doppeltes Laden
    if (dataLoaded) {
      return;
    }

    const loadData = async () => {
      try {
        // Token holen - wichtig: firebaseUser hat getIdToken(), nicht user
        const token = await firebaseUser.getIdToken();
        const authHeaders = {
          'Authorization': `Bearer ${token}`
        };

        // E-Mail-Konfiguration laden - mit Auth-Token für authentifizierten Zugriff
        const configResponse = await fetch(
          `/api/company/${companyId}/email-config?userId=${effectiveUserId}`,
          { headers: authHeaders }
        );
        
        if (configResponse.ok) {
          const config = await configResponse.json();
          // Nur setzen wenn hasConfig true ist oder status vorhanden
          if (config.hasConfig || config.status === 'connected') {
            setEmailConfig(config);
          }
        }

        // Webmail-Konfiguration laden
        const webmailResponse = await fetch(
          `/api/company/${companyId}/webmail-connect`,
          { headers: authHeaders }
        );
        if (webmailResponse.ok) {
          const webmailData = await webmailResponse.json();
          if (webmailData.connected && webmailData.config) {
            setWebmailConfig(webmailData.config);
          }
          // Prüfe ob Master User Zugriff möglich ist (für @taskilo.de E-Mails)
          if (webmailData.useMasterUser) {
            setUseMasterUser(true);
          }
        }
        
        setDataLoaded(true);
      } catch (error) {
        // Bei Fehler loggen (nur für Debugging)
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('[EmailPage] Fehler beim Laden:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [companyId, effectiveUserId, authLoading, user, firebaseUser, dataLoaded]);

  // Gmail verbinden - mit userId für benutzer-spezifische Verbindung
  const handleGmailConnect = () => {
    window.location.href = `/api/gmail/connect?uid=${companyId}&userId=${effectiveUserId}`;
  };

  // Gmail trennen - mit Loading-State um Mehrfach-Klicks zu verhindern
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  const handleGmailDisconnect = async () => {
    if (isDisconnecting) return; // Verhindere Mehrfach-Klicks
    
    setIsDisconnecting(true);
    try {
      const token = await firebaseUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/company/${companyId}/gmail-disconnect?userId=${effectiveUserId}`, {
        method: 'POST',
        headers
      });
      
      if (response.ok) {
        setEmailConfig(null);
      }
    } catch {
      // Fehler beim Trennen werden ignoriert
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Webmail verbinden
  const handleWebmailConnect = useCallback(async (email: string, password: string) => {
    setIsConnectingWebmail(true);
    try {
      const token = await firebaseUser?.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/company/${companyId}/webmail-connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Verbindung fehlgeschlagen');
      }
      
      if (data.config) {
        setWebmailConfig(data.config);
        
        // Starte initialen E-Mail-Sync im Hintergrund
        fetch(`/api/company/${companyId}/webmail-sync`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ email, password })
        }).catch(() => {
          // Sync-Fehler ignorieren
        });
        
        // Weiterleitung zum Posteingang
        window.location.href = `/dashboard/company/${companyId}/emails`;
      }
    } catch (error) {
      // Fehler weiterwerfen damit der Dialog ihn anzeigen kann
      throw error;
    } finally {
      setIsConnectingWebmail(false);
    }
  }, [companyId, firebaseUser]);

  // Webmail trennen
  const handleWebmailDisconnect = useCallback(async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/company/${companyId}/webmail-connect`, {
        method: 'DELETE',
        headers
      });
      
      if (response.ok) {
        setWebmailConfig(null);
      }
    } catch {
      // Fehler beim Trennen werden ignoriert
    }
  }, [companyId, firebaseUser]);

  if (isLoading || authLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">E-Mail-Management</h1>
        <p className="text-gray-600 mt-2">
          Verwalten Sie Ihre E-Mail-Verbindungen, Vorlagen und Einstellungen
        </p>
      </div>

      {/* Fehlermeldungen anzeigen */}
      {watchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Gmail Watch Setup Fehler:</strong><br />
            {decodeURIComponent(watchError)}
            <br /><br />
            <em>Das bedeutet: Die Pub/Sub Berechtigungen wurden gerade konfiguriert. Versuche bitte, Gmail erneut zu verbinden.</em>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>E-Mail-Anbieter</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailProviderGrid
            companyId={companyId}
            emailConfigs={emailConfig ? [emailConfig] : []}
            webmailConfig={webmailConfig ?? undefined}
            useMasterUser={useMasterUser}
            onDeleteConfig={handleGmailDisconnect}
            onConnectGmail={handleGmailConnect}
            onConnectWebmail={handleWebmailConnect}
            onDisconnectWebmail={handleWebmailDisconnect}
            isConnectingWebmail={isConnectingWebmail}
          />
        </CardContent>
      </Card>
    </div>
  );
}