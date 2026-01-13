'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Mail, ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SettingsTabProps } from './types';

interface LinkedAccount {
  id: string;
  email: string;
  type: 'pop3' | 'imap';
  lastSync: string;
}

export function AccountsSettings({ isDark, session }: SettingsTabProps) {
  const [linkedAccounts] = useState<LinkedAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  return (
    <div className="space-y-4">
      {/* Aktuelle E-Mail-Adresse */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <div className="flex items-start gap-8">
          <label className={cn(
            "text-xs font-medium w-48 pt-1 shrink-0",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            E-Mail-Adresse senden als:
          </label>
          <div className="flex-1">
            <div className={cn(
              "flex items-center gap-2 p-2 rounded text-xs",
              isDark ? "bg-[#3c4043]" : "bg-gray-50"
            )}>
              <Mail className="w-4 h-4 text-[#14ad9f]" />
              <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                {session?.email}
              </span>
              <span className={cn(
                "ml-2 px-2 py-0.5 rounded text-xs",
                isDark ? "bg-teal-900/50 text-teal-300" : "bg-teal-100 text-teal-700"
              )}>
                Standard
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "mt-2 h-7 text-xs",
                isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
              )}
            >
              <Plus className="w-3 h-3 mr-1" />
              Weitere E-Mail-Adresse hinzufügen
            </Button>
          </div>
        </div>
      </div>

      {/* E-Mails von anderen Konten abrufen */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <div className="flex items-start gap-8">
          <label className={cn(
            "text-xs font-medium w-48 pt-1 shrink-0",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            E-Mails von anderen Konten abrufen:
          </label>
          <div className="flex-1">
            <p className={cn(
              "text-xs mb-3",
              isDark ? "text-gray-400" : "text-gray-600"
            )}>
              Importieren Sie E-Mails von anderen E-Mail-Konten per POP3 oder IMAP.
            </p>

            {linkedAccounts.length > 0 ? (
              <div className="space-y-2 mb-3">
                {linkedAccounts.map((account) => (
                  <div 
                    key={account.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded text-xs",
                      isDark ? "bg-[#3c4043]" : "bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {account.email}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs uppercase",
                        isDark ? "bg-gray-600 text-gray-300" : "bg-gray-200 text-gray-600"
                      )}>
                        {account.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs", isDark ? "text-gray-500" : "text-gray-400")}>
                        Zuletzt: {account.lastSync}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-6 w-6 p-0",
                          isDark ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-600"
                        )}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={cn(
                "text-xs mb-3",
                isDark ? "text-gray-500" : "text-gray-400"
              )}>
                Keine verknüpften Konten vorhanden.
              </p>
            )}

            {showAddForm ? (
              <div className={cn(
                "p-3 rounded border space-y-3",
                isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
              )}>
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="E-Mail-Adresse"
                  className={cn(
                    "h-7 text-xs",
                    isDark ? "bg-[#202124] border-[#5f6368] text-white" : "bg-white border-gray-300"
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-[#14ad9f] hover:bg-teal-700"
                    disabled={!newEmail.trim()}
                  >
                    Weiter
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewEmail('');
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 text-xs",
                  isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                )}
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                E-Mail-Konto hinzufügen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Zugriff auf Ihr Konto gewähren */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <div className="flex items-start gap-8">
          <label className={cn(
            "text-xs font-medium w-48 pt-1 shrink-0",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            Zugriff auf Ihr Konto gewähren:
          </label>
          <div className="flex-1">
            <p className={cn(
              "text-xs mb-3",
              isDark ? "text-gray-400" : "text-gray-600"
            )}>
              Geben Sie anderen Personen Zugriff auf Ihr E-Mail-Konto, ohne Ihr Passwort zu teilen.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-xs",
                isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
              )}
            >
              <Plus className="w-3 h-3 mr-1" />
              Weiteren Benutzer hinzufügen
            </Button>
          </div>
        </div>
      </div>

      {/* Kontakte importieren */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <div className="flex items-start gap-8">
          <label className={cn(
            "text-xs font-medium w-48 pt-1 shrink-0",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            E-Mails und Kontakte importieren:
          </label>
          <div className="flex-1">
            <p className={cn(
              "text-xs mb-3",
              isDark ? "text-gray-400" : "text-gray-600"
            )}>
              Importieren Sie E-Mails und Kontakte aus anderen Konten wie Yahoo, Outlook oder anderen Webmail-Anbietern.
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
              E-Mails und Kontakte importieren
            </Button>
          </div>
        </div>
      </div>

      {/* Passwort ändern */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <div className="flex items-start gap-8">
          <label className={cn(
            "text-xs font-medium w-48 pt-1 shrink-0",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            Passwort ändern:
          </label>
          <div className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-xs",
                isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
              )}
            >
              Passwort ändern
            </Button>
          </div>
        </div>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Verwalten Sie hier Ihre E-Mail-Konten und Zugriffsberechtigungen. Änderungen an Ihren Kontoeinstellungen können einige Minuten dauern, bis sie wirksam werden.
        </p>
      </div>
    </div>
  );
}
