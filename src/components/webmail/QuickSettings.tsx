'use client';

import { useState, useEffect } from 'react';
import { X, Mail, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

// Theme-Daten
export interface ThemeData {
  id: string;
  name: string;
  previewUrl: string;
  backgroundUrl: string;
}

export const THEMES: ThemeData[] = [
  { 
    id: 'basicwhite', 
    name: 'Standard', 
    previewUrl: '//ssl.gstatic.com/ui/v1/icons/mail/themes/basicwhite/previewHD5.png',
    backgroundUrl: '' // Kein Hintergrundbild
  },
  { 
    id: 'f53', 
    name: 'Von Romain Guy', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f53.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f53.jpg'
  },
  { 
    id: 'f54', 
    name: 'Von Romain Guy', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f54.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f54.jpg'
  },
  { 
    id: 'f41', 
    name: 'Von Romain Guy', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f41.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f41.jpg'
  },
  { 
    id: 'f42', 
    name: 'Von Romain Guy', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f42.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f42.jpg'
  },
  { 
    id: 'f43', 
    name: 'Von Romain Guy', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f43.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f43.jpg'
  },
  { 
    id: 'f44', 
    name: 'Von Greg Bullock', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f44.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f44.jpg'
  },
  { 
    id: 'f45', 
    name: 'Von Grzegorz Glowaty', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f45.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f45.jpg'
  },
  { 
    id: 'f46', 
    name: 'Von Romain Guy', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f46.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f46.jpg'
  },
  { 
    id: 'f47', 
    name: 'Von Romain Guy', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f47.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f47.jpg'
  },
  { 
    id: 'f48', 
    name: 'Animals', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f48.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f48.jpg'
  },
  { 
    id: 'f49', 
    name: 'Von Greg Bullock', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f49.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f49.jpg'
  },
  { 
    id: 'f50', 
    name: 'Lake Tahoe', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f50.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f50.jpg'
  },
  { 
    id: 'f51', 
    name: 'Von Romain Guy', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f51.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f51.jpg'
  },
  { 
    id: 'f52', 
    name: 'Von Grzegorz Glowaty', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f52.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f52.jpg'
  },
  { 
    id: 'f55', 
    name: 'Von Romain Guy', 
    previewUrl: 'https://www.gstatic.com/mail/themes/featured/f55.jpg=w58-h40-e365-k-no-nd',
    backgroundUrl: 'https://www.gstatic.com/mail/themes/featured/f55.jpg'
  },
];

// Einstellungen-Typen
export interface WebmailSettings {
  density: 'default' | 'comfortable' | 'compact';
  inboxType: 'default' | 'important-first' | 'unread-first' | 'starred-first' | 'priority' | 'multiple';
  readingPane: 'none' | 'right' | 'bottom';
  conversationView: boolean;
  theme: string;
}

// Standard-Einstellungen
const defaultSettings: WebmailSettings = {
  density: 'default',
  inboxType: 'default',
  readingPane: 'none',
  conversationView: true,
  theme: 'basicwhite',
};

// LocalStorage Key
const SETTINGS_KEY = 'taskilo_webmail_settings';

// Einstellungen laden
export function loadSettings(): WebmailSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch {
    // Fehler ignorieren
  }
  return defaultSettings;
}

// Einstellungen speichern
function saveSettings(settings: WebmailSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Fehler ignorieren
  }
}

// Theme anhand ID finden
export function getThemeById(themeId: string): ThemeData | undefined {
  return THEMES.find(t => t.id === themeId);
}

interface QuickSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: WebmailSettings) => void;
}

