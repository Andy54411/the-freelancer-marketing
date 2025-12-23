'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Trash2,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface UserSettings {
  displayName: string;
  signature: string;
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    desktop: boolean;
    sound: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
  };
  privacy: {
    readReceipts: boolean;
    showOnlineStatus: boolean;
  };
}

const defaultSettings: UserSettings = {
  displayName: '',
  signature: '',
  language: 'de',
  timezone: 'Europe/Berlin',
  notifications: {
    email: true,
    desktop: true,
    sound: true,
  },
  appearance: {
    theme: 'light',
    compactMode: false,
  },
  privacy: {
    readReceipts: true,
    showOnlineStatus: true,
  },
};

export default function WebmailSettingsPage() {
  const { session, logout } = useWebmailSession();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('account');

  const loadSettings = useCallback(() => {
    if (!session?.email) return;
    
    const storageKey = `webmail_settings_${session.email}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      setSettings(JSON.parse(saved));
    } else {
      setSettings({
        ...defaultSettings,
        displayName: session.email.split('@')[0],
      });
    }
    setIsLoading(false);
  }, [session?.email]);

  // Session wird bereits vom Layout geprüft - hier nur Settings laden
  useEffect(() => {
    if (session?.isAuthenticated) {
      loadSettings();
    }
  }, [session?.isAuthenticated, loadSettings]);

  const saveSettings = () => {
    if (!session?.email) return;
    
    setIsSaving(true);
    const storageKey = `webmail_settings_${session.email}`;
    localStorage.setItem(storageKey, JSON.stringify(settings));
    
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Einstellungen gespeichert');
    }, 500);
  };

  const sections = [
    { id: 'account', name: 'Konto', icon: User },
    { id: 'notifications', name: 'Benachrichtigungen', icon: Bell },
    { id: 'appearance', name: 'Darstellung', icon: Palette },
    { id: 'privacy', name: 'Datenschutz', icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-gray-600" />
          <h1 className="text-lg font-semibold">Einstellungen</h1>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <section.icon className="h-4 w-4" />
              {section.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-8">
          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Konto</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Verwalte deine Kontoinformationen
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div>
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    value={session?.email || ''}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>

                <div>
                  <Label htmlFor="displayName">Anzeigename</Label>
                  <Input
                    id="displayName"
                    value={settings.displayName}
                    onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="signature">E-Mail-Signatur</Label>
                  <textarea
                    id="signature"
                    value={settings.signature}
                    onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
                    className="mt-1 w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Deine E-Mail-Signatur..."
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sprache</Label>
                    <Select
                      value={settings.language}
                      onValueChange={(value) => setSettings({ ...settings, language: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Zeitzone</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Berlin">Berlin (MEZ)</SelectItem>
                        <SelectItem value="Europe/Vienna">Wien (MEZ)</SelectItem>
                        <SelectItem value="Europe/Zurich">Zürich (MEZ)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h3 className="text-lg font-medium text-red-900">Gefahrenzone</h3>
                <p className="text-sm text-red-700 mt-1">
                  Diese Aktionen können nicht rückgängig gemacht werden
                </p>
                <div className="mt-4">
                  <Button variant="destructive" onClick={logout}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Abmelden
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Benachrichtigungen</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Konfiguriere wie du benachrichtigt werden möchtest
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>E-Mail-Benachrichtigungen</Label>
                    <p className="text-sm text-gray-500">
                      Erhalte E-Mails über wichtige Updates
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.email}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, email: checked }
                    })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Desktop-Benachrichtigungen</Label>
                    <p className="text-sm text-gray-500">
                      Zeige Benachrichtigungen im Browser
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.desktop}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, desktop: checked }
                    })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ton bei neuen E-Mails</Label>
                    <p className="text-sm text-gray-500">
                      Spiele einen Ton ab wenn neue E-Mails eintreffen
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sound}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, sound: checked }
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Darstellung</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Passe das Aussehen an deine Vorlieben an
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div>
                  <Label>Theme</Label>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'system'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setSettings({
                          ...settings,
                          appearance: { ...settings.appearance, theme }
                        })}
                        className={`p-4 rounded-lg border-2 text-center transition-colors ${
                          settings.appearance.theme === theme
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-sm font-medium capitalize">
                          {theme === 'light' ? 'Hell' : theme === 'dark' ? 'Dunkel' : 'System'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Kompaktmodus</Label>
                    <p className="text-sm text-gray-500">
                      Zeige mehr Inhalte auf kleinerem Raum
                    </p>
                  </div>
                  <Switch
                    checked={settings.appearance.compactMode}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      appearance: { ...settings.appearance, compactMode: checked }
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Datenschutz</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Kontrolliere deine Datenschutzeinstellungen
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lesebestätigungen</Label>
                    <p className="text-sm text-gray-500">
                      Sende Lesebestätigungen an Absender
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.readReceipts}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      privacy: { ...settings.privacy, readReceipts: checked }
                    })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Online-Status anzeigen</Label>
                    <p className="text-sm text-gray-500">
                      Andere können sehen wenn du online bist
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.showOnlineStatus}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      privacy: { ...settings.privacy, showOnlineStatus: checked }
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <Button onClick={saveSettings} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Speichern...' : 'Einstellungen speichern'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
