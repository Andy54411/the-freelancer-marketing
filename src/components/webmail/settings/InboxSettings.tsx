'use client';

import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import type { SettingsTabProps } from './types';

export function InboxSettings({ settings, onSettingsChange, isDark }: SettingsTabProps) {
  return (
    <div className="space-y-4">
      {/* Posteingangstyp */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Posteingangstyp
        </h3>
        <div className="space-y-2">
          {[
            { value: 'default', label: 'Standard', description: 'Neueste E-Mails werden zuerst angezeigt' },
            { value: 'important-first', label: 'Wichtige zuerst', description: 'Wichtige E-Mails werden oben angezeigt' },
            { value: 'unread-first', label: 'Ungelesene zuerst', description: 'Ungelesene E-Mails werden oben angezeigt' },
            { value: 'starred-first', label: 'Markierte zuerst', description: 'Markierte E-Mails werden oben angezeigt' },
            { value: 'priority', label: 'Prioritätsposteingang', description: 'KI sortiert E-Mails nach Wichtigkeit' },
          ].map((option) => (
            <label 
              key={option.value}
              className={cn(
                "flex items-start gap-2 p-2 rounded cursor-pointer",
                settings.inbox.type === option.value 
                  ? isDark ? "bg-teal-900/30" : "bg-teal-50"
                  : isDark ? "hover:bg-[#3c4043]" : "hover:bg-gray-50"
              )}
            >
              <input
                type="radio"
                name="inboxType"
                checked={settings.inbox.type === option.value}
                onChange={() => onSettingsChange({ 
                  ...settings, 
                  inbox: { ...settings.inbox, type: option.value as typeof settings.inbox.type } 
                })}
                className="w-3 h-3 mt-0.5"
              />
              <div>
                <span className={cn(
                  "text-xs font-medium block",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  {option.label}
                </span>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  {option.description}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Kategorien */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Kategorien
        </h3>
        <p className={cn(
          "text-xs mb-3",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Kategorien helfen dabei, E-Mails automatisch zu sortieren und den Posteingang übersichtlich zu halten.
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className={cn(
                "text-xs font-medium block",
                isDark ? "text-gray-300" : "text-gray-700"
              )}>
                Kategorien aktivieren
              </span>
              <span className={cn(
                "text-xs",
                isDark ? "text-gray-500" : "text-gray-400"
              )}>
                E-Mails werden automatisch in Kategorien sortiert
              </span>
            </div>
            <Switch
              checked={settings.inbox.categories}
              onCheckedChange={(checked) => onSettingsChange({ 
                ...settings, 
                inbox: { ...settings.inbox, categories: checked } 
              })}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>

          {settings.inbox.categories && (
            <div className={cn(
              "pl-4 space-y-2 pt-2 border-l-2",
              isDark ? "border-[#3c4043]" : "border-gray-200"
            )}>
              {[
                { key: 'promotionsCategory', label: 'Werbung', description: 'Angebote, Newsletter' },
                { key: 'socialCategory', label: 'Soziale Netzwerke', description: 'Updates von sozialen Netzwerken' },
                { key: 'updatesCategory', label: 'Benachrichtigungen', description: 'Automatische Benachrichtigungen' },
                { key: 'forumsCategory', label: 'Foren', description: 'Diskussionsgruppen und Foren' },
              ].map((category) => (
                <div key={category.key} className="flex items-center justify-between">
                  <div>
                    <span className={cn(
                      "text-xs block",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}>
                      {category.label}
                    </span>
                    <span className={cn(
                      "text-xs",
                      isDark ? "text-gray-500" : "text-gray-400"
                    )}>
                      {category.description}
                    </span>
                  </div>
                  <Switch
                    checked={settings.inbox[category.key as keyof typeof settings.inbox] as boolean}
                    onCheckedChange={(checked) => onSettingsChange({ 
                      ...settings, 
                      inbox: { ...settings.inbox, [category.key]: checked } 
                    })}
                    className="data-[state=checked]:bg-[#14ad9f]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lesebereich */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Vorschau-Bereich
        </h3>
        <p className={cn(
          "text-xs mb-3",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Wählen Sie, wie E-Mails in der Vorschau angezeigt werden sollen.
        </p>
        
        <div className="flex gap-4">
          {[
            { value: 'none', label: 'Keine Vorschau' },
            { value: 'right', label: 'Rechts' },
            { value: 'bottom', label: 'Unten' },
          ].map((option) => (
            <label 
              key={option.value}
              className={cn(
                "flex items-center gap-2 text-xs cursor-pointer",
                isDark ? "text-gray-300" : "text-gray-700"
              )}
            >
              <input
                type="radio"
                name="readingPane"
                checked={false} // Placeholder - würde mit separatem State funktionieren
                onChange={() => {}}
                className="w-3 h-3"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* Dichte */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Anzeigedichte
        </h3>
        
        <div className="flex gap-6">
          {[
            { value: 'default', label: 'Standard' },
            { value: 'comfortable', label: 'Komfortabel' },
            { value: 'compact', label: 'Kompakt' },
          ].map((option) => (
            <label 
              key={option.value}
              className={cn(
                "flex items-center gap-2 text-xs cursor-pointer",
                isDark ? "text-gray-300" : "text-gray-700"
              )}
            >
              <input
                type="radio"
                name="density"
                checked={false} // Placeholder
                onChange={() => {}}
                className="w-3 h-3"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Änderungen am Posteingangstyp werden sofort wirksam. Kategorien können jederzeit aktiviert oder deaktiviert werden.
        </p>
      </div>
    </div>
  );
}
