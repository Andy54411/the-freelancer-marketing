'use client';

import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Puzzle, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { SettingsTabProps } from './types';

interface Addon {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: 'productivity' | 'communication' | 'integration';
}

const availableAddons: Addon[] = [
  {
    id: 'calendar',
    name: 'Taskilo Kalender',
    description: 'Kalenderintegration für Termine und Ereignisse direkt in E-Mails',
    icon: 'calendar',
    enabled: true,
    category: 'productivity',
  },
  {
    id: 'tasks',
    name: 'Taskilo Aufgaben',
    description: 'Erstellen Sie Aufgaben direkt aus E-Mails',
    icon: 'tasks',
    enabled: true,
    category: 'productivity',
  },
  {
    id: 'drive',
    name: 'Taskilo Drive',
    description: 'Speichern Sie Anhänge direkt in Ihrem Cloud-Speicher',
    icon: 'drive',
    enabled: false,
    category: 'productivity',
  },
  {
    id: 'video',
    name: 'Taskilo Video',
    description: 'Videokonferenzen planen und starten',
    icon: 'video',
    enabled: false,
    category: 'communication',
  },
];

export function AddonsSettings({ isDark }: SettingsTabProps) {
  const [addons, setAddons] = useState<Addon[]>(availableAddons);

  const toggleAddon = (id: string) => {
    setAddons(addons.map(addon => 
      addon.id === id ? { ...addon, enabled: !addon.enabled } : addon
    ));
  };

  const categoryLabels: Record<string, string> = {
    productivity: 'Produktivität',
    communication: 'Kommunikation',
    integration: 'Integration',
  };

  const groupedAddons = addons.reduce((acc, addon) => {
    if (!acc[addon.category]) {
      acc[addon.category] = [];
    }
    acc[addon.category].push(addon);
    return acc;
  }, {} as Record<string, Addon[]>);

  return (
    <div className="space-y-4">
      {/* Übersicht */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Add-ons
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Add-ons erweitern Taskilo Webmail um zusätzliche Funktionen. Aktivieren oder deaktivieren Sie Add-ons nach Bedarf.
        </p>
      </div>

      {/* Add-ons nach Kategorie */}
      {Object.entries(groupedAddons).map(([category, categoryAddons]) => (
        <div key={category} className={cn(
          "py-2 border-b",
          isDark ? "border-[#3c4043]" : "border-gray-200"
        )}>
          <h4 className={cn(
            "text-xs font-medium mb-3",
            isDark ? "text-gray-400" : "text-gray-500"
          )}>
            {categoryLabels[category]}
          </h4>

          <div className="space-y-3">
            {categoryAddons.map((addon) => (
              <div 
                key={addon.id}
                className={cn(
                  "flex items-start justify-between p-3 rounded border",
                  isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded flex items-center justify-center",
                    addon.enabled ? "bg-[#14ad9f]/20" : isDark ? "bg-gray-600" : "bg-gray-200"
                  )}>
                    <Puzzle className={cn(
                      "w-4 h-4",
                      addon.enabled ? "text-[#14ad9f]" : isDark ? "text-gray-400" : "text-gray-500"
                    )} />
                  </div>
                  <div>
                    <span className={cn(
                      "text-xs font-medium block",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}>
                      {addon.name}
                    </span>
                    <span className={cn(
                      "text-xs",
                      isDark ? "text-gray-500" : "text-gray-400"
                    )}>
                      {addon.description}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={addon.enabled}
                  onCheckedChange={() => toggleAddon(addon.id)}
                  className="data-[state=checked]:bg-[#14ad9f]"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Weitere Add-ons */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h4 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Weitere Add-ons
        </h4>
        <p className={cn(
          "text-xs mb-3",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Entdecken Sie weitere Add-ons im Taskilo Marketplace.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 text-xs",
            isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
          )}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Marketplace öffnen
        </Button>
      </div>

      {/* Berechtigungen */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h4 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Add-on-Berechtigungen
        </h4>
        <p className={cn(
          "text-xs mb-3",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Add-ons können auf bestimmte Daten zugreifen, um ihre Funktionen bereitzustellen. Sie können die Berechtigungen jederzeit verwalten.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 text-xs",
            isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
          )}
        >
          Berechtigungen verwalten
        </Button>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Add-ons werden von Taskilo entwickelt und geprüft. Einige Add-ons können zusätzliche Berechtigungen erfordern.
        </p>
      </div>
    </div>
  );
}