// Preview Image Components
function DensityPreviewDefault({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-[52px] rounded border flex flex-col p-2 gap-1",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className="flex items-center gap-1">
        <div className={cn("w-3 h-3 rounded-sm", isDark ? "bg-gray-600" : "bg-gray-200")} />
        <div className={cn("flex-1 h-2 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      </div>
      <div className="flex items-center gap-1">
        <div className={cn("w-3 h-3 rounded-sm", isDark ? "bg-gray-600" : "bg-gray-200")} />
        <div className={cn("flex-1 h-2 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      </div>
      <div className="flex items-center gap-1">
        <div className={cn("w-3 h-3 rounded-sm", isDark ? "bg-gray-600" : "bg-gray-200")} />
        <div className={cn("flex-1 h-2 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      </div>
    </div>
  );
}

function DensityPreviewComfortable({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-[52px] rounded border flex flex-col p-2 gap-2",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className="flex items-center gap-1">
        <div className={cn("w-2 h-2 rounded-full", isDark ? "bg-gray-500" : "bg-gray-300")} />
        <div className={cn("flex-1 h-2 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      </div>
      <div className="flex items-center gap-1">
        <div className={cn("w-2 h-2 rounded-full", isDark ? "bg-gray-500" : "bg-gray-300")} />
        <div className={cn("flex-1 h-2 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      </div>
    </div>
  );
}

function DensityPreviewCompact({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-[52px] rounded border flex flex-col p-1.5 gap-0.5",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className={cn("flex-1 rounded-sm", isDark ? "bg-gray-600" : "bg-gray-200")} />
      ))}
    </div>
  );
}

function InboxPreviewDefault({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-11 rounded border flex flex-col p-1.5 gap-0.5",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className={cn("h-1.5 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <div className={cn("h-1.5 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <div className={cn("h-1.5 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
    </div>
  );
}

function InboxPreviewImportant({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-11 rounded border flex flex-col p-1.5 gap-0.5 relative",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className={cn("h-1.5 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <div className={cn("h-1.5 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <ChevronRight className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-yellow-500" />
    </div>
  );
}

function InboxPreviewUnread({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-11 rounded border flex flex-col p-1.5 gap-0.5 relative",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className={cn("h-1.5 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <div className={cn("h-1.5 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <Mail className={cn("absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3", isDark ? "text-gray-500" : "text-white")} />
    </div>
  );
}

function InboxPreviewStarred({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-11 rounded border flex flex-col p-1.5 gap-0.5 relative",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className={cn("h-1.5 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <div className={cn("h-1.5 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <Star className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-yellow-400 fill-yellow-400" />
    </div>
  );
}

function InboxPreviewPriority({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-11 rounded border flex flex-col p-1.5 gap-1",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className="h-0.5 bg-teal-400 rounded w-full" />
      <div className={cn("h-1 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <div className="h-0.5 bg-teal-400 rounded w-full" />
      <div className={cn("h-1 rounded w-full", isDark ? "bg-gray-600" : "bg-gray-200")} />
    </div>
  );
}

function InboxPreviewMultiple({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-11 rounded border flex gap-0.5 p-1",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className={cn("flex-1 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <div className={cn("flex-1 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      <div className={cn("flex-1 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
    </div>
  );
}

function ReadingPaneNone({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-11 rounded border flex items-center justify-center p-1.5",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className={cn("w-full h-full rounded", isDark ? "bg-gray-600" : "bg-gray-100")} />
    </div>
  );
}

function ReadingPaneRight({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-11 rounded border flex gap-1 p-1.5",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className={cn("w-1/3 rounded flex flex-col gap-0.5 p-0.5", isDark ? "bg-gray-600" : "bg-gray-200")}>
        <div className="h-1 bg-red-400 rounded-full w-1" />
        <div className="h-1 bg-green-400 rounded-full w-1" />
        <div className="h-1 bg-teal-400 rounded-full w-1" />
      </div>
      <div className={cn("flex-1 rounded flex flex-col gap-0.5 p-0.5", isDark ? "bg-gray-700" : "bg-gray-100")}>
        <div className="h-1 bg-teal-400 rounded-full w-1" />
        <div className="h-1 bg-green-400 rounded-full w-1" />
        <div className="h-1 bg-red-400 rounded-full w-1" />
      </div>
    </div>
  );
}

function ReadingPaneBottom({ selected }: { selected?: boolean }) {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-11 rounded border flex flex-col gap-1 p-1.5",
      selected 
        ? isDark ? "border-teal-500 bg-teal-900/30" : "border-teal-500 bg-teal-50" 
        : isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className={cn("flex-1 rounded flex items-center gap-0.5 px-1", isDark ? "bg-gray-600" : "bg-gray-200")}>
        <div className="h-1 bg-red-400 rounded-full w-1" />
        <div className={cn("flex-1 h-1 rounded", isDark ? "bg-gray-500" : "bg-gray-300")} />
      </div>
      <div className={cn("flex-1 rounded flex items-center gap-0.5 px-1", isDark ? "bg-gray-700" : "bg-gray-100")}>
        <div className="h-1 bg-red-400 rounded-full w-1" />
        <div className={cn("flex-1 h-1 rounded", isDark ? "bg-gray-500" : "bg-gray-300")} />
      </div>
    </div>
  );
}

function ChatMeetPreview() {
  const { isDark } = useWebmailTheme();
  return (
    <div className={cn(
      "w-[72px] h-[52px] rounded border flex flex-col p-1.5 gap-1",
      isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-white"
    )}>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        <div className={cn("flex-1 h-1.5 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      </div>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        <div className={cn("flex-1 h-1.5 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      </div>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        <div className={cn("flex-1 h-1.5 rounded", isDark ? "bg-gray-600" : "bg-gray-200")} />
      </div>
    </div>
  );
}

export function QuickSettings({ isOpen, onClose, onSettingsChange }: QuickSettingsProps) {
  const { isDark } = useWebmailTheme();
  const [settings, setSettings] = useState<WebmailSettings>(defaultSettings);
  const [isAnimating, setIsAnimating] = useState(false);

  // Einstellungen beim Öffnen laden
  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      // Animation starten
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Einstellungen aktualisieren
  const updateSetting = <K extends keyof WebmailSettings>(key: K, value: WebmailSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 z-40 transition-opacity duration-300",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Panel von rechts */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-[360px] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out",
          isDark ? "bg-[#2d2e30]" : "bg-white",
          isAnimating ? "translate-x-0" : "translate-x-full"
        )}
        role="menu"
        aria-label="Schnelleinstellungen"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className={cn("text-[22px] font-normal", isDark ? "text-white" : "text-gray-800")}>Schnelleinstellungen</h2>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-full transition-colors -mr-2",
              isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
            )}
            aria-label="Schliessen"
          >
            <X className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
          </button>
        </div>

        {/* Alle Einstellungen Button */}
        <div className="px-6 pb-4">
          <button 
            className={cn(
              "w-full py-2 px-4 border rounded-full text-sm font-medium transition-colors",
              isDark 
                ? "border-[#5f6368] text-teal-400 hover:bg-white/10" 
                : "border-gray-300 text-teal-600 hover:bg-teal-50"
            )}
            onClick={() => {
              // TODO: Navigation zu vollen Einstellungen
              onClose();
            }}
          >
            Alle Einstellungen aufrufen
          </button>
        </div>

        {/* Scrollbarer Inhalt */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pb-6">
            
            {/* Apps in Gmail / Chat und Meet */}
            <section className={cn("py-4 border-t", isDark ? "border-[#5f6368]" : "border-gray-200")}>
              <h3 className={cn("text-xs font-medium uppercase tracking-wide mb-3", isDark ? "text-white" : "text-gray-500")}>Apps in Taskilo</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Chat und Meet</div>
                  <button className={cn("text-sm", isDark ? "text-teal-400 hover:text-teal-300" : "text-teal-600 hover:text-teal-700")}>Anpassen</button>
                </div>
                <ChatMeetPreview />
              </div>
            </section>

            {/* Kompaktheitsgrad */}
            <section className={cn("py-4 border-t", isDark ? "border-[#5f6368]" : "border-gray-200")}>
              <h3 className={cn("text-xs font-medium uppercase tracking-wide mb-4", isDark ? "text-white" : "text-gray-500")}>Kompaktheitsgrad</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.density === 'default' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.density === 'default' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Standard</span>
                  </div>
                  <input
                    type="radio"
                    name="density"
                    checked={settings.density === 'default'}
                    onChange={() => updateSetting('density', 'default')}
                    className="sr-only"
                  />
                  <DensityPreviewDefault selected={settings.density === 'default'} />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.density === 'comfortable' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.density === 'comfortable' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Übersichtlich</span>
                  </div>
                  <input
                    type="radio"
                    name="density"
                    checked={settings.density === 'comfortable'}
                    onChange={() => updateSetting('density', 'comfortable')}
                    className="sr-only"
                  />
                  <DensityPreviewComfortable selected={settings.density === 'comfortable'} />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.density === 'compact' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.density === 'compact' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Kompakt</span>
                  </div>
                  <input
                    type="radio"
                    name="density"
                    checked={settings.density === 'compact'}
                    onChange={() => updateSetting('density', 'compact')}
                    className="sr-only"
                  />
                  <DensityPreviewCompact selected={settings.density === 'compact'} />
                </label>
              </div>
            </section>

            {/* Design */}
            <section className={cn("py-4 border-t", isDark ? "border-[#5f6368]" : "border-gray-200")}>
              <div className="flex items-center justify-between mb-3">
                <div className={cn("text-xs font-medium uppercase tracking-wide", isDark ? "text-white" : "text-gray-500")}>Design</div>
                <button className={cn("text-sm", isDark ? "text-teal-400 hover:text-teal-300" : "text-teal-600 hover:text-teal-700")}>Alle anzeigen</button>
              </div>
              {/* eslint-disable @next/next/no-img-element */}
              <div className="grid grid-cols-4 gap-1.5">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => updateSetting('theme', theme.id)}
                    className={cn(
                      "relative rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-500",
                      settings.theme === theme.id 
                        ? "border-2 border-teal-500" 
                        : isDark ? "border border-[#5f6368] hover:border-gray-400" : "border border-gray-200 hover:border-gray-400"
                    )}
                    aria-label={`Design: ${theme.name}`}
                  >
                    <img 
                      src={theme.previewUrl} 
                      alt={theme.name} 
                      className="w-full h-10 object-cover"
                    />
                  </button>
                ))}
              </div>
              {/* eslint-enable @next/next/no-img-element */}
            </section>

            {/* Art des Posteingangs */}
            <section className={cn("py-4 border-t", isDark ? "border-[#5f6368]" : "border-gray-200")}>
              <h3 className={cn("text-xs font-medium uppercase tracking-wide mb-4", isDark ? "text-white" : "text-gray-500")}>Art des Posteingangs</h3>
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => updateSetting('inboxType', 'default')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.inboxType === 'default' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.inboxType === 'default' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <div>
                      <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Standard</span>
                      <span className={cn("block text-sm", isDark ? "text-teal-400" : "text-teal-600")}>Anpassen</span>
                    </div>
                  </div>
                  <InboxPreviewDefault selected={settings.inboxType === 'default'} />
                </div>

                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => updateSetting('inboxType', 'important-first')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.inboxType === 'important-first' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.inboxType === 'important-first' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Wichtige zuerst</span>
                  </div>
                  <InboxPreviewImportant selected={settings.inboxType === 'important-first'} />
                </div>

                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => updateSetting('inboxType', 'unread-first')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.inboxType === 'unread-first' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.inboxType === 'unread-first' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Ungelesene zuerst</span>
                  </div>
                  <InboxPreviewUnread selected={settings.inboxType === 'unread-first'} />
                </div>

                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => updateSetting('inboxType', 'starred-first')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.inboxType === 'starred-first' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.inboxType === 'starred-first' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Markierte zuerst</span>
                  </div>
                  <InboxPreviewStarred selected={settings.inboxType === 'starred-first'} />
                </div>

                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => updateSetting('inboxType', 'priority')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.inboxType === 'priority' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.inboxType === 'priority' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <div>
                      <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Sortierter Eingang</span>
                      <span className={cn("block text-sm", isDark ? "text-teal-400" : "text-teal-600")}>Anpassen</span>
                    </div>
                  </div>
                  <InboxPreviewPriority selected={settings.inboxType === 'priority'} />
                </div>

                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => updateSetting('inboxType', 'multiple')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.inboxType === 'multiple' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.inboxType === 'multiple' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <div>
                      <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Mehrere Posteingänge</span>
                      <span className={cn("block text-sm", isDark ? "text-teal-400" : "text-teal-600")}>Anpassen</span>
                    </div>
                  </div>
                  <InboxPreviewMultiple selected={settings.inboxType === 'multiple'} />
                </div>
              </div>
            </section>

            {/* Lesebereich */}
            <section className={cn("py-4 border-t", isDark ? "border-[#5f6368]" : "border-gray-200")}>
              <h3 className={cn("text-xs font-medium uppercase tracking-wide mb-4", isDark ? "text-white" : "text-gray-500")}>Lesebereich</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.readingPane === 'none' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.readingPane === 'none' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Nicht geteilt</span>
                  </div>
                  <input
                    type="radio"
                    name="readingPane"
                    checked={settings.readingPane === 'none'}
                    onChange={() => updateSetting('readingPane', 'none')}
                    className="sr-only"
                  />
                  <ReadingPaneNone selected={settings.readingPane === 'none'} />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.readingPane === 'right' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.readingPane === 'right' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Rechts neben dem Posteingang</span>
                  </div>
                  <input
                    type="radio"
                    name="readingPane"
                    checked={settings.readingPane === 'right'}
                    onChange={() => updateSetting('readingPane', 'right')}
                    className="sr-only"
                  />
                  <ReadingPaneRight selected={settings.readingPane === 'right'} />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      settings.readingPane === 'bottom' ? "border-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                    )}>
                      {settings.readingPane === 'bottom' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Unter dem Posteingang</span>
                  </div>
                  <input
                    type="radio"
                    name="readingPane"
                    checked={settings.readingPane === 'bottom'}
                    onChange={() => updateSetting('readingPane', 'bottom')}
                    className="sr-only"
                  />
                  <ReadingPaneBottom selected={settings.readingPane === 'bottom'} />
                </label>
              </div>
            </section>

            {/* E-Mail-Threads */}
            <section className={cn("py-4 border-t", isDark ? "border-[#5f6368]" : "border-gray-200")}>
              <h3 className={cn("text-xs font-medium uppercase tracking-wide mb-4", isDark ? "text-white" : "text-gray-500")}>E-Mail-Threads</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center",
                  settings.conversationView ? "border-teal-600 bg-teal-600" : isDark ? "border-[#5f6368]" : "border-gray-300"
                )}>
                  {settings.conversationView && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={settings.conversationView}
                  onChange={(e) => updateSetting('conversationView', e.target.checked)}
                  className="sr-only"
                />
                <span className={cn("text-sm", isDark ? "text-white" : "text-gray-800")}>Konversationsansicht</span>
                <div 
                  className={cn("ml-auto cursor-help", isDark ? "text-gray-500" : "text-white")}
                  title="E-Mails mit demselben Thema werden gruppiert"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </label>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
