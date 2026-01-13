'use client';

import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SettingsTabProps } from './types';

export function ForwardingSettings({ settings, onSettingsChange, isDark, session }: SettingsTabProps) {
  return (
    <div className="space-y-4">
      {/* Weiterleitung */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Weiterleitung
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Leiten Sie eingehende E-Mails automatisch an eine andere Adresse weiter.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.forwarding.enabled}
              onCheckedChange={(checked) => onSettingsChange({ 
                ...settings, 
                forwarding: { ...settings.forwarding, enabled: checked } 
              })}
              className="data-[state=checked]:bg-[#14ad9f]"
            />
            <span className={cn(
              "text-xs",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              Weiterleitung aktivieren
            </span>
          </div>

          {settings.forwarding.enabled && (
            <div className="space-y-3 pl-0">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
                  Kopie aller eingehenden E-Mails weiterleiten an:
                </span>
                <Input
                  value={settings.forwarding.address}
                  onChange={(e) => onSettingsChange({ 
                    ...settings, 
                    forwarding: { ...settings.forwarding, address: e.target.value } 
                  })}
                  placeholder="weiterleitung@example.com"
                  className={cn(
                    "h-7 text-xs w-64",
                    isDark ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
                  )}
                />
              </div>
              <label className={cn(
                "flex items-center gap-2 text-xs cursor-pointer",
                isDark ? "text-gray-300" : "text-gray-700"
              )}>
                <input
                  type="checkbox"
                  checked={settings.forwarding.keepCopy}
                  onChange={(e) => onSettingsChange({ 
                    ...settings, 
                    forwarding: { ...settings.forwarding, keepCopy: e.target.checked } 
                  })}
                  className="w-3 h-3"
                />
                Kopie im Posteingang behalten
              </label>
            </div>
          )}
        </div>
      </div>

      {/* POP-Download */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          POP-Download
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Verwenden Sie POP, um E-Mails in einem anderen E-Mail-Programm wie Outlook oder Thunderbird abzurufen.
        </p>

        <div className="space-y-2">
          <label className={cn(
            "flex items-center gap-2 text-xs cursor-pointer",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            <input type="radio" name="pop" className="w-3 h-3" defaultChecked />
            POP für alle E-Mails aktivieren (auch bereits heruntergeladene)
          </label>
          <label className={cn(
            "flex items-center gap-2 text-xs cursor-pointer",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            <input type="radio" name="pop" className="w-3 h-3" />
            POP für ab jetzt eingehende E-Mails aktivieren
          </label>
          <label className={cn(
            "flex items-center gap-2 text-xs cursor-pointer",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            <input type="radio" name="pop" className="w-3 h-3" />
            POP deaktivieren
          </label>
        </div>

        <div className={cn(
          "mt-4 p-3 rounded border text-xs",
          isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
        )}>
          <h4 className={cn(
            "font-medium mb-2",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            POP-Servereinstellungen
          </h4>
          <div className="space-y-1">
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              Server: mail.taskilo.de
            </p>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              Port: 995 (SSL)
            </p>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              Benutzername: {session?.email}
            </p>
          </div>
        </div>
      </div>

      {/* IMAP-Zugriff */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          IMAP-Zugriff
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          IMAP ermöglicht den Zugriff auf Ihre E-Mails von mehreren Geräten aus.
        </p>

        <div className="space-y-2">
          <label className={cn(
            "flex items-center gap-2 text-xs cursor-pointer",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            <input type="radio" name="imap" className="w-3 h-3" defaultChecked />
            IMAP aktivieren
          </label>
          <label className={cn(
            "flex items-center gap-2 text-xs cursor-pointer",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            <input type="radio" name="imap" className="w-3 h-3" />
            IMAP deaktivieren
          </label>
        </div>

        <div className={cn(
          "mt-4 p-3 rounded border text-xs",
          isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
        )}>
          <h4 className={cn(
            "font-medium mb-2",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            IMAP-Servereinstellungen
          </h4>
          <div className="space-y-1">
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              Eingangsserver: mail.taskilo.de
            </p>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              Port: 993 (SSL)
            </p>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              Ausgangsserver: mail.taskilo.de
            </p>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              SMTP-Port: 465 (SSL) oder 587 (STARTTLS)
            </p>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              Benutzername: {session?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Ordnergröße */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Ordnergröße
        </h3>
        <p className={cn(
          "text-xs mb-3",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Legen Sie fest, wie viele Nachrichten IMAP-Clients pro Ordner herunterladen sollen.
        </p>

        <div className="flex items-center gap-2">
          <span className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
            Begrenzen auf:
          </span>
          <Select defaultValue="1000">
            <SelectTrigger className={cn(
              "h-7 text-xs w-32",
              isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "bg-white border-gray-300"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-[#3c4043] border-[#5f6368]" : ""}>
              {[100, 500, 1000, 2000, 5000, 10000].map((num) => (
                <SelectItem key={num} value={num.toString()} className={cn("text-xs", isDark && "text-white focus:bg-[#5f6368]")}>
                  {num.toLocaleString('de-DE')} Nachrichten
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Änderungen an POP- und IMAP-Einstellungen können einige Minuten dauern, bis sie wirksam werden.
        </p>
      </div>
    </div>
  );
}
