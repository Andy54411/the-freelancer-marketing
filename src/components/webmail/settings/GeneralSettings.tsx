'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, AlertCircle, Info, Check, HelpCircle, Plus, Trash2, GripVertical } from 'lucide-react';
import type { SettingsTabProps, EmailSignature } from './types';

// Hilfsfunktion für Radio-Button Styling
const RadioOption = ({ 
  name, 
  value, 
  checked, 
  onChange, 
  label, 
  description,
  isDark 
}: { 
  name: string; 
  value: string; 
  checked: boolean; 
  onChange: () => void; 
  label: string;
  description?: string;
  isDark: boolean;
}) => (
  <label className={cn("flex items-start gap-2 text-xs cursor-pointer py-0.5", isDark ? "text-gray-300" : "text-gray-700")}>
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="w-3.5 h-3.5 mt-0.5 accent-[#14ad9f]"
    />
    <div>
      <span>{label}</span>
      {description && (
        <span className={cn("block text-xs mt-0.5", isDark ? "text-gray-500" : "text-gray-500")}>
          {description}
        </span>
      )}
    </div>
  </label>
);

// Checkbox Option
const CheckboxOption = ({ 
  checked, 
  onChange, 
  label, 
  description,
  isDark 
}: { 
  checked: boolean; 
  onChange: (checked: boolean) => void; 
  label: string;
  description?: string;
  isDark: boolean;
}) => (
  <label className={cn("flex items-start gap-2 text-xs cursor-pointer py-0.5", isDark ? "text-gray-300" : "text-gray-700")}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-3.5 h-3.5 mt-0.5 accent-[#14ad9f]"
    />
    <div>
      <span>{label}</span>
      {description && (
        <span className={cn("block text-xs mt-0.5", isDark ? "text-gray-500" : "text-gray-500")}>
          {description}
        </span>
      )}
    </div>
  </label>
);

// Settings-Zeile Layout
const SettingsRow = ({ 
  label, 
  children, 
  isDark,
  helpLink
}: { 
  label: string; 
  children: React.ReactNode; 
  isDark: boolean;
  helpLink?: string;
}) => (
  <div className={cn(
    "py-3 border-b flex",
    isDark ? "border-[#3c4043]" : "border-gray-200"
  )}>
    <div className={cn(
      "text-xs w-48 shrink-0 pt-0.5",
      isDark ? "text-gray-400" : "text-gray-600"
    )}>
      {label}
      {helpLink && (
        <a href={helpLink} target="_blank" rel="noopener noreferrer" className="block text-[#14ad9f] hover:underline mt-0.5">
          Weitere Informationen
        </a>
      )}
    </div>
    <div className="flex-1 min-w-0">
      {children}
    </div>
  </div>
);

// Stern-Icon basierend auf Typ
const StarIcon = ({ color, icon }: { color: string; icon: string }) => {
  const iconStyle = { color, fill: color };
  switch (icon) {
    case 'exclamation':
      return <AlertCircle className="w-5 h-5" style={iconStyle} />;
    case 'info':
      return <Info className="w-5 h-5" style={iconStyle} />;
    case 'check':
      return <Check className="w-5 h-5" style={iconStyle} />;
    case 'question':
      return <HelpCircle className="w-5 h-5" style={iconStyle} />;
    default:
      return <Star className="w-5 h-5" style={iconStyle} />;
  }
};

export function GeneralSettings({ settings, onSettingsChange, isDark }: SettingsTabProps) {
  const [newSignatureName, setNewSignatureName] = useState('');

  // Signatur erstellen
  const handleCreateSignature = () => {
    if (!newSignatureName.trim()) return;
    const newSig: EmailSignature = {
      id: `sig-${Date.now()}`,
      name: newSignatureName.trim(),
      content: '',
      isDefault: settings.signatures.length === 0,
    };
    onSettingsChange({
      signatures: [...settings.signatures, newSig],
    });
    setNewSignatureName('');
  };

  // Signatur löschen
  const handleDeleteSignature = (id: string) => {
    onSettingsChange({
      signatures: settings.signatures.filter(s => s.id !== id),
    });
  };

  // Signatur aktualisieren
  const handleUpdateSignature = (id: string, content: string) => {
    onSettingsChange({
      signatures: settings.signatures.map(s => 
        s.id === id ? { ...s, content } : s
      ),
    });
  };

  return (
    <div className="max-w-4xl">
      {/* Sprache */}
      <SettingsRow label="Sprache:" isDark={isDark}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs", isDark ? "text-gray-300" : "text-gray-700")}>
            Anzeigesprache:
          </span>
          <Select
            value={settings.language}
            onValueChange={(value) => onSettingsChange({ language: value })}
          >
            <SelectTrigger className={cn(
              "h-7 text-xs w-32",
              isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "bg-white border-gray-300"
            )}>
              <SelectValue placeholder="Sprache wählen">
                {settings.language === 'de' && 'Deutsch'}
                {settings.language === 'en' && 'English'}
                {settings.language === 'fr' && 'Français'}
                {settings.language === 'es' && 'Español'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-[#3c4043] border-[#5f6368]" : ""}>
              <SelectItem value="de" className={cn("text-xs", isDark && "text-white focus:bg-[#5f6368]")}>Deutsch</SelectItem>
              <SelectItem value="en" className={cn("text-xs", isDark && "text-white focus:bg-[#5f6368]")}>English</SelectItem>
              <SelectItem value="fr" className={cn("text-xs", isDark && "text-white focus:bg-[#5f6368]")}>Français</SelectItem>
              <SelectItem value="es" className={cn("text-xs", isDark && "text-white focus:bg-[#5f6368]")}>Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="mt-3">
          <CheckboxOption
            checked={settings.inputToolsEnabled}
            onChange={(checked) => onSettingsChange({ inputToolsEnabled: checked })}
            label="Eingabetools aktivieren"
            description="Verschiedene Texteingabetools ermöglichen Ihnen die Eingabe von Text in der Sprache Ihrer Wahl."
            isDark={isDark}
          />
        </div>
        
        <div className="mt-2 ml-5 space-y-1">
          <RadioOption
            name="rtlSupport"
            value="disabled"
            checked={!settings.rtlSupport}
            onChange={() => onSettingsChange({ rtlSupport: false })}
            label="Unterstützung für Sprachen, die von rechts nach links ausgerichtet sind, deaktivieren"
            isDark={isDark}
          />
          <RadioOption
            name="rtlSupport"
            value="enabled"
            checked={settings.rtlSupport}
            onChange={() => onSettingsChange({ rtlSupport: true })}
            label="Unterstützung für Sprachen, die von rechts nach links ausgerichtet sind, aktivieren"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Nachrichtenzahl pro Seite */}
      <SettingsRow label="Nachrichtenzahl pro Seite:" isDark={isDark}>
        <div className="flex items-center gap-2">
          <Select
            value={settings.maxPageSize.toString()}
            onValueChange={(value) => onSettingsChange({ maxPageSize: parseInt(value) })}
          >
            <SelectTrigger className={cn(
              "h-7 text-xs w-20",
              isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "bg-white border-gray-300"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-[#3c4043] border-[#5f6368]" : ""}>
              {[10, 15, 20, 25, 50, 100].map((num) => (
                <SelectItem key={num} value={num.toString()} className={cn("text-xs", isDark && "text-white focus:bg-[#5f6368]")}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className={cn("text-xs", isDark ? "text-gray-300" : "text-gray-700")}>
            Konversationen pro Seite anzeigen
          </span>
        </div>
      </SettingsRow>

      {/* E-Mail zurückrufen */}
      <SettingsRow label="E-Mail zurückrufen:" isDark={isDark}>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs", isDark ? "text-gray-300" : "text-gray-700")}>
            Rückruffrist:
          </span>
          <Select
            value={settings.undoSendDelay.toString()}
            onValueChange={(value) => onSettingsChange({ undoSendDelay: parseInt(value) })}
          >
            <SelectTrigger className={cn(
              "h-7 text-xs w-16",
              isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "bg-white border-gray-300"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? "bg-[#3c4043] border-[#5f6368]" : ""}>
              {[5, 10, 20, 30].map((num) => (
                <SelectItem key={num} value={num.toString()} className={cn("text-xs", isDark && "text-white focus:bg-[#5f6368]")}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className={cn("text-xs", isDark ? "text-gray-300" : "text-gray-700")}>
            Sekunden
          </span>
        </div>
      </SettingsRow>

      {/* Standard-Antwortmodus */}
      <SettingsRow label="Standard-Antwortmodus:" isDark={isDark} helpLink="#">
        <div className="space-y-1">
          <RadioOption
            name="replyBehavior"
            value="reply"
            checked={settings.defaultReplyBehavior === 'reply'}
            onChange={() => onSettingsChange({ defaultReplyBehavior: 'reply' })}
            label="Antworten"
            isDark={isDark}
          />
          <RadioOption
            name="replyBehavior"
            value="reply-all"
            checked={settings.defaultReplyBehavior === 'reply-all'}
            onChange={() => onSettingsChange({ defaultReplyBehavior: 'reply-all' })}
            label="Allen antworten"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Aktionen über den Mauszeiger */}
      <SettingsRow label="Aktionen über den Mauszeiger:" isDark={isDark}>
        <div className="space-y-1">
          <RadioOption
            name="hoverActions"
            value="enabled"
            checked={settings.hoverActions}
            onChange={() => onSettingsChange({ hoverActions: true })}
            label="Aktionen über den Mauszeiger aktivieren"
            description="Über den Mauszeiger erhalten Sie im Handumdrehen Zugriff auf die Funktionen, mit denen Sie E-Mails archivieren, löschen, als gelesen markieren oder zurückstellen können."
            isDark={isDark}
          />
          <RadioOption
            name="hoverActions"
            value="disabled"
            checked={!settings.hoverActions}
            onChange={() => onSettingsChange({ hoverActions: false })}
            label="Aktionen über den Mauszeiger deaktivieren"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Senden und archivieren */}
      <SettingsRow label="Senden und archivieren:" isDark={isDark} helpLink="#">
        <div className="space-y-1">
          <RadioOption
            name="sendAndArchive"
            value="show"
            checked={settings.sendAndArchive}
            onChange={() => onSettingsChange({ sendAndArchive: true })}
            label="&quot;Senden und archivieren&quot; in Antworten anzeigen"
            isDark={isDark}
          />
          <RadioOption
            name="sendAndArchive"
            value="hide"
            checked={!settings.sendAndArchive}
            onChange={() => onSettingsChange({ sendAndArchive: false })}
            label="&quot;Senden und archivieren&quot; in Antworten ausblenden"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Standardtextstil */}
      <SettingsRow label="Standardtextstil:" isDark={isDark}>
        <div className="space-y-2">
          <p className={cn("text-xs", isDark ? "text-gray-500" : "text-gray-500")}>
            (Über die Schaltfläche zum Entfernen der Formatierung in der Symbolleiste können Sie den Standardtextstil zurücksetzen)
          </p>
          <div className={cn(
            "flex items-center gap-2 p-2 border rounded",
            isDark ? "bg-[#3c4043] border-[#5f6368]" : "bg-white border-gray-300"
          )}>
            <Select
              value={settings.defaultTextStyle.fontFamily}
              onValueChange={(value) => onSettingsChange({ 
                defaultTextStyle: { ...settings.defaultTextStyle, fontFamily: value } 
              })}
            >
              <SelectTrigger className={cn(
                "h-7 text-xs w-28",
                isDark ? "bg-[#2d2e30] border-[#5f6368] text-white" : "bg-gray-50 border-gray-300"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? "bg-[#3c4043] border-[#5f6368]" : ""}>
                <SelectItem value="Sans Serif" className={cn("text-xs", isDark && "text-white")}>Sans Serif</SelectItem>
                <SelectItem value="Serif" className={cn("text-xs", isDark && "text-white")}>Serif</SelectItem>
                <SelectItem value="Monospace" className={cn("text-xs", isDark && "text-white")}>Monospace</SelectItem>
                <SelectItem value="Arial" className={cn("text-xs", isDark && "text-white")}>Arial</SelectItem>
                <SelectItem value="Verdana" className={cn("text-xs", isDark && "text-white")}>Verdana</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={settings.defaultTextStyle.fontSize}
              onValueChange={(value) => onSettingsChange({ 
                defaultTextStyle: { ...settings.defaultTextStyle, fontSize: value } 
              })}
            >
              <SelectTrigger className={cn(
                "h-7 text-xs w-20",
                isDark ? "bg-[#2d2e30] border-[#5f6368] text-white" : "bg-gray-50 border-gray-300"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? "bg-[#3c4043] border-[#5f6368]" : ""}>
                <SelectItem value="small" className={cn("text-xs", isDark && "text-white")}>Klein</SelectItem>
                <SelectItem value="normal" className={cn("text-xs", isDark && "text-white")}>Normal</SelectItem>
                <SelectItem value="large" className={cn("text-xs", isDark && "text-white")}>Groß</SelectItem>
                <SelectItem value="huge" className={cn("text-xs", isDark && "text-white")}>Sehr groß</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="color"
              value={settings.defaultTextStyle.textColor}
              onChange={(e) => onSettingsChange({ 
                defaultTextStyle: { ...settings.defaultTextStyle, textColor: e.target.value } 
              })}
              className="w-7 h-7 rounded cursor-pointer"
            />
          </div>
          <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
            So sieht Ihr E-Mail-Text aus:
          </p>
        </div>
      </SettingsRow>

      {/* Bilder */}
      <SettingsRow label="Bilder:" isDark={isDark}>
        <div className="space-y-1">
          <RadioOption
            name="externalImages"
            value="always"
            checked={settings.externalImages === 'always'}
            onChange={() => onSettingsChange({ externalImages: 'always' })}
            label="Externe Bilder immer anzeigen"
            isDark={isDark}
          />
          <RadioOption
            name="externalImages"
            value="ask"
            checked={settings.externalImages === 'ask'}
            onChange={() => onSettingsChange({ externalImages: 'ask' })}
            label="Vor dem Anzeigen externer Bilder fragen"
            description="Mit dieser Option werden auch dynamische E-Mails deaktiviert."
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Dynamische E-Mails */}
      <SettingsRow label="Dynamische E-Mails:" isDark={isDark} helpLink="#">
        <CheckboxOption
          checked={settings.dynamicEmail}
          onChange={(checked) => onSettingsChange({ dynamicEmail: checked })}
          label="Dynamische E-Mails aktivieren"
          description="Dynamische E-Mail-Inhalte anzeigen, wenn verfügbar."
          isDark={isDark}
        />
      </SettingsRow>

      {/* Grammatik */}
      <SettingsRow label="Grammatik:" isDark={isDark}>
        <div className="space-y-1">
          <RadioOption
            name="grammar"
            value="enabled"
            checked={settings.grammarSuggestions}
            onChange={() => onSettingsChange({ grammarSuggestions: true })}
            label="Grammatikvorschläge aktiviert"
            isDark={isDark}
          />
          <RadioOption
            name="grammar"
            value="disabled"
            checked={!settings.grammarSuggestions}
            onChange={() => onSettingsChange({ grammarSuggestions: false })}
            label="Grammatikvorschläge deaktiviert"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Rechtschreibung */}
      <SettingsRow label="Rechtschreibung:" isDark={isDark}>
        <div className="space-y-1">
          <RadioOption
            name="spelling"
            value="enabled"
            checked={settings.spellCheck}
            onChange={() => onSettingsChange({ spellCheck: true })}
            label="Rechtschreibvorschläge aktiviert"
            isDark={isDark}
          />
          <RadioOption
            name="spelling"
            value="disabled"
            checked={!settings.spellCheck}
            onChange={() => onSettingsChange({ spellCheck: false })}
            label="Rechtschreibvorschläge deaktiviert"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Autokorrektur */}
      <SettingsRow label="Autokorrektur:" isDark={isDark}>
        <div className="space-y-1">
          <RadioOption
            name="autocorrect"
            value="enabled"
            checked={settings.autocorrect}
            onChange={() => onSettingsChange({ autocorrect: true })}
            label="Autokorrektur ein"
            isDark={isDark}
          />
          <RadioOption
            name="autocorrect"
            value="disabled"
            checked={!settings.autocorrect}
            onChange={() => onSettingsChange({ autocorrect: false })}
            label="Autokorrektur aus"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Intelligentes Schreiben */}
      <SettingsRow label="Intelligentes Schreiben:" isDark={isDark}>
        <p className={cn("text-xs mb-2", isDark ? "text-gray-500" : "text-gray-500")}>
          (Beim Schreiben einer E-Mail wird Ihnen Text vorgegeben)
        </p>
        <div className="space-y-1">
          <RadioOption
            name="smartCompose"
            value="enabled"
            checked={settings.smartCompose}
            onChange={() => onSettingsChange({ smartCompose: true })}
            label="Textvorschläge ein"
            isDark={isDark}
          />
          <RadioOption
            name="smartCompose"
            value="disabled"
            checked={!settings.smartCompose}
            onChange={() => onSettingsChange({ smartCompose: false })}
            label="Textvorschläge aus"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Personalisierung Intelligentes Schreiben */}
      <SettingsRow label="Personalisierung:" isDark={isDark}>
        <p className={cn("text-xs mb-2", isDark ? "text-gray-500" : "text-gray-500")}>
          (Die Funktion &quot;Intelligentes Schreiben&quot; wird gemäß Ihrem persönlichen Schreibstil personalisiert)
        </p>
        <div className="space-y-1">
          <RadioOption
            name="smartComposePersonalization"
            value="enabled"
            checked={settings.smartComposePersonalization}
            onChange={() => onSettingsChange({ smartComposePersonalization: true })}
            label="Personalisierung ein"
            isDark={isDark}
          />
          <RadioOption
            name="smartComposePersonalization"
            value="disabled"
            checked={!settings.smartComposePersonalization}
            onChange={() => onSettingsChange({ smartComposePersonalization: false })}
            label="Personalisierung deaktiviert"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Konversationsansicht */}
      <SettingsRow label="Konversationsansicht:" isDark={isDark}>
        <p className={cn("text-xs mb-2", isDark ? "text-gray-500" : "text-gray-500")}>
          (Legt fest, ob E-Mails mit demselben Thema gruppiert werden sollen.)
        </p>
        <div className="space-y-1">
          <RadioOption
            name="conversationView"
            value="enabled"
            checked={settings.conversationView}
            onChange={() => onSettingsChange({ conversationView: true })}
            label="Konversationsansicht aktiviert"
            isDark={isDark}
          />
          <RadioOption
            name="conversationView"
            value="disabled"
            checked={!settings.conversationView}
            onChange={() => onSettingsChange({ conversationView: false })}
            label="Konversationsansicht deaktiviert"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Automatische Erinnerungen */}
      <SettingsRow label="Automatische Erinnerungen:" isDark={isDark} helpLink="#">
        <div className="space-y-2">
          <CheckboxOption
            checked={settings.nudges.suggestReplies}
            onChange={(checked) => onSettingsChange({ 
              nudges: { ...settings.nudges, suggestReplies: checked } 
            })}
            label="E-Mails für Beantwortung vorschlagen"
            description="E-Mails, die Sie möglicherweise vergessen haben zu beantworten, werden oben im Posteingang angezeigt"
            isDark={isDark}
          />
          <CheckboxOption
            checked={settings.nudges.suggestFollowUps}
            onChange={(checked) => onSettingsChange({ 
              nudges: { ...settings.nudges, suggestFollowUps: checked } 
            })}
            label="E-Mails für Abklärung vorschlagen"
            description="Gesendete E-Mails, auf die Sie möglicherweise noch einmal zurückkommen möchten, werden oben im Posteingang angezeigt"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Intelligente Antwort */}
      <SettingsRow label="Intelligente Antwort:" isDark={isDark}>
        <p className={cn("text-xs mb-2", isDark ? "text-gray-500" : "text-gray-500")}>
          (Vorgeschlagene Antworten anzeigen, wenn verfügbar)
        </p>
        <div className="space-y-1">
          <RadioOption
            name="smartReply"
            value="enabled"
            checked={settings.smartReply}
            onChange={() => onSettingsChange({ smartReply: true })}
            label="&quot;Intelligente Antwort&quot; ein"
            isDark={isDark}
          />
          <RadioOption
            name="smartReply"
            value="disabled"
            checked={!settings.smartReply}
            onChange={() => onSettingsChange({ smartReply: false })}
            label="&quot;Intelligente Antwort&quot; aus"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Smarte Funktionen */}
      <SettingsRow label="Smarte Funktionen:" isDark={isDark} helpLink="#">
        <CheckboxOption
          checked={settings.smartFeatures}
          onChange={(checked) => onSettingsChange({ smartFeatures: checked })}
          label="Smarte Funktionen aktivieren"
          description="Wenn Sie diese Einstellung aktivieren, stimmen Sie zu, dass Ihre Inhalte und Aktivitäten verwendet werden dürfen, um smarte Funktionen bereitzustellen und Ihre Umgebung zu personalisieren."
          isDark={isDark}
        />
      </SettingsRow>

      {/* Paketverfolgung */}
      <SettingsRow label="Paketverfolgung:" isDark={isDark} helpLink="#">
        <CheckboxOption
          checked={settings.packageTracking}
          onChange={(checked) => onSettingsChange({ packageTracking: checked })}
          label="Paketverfolgung aktivieren"
          description="Sie werden hier informiert, wenn sich der Status ändert."
          isDark={isDark}
        />
      </SettingsRow>

      {/* Desktop-Benachrichtigungen */}
      <SettingsRow label="Desktop-Benachrichtigungen:" isDark={isDark} helpLink="#">
        <p className={cn("text-xs mb-2", isDark ? "text-gray-500" : "text-gray-500")}>
          (Ermöglicht das Anzeigen von Pop-up-Benachrichtigungen auf Ihrem Desktop, wenn neue E-Mails eingehen.)
        </p>
        <div className="space-y-1">
          <RadioOption
            name="desktopNotifications"
            value="new-mail"
            checked={settings.desktopNotifications === 'new-mail'}
            onChange={() => onSettingsChange({ desktopNotifications: 'new-mail' })}
            label="Benachrichtigung über neue E-Mails aktivieren"
            description="Ich möchte beim Eingang neuer Nachrichten in meinem Posteingang benachrichtigt werden."
            isDark={isDark}
          />
          <RadioOption
            name="desktopNotifications"
            value="important"
            checked={settings.desktopNotifications === 'important'}
            onChange={() => onSettingsChange({ desktopNotifications: 'important' })}
            label="Benachrichtigung über wichtige E-Mails aktivieren"
            description="Nur benachrichtigen, wenn eine wichtige Nachricht in meinem Posteingang eingeht"
            isDark={isDark}
          />
          <RadioOption
            name="desktopNotifications"
            value="off"
            checked={settings.desktopNotifications === 'off'}
            onChange={() => onSettingsChange({ desktopNotifications: 'off' })}
            label="E-Mail-Benachrichtigungen deaktivieren"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Sterne */}
      <SettingsRow label="Sterne:" isDark={isDark}>
        <p className={cn("text-xs mb-3", isDark ? "text-gray-500" : "text-gray-500")}>
          Ziehen Sie die Sterne zwischen die Listen. Die Sterne rotieren dann mit jedem Klick in der unten angegebenen Reihenfolge.
        </p>
        
        <div className="space-y-3">
          <div className={cn("text-xs font-medium", isDark ? "text-gray-400" : "text-gray-600")}>
            Voreinstellungen:
          </div>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSettingsChange({ 
                starConfig: settings.starConfig.map((s, i) => ({ ...s, inUse: i === 0 })) 
              })}
              className={cn("text-xs h-7", isDark ? "text-gray-300" : "text-gray-700")}
            >
              1 Stern
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSettingsChange({ 
                starConfig: settings.starConfig.map((s, i) => ({ ...s, inUse: i < 4 })) 
              })}
              className={cn("text-xs h-7", isDark ? "text-gray-300" : "text-gray-700")}
            >
              4 Sterne
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSettingsChange({ 
                starConfig: settings.starConfig.map(s => ({ ...s, inUse: true })) 
              })}
              className={cn("text-xs h-7", isDark ? "text-gray-300" : "text-gray-700")}
            >
              Alle Sterne
            </Button>
          </div>
          
          <div>
            <div className={cn("text-xs font-medium mb-2", isDark ? "text-gray-400" : "text-gray-600")}>
              In Verwendung:
            </div>
            <div className={cn(
              "flex flex-wrap gap-2 min-h-10 p-2 border rounded",
              isDark ? "bg-[#3c4043] border-[#5f6368]" : "bg-gray-50 border-gray-300"
            )}>
              {settings.starConfig.filter(s => s.inUse).map(star => (
                <button
                  key={star.id}
                  onClick={() => onSettingsChange({ 
                    starConfig: settings.starConfig.map(s => 
                      s.id === star.id ? { ...s, inUse: false } : s
                    ) 
                  })}
                  className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                  title="Klicken zum Entfernen"
                >
                  <StarIcon color={star.color} icon={star.icon} />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <div className={cn("text-xs font-medium mb-2", isDark ? "text-gray-400" : "text-gray-600")}>
              Nicht in Verwendung:
            </div>
            <div className={cn(
              "flex flex-wrap gap-2 min-h-10 p-2 border rounded",
              isDark ? "bg-[#3c4043] border-[#5f6368]" : "bg-gray-50 border-gray-300"
            )}>
              {settings.starConfig.filter(s => !s.inUse).map(star => (
                <button
                  key={star.id}
                  onClick={() => onSettingsChange({ 
                    starConfig: settings.starConfig.map(s => 
                      s.id === star.id ? { ...s, inUse: true } : s
                    ) 
                  })}
                  className="p-1 hover:bg-gray-200 rounded cursor-pointer opacity-50 hover:opacity-100"
                  title="Klicken zum Hinzufügen"
                >
                  <StarIcon color={star.color} icon={star.icon} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsRow>

      {/* Tastenkürzel */}
      <SettingsRow label="Tastenkürzel:" isDark={isDark} helpLink="#">
        <div className="space-y-1">
          <RadioOption
            name="keyboardShortcuts"
            value="disabled"
            checked={!settings.keyboardShortcuts}
            onChange={() => onSettingsChange({ keyboardShortcuts: false })}
            label="Tastenkürzel deaktivieren"
            isDark={isDark}
          />
          <RadioOption
            name="keyboardShortcuts"
            value="enabled"
            checked={settings.keyboardShortcuts}
            onChange={() => onSettingsChange({ keyboardShortcuts: true })}
            label="Tastenkürzel aktivieren"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Schaltflächenbeschriftung */}
      <SettingsRow label="Schaltflächenbeschriftung:" isDark={isDark} helpLink="#">
        <div className="space-y-1">
          <RadioOption
            name="buttonLabels"
            value="icons"
            checked={settings.buttonLabels === 'icons'}
            onChange={() => onSettingsChange({ buttonLabels: 'icons' })}
            label="Symbole"
            isDark={isDark}
          />
          <RadioOption
            name="buttonLabels"
            value="text"
            checked={settings.buttonLabels === 'text'}
            onChange={() => onSettingsChange({ buttonLabels: 'text' })}
            label="Text"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Mein Bild */}
      <SettingsRow label="Mein Bild:" isDark={isDark} helpLink="#">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium",
            isDark ? "bg-[#3c4043] text-gray-300" : "bg-gray-200 text-gray-600"
          )}>
            {settings.profileImage ? (
              <img src={settings.profileImage} alt="Profilbild" className="w-full h-full rounded-full object-cover" />
            ) : (
              settings.displayName?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
          <div className="space-y-2">
            <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
              Ihr Profilbild ist in allen Produkten sichtbar.
            </p>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "text-xs h-7",
                isDark && "border-[#5f6368] bg-transparent text-gray-300 hover:bg-[#3c4043]"
              )}
            >
              Bild ändern
            </Button>
          </div>
        </div>
      </SettingsRow>

      {/* Kontakte automatisch erstellen */}
      <SettingsRow label="Kontakte für die automatische Vervollständigung erstellen:" isDark={isDark}>
        <div className="space-y-1">
          <RadioOption
            name="autoCreateContacts"
            value="enabled"
            checked={settings.autoCreateContacts}
            onChange={() => onSettingsChange({ autoCreateContacts: true })}
            label="Neue Empfänger, an die ich eine Nachricht sende, hinzufügen, damit ich beim nächsten Mal die automatische Vervollständigung nutzen kann"
            isDark={isDark}
          />
          <RadioOption
            name="autoCreateContacts"
            value="disabled"
            checked={!settings.autoCreateContacts}
            onChange={() => onSettingsChange({ autoCreateContacts: false })}
            label="Ich füge meine Kontakte selbst hinzu"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Signatur */}
      <SettingsRow label="Signatur:" isDark={isDark} helpLink="#">
        <p className={cn("text-xs mb-3", isDark ? "text-gray-500" : "text-gray-500")}>
          (Wird an alle ausgehenden Nachrichten angehängt)
        </p>
        
        <div className="space-y-4">
          {/* Bestehende Signaturen */}
          {settings.signatures.map((sig) => (
            <div key={sig.id} className={cn(
              "p-3 border rounded-lg",
              isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-300 bg-gray-50"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GripVertical className={cn("w-4 h-4 cursor-grab", isDark ? "text-gray-500" : "text-gray-400")} />
                  <span className={cn("text-xs font-medium", isDark ? "text-gray-300" : "text-gray-700")}>
                    {sig.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSignature(sig.id)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <textarea
                value={sig.content}
                onChange={(e) => handleUpdateSignature(sig.id, e.target.value)}
                placeholder="Signaturtext eingeben..."
                className={cn(
                  "w-full min-h-[100px] p-2 text-xs border rounded resize-y",
                  isDark 
                    ? "bg-[#2d2e30] border-[#5f6368] text-white placeholder:text-gray-500" 
                    : "bg-white border-gray-300 placeholder:text-gray-400"
                )}
              />
            </div>
          ))}
          
          {/* Neue Signatur erstellen */}
          <div className="flex items-center gap-2">
            <Input
              value={newSignatureName}
              onChange={(e) => setNewSignatureName(e.target.value)}
              placeholder="Name der neuen Signatur"
              className={cn(
                "h-8 text-xs flex-1",
                isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "bg-white border-gray-300"
              )}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateSignature}
              className={cn(
                "h-8 text-xs",
                isDark && "border-[#5f6368] bg-transparent text-gray-300 hover:bg-[#3c4043]"
              )}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Neu erstellen
            </Button>
          </div>
          
          {/* Standardeinstellungen für Signaturen */}
          {settings.signatures.length > 0 && (
            <div className={cn(
              "p-3 border rounded-lg space-y-3",
              isDark ? "border-[#5f6368]" : "border-gray-200"
            )}>
              <div className={cn("text-xs font-medium", isDark ? "text-gray-300" : "text-gray-700")}>
                Standardeinstellungen für Signaturen
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn("text-xs block mb-1", isDark ? "text-gray-400" : "text-gray-600")}>
                    FÜR NEUE E-MAILS
                  </label>
                  <Select
                    value={settings.defaultSignatureNewEmail}
                    onValueChange={(value) => onSettingsChange({ defaultSignatureNewEmail: value })}
                  >
                    <SelectTrigger className={cn(
                      "h-7 text-xs",
                      isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "bg-white border-gray-300"
                    )}>
                      <SelectValue placeholder="Keine Signatur" />
                    </SelectTrigger>
                    <SelectContent className={isDark ? "bg-[#3c4043] border-[#5f6368]" : ""}>
                      <SelectItem value="" className={cn("text-xs", isDark && "text-white")}>Keine Signatur</SelectItem>
                      {settings.signatures.map(sig => (
                        <SelectItem key={sig.id} value={sig.id} className={cn("text-xs", isDark && "text-white")}>
                          {sig.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className={cn("text-xs block mb-1", isDark ? "text-gray-400" : "text-gray-600")}>
                    BEIM ANTWORTEN/WEITERLEITEN
                  </label>
                  <Select
                    value={settings.defaultSignatureReply}
                    onValueChange={(value) => onSettingsChange({ defaultSignatureReply: value })}
                  >
                    <SelectTrigger className={cn(
                      "h-7 text-xs",
                      isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "bg-white border-gray-300"
                    )}>
                      <SelectValue placeholder="Keine Signatur" />
                    </SelectTrigger>
                    <SelectContent className={isDark ? "bg-[#3c4043] border-[#5f6368]" : ""}>
                      <SelectItem value="" className={cn("text-xs", isDark && "text-white")}>Keine Signatur</SelectItem>
                      {settings.signatures.map(sig => (
                        <SelectItem key={sig.id} value={sig.id} className={cn("text-xs", isDark && "text-white")}>
                          {sig.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <CheckboxOption
                checked={settings.insertSignatureBeforeQuote}
                onChange={(checked) => onSettingsChange({ insertSignatureBeforeQuote: checked })}
                label='Diese Signatur in Antworten vor dem zitierten Text einfügen und Zeile "--" entfernen.'
                isDark={isDark}
              />
            </div>
          )}
          
          {/* Fallback für alte einfache Signatur */}
          {settings.signatures.length === 0 && (
            <textarea
              value={settings.signature}
              onChange={(e) => onSettingsChange({ signature: e.target.value })}
              placeholder="Signaturtext eingeben..."
              className={cn(
                "w-full min-h-[120px] p-2 text-xs border rounded resize-y",
                isDark 
                  ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-gray-500" 
                  : "bg-white border-gray-300 placeholder:text-gray-400"
              )}
            />
          )}
        </div>
      </SettingsRow>

      {/* Persönliche Nachrichten kennzeichnen */}
      <SettingsRow label="Persönliche Nachrichten kennzeichnen:" isDark={isDark}>
        <div className="space-y-1">
          <RadioOption
            name="personalLevelIndicators"
            value="disabled"
            checked={!settings.personalLevelIndicators}
            onChange={() => onSettingsChange({ personalLevelIndicators: false })}
            label="Keine Indikatoren"
            isDark={isDark}
          />
          <RadioOption
            name="personalLevelIndicators"
            value="enabled"
            checked={settings.personalLevelIndicators}
            onChange={() => onSettingsChange({ personalLevelIndicators: true })}
            label="Indikatoren anzeigen"
            description="Bei Nachrichten, die an meine Adresse (nicht an eine Mailingliste) gesendet wurden, wird eine Pfeilspitze (›) angezeigt. Nachrichten, die nur an mich gesendet wurden, werden durch eine doppelte Pfeilspitze (») gekennzeichnet."
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Ausschnitte/Vorschau */}
      <SettingsRow label="Ausschnitte:" isDark={isDark}>
        <div className="space-y-1">
          <RadioOption
            name="snippets"
            value="enabled"
            checked={settings.snippets}
            onChange={() => onSettingsChange({ snippets: true })}
            label="Vorschau anzeigen"
            description="Vorschau der Nachricht anzeigen"
            isDark={isDark}
          />
          <RadioOption
            name="snippets"
            value="disabled"
            checked={!settings.snippets}
            onChange={() => onSettingsChange({ snippets: false })}
            label="Keine Vorschau"
            description="Nur Betreff anzeigen"
            isDark={isDark}
          />
        </div>
      </SettingsRow>

      {/* Abwesenheitsnotiz */}
      <SettingsRow label="Abwesenheitsnotiz:" isDark={isDark} helpLink="#">
        <p className={cn("text-xs mb-3", isDark ? "text-gray-500" : "text-gray-500")}>
          (Beantwortet eingehende Nachrichten automatisch. Wenn ein Kontakt Ihnen mehrere Nachrichten sendet, wird die automatische Antwort maximal einmal alle vier Tage gesendet.)
        </p>
        
        <div className="space-y-3">
          <div className="space-y-1">
            <RadioOption
              name="vacation"
              value="disabled"
              checked={!settings.vacation.enabled}
              onChange={() => onSettingsChange({ 
                vacation: { ...settings.vacation, enabled: false } 
              })}
              label="Abwesenheitsnotiz deaktiviert"
              isDark={isDark}
            />
            <RadioOption
              name="vacation"
              value="enabled"
              checked={settings.vacation.enabled}
              onChange={() => onSettingsChange({ 
                vacation: { ...settings.vacation, enabled: true } 
              })}
              label="Abwesenheitsnotiz aktiviert"
              isDark={isDark}
            />
          </div>
          
          {settings.vacation.enabled && (
            <div className={cn(
              "p-3 border rounded-lg space-y-3 ml-5",
              isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
            )}>
              <div className="flex items-center gap-2 flex-wrap">
                <label className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
                  Beginnt:
                </label>
                <Input
                  type="date"
                  value={settings.vacation.startDate}
                  onChange={(e) => onSettingsChange({ 
                    vacation: { ...settings.vacation, startDate: e.target.value } 
                  })}
                  className={cn(
                    "h-7 text-xs w-36",
                    isDark ? "bg-[#2d2e30] border-[#5f6368] text-white" : "bg-white border-gray-300"
                  )}
                />
                <label className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
                  Letzter Tag:
                </label>
                <Input
                  type="date"
                  value={settings.vacation.endDate}
                  onChange={(e) => onSettingsChange({ 
                    vacation: { ...settings.vacation, endDate: e.target.value } 
                  })}
                  className={cn(
                    "h-7 text-xs w-36",
                    isDark ? "bg-[#2d2e30] border-[#5f6368] text-white" : "bg-white border-gray-300"
                  )}
                />
                <span className={cn("text-xs", isDark ? "text-gray-500" : "text-gray-500")}>
                  (optional)
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <label className={cn("text-xs w-16 shrink-0", isDark ? "text-gray-400" : "text-gray-600")}>
                  Betreff:
                </label>
                <Input
                  value={settings.vacation.subject}
                  onChange={(e) => onSettingsChange({ 
                    vacation: { ...settings.vacation, subject: e.target.value } 
                  })}
                  className={cn(
                    "h-7 text-xs flex-1",
                    isDark ? "bg-[#2d2e30] border-[#5f6368] text-white" : "bg-white border-gray-300"
                  )}
                />
              </div>
              
              <div>
                <label className={cn("text-xs block mb-1", isDark ? "text-gray-400" : "text-gray-600")}>
                  Nachricht:
                </label>
                <textarea
                  value={settings.vacation.message}
                  onChange={(e) => onSettingsChange({ 
                    vacation: { ...settings.vacation, message: e.target.value } 
                  })}
                  className={cn(
                    "w-full min-h-[100px] p-2 text-xs border rounded resize-y",
                    isDark 
                      ? "bg-[#2d2e30] border-[#5f6368] text-white" 
                      : "bg-white border-gray-300"
                  )}
                />
              </div>
              
              <CheckboxOption
                checked={settings.vacation.contactsOnly}
                onChange={(checked) => onSettingsChange({ 
                  vacation: { ...settings.vacation, contactsOnly: checked } 
                })}
                label="Abwesenheitsnotiz nur an meine Kontakte senden"
                isDark={isDark}
              />
            </div>
          )}
        </div>
      </SettingsRow>
    </div>
  );
}
