'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, Palette, Sun, Moon, Monitor } from 'lucide-react';
import type { SettingsTabProps } from './types';

const THEMES = [
  { id: 'default', name: 'Standard', color: '#14ad9f', preview: ['#14ad9f', '#ffffff', '#f3f4f6'] },
  { id: 'ocean', name: 'Ozean', color: '#0ea5e9', preview: ['#0ea5e9', '#f0f9ff', '#e0f2fe'] },
  { id: 'forest', name: 'Wald', color: '#22c55e', preview: ['#22c55e', '#f0fdf4', '#dcfce7'] },
  { id: 'sunset', name: 'Sonnenuntergang', color: '#f97316', preview: ['#f97316', '#fff7ed', '#ffedd5'] },
  { id: 'lavender', name: 'Lavendel', color: '#a855f7', preview: ['#a855f7', '#faf5ff', '#f3e8ff'] },
  { id: 'rose', name: 'Rose', color: '#ec4899', preview: ['#ec4899', '#fdf2f8', '#fce7f3'] },
  { id: 'slate', name: 'Schiefer', color: '#64748b', preview: ['#64748b', '#f8fafc', '#f1f5f9'] },
  { id: 'amber', name: 'Bernstein', color: '#f59e0b', preview: ['#f59e0b', '#fffbeb', '#fef3c7'] },
];

const BACKGROUNDS = [
  { id: 'none', name: 'Kein Hintergrund', image: null },
  { id: 'geometric', name: 'Geometrisch', image: '/images/backgrounds/geometric.jpg' },
  { id: 'nature', name: 'Natur', image: '/images/backgrounds/nature.jpg' },
  { id: 'abstract', name: 'Abstrakt', image: '/images/backgrounds/abstract.jpg' },
  { id: 'gradient', name: 'Farbverlauf', image: '/images/backgrounds/gradient.jpg' },
];

export function ThemesSettings({ isDark }: SettingsTabProps) {
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [colorMode, setColorMode] = useState<'light' | 'dark' | 'system'>('system');

  return (
    <div className="space-y-4">
      {/* Farbmodus */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Farbmodus
        </h3>
        <div className="flex gap-2">
          {[
            { id: 'light', label: 'Hell', icon: Sun },
            { id: 'dark', label: 'Dunkel', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setColorMode(mode.id as 'light' | 'dark' | 'system')}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border text-xs transition-colors",
                colorMode === mode.id
                  ? "border-[#14ad9f] bg-[#14ad9f]/10"
                  : isDark
                    ? "border-[#3c4043] hover:bg-[#3c4043]"
                    : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <mode.icon className={cn(
                "w-5 h-5",
                colorMode === mode.id
                  ? "text-[#14ad9f]"
                  : isDark
                    ? "text-gray-400"
                    : "text-gray-500"
              )} />
              <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                {mode.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Akzentfarben */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Akzentfarbe
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-3 rounded-lg border text-xs transition-colors",
                selectedTheme === theme.id
                  ? "border-[#14ad9f] bg-[#14ad9f]/10"
                  : isDark
                    ? "border-[#3c4043] hover:bg-[#3c4043]"
                    : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: theme.color }}
              >
                {selectedTheme === theme.id && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
              <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                {theme.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme-Vorschau */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Vorschau
        </h3>
        <div className={cn(
          "p-4 rounded-lg border",
          isDark ? "border-[#3c4043] bg-[#2d2e30]" : "border-gray-200 bg-gray-50"
        )}>
          <div className="flex gap-2 mb-3">
            {THEMES.find(t => t.id === selectedTheme)?.preview.map((color, index) => (
              <div
                key={index}
                className="w-12 h-8 rounded"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="space-y-2">
            <div className={cn(
              "h-3 rounded w-3/4",
              isDark ? "bg-gray-600" : "bg-gray-300"
            )} />
            <div className={cn(
              "h-3 rounded w-1/2",
              isDark ? "bg-gray-700" : "bg-gray-200"
            )} />
            <Button
              size="sm"
              className="h-6 text-xs px-3"
              style={{ backgroundColor: THEMES.find(t => t.id === selectedTheme)?.color }}
            >
              Beispiel-Button
            </Button>
          </div>
        </div>
      </div>

      {/* Hintergrund */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Hintergrundbild
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => setSelectedBackground(bg.id)}
              className={cn(
                "relative aspect-video rounded-lg border overflow-hidden transition-all",
                selectedBackground === bg.id
                  ? "ring-2 ring-[#14ad9f] ring-offset-2"
                  : "hover:opacity-80",
                isDark ? "ring-offset-[#202124]" : "ring-offset-white"
              )}
            >
              {bg.image ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundColor: isDark ? '#3c4043' : '#e5e7eb' }}
                />
              ) : (
                <div className={cn(
                  "w-full h-full flex items-center justify-center",
                  isDark ? "bg-[#2d2e30]" : "bg-gray-100"
                )}>
                  <span className={cn(
                    "text-[10px]",
                    isDark ? "text-gray-500" : "text-gray-400"
                  )}>
                    Kein
                  </span>
                </div>
              )}
              {selectedBackground === bg.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
        <p className={cn(
          "text-xs mt-2",
          isDark ? "text-gray-500" : "text-gray-400"
        )}>
          Wählen Sie ein Hintergrundbild für die Seitenleiste
        </p>
      </div>

      {/* Weitere Optionen */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Weitere Optionen
        </h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start text-xs h-8",
              isDark && "border-[#3c4043] bg-transparent hover:bg-[#3c4043]"
            )}
          >
            <Palette className="w-3.5 h-3.5 mr-2" />
            Eigene Farbe auswählen
          </Button>
        </div>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Das ausgewählte Design wird auf alle Bereiche von Taskilo Webmail angewendet. Änderungen werden automatisch gespeichert.
        </p>
      </div>
    </div>
  );
}
