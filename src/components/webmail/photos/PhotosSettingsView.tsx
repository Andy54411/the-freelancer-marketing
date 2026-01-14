'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  HardDrive,
  Palette,
  Video,
  Lightbulb,
  Bell,
  Share2,
  MapPin,
  ShoppingBag,
  Mail,
  BellRing,
  Sparkles,
  Download,
  Shield,
  FileText,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { PhotosApiService, PhotoStorageInfo } from '@/services/photos/PhotosApiService';

interface PhotosSettingsViewProps {
  userEmail: string;
  onStorageManagement?: () => void;
}

type ColorScheme = 'system' | 'light' | 'dark';

interface ExpandableSection {
  colorScheme: boolean;
  suggestions: boolean;
  memories: boolean;
  sharing: boolean;
  location: boolean;
}

export function PhotosSettingsView({ userEmail, onStorageManagement }: PhotosSettingsViewProps) {
  const { isDark, setTheme } = useWebmailTheme();
  const [storageInfo, setStorageInfo] = useState<PhotoStorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Einstellungen-States
  const [qualitySetting, setQualitySetting] = useState<'original' | 'compressed'>('original');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('system');
  const [showRotationHints, setShowRotationHints] = useState(true);
  const [showCollageHints, setShowCollageHints] = useState(true);
  const [memoriesEnabled, setMemoriesEnabled] = useState(true);
  const [emailReminders, setEmailReminders] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [activityPersonalization, setActivityPersonalization] = useState(true);
  
  // Expandierte Sektionen
  const [expanded, setExpanded] = useState<ExpandableSection>({
    colorScheme: false,
    suggestions: false,
    memories: false,
    sharing: false,
    location: false,
  });

  useEffect(() => {
    const loadStorageInfo = async () => {
      if (!userEmail) return;
      PhotosApiService.setUserId(userEmail);
      try {
        const storage = await PhotosApiService.getStorageInfo();
        setStorageInfo(storage);
      } catch {
        // Fehler ignorieren
      } finally {
        setLoading(false);
      }
    };
    loadStorageInfo();
  }, [userEmail]);

  const toggleExpanded = (key: keyof ExpandableSection) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setColorScheme(scheme);
    if (scheme === 'light') {
      setTheme('light');
    } else if (scheme === 'dark') {
      setTheme('dark');
    } else {
      // System-Einstellung
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotifications(permission === 'granted');
    }
  };

  // Formatiere Speicherplatz
  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  return (
    <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className={`text-2xl font-medium mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Einstellungen
        </h1>

        {/* Sicherungsqualität */}
        <section className={`mb-8 pb-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Sicherungsqualität für Fotos und Videos
          </h2>
          
          <div className="space-y-4">
            <label className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-colors ${
              qualitySetting === 'original' 
                ? (isDark ? 'bg-teal-900/30 border border-teal-600' : 'bg-teal-50 border border-teal-500')
                : (isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50')
            }`}>
              <input
                type="radio"
                name="quality"
                checked={qualitySetting === 'original'}
                onChange={() => setQualitySetting('original')}
                className="mt-1 w-5 h-5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Originalqualität
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Fotos und Videos in Originalqualität speichern
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-colors ${
              qualitySetting === 'compressed' 
                ? (isDark ? 'bg-teal-900/30 border border-teal-600' : 'bg-teal-50 border border-teal-500')
                : (isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50')
            }`}>
              <input
                type="radio"
                name="quality"
                checked={qualitySetting === 'compressed'}
                onChange={() => setQualitySetting('compressed')}
                className="mt-1 w-5 h-5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Speicherplatz sparen
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Elemente in etwas geringerer Qualität speichern
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              isDark 
                ? 'border-gray-600 text-teal-400 hover:bg-gray-800' 
                : 'border-gray-300 text-teal-600 hover:bg-gray-50'
            }`}>
              Abo-Einstellungen
            </button>
            <button 
              onClick={onStorageManagement}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              isDark 
                ? 'border-gray-600 text-teal-400 hover:bg-gray-800' 
                : 'border-gray-300 text-teal-600 hover:bg-gray-50'
            }`}>
              Speicherplatz verwalten
            </button>
          </div>
        </section>

        {/* Farbschema */}
        <section className={`mb-2`}>
          <button
            onClick={() => toggleExpanded('colorScheme')}
            className={`w-full flex items-center justify-between py-4 ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            <div className="flex items-center gap-3">
              <Palette className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Farbschema</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Farbschema auswählen
                </p>
              </div>
            </div>
            {expanded.colorScheme ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </button>
          
          {expanded.colorScheme && (
            <div className={`pl-8 pb-4 space-y-3`}>
              {[
                { value: 'system', label: 'Systemeinstellung' },
                { value: 'light', label: 'Hell' },
                { value: 'dark', label: 'Dunkel' },
              ].map(option => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="colorScheme"
                    checked={colorScheme === option.value}
                    onChange={() => handleColorSchemeChange(option.value as ColorScheme)}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                  />
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Nicht unterstützte Videos */}
        <section className="py-4">
          <button className={`w-full flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-3">
              <Video className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Nicht unterstützte Videos</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Videos verwalten, die nicht verarbeitet werden können
                </p>
              </div>
            </div>
            <span className={`text-sm ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Ansehen</span>
          </button>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Vorschläge */}
        <section className="py-4">
          <button
            onClick={() => toggleExpanded('suggestions')}
            className={`w-full flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            <div className="flex items-center gap-3">
              <Lightbulb className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Vorschläge</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Angezeigte Vorschläge verwalten, z. B. empfohlene Collagen oder Hinweise zum Korrigieren seitlich gedrehter Fotos
                </p>
              </div>
            </div>
            {expanded.suggestions ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </button>
          
          {expanded.suggestions && (
            <div className={`pl-8 py-4 space-y-4`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Collagen vorschlagen</span>
                <input
                  type="checkbox"
                  checked={showCollageHints}
                  onChange={(e) => setShowCollageHints(e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Hinweise zu gedrehten Fotos</span>
                <input
                  type="checkbox"
                  checked={showRotationHints}
                  onChange={(e) => setShowRotationHints(e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                />
              </label>
            </div>
          )}
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Erinnerungen */}
        <section className="py-4">
          <button
            onClick={() => toggleExpanded('memories')}
            className={`w-full flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            <div className="flex items-center gap-3">
              <Bell className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Erinnerungen</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Hiermit kannst du die Erinnerungen über der Fotoansicht verwalten
                </p>
              </div>
            </div>
            {expanded.memories ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </button>
          
          {expanded.memories && (
            <div className={`pl-8 py-4`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Erinnerungen anzeigen</span>
                <input
                  type="checkbox"
                  checked={memoriesEnabled}
                  onChange={(e) => setMemoriesEnabled(e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                />
              </label>
            </div>
          )}
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Teilen */}
        <section className="py-4">
          <button
            onClick={() => toggleExpanded('sharing')}
            className={`w-full flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            <div className="flex items-center gap-3">
              <Share2 className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Teilen</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Einstellungen zum Teilen verwalten
                </p>
              </div>
            </div>
            {expanded.sharing ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </button>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Standort */}
        <section className="py-4">
          <button
            onClick={() => toggleExpanded('location')}
            className={`w-full flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            <div className="flex items-center gap-3">
              <MapPin className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Standort</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Standortdaten verwalten
                </p>
              </div>
            </div>
            {expanded.location ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </button>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Bestellverlauf */}
        <section className="py-4">
          <button className={`w-full flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-3">
              <ShoppingBag className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Bestellverlauf für Druckprodukte</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Bisherige Bestellungen ansehen und archivieren
                </p>
              </div>
            </div>
          </button>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* E-Mail-Erinnerungen */}
        <section className="py-4">
          <label className={`flex items-center justify-between cursor-pointer ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-3">
              <Mail className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">E-Mail-Erinnerungen für Entwürfe</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Erinnerungen zu ablaufenden Entwürfen für Druckprodukte
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={emailReminders}
              onChange={(e) => setEmailReminders(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
            />
          </label>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Browserbenachrichtigungen */}
        <section className="py-4">
          <label className={`flex items-center justify-between cursor-pointer ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-3">
              <BellRing className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Browserbenachrichtigungen</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Auf diesem Computer Desktopbenachrichtigungen aktivieren
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={browserNotifications}
              onChange={(e) => {
                if (e.target.checked) {
                  requestNotificationPermission();
                } else {
                  setBrowserNotifications(false);
                }
              }}
              className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
            />
          </label>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Aktivitätsbasierte Personalisierung */}
        <section className="py-4">
          <label className={`flex items-center justify-between cursor-pointer ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-3">
              <Sparkles className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Aktivitätsbasierte Personalisierung</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Aktivitätsbasierte Personalisierung von Erinnerungen und anderen Funktionen auf Grundlage deiner Nutzung von Taskilo Fotos aktivieren
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={activityPersonalization}
              onChange={(e) => setActivityPersonalization(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
            />
          </label>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Daten exportieren */}
        <section className="py-4">
          <button className={`w-full flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-3">
              <Download className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Daten exportieren</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Hiermit kannst du eine Kopie deiner Fotos und Videos erstellen und dann in einem externen Dienst verwenden oder als Sicherung speichern
                </p>
              </div>
            </div>
            <ExternalLink className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          </button>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Meine Daten */}
        <section className="py-4">
          <button className={`w-full flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Meine Daten in Taskilo Fotos</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  So schützen wir deine Fotos und Videos
                </p>
              </div>
            </div>
            <ExternalLink className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          </button>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* Aktivitätsprotokoll */}
        <section className="py-4">
          <button className={`w-full flex items-center justify-between ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="flex items-center gap-3">
              <FileText className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className="font-medium">Aktivitätsprotokoll</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Meine Kommentare und Nachrichten zu geteilten Fotos ansehen und entfernen
                </p>
              </div>
            </div>
          </button>
        </section>

        <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />

        {/* RAW-Fotoeditor */}
        <section className="py-4 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Camera className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>RAW-Fotoeditor</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Wähle aus, was passieren soll, wenn du ein RAW-Foto bearbeitest
              </p>
            </div>
          </div>
          
          <div className="pl-8 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="rawEditor"
                defaultChecked
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Immer in Taskilo Fotos bearbeiten</span>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Wandelt Dateien vor der Bearbeitung in das JPEG-Format um
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="rawEditor"
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Jedes Mal nachfragen</span>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Du kannst deine RAW-Datei herunterladen oder sie mit Taskilo Fotos bearbeiten
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Speicherinfo */}
        {storageInfo && (
          <section className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-3 mb-3">
              <HardDrive className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Speicherplatz
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}>
              <div 
                className="h-full bg-teal-600 rounded-full"
                style={{ width: `${Math.min(storageInfo.usedPercent, 100)}%` }}
              />
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatBytes(storageInfo.used)} von {formatBytes(storageInfo.limit)} belegt
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
