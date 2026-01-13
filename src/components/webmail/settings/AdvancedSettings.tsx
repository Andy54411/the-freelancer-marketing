'use client';

import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle } from 'lucide-react';
import type { SettingsTabProps } from './types';

export function AdvancedSettings({ isDark }: SettingsTabProps) {
  return (
    <div className="space-y-4">
      {/* Warnung */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <div className={cn(
          "flex items-start gap-2 p-3 rounded text-xs",
          isDark ? "bg-yellow-900/30 border border-yellow-700/50" : "bg-yellow-50 border border-yellow-200"
        )}>
          <AlertTriangle className={cn(
            "w-4 h-4 mt-0.5 shrink-0",
            isDark ? "text-yellow-500" : "text-yellow-600"
          )} />
          <p className={isDark ? "text-yellow-300" : "text-yellow-800"}>
            Diese Einstellungen sind für fortgeschrittene Benutzer gedacht. Änderungen können die Funktionalität Ihres E-Mail-Kontos beeinflussen.
          </p>
        </div>
      </div>

      {/* Experimentelle Funktionen */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Experimentelle Funktionen
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Aktivieren Sie experimentelle Funktionen, die sich noch in der Entwicklung befinden.
        </p>

        <div className="space-y-3">
          {[
            {
              id: 'smart-compose',
              label: 'Smart Compose',
              description: 'KI-gestützte Textvorschläge beim Verfassen von E-Mails',
              enabled: true,
            },
            {
              id: 'quick-actions',
              label: 'Schnellaktionen',
              description: 'Schnellaktionen in der E-Mail-Vorschau anzeigen',
              enabled: true,
            },
            {
              id: 'auto-reply',
              label: 'Intelligente Antworten',
              description: 'Automatische Antwortvorschläge basierend auf dem E-Mail-Inhalt',
              enabled: false,
            },
            {
              id: 'summary',
              label: 'E-Mail-Zusammenfassung',
              description: 'Automatische Zusammenfassung langer E-Mails mit KI',
              enabled: false,
            },
          ].map((feature) => (
            <div key={feature.id} className="flex items-center justify-between">
              <div>
                <span className={cn(
                  "text-xs font-medium block",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  {feature.label}
                </span>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  {feature.description}
                </span>
              </div>
              <Switch
                defaultChecked={feature.enabled}
                className="data-[state=checked]:bg-[#14ad9f]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Vorlagen */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Vorlagen
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className={cn(
              "text-xs block",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              Vorlagen aktivieren
            </span>
            <span className={cn(
              "text-xs",
              isDark ? "text-gray-500" : "text-gray-400"
            )}>
              Speichern Sie E-Mails als Vorlagen für die Wiederverwendung
            </span>
          </div>
          <Switch
            defaultChecked={true}
            className="data-[state=checked]:bg-[#14ad9f]"
          />
        </div>
      </div>

      {/* Benutzerdefinierte Tastaturkürzel */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Benutzerdefinierte Tastaturkürzel
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className={cn(
              "text-xs block",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              Benutzerdefinierte Tastaturkürzel aktivieren
            </span>
            <span className={cn(
              "text-xs",
              isDark ? "text-gray-500" : "text-gray-400"
            )}>
              Definieren Sie eigene Tastaturkürzel für häufige Aktionen
            </span>
          </div>
          <Switch
            defaultChecked={false}
            className="data-[state=checked]:bg-[#14ad9f]"
          />
        </div>
      </div>

      {/* Auto-Expand */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Konversationen
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className={cn(
              "text-xs block",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              Automatisch erweitern
            </span>
            <span className={cn(
              "text-xs",
              isDark ? "text-gray-500" : "text-gray-400"
            )}>
              Konversationen beim Öffnen automatisch erweitern
            </span>
          </div>
          <Switch
            defaultChecked={true}
            className="data-[state=checked]:bg-[#14ad9f]"
          />
        </div>
      </div>

      {/* Nachrichtencodierung */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Nachrichtencodierung
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className={cn(
              "text-xs block",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              UTF-8 für ausgehende E-Mails verwenden
            </span>
            <span className={cn(
              "text-xs",
              isDark ? "text-gray-500" : "text-gray-400"
            )}>
            Empfohlen für internationale Zeichen
            </span>
          </div>
          <Switch
            defaultChecked={true}
            className="data-[state=checked]:bg-[#14ad9f]"
          />
        </div>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Erweiterte Einstellungen können die Leistung und das Verhalten von Taskilo Webmail beeinflussen. Bei Problemen können Sie die Standardeinstellungen wiederherstellen.
        </p>
      </div>
    </div>
  );
}
