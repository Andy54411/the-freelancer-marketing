'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Send, Inbox, Settings, Check, X, Loader2, Info, Eye, EyeOff } from 'lucide-react';
import {
  getEmailConfig,
  saveEmailConfig,
  encryptPassword,
  decryptPassword,
  markAsTested,
  EMAIL_PROVIDERS,
  type EmailConfig,
} from '@/services/emailIntegrationService';

export default function EmailIntegrationPage() {
  const { authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showImapPassword, setShowImapPassword] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState('custom');
  const [config, setConfig] = useState<Partial<EmailConfig>>({
    smtp: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      fromName: '',
      fromEmail: '',
    },
    imap: {
      enabled: false,
      host: '',
      port: 993,
      secure: true,
      username: '',
      password: '',
    },
    settings: {
      enabled: false,
      syncInterval: 15,
      autoSync: false,
    },
  });

  const loadConfig = async () => {
    if (!authUser?.uid) {
      setLoading(false);
      return;
    }

    console.log('[EmailIntegration] Loading config for user:', authUser.uid);
    setLoading(true);
    try {
      const existingConfig = await getEmailConfig(authUser.uid);

      if (existingConfig) {
        try {
          // Decrypt passwords
          setConfig({
            ...existingConfig,
            smtp: {
              ...existingConfig.smtp,
              password: decryptPassword(existingConfig.smtp.password),
            },
            imap: {
              ...existingConfig.imap,
              password: existingConfig.imap.password
                ? decryptPassword(existingConfig.imap.password)
                : '',
            },
          });
        } catch (decryptError) {
          console.error('Error decrypting passwords:', decryptError);
          toast.error('Fehler beim Entschlüsseln der Passwörter');
          // Keep config but with empty passwords
          setConfig({
            ...existingConfig,
            smtp: { ...existingConfig.smtp, password: '' },
            imap: { ...existingConfig.imap, password: '' },
          });
        }
      } else {
        // No config exists yet - this is normal for new users
        console.log('No email config found - using default values');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Fehler beim Laden der Konfiguration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid]);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);

    if (provider !== 'custom') {
      const providerConfig = EMAIL_PROVIDERS[provider];
      setConfig(prev => ({
        ...prev,
        smtp: {
          ...prev.smtp!,
          host: providerConfig.smtp.host,
          port: providerConfig.smtp.port,
          secure: providerConfig.smtp.secure,
        },
        imap: {
          ...prev.imap!,
          host: providerConfig.imap.host,
          port: providerConfig.imap.port,
          secure: providerConfig.imap.secure,
        },
      }));
    }
  };

  const handleTestConnection = async (type: 'smtp' | 'imap' | 'both') => {
    if (!authUser?.uid) return;

    setTesting(true);
    try {
      const response = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp: config.smtp,
          imap: config.imap,
          testType: type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await markAsTested(authUser.uid, true);
      } else {
        toast.error(data.message);
        await markAsTested(authUser.uid, false);
      }
    } catch (error: any) {
      toast.error(`Verbindungstest fehlgeschlagen: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!authUser?.uid) return;

    // Validation
    if (!config.smtp?.host || !config.smtp?.username || !config.smtp?.password) {
      toast.error('Bitte füllen Sie alle SMTP-Pflichtfelder aus');
      return;
    }

    setSaving(true);
    try {
      // Encrypt passwords
      const configToSave: any = {
        ...config,
        companyId: authUser.uid,
        smtp: {
          ...config.smtp,
          password: encryptPassword(config.smtp.password),
        },
        imap: {
          ...config.imap!,
          password: encryptPassword(config.imap!.password || ''),
        },
      };

      const success = await saveEmailConfig(configToSave);

      if (success) {
        toast.success('Konfiguration erfolgreich gespeichert');
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler beim Speichern der Konfiguration');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!authUser?.uid) return;

    toast.info('E-Mail-Synchronisation gestartet...');

    try {
      const response = await fetch('/api/email/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: authUser.uid,
          limit: 50,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      toast.error(`Synchronisation fehlgeschlagen: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-Mail Integration</h1>
          <p className="text-gray-500 mt-1">Verbinden Sie Ihr E-Mail-Konto mit Taskilo</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/docs/EMAIL_PROVIDER_SETUP_GUIDE.md', '_blank')}
          >
            <Info className="h-4 w-4 mr-2" />
            Setup-Anleitung
          </Button>
          <Mail className="h-8 w-8 text-teal-500" />
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">E-Mail-Integration aktivieren</Label>
              <p className="text-sm text-gray-500 mt-1">
                Ermöglicht das Senden und Empfangen von E-Mails über Ihr eigenes Konto
              </p>
            </div>
            <Switch
              checked={config.settings?.enabled || false}
              onCheckedChange={checked =>
                setConfig(prev => ({
                  ...prev,
                  settings: { ...prev.settings!, enabled: checked },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Card for new users */}
      {!config.settings?.enabled && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-3">
                <p className="font-medium text-blue-900">Sie haben noch keinen E-Mail-Provider?</p>
                <p className="text-sm text-blue-800">
                  Kein Problem! Wir empfehlen <strong>Zoho Mail</strong> für nur €1/Monat pro
                  Postfach.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() => window.open('https://www.zoho.com/mail/', '_blank')}
                  >
                    Zoho Mail ansehen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() => window.open('/docs/EMAIL_PROVIDER_SETUP_GUIDE.md', '_blank')}
                  >
                    Alle Provider vergleichen
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>E-Mail-Anbieter</CardTitle>
          <CardDescription>
            Wählen Sie Ihren E-Mail-Anbieter oder konfigurieren Sie benutzerdefinierte Einstellungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProvider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue placeholder="Anbieter wählen" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMAIL_PROVIDERS).map(([key, provider]) => (
                <SelectItem key={key} value={key}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="smtp" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            SMTP (Senden)
          </TabsTrigger>
          <TabsTrigger value="imap" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            IMAP (Empfangen)
          </TabsTrigger>
        </TabsList>

        {/* SMTP Configuration */}
        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>SMTP-Konfiguration</CardTitle>
              <CardDescription>Einstellungen für ausgehende E-Mails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SMTP Server</Label>
                  <Input
                    placeholder="smtp.example.com"
                    value={config.smtp?.host || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        smtp: { ...prev.smtp!, host: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    placeholder="587"
                    value={config.smtp?.port || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        smtp: { ...prev.smtp!, port: parseInt(e.target.value) },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={config.smtp?.secure || false}
                  onCheckedChange={checked =>
                    setConfig(prev => ({
                      ...prev,
                      smtp: { ...prev.smtp!, secure: checked },
                    }))
                  }
                />
                <Label>SSL/TLS verwenden (Port 465)</Label>
              </div>

              <div className="space-y-2">
                <Label>Benutzername / E-Mail</Label>
                <Input
                  type="email"
                  placeholder="ihr@email.de"
                  value={config.smtp?.username || ''}
                  onChange={e =>
                    setConfig(prev => ({
                      ...prev,
                      smtp: { ...prev.smtp!, username: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Passwort</Label>
                <div className="relative">
                  <Input
                    type={showSmtpPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={config.smtp?.password || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        smtp: { ...prev.smtp!, password: e.target.value },
                      }))
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showSmtpPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Absender-Name</Label>
                  <Input
                    placeholder="Ihre Firma"
                    value={config.smtp?.fromName || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        smtp: { ...prev.smtp!, fromName: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Absender-E-Mail</Label>
                  <Input
                    type="email"
                    placeholder="info@firma.de"
                    value={config.smtp?.fromEmail || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        smtp: { ...prev.smtp!, fromEmail: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={() => handleTestConnection('smtp')}
                disabled={testing}
                variant="outline"
                className="w-full"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Teste Verbindung...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    SMTP-Verbindung testen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMAP Configuration */}
        <TabsContent value="imap">
          <Card>
            <CardHeader>
              <CardTitle>IMAP-Konfiguration</CardTitle>
              <CardDescription>Einstellungen für eingehende E-Mails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Switch
                  checked={config.imap?.enabled || false}
                  onCheckedChange={checked =>
                    setConfig(prev => ({
                      ...prev,
                      imap: { ...prev.imap!, enabled: checked },
                    }))
                  }
                />
                <Label>IMAP aktivieren (E-Mails empfangen)</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IMAP Server</Label>
                  <Input
                    placeholder="imap.example.com"
                    value={config.imap?.host || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        imap: { ...prev.imap!, host: e.target.value },
                      }))
                    }
                    disabled={!config.imap?.enabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    placeholder="993"
                    value={config.imap?.port || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        imap: { ...prev.imap!, port: parseInt(e.target.value) },
                      }))
                    }
                    disabled={!config.imap?.enabled}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={config.imap?.secure || false}
                  onCheckedChange={checked =>
                    setConfig(prev => ({
                      ...prev,
                      imap: { ...prev.imap!, secure: checked },
                    }))
                  }
                  disabled={!config.imap?.enabled}
                />
                <Label>SSL/TLS verwenden (empfohlen)</Label>
              </div>

              <div className="space-y-2">
                <Label>Benutzername / E-Mail</Label>
                <Input
                  type="email"
                  placeholder="ihr@email.de"
                  value={config.imap?.username || ''}
                  onChange={e =>
                    setConfig(prev => ({
                      ...prev,
                      imap: { ...prev.imap!, username: e.target.value },
                    }))
                  }
                  disabled={!config.imap?.enabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Passwort</Label>
                <div className="relative">
                  <Input
                    type={showImapPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={config.imap?.password || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        imap: { ...prev.imap!, password: e.target.value },
                      }))
                    }
                    disabled={!config.imap?.enabled}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowImapPassword(!showImapPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    disabled={!config.imap?.enabled}
                  >
                    {showImapPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Synchronisations-Intervall (Minuten)</Label>
                <Input
                  type="number"
                  placeholder="15"
                  value={config.settings?.syncInterval || 15}
                  onChange={e =>
                    setConfig(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings!,
                        syncInterval: parseInt(e.target.value),
                      },
                    }))
                  }
                  disabled={!config.imap?.enabled}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={config.settings?.autoSync || false}
                  onCheckedChange={checked =>
                    setConfig(prev => ({
                      ...prev,
                      settings: { ...prev.settings!, autoSync: checked },
                    }))
                  }
                  disabled={!config.imap?.enabled}
                />
                <Label>Automatische Synchronisation</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleTestConnection('imap')}
                  disabled={testing || !config.imap?.enabled}
                  variant="outline"
                  className="flex-1"
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Teste...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      IMAP testen
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSync}
                  disabled={!config.imap?.enabled}
                  variant="outline"
                  className="flex-1"
                >
                  <Inbox className="mr-2 h-4 w-4" />
                  Jetzt synchronisieren
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900">Wichtige Hinweise:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>
                  Für Gmail: Aktivieren Sie &quot;App-Passwörter&quot; in Ihren
                  Google-Kontoeinstellungen
                </li>
                <li>
                  Für Outlook: Verwenden Sie die Zwei-Faktor-Authentifizierung und erstellen Sie ein
                  App-Passwort
                </li>
                <li>Passwörter werden verschlüsselt gespeichert</li>
                <li>Testen Sie die Verbindung vor dem Speichern</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={loadConfig} disabled={loading}>
          Zurücksetzen
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-teal-500 hover:bg-teal-600">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Speichert...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Konfiguration speichern
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
