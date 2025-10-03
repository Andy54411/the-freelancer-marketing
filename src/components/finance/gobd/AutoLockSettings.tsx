'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  Mail, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { GoBDSettings } from '@/types/gobdTypes';
import { GoBDService } from '@/services/gobdService';
import { toast } from 'sonner';

interface AutoLockSettingsProps {
  companyId: string;
  onSettingsChange?: (settings: GoBDSettings) => void;
}

export function AutoLockSettings({ companyId, onSettingsChange }: AutoLockSettingsProps) {
  const [settings, setSettings] = useState<GoBDSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [companyId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const gobdSettings = await GoBDService.getSettings(companyId);
      setSettings(gobdSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Einstellungen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof GoBDSettings, value: any) => {
    if (!settings) return;

    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);

    try {
      setSaving(true);
      await GoBDService.updateSettings(updatedSettings);
      onSettingsChange?.(updatedSettings);
    } catch (error) {
      console.error('Failed to update setting:', error);
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const updateNotificationSetting = async (key: keyof GoBDSettings['notificationSettings'], value: boolean) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      notificationSettings: {
        ...settings.notificationSettings,
        [key]: value
      }
    };
    
    setSettings(updatedSettings);

    try {
      setSaving(true);
      await GoBDService.updateSettings(updatedSettings);
      onSettingsChange?.(updatedSettings);
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#14ad9f]" />
            Automatische Festschreibung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* GoBD Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>GoBD-Konformität:</strong> Die automatische Festschreibung gewährleistet die 
          Einhaltung der Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern.
        </AlertDescription>
      </Alert>

      {/* Haupteinstellungen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#14ad9f]" />
            Automatische Festschreibung
            {settings.autoLockOnSend && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                Aktiv
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-Lock bei Versand */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Bei E-Mail-Versand festschreiben
              </Label>
              <p className="text-sm text-gray-600">
                Dokumente werden automatisch beim Versenden per E-Mail festgeschrieben
              </p>
            </div>
            <Switch
              checked={settings.autoLockOnSend}
              onCheckedChange={(checked) => updateSetting('autoLockOnSend', checked)}
              disabled={saving}
            />
          </div>

          {/* Auto-Lock bei DATEV-Export */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Bei DATEV-Export festschreiben
              </Label>
              <p className="text-sm text-gray-600">
                Dokumente werden beim Export zum Steuerberater automatisch festgeschrieben
              </p>
            </div>
            <Switch
              checked={settings.autoLockOnExport}
              onCheckedChange={(checked) => updateSetting('autoLockOnExport', checked)}
              disabled={saving}
            />
          </div>

          {/* Storno nach Festschreibung */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Storno nach Festschreibung erlauben
              </Label>
              <p className="text-sm text-gray-600">
                Ermöglicht das Erstellen von Stornorechnungen für festgeschriebene Dokumente
              </p>
            </div>
            <Switch
              checked={settings.allowStornoAfterLock}
              onCheckedChange={(checked) => updateSetting('allowStornoAfterLock', checked)}
              disabled={saving}
            />
          </div>

          {/* Freigabe für Entsperrung */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Freigabe für Entsperrung erforderlich
              </Label>
              <p className="text-sm text-gray-600">
                Administratorfreigabe vor manueller Entsperrung von Dokumenten
              </p>
            </div>
            <Switch
              checked={settings.requireApprovalForUnlock}
              onCheckedChange={(checked) => updateSetting('requireApprovalForUnlock', checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Benachrichtigungseinstellungen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#14ad9f]" />
            Benachrichtigungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Erinnerung vor Festschreibungs-Deadline
              </Label>
              <p className="text-sm text-gray-600">
                E-Mail-Erinnerung 5 Tage vor Ablauf der 30-Tage-Frist
              </p>
            </div>
            <Switch
              checked={settings.notificationSettings.lockDeadlineReminder}
              onCheckedChange={(checked) => updateNotificationSetting('lockDeadlineReminder', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Bestätigung bei Festschreibung
              </Label>
              <p className="text-sm text-gray-600">
                Benachrichtigung wenn Dokumente festgeschrieben wurden
              </p>
            </div>
            <Switch
              checked={settings.notificationSettings.lockConfirmation}
              onCheckedChange={(checked) => updateNotificationSetting('lockConfirmation', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Storno-Benachrichtigungen
              </Label>
              <p className="text-sm text-gray-600">
                Information bei Erstellung von Stornorechnungen
              </p>
            </div>
            <Switch
              checked={settings.notificationSettings.stornoNotification}
              onCheckedChange={(checked) => updateNotificationSetting('stornoNotification', checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
            GoBD-Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {settings.autoLockOnSend ? '✓' : '✗'}
              </div>
              <p className="text-sm font-medium">Auto-Lock Versand</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {settings.autoLockOnExport ? '✓' : '✗'}
              </div>
              <p className="text-sm font-medium">Auto-Lock Export</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {settings.allowStornoAfterLock ? '✓' : '✗'}
              </div>
              <p className="text-sm font-medium">Storno-Funktion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance-Hinweis */}
      {!settings.autoLockOnSend && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Empfehlung:</strong> Aktivieren Sie die automatische Festschreibung bei 
            E-Mail-Versand, um GoBD-Konformität sicherzustellen.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}