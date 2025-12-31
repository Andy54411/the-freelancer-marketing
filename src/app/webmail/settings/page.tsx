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
  Save,
  Phone,
  CheckCircle2,
  Loader2
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
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { cn } from '@/lib/utils';
import { MailHeader } from '@/components/webmail/MailHeader';
import { getAppUrl } from '@/lib/webmail-urls';

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
  const _router = useRouter();
  const { isDark } = useWebmailTheme();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('account');

  // Phone Verification State
  const [phoneStatus, setPhoneStatus] = useState<{
    hasProfile: boolean;
    phone: string | null;
    phoneVerified: boolean;
    isLoading: boolean;
  }>({ hasProfile: false, phone: null, phoneVerified: false, isLoading: true });
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
      loadPhoneStatus();
    }
  }, [session?.isAuthenticated, loadSettings]);

  // Phone Status laden
  const loadPhoneStatus = useCallback(async () => {
    if (!session?.email) return;
    
    try {
      const response = await fetch(
        `https://mail.taskilo.de/api/phone-verification/status?email=${encodeURIComponent(session.email)}`
      );
      const data = await response.json();
      
      setPhoneStatus({
        hasProfile: data.hasProfile || false,
        phone: data.phone || null,
        phoneVerified: data.phoneVerified || false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading phone status:', error);
      setPhoneStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [session?.email]);

  // SMS-Code senden
  const handleSendCode = async () => {
    if (!session?.email || !phoneInput || !passwordInput) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await fetch('https://mail.taskilo.de/api/phone-verification/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          password: passwordInput,
          phone: phoneInput,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationSessionId(data.sessionId);
        toast.success('SMS-Code wurde gesendet');
      } else {
        toast.error(data.error || 'Fehler beim Senden des Codes');
      }
    } catch {
      toast.error('Netzwerkfehler');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Code verifizieren
  const handleVerifyCode = async () => {
    if (!verificationSessionId || !verificationCode) {
      toast.error('Bitte Code eingeben');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('https://mail.taskilo.de/api/phone-verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: verificationSessionId,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Telefonnummer erfolgreich verifiziert');
        setPhoneStatus({
          hasProfile: true,
          phone: data.phone,
          phoneVerified: true,
          isLoading: false,
        });
        setVerificationSessionId(null);
        setVerificationCode('');
        setPhoneInput('');
        setPasswordInput('');
      } else {
        toast.error(data.error || 'Ungültiger Code');
      }
    } catch {
      toast.error('Netzwerkfehler');
    } finally {
      setIsVerifying(false);
    }
  };

  // Code erneut senden
  const handleResendCode = async () => {
    if (!verificationSessionId) return;

    setIsSendingCode(true);
    try {
      const response = await fetch('https://mail.taskilo.de/api/phone-verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: verificationSessionId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('SMS-Code wurde erneut gesendet');
      } else {
        toast.error(data.error || 'Fehler beim erneuten Senden');
      }
    } catch {
      toast.error('Netzwerkfehler');
    } finally {
      setIsSendingCode(false);
    }
  };

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
    { id: 'phone', name: 'Telefon', icon: Phone },
    { id: 'notifications', name: 'Benachrichtigungen', icon: Bell },
    { id: 'appearance', name: 'Darstellung', icon: Palette },
    { id: 'privacy', name: 'Datenschutz', icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className={cn("h-screen flex items-center justify-center", isDark ? "bg-[#202124]" : "bg-white")}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className={cn("h-screen flex flex-col", isDark ? "bg-[#202124]" : "bg-white")}>
      {/* MailHeader */}
      <MailHeader
        userEmail={session?.email || ''}
        onLogout={() => window.location.href = getAppUrl('/webmail')}
      />

      <div className={cn("flex-1 flex overflow-hidden", isDark ? "bg-[#202124]" : "bg-white")}>
      {/* Sidebar */}
      <div className={cn(
        "w-64 border-r p-4",
        isDark ? "bg-[#202124] border-[#5f6368]" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center gap-2 mb-6">
          <Settings className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
          <h1 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>Einstellungen</h1>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                activeSection === section.id
                  ? isDark ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-50 text-teal-700'
                  : isDark ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
              )}
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
                <h2 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>Konto</h2>
                <p className={cn("text-sm mt-1", isDark ? "text-white" : "text-gray-500")}>
                  Verwalte deine Kontoinformationen
                </p>
              </div>

              <div className={cn(
                "rounded-xl border p-6 space-y-6",
                isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
              )}>
                <div>
                  <Label htmlFor="email" className={cn(isDark && "text-white")}>E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    value={session?.email || ''}
                    disabled
                    className={cn("mt-1", isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "bg-gray-50")}
                  />
                </div>

                <div>
                  <Label htmlFor="displayName" className={cn(isDark && "text-white")}>Anzeigename</Label>
                  <Input
                    id="displayName"
                    value={settings.displayName}
                    onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                    className={cn("mt-1", isDark && "bg-[#3c4043] border-[#5f6368] text-white")}
                  />
                </div>

                <div>
                  <Label htmlFor="signature" className={cn(isDark && "text-white")}>E-Mail-Signatur</Label>
                  <textarea
                    id="signature"
                    value={settings.signature}
                    onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
                    className={cn(
                      "mt-1 w-full min-h-[100px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500",
                      isDark 
                        ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-gray-500" 
                        : "border-gray-300"
                    )}
                    placeholder="Deine E-Mail-Signatur..."
                  />
                </div>

                <Separator className={cn(isDark && "bg-[#5f6368]")} />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={cn(isDark && "text-white")}>Sprache</Label>
                    <Select
                      value={settings.language}
                      onValueChange={(value) => setSettings({ ...settings, language: value })}
                    >
                      <SelectTrigger className={cn("mt-1", isDark && "bg-[#3c4043] border-[#5f6368] text-white")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={cn(isDark && "bg-[#2d2e30] border-[#5f6368]")}>
                        <SelectItem value="de" className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>Deutsch</SelectItem>
                        <SelectItem value="en" className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className={cn(isDark && "text-white")}>Zeitzone</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                    >
                      <SelectTrigger className={cn("mt-1", isDark && "bg-[#3c4043] border-[#5f6368] text-white")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={cn(isDark && "bg-[#2d2e30] border-[#5f6368]")}>
                        <SelectItem value="Europe/Berlin" className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>Berlin (MEZ)</SelectItem>
                        <SelectItem value="Europe/Vienna" className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>Wien (MEZ)</SelectItem>
                        <SelectItem value="Europe/Zurich" className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>Zürich (MEZ)</SelectItem>
                        <SelectItem value="UTC" className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className={cn(
                "rounded-xl border p-6",
                isDark ? "bg-red-900/20 border-red-900/50" : "bg-red-50 border-red-200"
              )}>
                <h3 className={cn("text-lg font-medium", isDark ? "text-red-400" : "text-red-900")}>Gefahrenzone</h3>
                <p className={cn("text-sm mt-1", isDark ? "text-red-300" : "text-red-700")}>
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

          {/* Phone Section */}
          {activeSection === 'phone' && (
            <div className="space-y-6">
              <div>
                <h2 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>Telefonnummer</h2>
                <p className={cn("text-sm mt-1", isDark ? "text-white" : "text-gray-500")}>
                  Verifiziere deine Telefonnummer für zusätzliche Sicherheit
                </p>
              </div>

              {phoneStatus.isLoading ? (
                <div className={cn(
                  "rounded-xl border p-6 flex items-center justify-center",
                  isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
                )}>
                  <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                </div>
              ) : phoneStatus.phoneVerified ? (
                // Bereits verifiziert
                <div className={cn(
                  "rounded-xl border p-6",
                  isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-teal-100">
                      <CheckCircle2 className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                        Telefonnummer verifiziert
                      </p>
                      <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                        {phoneStatus.phone}
                      </p>
                    </div>
                  </div>
                </div>
              ) : verificationSessionId ? (
                // Code eingeben
                <div className={cn(
                  "rounded-xl border p-6 space-y-4",
                  isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
                )}>
                  <div className="text-center">
                    <Phone className={cn("h-10 w-10 mx-auto mb-2", isDark ? "text-teal-400" : "text-teal-600")} />
                    <p className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                      SMS-Code eingeben
                    </p>
                    <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-500")}>
                      Wir haben einen 6-stelligen Code an deine Telefonnummer gesendet
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="verificationCode" className={cn(isDark && "text-white")}>
                      Verifizierungscode
                    </Label>
                    <Input
                      id="verificationCode"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className={cn(
                        "mt-1 text-center text-2xl tracking-widest",
                        isDark && "bg-[#3c4043] border-[#5f6368] text-white"
                      )}
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleResendCode}
                      disabled={isSendingCode}
                      className="flex-1"
                    >
                      {isSendingCode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Erneut senden
                    </Button>
                    <Button
                      onClick={handleVerifyCode}
                      disabled={isVerifying || verificationCode.length !== 6}
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                    >
                      {isVerifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Verifizieren
                    </Button>
                  </div>

                  <button
                    onClick={() => {
                      setVerificationSessionId(null);
                      setVerificationCode('');
                    }}
                    className={cn("text-sm underline", isDark ? "text-gray-400" : "text-gray-500")}
                  >
                    Andere Nummer verwenden
                  </button>
                </div>
              ) : (
                // Telefonnummer eingeben
                <div className={cn(
                  "rounded-xl border p-6 space-y-4",
                  isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
                )}>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                    Verifiziere deine Telefonnummer um dein Konto abzusichern und wichtige 
                    Benachrichtigungen per SMS zu erhalten.
                  </p>

                  <div>
                    <Label htmlFor="phoneInput" className={cn(isDark && "text-white")}>
                      Telefonnummer
                    </Label>
                    <Input
                      id="phoneInput"
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="0170 1234567"
                      className={cn("mt-1", isDark && "bg-[#3c4043] border-[#5f6368] text-white")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="passwordInput" className={cn(isDark && "text-white")}>
                      E-Mail-Passwort
                    </Label>
                    <Input
                      id="passwordInput"
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Dein Webmail-Passwort"
                      className={cn("mt-1", isDark && "bg-[#3c4043] border-[#5f6368] text-white")}
                    />
                    <p className={cn("text-xs mt-1", isDark ? "text-gray-500" : "text-gray-400")}>
                      Zur Bestätigung deiner Identität
                    </p>
                  </div>

                  <Button
                    onClick={handleSendCode}
                    disabled={isSendingCode || !phoneInput || !passwordInput}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    {isSendingCode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    SMS-Code senden
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>Benachrichtigungen</h2>
                <p className={cn("text-sm mt-1", isDark ? "text-white" : "text-gray-500")}>
                  Konfiguriere wie du benachrichtigt werden möchtest
                </p>
              </div>

              <div className={cn(
                "rounded-xl border p-6 space-y-6",
                isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={cn(isDark && "text-white")}>E-Mail-Benachrichtigungen</Label>
                    <p className={cn("text-sm", isDark ? "text-white" : "text-gray-500")}>
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

                <Separator className={cn(isDark && "bg-[#5f6368]")} />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={cn(isDark && "text-white")}>Desktop-Benachrichtigungen</Label>
                    <p className={cn("text-sm", isDark ? "text-white" : "text-gray-500")}>
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

                <Separator className={cn(isDark && "bg-[#5f6368]")} />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={cn(isDark && "text-white")}>Ton bei neuen E-Mails</Label>
                    <p className={cn("text-sm", isDark ? "text-white" : "text-gray-500")}>
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
                <h2 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>Darstellung</h2>
                <p className={cn("text-sm mt-1", isDark ? "text-white" : "text-gray-500")}>
                  Passe das Aussehen an deine Vorlieben an
                </p>
              </div>

              <div className={cn(
                "rounded-xl border p-6 space-y-6",
                isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
              )}>
                <div>
                  <Label className={cn(isDark && "text-white")}>Theme</Label>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'system'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setSettings({
                          ...settings,
                          appearance: { ...settings.appearance, theme }
                        })}
                        className={cn(
                          'p-4 rounded-lg border-2 text-center transition-colors',
                          settings.appearance.theme === theme
                            ? (isDark ? 'border-teal-500 bg-teal-900/30' : 'border-teal-500 bg-teal-50')
                            : (isDark ? 'border-[#5f6368] hover:border-gray-500' : 'border-gray-200 hover:border-gray-300')
                        )}
                      >
                        <span className={cn(
                          "text-sm font-medium capitalize",
                          isDark ? "text-white" : "text-gray-700"
                        )}>
                          {theme === 'light' ? 'Hell' : theme === 'dark' ? 'Dunkel' : 'System'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className={cn(isDark && "bg-[#5f6368]")} />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={cn(isDark && "text-white")}>Kompaktmodus</Label>
                    <p className={cn("text-sm", isDark ? "text-white" : "text-gray-500")}>
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
                <h2 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>Datenschutz</h2>
                <p className={cn("text-sm mt-1", isDark ? "text-white" : "text-gray-500")}>
                  Kontrolliere deine Datenschutzeinstellungen
                </p>
              </div>

              <div className={cn(
                "rounded-xl border p-6 space-y-6",
                isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={cn(isDark && "text-white")}>Lesebestätigungen</Label>
                    <p className={cn("text-sm", isDark ? "text-white" : "text-gray-500")}>
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

                <Separator className={cn(isDark && "bg-[#5f6368]")} />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={cn(isDark && "text-white")}>Online-Status anzeigen</Label>
                    <p className={cn("text-sm", isDark ? "text-white" : "text-gray-500")}>
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
    </div>
  );
}
