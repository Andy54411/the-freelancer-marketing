'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { settingsTabs, type SettingsTabId, type UserSettings, defaultSettings, type SettingsTabProps } from './types';
import { GeneralSettings } from './GeneralSettings';
import { LabelsSettings } from './LabelsSettings';
import { InboxSettings } from './InboxSettings';
import { AccountsSettings } from './AccountsSettings';
import { FilterSettings } from './FilterSettings';
import { ForwardingSettings } from './ForwardingSettings';
import { AddonsSettings } from './AddonsSettings';
import { ChatSettings } from './ChatSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { OfflineSettings } from './OfflineSettings';
import { ThemesSettings } from './ThemesSettings';
import { DomainsSettings } from './DomainsSettings';
import { getSettings, saveSettings } from '@/lib/webmail-settings-api';

interface SettingsPageProps {
  onClose: () => void;
  isDark?: boolean;
  session?: SettingsTabProps['session'];
  initialSettings?: Partial<UserSettings>;
  onSave?: (settings: UserSettings) => void;
  email?: string;
}

export function SettingsPage({
  onClose,
  isDark = false,
  session,
  initialSettings,
  onSave,
  email,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [settings, setSettings] = useState<UserSettings>({ ...defaultSettings, ...initialSettings });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Einstellungen vom Hetzner-Server laden
  const loadSettings = useCallback(async () => {
    if (!email) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const loadedSettings = await getSettings(email);
      
      if (loadedSettings) {
        setSettings({ ...defaultSettings, ...loadedSettings });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Scroll-Pfeile-Logik
  const checkScrollArrows = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollArrows();
    window.addEventListener('resize', checkScrollArrows);
    return () => window.removeEventListener('resize', checkScrollArrows);
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollArrows, 300);
    }
  };

  const handleSettingsChange = (updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    console.log('[SettingsPage] Speichern gestartet für:', email);
    console.log('[SettingsPage] Settings zum Speichern:', JSON.stringify(settings, null, 2));
    console.log('[SettingsPage] Signaturen:', settings.signatures);
    
    try {
      // Auf Hetzner speichern
      if (email) {
        console.log('[SettingsPage] API-Aufruf: saveSettings');
        const result = await saveSettings(email, settings);
        console.log('[SettingsPage] API-Antwort:', result);
        if (!result.success) {
          console.error('[SettingsPage] Fehler beim Speichern:', result.error);
          setSaveError(result.error || 'Fehler beim Speichern');
          return;
        }
        console.log('[SettingsPage] Erfolgreich gespeichert!');
      }
      
      // Optional: zusätzlicher onSave-Callback
      if (onSave) {
        await onSave(settings);
      }
      
      onClose();
    } catch {
      setSaveError('Fehler beim Speichern der Einstellungen');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTabContent = () => {
    const props: SettingsTabProps = {
      settings,
      onSettingsChange: handleSettingsChange,
      isDark,
      session: session ?? null,
    };

    switch (activeTab) {
      case 'general':
        return <GeneralSettings {...props} />;
      case 'labels':
        return <LabelsSettings {...props} />;
      case 'inbox':
        return <InboxSettings {...props} />;
      case 'accounts':
        return <AccountsSettings {...props} />;
      case 'filters':
        return <FilterSettings {...props} />;
      case 'forwarding':
        return <ForwardingSettings {...props} />;
      case 'addons':
        return <AddonsSettings {...props} />;
      case 'chat':
        return <ChatSettings {...props} />;
      case 'advanced':
        return <AdvancedSettings {...props} />;
      case 'offline':
        return <OfflineSettings {...props} />;
      case 'themes':
        return <ThemesSettings {...props} />;
      case 'domains':
        return <DomainsSettings {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "flex-1 flex flex-col overflow-hidden rounded-2xl",
      isDark ? "bg-[#202124]" : "bg-white"
    )}>
      {/* Header - Gmail-Style */}
      <div className={cn(
        "flex items-center justify-between px-6 py-4 border-b shrink-0",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h1 className={cn(
          "text-xl font-normal",
          isDark ? "text-gray-200" : "text-gray-800"
        )}>
          Einstellungen
        </h1>
        
        {/* Sprachauswahl wie bei Gmail */}
        <div className="flex items-center gap-2">
          <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>De</span>
          <ChevronRight className={cn("w-4 h-4", isDark ? "text-gray-400" : "text-gray-500")} />
        </div>
      </div>

      {/* Tabs - Gmail-Style horizontal scrollbar */}
      <div className={cn(
        "relative border-b shrink-0",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        {/* Linker Scroll-Pfeil */}
        {showLeftArrow && (
          <button
            onClick={() => scrollTabs('left')}
            className={cn(
              "absolute left-0 top-0 bottom-0 z-10 px-2 flex items-center",
              isDark
                ? "bg-linear-to-r from-[#202124] via-[#202124] to-transparent"
                : "bg-linear-to-r from-white via-white to-transparent"
            )}
          >
            <ChevronLeft className={cn(
              "w-5 h-5",
              isDark ? "text-gray-400" : "text-gray-500"
            )} />
          </button>
        )}

        {/* Tab-Liste */}
        <div
          ref={tabsRef}
          className="flex overflow-x-auto scrollbar-hide px-4"
          onScroll={checkScrollArrows}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 px-4 py-3 text-sm whitespace-nowrap transition-colors relative",
                activeTab === tab.id
                  ? isDark
                    ? "text-[#14ad9f] font-medium"
                    : "text-[#14ad9f] font-medium"
                  : isDark
                    ? "text-gray-400 hover:text-gray-300"
                    : "text-gray-600 hover:text-gray-800"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14ad9f]" />
              )}
            </button>
          ))}
        </div>

        {/* Rechter Scroll-Pfeil */}
        {showRightArrow && (
          <button
            onClick={() => scrollTabs('right')}
            className={cn(
              "absolute right-0 top-0 bottom-0 z-10 px-2 flex items-center",
              isDark
                ? "bg-linear-to-l from-[#202124] via-[#202124] to-transparent"
                : "bg-linear-to-l from-white via-white to-transparent"
            )}
          >
            <ChevronRight className={cn(
              "w-5 h-5",
              isDark ? "text-gray-400" : "text-gray-500"
            )} />
          </button>
        )}
      </div>

      {/* Content - Scrollbar Bereich */}
      <div className={cn(
        "flex-1 overflow-y-auto p-6",
        isDark ? "text-gray-300" : "text-gray-700"
      )}>
        <div className="max-w-4xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
              <span className="ml-3 text-gray-500">Einstellungen werden geladen...</span>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>

      {/* Footer mit Speichern-Buttons - Gmail-Style */}
      <div className={cn(
        "flex items-center gap-3 px-6 py-4 border-t shrink-0",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="text-sm h-9 px-6 bg-[#14ad9f] hover:bg-[#0d8a7f] text-white rounded-md"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Speichern...
            </>
          ) : (
            'Änderungen speichern'
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isSaving}
          className={cn(
            "text-sm h-9 px-4",
            isDark ? "text-gray-300 hover:bg-[#3c4043]" : "text-gray-700 hover:bg-gray-100"
          )}
        >
          Abbrechen
        </Button>
        
        {/* Fehlermeldung */}
        {saveError && (
          <span className="text-sm text-red-500 ml-auto">
            {saveError}
          </span>
        )}
      </div>
    </div>
  );
}
