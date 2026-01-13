'use client';

import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { HardDrive, Download, Trash2, RefreshCw } from 'lucide-react';
import type { SettingsTabProps } from './types';

export function OfflineSettings({ isDark }: SettingsTabProps) {
  return (
    <div className="space-y-4">
      {/* Offline-Modus aktivieren */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Offline-Modus
        </h3>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className={cn(
              "text-xs block",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              Offline-E-Mail aktivieren
            </span>
            <span className={cn(
              "text-xs",
              isDark ? "text-gray-500" : "text-gray-400"
            )}>
              E-Mails lesen und verfassen, wenn Sie offline sind
            </span>
          </div>
          <Switch
            defaultChecked={false}
            className="data-[state=checked]:bg-[#14ad9f]"
          />
        </div>
        <p className={cn(
          "text-xs",
          isDark ? "text-gray-500" : "text-gray-400"
        )}>
          Wenn aktiviert, werden E-Mails auf Ihrem Gerät gespeichert und synchronisiert, sobald Sie wieder online sind.
        </p>
      </div>

      {/* Synchronisierungseinstellungen */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Synchronisierungseinstellungen
        </h3>

        <div className="space-y-3">
          <div>
            <span className={cn(
              "text-xs block mb-2",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              Synchronisierungszeitraum:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: '7', label: '7 Tage' },
                { value: '14', label: '14 Tage' },
                { value: '30', label: '30 Tage' },
                { value: '90', label: '90 Tage' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-center px-3 py-1.5 rounded-md text-xs cursor-pointer border",
                    isDark
                      ? "border-[#3c4043] hover:bg-[#3c4043]"
                      : "border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <input
                    type="radio"
                    name="sync-period"
                    value={option.value}
                    defaultChecked={option.value === '30'}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={cn(
              "text-xs",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              Anhänge offline verfügbar machen
            </span>
            <Switch
              defaultChecked={false}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>
        </div>
      </div>

      {/* Speichernutzung */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Speichernutzung
        </h3>

        <div className={cn(
          "p-3 rounded-lg flex items-center gap-3",
          isDark ? "bg-[#2d2e30]" : "bg-gray-50"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isDark ? "bg-[#3c4043]" : "bg-gray-200"
          )}>
            <HardDrive className={cn(
              "w-5 h-5",
              isDark ? "text-gray-400" : "text-gray-500"
            )} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className={cn(
                "text-xs",
                isDark ? "text-gray-300" : "text-gray-700"
              )}>
                Offline-Speicher
              </span>
              <span className={cn(
                "text-xs",
                isDark ? "text-gray-400" : "text-gray-500"
              )}>
                0 MB verwendet
              </span>
            </div>
            <div className={cn(
              "w-full h-2 rounded-full",
              isDark ? "bg-[#3c4043]" : "bg-gray-200"
            )}>
              <div
                className="h-full rounded-full bg-[#14ad9f]"
                style={{ width: '0%' }}
              />
            </div>
            <span className={cn(
              "text-xs",
              isDark ? "text-gray-500" : "text-gray-400"
            )}>
              Maximal 500 MB verfügbar
            </span>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Aktionen
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
            <Download className="w-3.5 h-3.5 mr-2" />
            Jetzt synchronisieren
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start text-xs h-8",
              isDark && "border-[#3c4043] bg-transparent hover:bg-[#3c4043]"
            )}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Offline-Daten aktualisieren
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start text-xs h-8 text-red-500 hover:text-red-600",
              isDark && "border-[#3c4043] bg-transparent hover:bg-[#3c4043]"
            )}
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Offline-Daten löschen
          </Button>
        </div>
      </div>

      {/* Sicherheit */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Sicherheit
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className={cn(
                "text-xs block",
                isDark ? "text-gray-300" : "text-gray-700"
              )}>
                Offline-Daten bei Abmeldung löschen
              </span>
              <span className={cn(
                "text-xs",
                isDark ? "text-gray-500" : "text-gray-400"
              )}>
                Empfohlen für gemeinsam genutzte Computer
              </span>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>
        </div>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Der Offline-Modus erfordert einen modernen Browser mit Service Worker-Unterstützung. Die Offline-Daten werden lokal auf diesem Gerät gespeichert.
        </p>
      </div>
    </div>
  );
}
