'use client';

import { useState, useEffect } from 'react';
import { X, Bell, MessageSquare, Palette, Accessibility, Lock, Shield, Video, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChatSettings {
  desktopNotifications: boolean;
  reactionNotifications: boolean;
  notificationSound: string;
  emailNotifications: boolean;
  autoPlayGifs: boolean;
  autoPlayVideos: boolean;
  showLinkPreviews: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  compactMode: boolean;
  showAvatars: boolean;
  fontSize: 'small' | 'medium' | 'large';
  reduceMotion: boolean;
  highContrast: boolean;
  screenReaderOptimized: boolean;
  allowDirectMessages: 'everyone' | 'contacts' | 'nobody';
  allowSpaceInvites: 'everyone' | 'contacts' | 'nobody';
  showOnlineStatus: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
  sharePresence: boolean;
  incomingCallNotifications: boolean;
  autoJoinAudio: boolean;
  autoJoinVideo: boolean;
  dndEnabled: boolean;
  dndSchedule: {
    weekdayStart: string;
    weekdayEnd: string;
    weekendStart: string;
    weekendEnd: string;
    weekdayDays: string[];
    weekendDays: string[];
  };
  dndTimezoneSync: boolean;
}

const defaultSettings: ChatSettings = {
  desktopNotifications: true,
  reactionNotifications: true,
  notificationSound: 'default',
  emailNotifications: true,
  autoPlayGifs: true,
  autoPlayVideos: false,
  showLinkPreviews: true,
  imageQuality: 'high',
  compactMode: false,
  showAvatars: true,
  fontSize: 'medium',
  reduceMotion: false,
  highContrast: false,
  screenReaderOptimized: false,
  allowDirectMessages: 'everyone',
  allowSpaceInvites: 'everyone',
  showOnlineStatus: true,
  readReceipts: true,
  typingIndicators: true,
  sharePresence: true,
  incomingCallNotifications: true,
  autoJoinAudio: true,
  autoJoinVideo: false,
  dndEnabled: false,
  dndSchedule: {
    weekdayStart: '19:00',
    weekdayEnd: '07:00',
    weekendStart: '00:00',
    weekendEnd: '00:00',
    weekdayDays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr'],
    weekendDays: ['Sa', 'So'],
  },
  dndTimezoneSync: true,
};

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

type SettingsSection = 'notifications' | 'messages' | 'appearance' | 'accessibility' | 'access' | 'privacy';

function SettingsCard({ 
  title, 
  children, 
  isDark,
  icon: Icon 
}: { 
  title: string; 
  children: React.ReactNode; 
  isDark: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      isDark ? "bg-[#2d2e31] border-white/10" : "bg-white border-gray-200"
    )}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />}
        <h3 className={cn(
          "font-medium",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function SettingsRow({ 
  label, 
  description, 
  children, 
  isDark 
}: { 
  label: string; 
  description?: string; 
  children: React.ReactNode; 
  isDark: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex-1 pr-4">
        <p className={cn("text-sm", isDark ? "text-gray-200" : "text-gray-700")}>
          {label}
        </p>
        {description && (
          <p className={cn("text-xs mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export function ChatSettingsModal({ isOpen, onClose, userEmail }: ChatSettingsModalProps) {
  const { isDark } = useWebmailTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('notifications');
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [browserNotificationsBlocked, setBrowserNotificationsBlocked] = useState(false);

  useEffect(() => {
    if (!isOpen || !userEmail) return;
    
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/webmail/chat/settings?email=${encodeURIComponent(userEmail)}`);
        const data = await response.json();
        
        if (data.success && data.settings) {
          setSettings({ ...defaultSettings, ...data.settings });
        }
      } catch {
        // Fallback zu Default-Einstellungen
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
    
    if ('Notification' in window) {
      setBrowserNotificationsBlocked(Notification.permission === 'denied');
    }
  }, [isOpen, userEmail]);

  const updateSetting = async <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    if (!userEmail) return;
    
    try {
      setIsSaving(true);
      await fetch('/api/webmail/chat/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, settings: newSettings }),
      });
    } catch {
      // Fehler stillschweigend ignorieren
    } finally {
      setIsSaving(false);
    }
  };

  const requestBrowserNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotificationsBlocked(permission === 'denied');
      if (permission === 'granted') {
        updateSetting('desktopNotifications', true);
      }
    }
  };

  const sections = [
    { id: 'notifications' as const, label: 'Benachrichtigungen', icon: Bell },
    { id: 'messages' as const, label: 'Nachrichten und Medien', icon: MessageSquare },
    { id: 'appearance' as const, label: 'Darstellung', icon: Palette },
    { id: 'accessibility' as const, label: 'Bedienungshilfen', icon: Accessibility },
    { id: 'access' as const, label: 'Zugriffsbeschränkungen', icon: Lock },
    { id: 'privacy' as const, label: 'Datenschutz', icon: Shield },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      <div className={cn(
        "relative w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex",
        isDark ? "bg-[#202124]" : "bg-white"
      )}>
        <div className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 border-b z-10",
          isDark ? "bg-[#202124] border-white/10" : "bg-white border-gray-200"
        )}>
          <h2 className={cn(
            "text-xl font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>
            Chateinstellungen
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-full transition-colors",
              isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
            )}
          >
            <X className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
        </div>

        <div className="flex w-full pt-16 h-[85vh]">
          <div className={cn(
            "w-64 border-r overflow-y-auto shrink-0",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            <nav className="p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm transition-colors text-left",
                      activeSection === section.id
                        ? "bg-[#e8f5f4] text-[#14ad9f]"
                        : isDark 
                          ? "text-gray-300 hover:bg-white/5" 
                          : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]" />
              </div>
            ) : (
              <>
                {activeSection === 'notifications' && (
                  <div className="space-y-6">
                    <SettingsCard title="Desktop-Benachrichtigungen" isDark={isDark}>
                      <SettingsRow label="Chatbenachrichtigungen erlauben" isDark={isDark}>
                        <Switch
                          checked={settings.desktopNotifications}
                          onCheckedChange={(checked) => updateSetting('desktopNotifications', checked)}
                          disabled={browserNotificationsBlocked}
                        />
                      </SettingsRow>
                      
                      {browserNotificationsBlocked && (
                        <div className={cn(
                          "mt-4 p-4 rounded-lg flex items-start gap-3",
                          isDark ? "bg-yellow-500/10" : "bg-yellow-50"
                        )}>
                          <Bell className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                          <div>
                            <p className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
                              Sie erhalten keine Benachrichtigungen, da Desktop-Benachrichtigungen in Ihrem Browser deaktiviert sind.
                            </p>
                            <button
                              onClick={requestBrowserNotifications}
                              className="mt-2 text-sm text-[#14ad9f] hover:underline"
                            >
                              Benachrichtigungen im Browser aktivieren
                            </button>
                          </div>
                        </div>
                      )}

                      <SettingsRow
                        label="Benachrichtigungen zu Reaktionen"
                        description="Benachrichtigungen zu Reaktionen auf Ihre Chatnachrichten aktivieren"
                        isDark={isDark}
                      >
                        <Switch
                          checked={settings.reactionNotifications}
                          onCheckedChange={(checked) => updateSetting('reactionNotifications', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>

                    <SettingsCard title="Benachrichtigungstöne" isDark={isDark}>
                      <Select
                        value={settings.notificationSound}
                        onValueChange={(value) => updateSetting('notificationSound', value)}
                      >
                        <SelectTrigger className={cn(
                          "w-full",
                          isDark ? "bg-[#3c4043] border-white/10 text-white" : ""
                        )}>
                          <SelectValue placeholder="Ton auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Standard</SelectItem>
                          <SelectItem value="chime">Glockenspiel</SelectItem>
                          <SelectItem value="ping">Ping</SelectItem>
                          <SelectItem value="pop">Pop</SelectItem>
                          <SelectItem value="none">Aus</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingsCard>

                    <SettingsCard title="E-Mail-Benachrichtigungen" isDark={isDark}>
                      <SettingsRow
                        label="E-Mail-Benachrichtigungen für ungelesene Direktnachrichten oder @Erwähnungen erhalten"
                        isDark={isDark}
                      >
                        <Switch
                          checked={settings.emailNotifications}
                          onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>

                    <SettingsCard title="Einstellungen für Meet" isDark={isDark} icon={Video}>
                      <SettingsRow label="Benachrichtigungen für eingehende Anrufe" isDark={isDark}>
                        <Switch
                          checked={settings.incomingCallNotifications}
                          onCheckedChange={(checked) => updateSetting('incomingCallNotifications', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>

                    <SettingsCard title="Bitte nicht stören - Zeitpläne" isDark={isDark} icon={Clock}>
                      <SettingsRow label="Bitte nicht stören aktivieren" isDark={isDark}>
                        <Switch
                          checked={settings.dndEnabled}
                          onCheckedChange={(checked) => updateSetting('dndEnabled', checked)}
                        />
                      </SettingsRow>
                      
                      {settings.dndEnabled && (
                        <div className="mt-4 space-y-4">
                          <div className={cn(
                            "p-4 rounded-lg",
                            isDark ? "bg-[#3c4043]" : "bg-gray-50"
                          )}>
                            <p className={cn("text-sm font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                              Wochentags
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={settings.dndSchedule.weekdayStart}
                                onChange={(e) => updateSetting('dndSchedule', {
                                  ...settings.dndSchedule,
                                  weekdayStart: e.target.value
                                })}
                                className={cn(
                                  "px-3 py-2 rounded-lg text-sm border",
                                  isDark ? "bg-[#202124] text-white border-white/10" : "bg-white border-gray-200"
                                )}
                              />
                              <span className={isDark ? "text-gray-400" : "text-gray-500"}>-</span>
                              <input
                                type="time"
                                value={settings.dndSchedule.weekdayEnd}
                                onChange={(e) => updateSetting('dndSchedule', {
                                  ...settings.dndSchedule,
                                  weekdayEnd: e.target.value
                                })}
                                className={cn(
                                  "px-3 py-2 rounded-lg text-sm border",
                                  isDark ? "bg-[#202124] text-white border-white/10" : "bg-white border-gray-200"
                                )}
                              />
                            </div>
                            <p className={cn("text-xs mt-2", isDark ? "text-gray-400" : "text-gray-500")}>
                              {settings.dndSchedule.weekdayDays.join(', ')}
                            </p>
                          </div>

                          <div className={cn(
                            "p-4 rounded-lg",
                            isDark ? "bg-[#3c4043]" : "bg-gray-50"
                          )}>
                            <p className={cn("text-sm font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                              Wochenende
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={settings.dndSchedule.weekendStart}
                                onChange={(e) => updateSetting('dndSchedule', {
                                  ...settings.dndSchedule,
                                  weekendStart: e.target.value
                                })}
                                className={cn(
                                  "px-3 py-2 rounded-lg text-sm border",
                                  isDark ? "bg-[#202124] text-white border-white/10" : "bg-white border-gray-200"
                                )}
                              />
                              <span className={isDark ? "text-gray-400" : "text-gray-500"}>-</span>
                              <input
                                type="time"
                                value={settings.dndSchedule.weekendEnd}
                                onChange={(e) => updateSetting('dndSchedule', {
                                  ...settings.dndSchedule,
                                  weekendEnd: e.target.value
                                })}
                                className={cn(
                                  "px-3 py-2 rounded-lg text-sm border",
                                  isDark ? "bg-[#202124] text-white border-white/10" : "bg-white border-gray-200"
                                )}
                              />
                            </div>
                            <p className={cn("text-xs mt-2", isDark ? "text-gray-400" : "text-gray-500")}>
                              {settings.dndSchedule.weekendDays.join(', ')}
                            </p>
                          </div>

                          <SettingsRow
                            label="Zeitplan an Zeitzone anpassen"
                            description="Zeitzone des Geräts"
                            isDark={isDark}
                          >
                            <Switch
                              checked={settings.dndTimezoneSync}
                              onCheckedChange={(checked) => updateSetting('dndTimezoneSync', checked)}
                            />
                          </SettingsRow>
                        </div>
                      )}
                    </SettingsCard>
                  </div>
                )}

                {activeSection === 'messages' && (
                  <div className="space-y-6">
                    <SettingsCard title="Medien-Einstellungen" isDark={isDark}>
                      <SettingsRow label="GIFs automatisch abspielen" isDark={isDark}>
                        <Switch
                          checked={settings.autoPlayGifs}
                          onCheckedChange={(checked) => updateSetting('autoPlayGifs', checked)}
                        />
                      </SettingsRow>
                      <SettingsRow label="Videos automatisch abspielen" isDark={isDark}>
                        <Switch
                          checked={settings.autoPlayVideos}
                          onCheckedChange={(checked) => updateSetting('autoPlayVideos', checked)}
                        />
                      </SettingsRow>
                      <SettingsRow label="Link-Vorschau anzeigen" isDark={isDark}>
                        <Switch
                          checked={settings.showLinkPreviews}
                          onCheckedChange={(checked) => updateSetting('showLinkPreviews', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>

                    <SettingsCard title="Bildqualität" isDark={isDark}>
                      <Select
                        value={settings.imageQuality}
                        onValueChange={(value: 'low' | 'medium' | 'high') => updateSetting('imageQuality', value)}
                      >
                        <SelectTrigger className={cn(
                          "w-full",
                          isDark ? "bg-[#3c4043] border-white/10 text-white" : ""
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Niedrig (Daten sparen)</SelectItem>
                          <SelectItem value="medium">Mittel</SelectItem>
                          <SelectItem value="high">Hoch</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingsCard>
                  </div>
                )}

                {activeSection === 'appearance' && (
                  <div className="space-y-6">
                    <SettingsCard title="Ansicht" isDark={isDark}>
                      <SettingsRow label="Kompakte Ansicht" isDark={isDark}>
                        <Switch
                          checked={settings.compactMode}
                          onCheckedChange={(checked) => updateSetting('compactMode', checked)}
                        />
                      </SettingsRow>
                      <SettingsRow label="Avatare anzeigen" isDark={isDark}>
                        <Switch
                          checked={settings.showAvatars}
                          onCheckedChange={(checked) => updateSetting('showAvatars', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>

                    <SettingsCard title="Schriftgröße" isDark={isDark}>
                      <Select
                        value={settings.fontSize}
                        onValueChange={(value: 'small' | 'medium' | 'large') => updateSetting('fontSize', value)}
                      >
                        <SelectTrigger className={cn(
                          "w-full",
                          isDark ? "bg-[#3c4043] border-white/10 text-white" : ""
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Klein</SelectItem>
                          <SelectItem value="medium">Mittel</SelectItem>
                          <SelectItem value="large">Groß</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingsCard>
                  </div>
                )}

                {activeSection === 'accessibility' && (
                  <div className="space-y-6">
                    <SettingsCard title="Barrierefreiheit" isDark={isDark}>
                      <SettingsRow 
                        label="Bewegung reduzieren" 
                        description="Animationen und Übergänge minimieren"
                        isDark={isDark}
                      >
                        <Switch
                          checked={settings.reduceMotion}
                          onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
                        />
                      </SettingsRow>
                      <SettingsRow 
                        label="Hoher Kontrast" 
                        description="Verbesserte Lesbarkeit durch höheren Kontrast"
                        isDark={isDark}
                      >
                        <Switch
                          checked={settings.highContrast}
                          onCheckedChange={(checked) => updateSetting('highContrast', checked)}
                        />
                      </SettingsRow>
                      <SettingsRow 
                        label="Screenreader-Optimierung" 
                        description="Verbesserte Unterstützung für Screenreader"
                        isDark={isDark}
                      >
                        <Switch
                          checked={settings.screenReaderOptimized}
                          onCheckedChange={(checked) => updateSetting('screenReaderOptimized', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>
                  </div>
                )}

                {activeSection === 'access' && (
                  <div className="space-y-6">
                    <SettingsCard title="Wer kann Sie kontaktieren?" isDark={isDark}>
                      <div className="space-y-4">
                        <div>
                          <p className={cn("text-sm font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                            Direktnachrichten
                          </p>
                          <Select
                            value={settings.allowDirectMessages}
                            onValueChange={(value: 'everyone' | 'contacts' | 'nobody') => updateSetting('allowDirectMessages', value)}
                          >
                            <SelectTrigger className={cn(
                              "w-full",
                              isDark ? "bg-[#3c4043] border-white/10 text-white" : ""
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="everyone">Alle</SelectItem>
                              <SelectItem value="contacts">Nur Kontakte</SelectItem>
                              <SelectItem value="nobody">Niemand</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <p className={cn("text-sm font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                            Space-Einladungen
                          </p>
                          <Select
                            value={settings.allowSpaceInvites}
                            onValueChange={(value: 'everyone' | 'contacts' | 'nobody') => updateSetting('allowSpaceInvites', value)}
                          >
                            <SelectTrigger className={cn(
                              "w-full",
                              isDark ? "bg-[#3c4043] border-white/10 text-white" : ""
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="everyone">Alle</SelectItem>
                              <SelectItem value="contacts">Nur Kontakte</SelectItem>
                              <SelectItem value="nobody">Niemand</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </SettingsCard>

                    <SettingsCard title="Sichtbarkeit" isDark={isDark}>
                      <SettingsRow 
                        label="Online-Status anzeigen" 
                        description="Anderen zeigen, wenn Sie online sind"
                        isDark={isDark}
                      >
                        <Switch
                          checked={settings.showOnlineStatus}
                          onCheckedChange={(checked) => updateSetting('showOnlineStatus', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>
                  </div>
                )}

                {activeSection === 'privacy' && (
                  <div className="space-y-6">
                    <SettingsCard title="Lesebestätigungen" isDark={isDark}>
                      <SettingsRow 
                        label="Lesebestätigungen senden" 
                        description="Anderen zeigen, wenn Sie ihre Nachrichten gelesen haben"
                        isDark={isDark}
                      >
                        <Switch
                          checked={settings.readReceipts}
                          onCheckedChange={(checked) => updateSetting('readReceipts', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>

                    <SettingsCard title="Tippanzeige" isDark={isDark}>
                      <SettingsRow 
                        label="Tipp-Indikator senden" 
                        description="Anderen zeigen, wenn Sie gerade tippen"
                        isDark={isDark}
                      >
                        <Switch
                          checked={settings.typingIndicators}
                          onCheckedChange={(checked) => updateSetting('typingIndicators', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>

                    <SettingsCard title="Präsenz" isDark={isDark}>
                      <SettingsRow 
                        label="Präsenz teilen" 
                        description="Ihren Status mit anderen teilen"
                        isDark={isDark}
                      >
                        <Switch
                          checked={settings.sharePresence}
                          onCheckedChange={(checked) => updateSetting('sharePresence', checked)}
                        />
                      </SettingsRow>
                    </SettingsCard>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
