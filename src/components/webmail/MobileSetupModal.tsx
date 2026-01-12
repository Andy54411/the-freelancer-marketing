'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Apple, Download, Mail, Server, Lock, User, Copy, Check } from 'lucide-react';

interface MobileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName?: string;
}

export const MobileSetupModal: React.FC<MobileSetupModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userName,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // URL für das Konfigurationsprofil
  const configUrl = `https://taskilo.de/api/webmail/mobile-config?email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName || '')}`;

  const serverSettings = {
    imap: {
      server: 'mail.taskilo.de',
      port: '993',
      security: 'SSL/TLS',
    },
    smtp: {
      server: 'mail.taskilo.de',
      port: '465',
      security: 'SSL/TLS',
    },
    smtpAlt: {
      port: '587',
      security: 'STARTTLS',
    },
  };

  const CopyButton = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(value, field)}
      className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
      title="Kopieren"
    >
      {copiedField === field ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-400" />
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[#14ad9f]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                E-Mail auf Smartphone einrichten
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userEmail}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* iPhone/iPad - QR Code Section */}
          <div className="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Apple className="w-6 h-6 text-gray-800 dark:text-white" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                iPhone / iPad - Automatische Einrichtung
              </h3>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <QRCodeSVG
                  value={configUrl}
                  size={180}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              {/* Anleitung */}
              <div className="flex-1 space-y-3">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  So geht es:
                </p>
                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#14ad9f] text-white text-xs flex items-center justify-center font-medium">1</span>
                    <span>Scannen Sie den QR-Code mit der iPhone-Kamera</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#14ad9f] text-white text-xs flex items-center justify-center font-medium">2</span>
                    <span>Tippen Sie auf &quot;Profil laden&quot; in der Benachrichtigung</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#14ad9f] text-white text-xs flex items-center justify-center font-medium">3</span>
                    <span>Gehen Sie zu Einstellungen → Profil geladen → Installieren</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#14ad9f] text-white text-xs flex items-center justify-center font-medium">4</span>
                    <span>Geben Sie Ihr E-Mail-Passwort ein - fertig!</span>
                  </li>
                </ol>

                <a
                  href={configUrl}
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#0d8a7f] transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Profil direkt herunterladen
                </a>
              </div>
            </div>
          </div>

          {/* Android & Manuelle Einrichtung */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Android & Manuelle Einrichtung
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Verwenden Sie diese Einstellungen in Ihrer E-Mail-App (Gmail, Outlook, Samsung Mail, etc.):
            </p>

            {/* Server Einstellungen */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* IMAP */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-900 dark:text-blue-300">Posteingang (IMAP)</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Server:</span>
                    <div className="flex items-center">
                      <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-900 dark:text-white font-bold">{serverSettings.imap.server}</code>
                      <CopyButton value={serverSettings.imap.server} field="imap-server" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Port:</span>
                    <div className="flex items-center">
                      <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-900 dark:text-white font-bold">{serverSettings.imap.port}</code>
                      <CopyButton value={serverSettings.imap.port} field="imap-port" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Sicherheit:</span>
                    <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-900 dark:text-white">{serverSettings.imap.security}</code>
                  </div>
                </div>
              </div>

              {/* SMTP */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-900 dark:text-green-300">Postausgang (SMTP)</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Server:</span>
                    <div className="flex items-center">
                      <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-900 dark:text-white font-bold">{serverSettings.smtp.server}</code>
                      <CopyButton value={serverSettings.smtp.server} field="smtp-server" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Port:</span>
                    <div className="flex items-center">
                      <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-900 dark:text-white font-bold">{serverSettings.smtp.port}</code>
                      <CopyButton value={serverSettings.smtp.port} field="smtp-port" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Sicherheit:</span>
                    <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-900 dark:text-white">{serverSettings.smtp.security}</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternative SMTP Port Hinweis */}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/30 rounded-lg px-3 py-2">
              <strong>Alternativ für SMTP:</strong> Port {serverSettings.smtpAlt.port} mit {serverSettings.smtpAlt.security} (falls Port 465 blockiert ist)
            </div>

            {/* Anmeldedaten */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">Anmeldedaten</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-gray-600 dark:text-gray-400">Benutzername:</span>
                  <div className="flex items-center">
                    <code className="text-gray-900 dark:text-white font-mono font-bold">{userEmail}</code>
                    <CopyButton value={userEmail} field="username" />
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-gray-600 dark:text-gray-400">Passwort:</span>
                  <span className="text-gray-500 dark:text-gray-400 italic">Ihr Webmail-Passwort</span>
                </div>
              </div>
            </div>

            {/* Hinweis */}
            <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium">Wichtig:</p>
                <p>Der Benutzername ist immer Ihre vollständige E-Mail-Adresse. Das Passwort ist dasselbe wie für den Webmail-Login.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSetupModal;
