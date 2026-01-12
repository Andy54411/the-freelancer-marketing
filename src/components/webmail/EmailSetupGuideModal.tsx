'use client';

import { useState } from 'react';
import { X, Smartphone, Monitor, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

type DeviceType = 'iphone' | 'android' | 'outlook' | 'thunderbird';

const IMAP_SETTINGS = {
  server: 'mail.taskilo.de',
  port: 993,
  security: 'SSL/TLS',
};

const SMTP_SETTINGS = {
  server: 'mail.taskilo.de',
  port: 465,
  security: 'SSL/TLS',
  altPort: 587,
  altSecurity: 'STARTTLS',
};

export function EmailSetupGuideModal({ isOpen, onClose, userEmail }: EmailSetupGuideModalProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('iphone');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(value, field)}
      className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
      title="Kopieren"
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );

  const SettingsTable = () => (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Servereinstellungen</h4>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">E-Mail-Adresse</span>
          <div className="flex items-center">
            <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-sm font-mono">{userEmail}</code>
            <CopyButton value={userEmail} field="email" />
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">Benutzername</span>
          <div className="flex items-center">
            <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-sm font-mono">{userEmail}</code>
            <CopyButton value={userEmail} field="username" />
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">IMAP-Server</span>
          <div className="flex items-center">
            <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-sm font-mono">{IMAP_SETTINGS.server}</code>
            <CopyButton value={IMAP_SETTINGS.server} field="imap" />
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">IMAP-Port</span>
          <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-sm font-mono">{IMAP_SETTINGS.port} ({IMAP_SETTINGS.security})</code>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">SMTP-Server</span>
          <div className="flex items-center">
            <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-sm font-mono">{SMTP_SETTINGS.server}</code>
            <CopyButton value={SMTP_SETTINGS.server} field="smtp" />
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">SMTP-Port</span>
          <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-sm font-mono">{SMTP_SETTINGS.port} ({SMTP_SETTINGS.security})</code>
        </div>
      </div>
      
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center text-sm text-[#14ad9f] hover:underline mt-2"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
        Alternative SMTP-Einstellungen
      </button>
      
      {showAdvanced && (
        <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Falls Port 465 nicht funktioniert:
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">SMTP-Port (alternativ)</span>
            <code className="bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">{SMTP_SETTINGS.altPort} ({SMTP_SETTINGS.altSecurity})</code>
          </div>
        </div>
      )}
    </div>
  );

  const renderIPhoneGuide = () => (
    <div className="space-y-4">
      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Einstellungen öffnen</p>
            <p className="text-gray-600 dark:text-gray-400">Gehe zu <strong>Einstellungen</strong> → <strong>Mail</strong> → <strong>Accounts</strong> → <strong>Account hinzufügen</strong></p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Andere wählen</p>
            <p className="text-gray-600 dark:text-gray-400">Tippe ganz unten auf <strong>Andere</strong>, dann auf <strong>Mail-Account hinzufügen</strong></p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Kontodaten eingeben</p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Name:</strong> Dein Name<br />
              <strong>E-Mail:</strong> {userEmail}<br />
              <strong>Passwort:</strong> Dein Webmail-Passwort<br />
              <strong>Beschreibung:</strong> Taskilo
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">IMAP auswählen</p>
            <p className="text-gray-600 dark:text-gray-400">Tippe auf <strong>Weiter</strong> und wähle <strong>IMAP</strong></p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Servereinstellungen</p>
            <p className="text-gray-600 dark:text-gray-400">Gib die unten stehenden Servereinstellungen ein und tippe auf <strong>Sichern</strong></p>
          </div>
        </li>
      </ol>
      
      <SettingsTable />
    </div>
  );

  const renderAndroidGuide = () => (
    <div className="space-y-4">
      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">E-Mail-App öffnen</p>
            <p className="text-gray-600 dark:text-gray-400">Öffne die <strong>Gmail</strong>-App oder eine andere E-Mail-App</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Konto hinzufügen</p>
            <p className="text-gray-600 dark:text-gray-400">Tippe auf dein Profilbild → <strong>Weiteres Konto hinzufügen</strong> → <strong>Andere</strong></p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">E-Mail eingeben</p>
            <p className="text-gray-600 dark:text-gray-400">Gib deine E-Mail-Adresse ein: <strong>{userEmail}</strong></p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">IMAP auswählen</p>
            <p className="text-gray-600 dark:text-gray-400">Wähle <strong>IMAP</strong> als Kontotyp</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Servereinstellungen</p>
            <p className="text-gray-600 dark:text-gray-400">Gib die unten stehenden Servereinstellungen ein</p>
          </div>
        </li>
      </ol>
      
      <SettingsTable />
    </div>
  );

  const renderOutlookGuide = () => (
    <div className="space-y-4">
      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Outlook öffnen</p>
            <p className="text-gray-600 dark:text-gray-400">Gehe zu <strong>Datei</strong> → <strong>Konto hinzufügen</strong></p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Manuelle Einrichtung</p>
            <p className="text-gray-600 dark:text-gray-400">Wähle <strong>Manuelle Einrichtung oder zusätzliche Servertypen</strong></p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">IMAP auswählen</p>
            <p className="text-gray-600 dark:text-gray-400">Wähle <strong>IMAP</strong> und klicke auf <strong>Weiter</strong></p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Servereinstellungen</p>
            <p className="text-gray-600 dark:text-gray-400">Gib die unten stehenden Servereinstellungen ein</p>
          </div>
        </li>
      </ol>
      
      <SettingsTable />
    </div>
  );

  const renderThunderbirdGuide = () => (
    <div className="space-y-4">
      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Thunderbird öffnen</p>
            <p className="text-gray-600 dark:text-gray-400">Gehe zu <strong>Einstellungen</strong> → <strong>Konten-Einstellungen</strong> → <strong>Konten-Aktionen</strong> → <strong>E-Mail-Konto hinzufügen</strong></p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Kontodaten eingeben</p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Name:</strong> Dein Name<br />
              <strong>E-Mail:</strong> {userEmail}<br />
              <strong>Passwort:</strong> Dein Webmail-Passwort
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Manuelle Konfiguration</p>
            <p className="text-gray-600 dark:text-gray-400">Klicke auf <strong>Manuell einrichten</strong> und gib die Servereinstellungen ein</p>
          </div>
        </li>
      </ol>
      
      <SettingsTable />
    </div>
  );

  const devices: { id: DeviceType; label: string; icon: React.ReactNode }[] = [
    { id: 'iphone', label: 'iPhone / iPad', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'android', label: 'Android', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'outlook', label: 'Outlook', icon: <Monitor className="w-4 h-4" /> },
    { id: 'thunderbird', label: 'Thunderbird', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            E-Mail-Konto einrichten
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Device Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {devices.map((device) => (
            <button
              key={device.id}
              onClick={() => setSelectedDevice(device.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                selectedDevice === device.id
                  ? "text-[#14ad9f] border-b-2 border-[#14ad9f]"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {device.icon}
              {device.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {selectedDevice === 'iphone' && renderIPhoneGuide()}
          {selectedDevice === 'android' && renderAndroidGuide()}
          {selectedDevice === 'outlook' && renderOutlookGuide()}
          {selectedDevice === 'thunderbird' && renderThunderbirdGuide()}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Das Passwort ist dasselbe wie für den Webmail-Login. Bei Problemen wende dich an den Support.
          </p>
        </div>
      </div>
    </div>
  );
}
