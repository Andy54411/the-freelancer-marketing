'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Settings, FileText, History, AlertCircle } from 'lucide-react';
import { GmailConnectionCard } from './GmailConnectionCard';
import { EmailProviderGrid } from './EmailProviderGrid';
import { EmailTemplates } from './EmailTemplates';
import { EmailSettingsCard } from './EmailSettingsCard';
import { EmailConfig, EmailSettings, EmailTemplate } from './types';
import { useAuth } from '@/contexts/AuthContext';

interface WebmailConfig {
  id: string;
  email: string;
  provider: 'taskilo-webmail';
  status: 'connected' | 'error' | 'disconnected';
  connectedAt: string;
  subscriptionPlan?: 'free' | 'domain' | 'pro' | 'business';
  displayName?: string;
}

interface EmailPageProps {
  companyId: string;
}

export function EmailPage({ companyId }: EmailPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [webmailConfig, setWebmailConfig] = useState<WebmailConfig | null>(null);
  const [isConnectingWebmail, setIsConnectingWebmail] = useState(false);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    defaultFrom: '',
    signature: '',
    autoReply: false,
    autoReplyMessage: '',
    trackOpens: false,
    trackClicks: false
  });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Die tatsaechliche User-ID fuer die E-Mail-Konfiguration
  // Mitarbeiter haben ihre eigene Config, Inhaber nutzen die Company-ID
  const effectiveUserId = user?.uid || companyId;

  // URL Parameter fuer Fehlermeldungen
  const watchError = searchParams?.get('watchError');

  // Lade E-Mail-Konfiguration, Einstellungen und Vorlagen
  useEffect(() => {
    const loadData = async () => {
      try {
        // E-Mail-Konfiguration laden - mit userId fuer benutzer-spezifische Config
        const configResponse = await fetch(`/api/company/${companyId}/email-config?userId=${effectiveUserId}`);
        if (configResponse.ok) {
          const config = await configResponse.json();
          setEmailConfig(config);
        }

        // Webmail-Konfiguration laden
        const webmailResponse = await fetch(`/api/company/${companyId}/webmail-connect`);
        if (webmailResponse.ok) {
          const webmailData = await webmailResponse.json();
          if (webmailData.connected && webmailData.config) {
            setWebmailConfig(webmailData.config);
          }
        }

        // E-Mail-Einstellungen laden
        const settingsResponse = await fetch(`/api/company/${companyId}/email-settings?userId=${effectiveUserId}`);
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          setEmailSettings(settings);
        }

        // E-Mail-Vorlagen laden (bleiben auf Company-Ebene)
        const templatesResponse = await fetch(`/api/company/${companyId}/email-templates`);
        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          setTemplates(templates);
        }
      } catch (error) {
        // Fehler beim Laden werden ignoriert
      } finally {
        setIsLoading(false);
      }
    };

    if (effectiveUserId) {
      loadData();
    }
  }, [companyId, effectiveUserId]);

  // Gmail verbinden - mit userId fuer benutzer-spezifische Verbindung
  const handleGmailConnect = () => {
    window.location.href = `/api/gmail/connect?uid=${companyId}&userId=${effectiveUserId}`;
  };

  // Gmail trennen
  const handleGmailDisconnect = async () => {
    try {
      const response = await fetch(`/api/company/${companyId}/gmail-disconnect?userId=${effectiveUserId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setEmailConfig(null);
      }
    } catch (error) {
      // Fehler beim Trennen werden ignoriert
    }
  };

  // Webmail verbinden
  const handleWebmailConnect = useCallback(async (email: string, password: string) => {
    setIsConnectingWebmail(true);
    try {
      const response = await fetch(`/api/company/${companyId}/webmail-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
          headers: { 'Content-Type': 'application/json' },
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
  }, [companyId]);

  // Webmail trennen
  const handleWebmailDisconnect = useCallback(async () => {
    try {
      const response = await fetch(`/api/company/${companyId}/webmail-connect`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setWebmailConfig(null);
      }
    } catch (error) {
      // Fehler beim Trennen werden ignoriert
    }
  }, [companyId]);

  // Einstellungen speichern
  const handleSaveSettings = async (settings: EmailSettings) => {
    try {
      const response = await fetch(`/api/company/${companyId}/email-settings?userId=${effectiveUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setEmailSettings(settings);
      }
    } catch (error) {
      throw error;
    }
  };

  // Template speichern
  const handleSaveTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/company/${companyId}/email-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      });
      
      if (response.ok) {
        const savedTemplate = await response.json();
        setTemplates(prev => {
          const existing = prev.find(t => t.id === savedTemplate.id);
          if (existing) {
            return prev.map(t => t.id === savedTemplate.id ? savedTemplate : t);
          }
          return [...prev, savedTemplate];
        });
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Vorlage:', error);
      throw error;
    }
  };

  // Template löschen
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/company/${companyId}/email-templates/${templateId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Vorlage:', error);
      throw error;
    }
  };

  if (isLoading) {
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

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connections" className="flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            Verbindungen
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Vorlagen
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Einstellungen
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <History className="h-4 w-4 mr-2" />
            Verlauf
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>E-Mail-Anbieter</CardTitle>
              </CardHeader>
              <CardContent>
                <EmailProviderGrid
                  companyId={companyId}
                  emailConfigs={emailConfig ? [emailConfig] : []}
                  webmailConfig={webmailConfig ?? undefined}
                  onDeleteConfig={handleGmailDisconnect}
                  onConnectGmail={handleGmailConnect}
                  onConnectWebmail={handleWebmailConnect}
                  onDisconnectWebmail={handleWebmailDisconnect}
                  isConnectingWebmail={isConnectingWebmail}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <EmailTemplates
            companyId={companyId}
            templates={templates}
            onCreateTemplate={async (template) => {
              const newTemplate = {
                ...template,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await handleSaveTemplate(newTemplate);
            }}
            onUpdateTemplate={async (templateId, updates) => {
              const existingTemplate = templates.find(t => t.id === templateId);
              if (existingTemplate) {
                const updatedTemplate = {
                  ...existingTemplate,
                  ...updates,
                  updatedAt: new Date().toISOString()
                };
                await handleSaveTemplate(updatedTemplate);
              }
            }}
            onDeleteTemplate={handleDeleteTemplate}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <EmailSettingsCard
            companyId={companyId}
            settings={emailSettings}
            onSaveSettings={handleSaveSettings}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>E-Mail-Verlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>E-Mail-Verlauf wird hier angezeigt</p>
                <p className="text-sm">Bald verfügbar...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}