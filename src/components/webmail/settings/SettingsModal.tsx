'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  session?: SettingsTabProps['session'];
  initialSettings?: Partial<UserSettings>;
  onSave?: (settings: UserSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  isDark = false,
  session,
  initialSettings,
  onSave,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [settings, setSettings] = useState<UserSettings>({ ...defaultSettings, ...initialSettings });
  const [isSaving, setIsSaving] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const tabsRef = useRef<HTMLDivElement>(null);

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
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(settings);
      }
      onClose();
    } catch {
      // Fehlerbehandlung
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
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-4xl mx-4 rounded-lg shadow-xl",
        isDark ? "bg-[#202124]" : "bg-white"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          isDark ? "border-[#3c4043]" : "border-gray-200"
        )}>
          <h2 className={cn(
            "text-sm font-medium",
            isDark ? "text-gray-200" : "text-gray-800"
          )}>
            Einstellungen
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              isDark
                ? "hover:bg-[#3c4043] text-gray-400"
                : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className={cn(
          "relative border-b",
          isDark ? "border-[#3c4043]" : "border-gray-200"
        )}>
          {/* Linker Scroll-Pfeil */}
          {showLeftArrow && (
            <button
              onClick={() => scrollTabs('left')}
              className={cn(
                "absolute left-0 top-0 bottom-0 z-10 px-1 flex items-center",
                isDark
                  ? "bg-linear-to-r from-[#202124] via-[#202124] to-transparent"
                  : "bg-linear-to-r from-white via-white to-transparent"
              )}
            >
              <ChevronLeft className={cn(
                "w-4 h-4",
                isDark ? "text-gray-400" : "text-gray-500"
              )} />
            </button>
          )}

          {/* Tab-Liste */}
          <div
            ref={tabsRef}
            className="flex overflow-x-auto scrollbar-hide px-2"
            onScroll={checkScrollArrows}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "shrink-0 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors relative",
                  activeTab === tab.id
                    ? isDark
                      ? "text-[#14ad9f]"
                      : "text-[#14ad9f]"
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
                "absolute right-0 top-0 bottom-0 z-10 px-1 flex items-center",
                isDark
                  ? "bg-linear-to-l from-[#202124] via-[#202124] to-transparent"
                  : "bg-linear-to-l from-white via-white to-transparent"
              )}
            >
              <ChevronRight className={cn(
                "w-4 h-4",
                isDark ? "text-gray-400" : "text-gray-500"
              )} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={cn(
          "p-4 max-h-[60vh] overflow-y-auto",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className={cn(
          "flex items-center justify-end gap-2 px-4 py-3 border-t",
          isDark ? "border-[#3c4043]" : "border-gray-200"
        )}>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className={cn(
              "text-xs h-8",
              isDark && "border-[#3c4043] bg-transparent hover:bg-[#3c4043] text-gray-300"
            )}
          >
            Abbrechen
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs h-8 bg-[#14ad9f] hover:bg-[#0d8a7f] text-white"
          >
            {isSaving ? 'Speichern...' : 'Änderungen speichern'}
          </Button>
        </div>
      </div>
    </div>
  );
}
