'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Save, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppSettings {
  accessToken: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  enabled: boolean;
  businessAccountId?: string;
}

export default function WhatsAppSettingsPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [settings, setSettings] = useState<WhatsAppSettings>({
    accessToken: '',
    phoneNumberId: '',
    webhookVerifyToken: `taskilo_${uid.substring(0, 8)}`,
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, [uid]);

  const loadSettings = async () => {
    if (!uid) return;

    try {
      const docRef = doc(db, 'companies', uid, 'integrations', 'whatsapp');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as WhatsAppSettings;
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!uid) return;

    // Validierung
    if (!settings.accessToken || !settings.phoneNumberId) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'companies', uid, 'integrations', 'whatsapp');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString(),
      });

      toast.success('WhatsApp-Einstellungen gespeichert!');
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.accessToken || !settings.phoneNumberId) {
      toast.error('Bitte speichere zuerst deine Einstellungen');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          accessToken: settings.accessToken,
          phoneNumberId: settings.phoneNumberId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: 'Verbindung erfolgreich!' });
        toast.success('WhatsApp API funktioniert!');
      } else {
        setTestResult({ success: false, message: data.error || 'Verbindung fehlgeschlagen' });
        toast.error(data.error || 'Verbindung fehlgeschlagen');
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Fehler beim Testen der Verbindung' });
      toast.error('Fehler beim Testen');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Lade Einstellungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-green-600" />
          WhatsApp Business API
        </h1>
        <p className="text-gray-500 mt-2">
          Verbinde deine eigene WhatsApp Business Nummer mit Taskilo
        </p>
      </div>

      {/* Anleitung */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">So richtest du WhatsApp ein</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <div>
              <span className="font-medium">Meta Developer Account erstellen</span>
              <br />
              Gehe zu{' '}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                developers.facebook.com/apps
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <div>
              <span className="font-medium">WhatsApp Business App erstellen</span>
              <br />
              Wähle "Business" → "WhatsApp" als Produkt
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <div>
              <span className="font-medium">Access Token & Phone Number ID kopieren</span>
              <br />
              Unter "WhatsApp" → "API Setup" findest du beide Werte
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <div>
              <span className="font-medium">System User Token erstellen (für Production)</span>
              <br />
              Der temporäre Token läuft nach 24h ab - erstelle einen permanenten Token
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Einstellungen */}
      <Card>
        <CardHeader>
          <CardTitle>API-Konfiguration</CardTitle>
          <CardDescription>
            Deine WhatsApp Business API Credentials (werden verschlüsselt gespeichert)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessToken">
              Access Token <span className="text-red-500">*</span>
            </Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="EAAaa3pV9IPc..."
              value={settings.accessToken}
              onChange={e => setSettings({ ...settings, accessToken: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Dein Meta WhatsApp Business API Access Token
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumberId">
              Phone Number ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phoneNumberId"
              type="text"
              placeholder="747568641782526"
              value={settings.phoneNumberId}
              onChange={e => setSettings({ ...settings, phoneNumberId: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Die ID deiner WhatsApp Business Telefonnummer
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookToken">Webhook Verify Token</Label>
            <Input
              id="webhookToken"
              type="text"
              value={settings.webhookVerifyToken}
              onChange={e => setSettings({ ...settings, webhookVerifyToken: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Verwende diesen Token in der Meta Webhook-Konfiguration
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessAccountId">Business Account ID (optional)</Label>
            <Input
              id="businessAccountId"
              type="text"
              placeholder="123456789..."
              value={settings.businessAccountId || ''}
              onChange={e => setSettings({ ...settings, businessAccountId: e.target.value })}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={settings.enabled}
              onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="enabled" className="cursor-pointer">
              WhatsApp Integration aktivieren
            </Label>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-lg border ${
                testResult.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Speichere...' : 'Einstellungen speichern'}
            </Button>

            <Button
              onClick={handleTest}
              disabled={testing || !settings.accessToken || !settings.phoneNumberId}
              variant="outline"
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {testing ? 'Teste...' : 'Verbindung testen'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Info */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook-Konfiguration</CardTitle>
          <CardDescription>
            Konfiguriere den Webhook in der Meta Developer Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Callback URL</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded border font-mono text-sm">
              https://taskilo.de/api/whatsapp/webhook/{uid}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Verify Token</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded border font-mono text-sm">
              {settings.webhookVerifyToken}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Webhook Fields</Label>
            <div className="mt-1 text-sm text-gray-600">Aktiviere: messages</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
