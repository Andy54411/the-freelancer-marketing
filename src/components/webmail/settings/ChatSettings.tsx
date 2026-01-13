'use client';

import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Video, MessageCircle, Calendar, Phone } from 'lucide-react';
import type { SettingsTabProps } from './types';

export function ChatSettings({ isDark }: SettingsTabProps) {
  return (
    <div className="space-y-4">
      {/* Chat */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Chat
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Konfigurieren Sie Ihre Chat-Einstellungen für die integrierte Nachrichtenfunktion.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className={cn("w-4 h-4", isDark ? "text-gray-400" : "text-gray-500")} />
              <div>
                <span className={cn(
                  "text-xs font-medium block",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  Chat aktivieren
                </span>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Direktnachrichten mit anderen Benutzern senden
                </span>
              </div>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4" />
              <div>
                <span className={cn(
                  "text-xs block",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  Chat-Benachrichtigungen
                </span>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Benachrichtigungen für neue Nachrichten anzeigen
                </span>
              </div>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4" />
              <div>
                <span className={cn(
                  "text-xs block",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  Status anzeigen
                </span>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Anderen Benutzern Ihren Online-Status zeigen
                </span>
              </div>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>
        </div>
      </div>

      {/* Meet / Videokonferenzen */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Videokonferenzen
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Starten Sie Videokonferenzen direkt aus Taskilo Webmail.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className={cn("w-4 h-4", isDark ? "text-gray-400" : "text-gray-500")} />
              <div>
                <span className={cn(
                  "text-xs font-medium block",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  Taskilo Meet aktivieren
                </span>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Videokonferenzen in der Seitenleiste anzeigen
                </span>
              </div>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4" />
              <div>
                <span className={cn(
                  "text-xs block",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  Meeting-Links in E-Mails
                </span>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Meeting-Link automatisch beim Verfassen hinzufügen
                </span>
              </div>
            </div>
            <Switch
              defaultChecked={false}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className={cn("w-4 h-4", isDark ? "text-gray-400" : "text-gray-500")} />
              <div>
                <span className={cn(
                  "text-xs block",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  Kalenderintegration
                </span>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Meetings automatisch im Kalender erstellen
                </span>
              </div>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>
        </div>
      </div>

      {/* Telefon */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Telefon
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Tätigen Sie Anrufe direkt aus Taskilo Webmail.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className={cn("w-4 h-4", isDark ? "text-gray-400" : "text-gray-500")} />
              <div>
                <span className={cn(
                  "text-xs font-medium block",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  Taskilo Phone aktivieren
                </span>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Telefonfunktion in der Seitenleiste anzeigen
                </span>
              </div>
            </div>
            <Switch
              defaultChecked={false}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
          </div>
        </div>

        <div className={cn(
          "mt-3 p-3 rounded border text-xs",
          isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
        )}>
          <span className={isDark ? "text-gray-400" : "text-gray-600"}>
            Taskilo Phone ist eine Premium-Funktion. Upgrade auf einen höheren Plan, um Anrufe zu tätigen.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 text-xs mt-2",
              isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
            )}
          >
            Mehr erfahren
          </Button>
        </div>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Chat- und Meet-Funktionen erfordern eine aktive Internetverbindung. Einige Funktionen sind möglicherweise nicht in allen Regionen verfügbar.
        </p>
      </div>
    </div>
  );
}
