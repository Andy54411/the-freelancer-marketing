'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Filter, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { SettingsTabProps } from './types';

interface EmailFilter {
  id: string;
  from: string;
  to: string;
  subject: string;
  hasWords: string;
  action: 'archive' | 'delete' | 'star' | 'label' | 'forward';
  actionValue?: string;
  enabled: boolean;
}

interface BlockedAddress {
  id: string;
  email: string;
  addedAt: string;
}

export function FilterSettings({ isDark }: SettingsTabProps) {
  const [filters, setFilters] = useState<EmailFilter[]>([
    {
      id: '1',
      from: 'newsletter@example.com',
      to: '',
      subject: '',
      hasWords: '',
      action: 'archive',
      enabled: true,
    },
  ]);
  const [blockedAddresses, setBlockedAddresses] = useState<BlockedAddress[]>([
    { id: '1', email: 'spam@spammer.com', addedAt: '10.01.2026' },
  ]);
  const [showNewFilter, setShowNewFilter] = useState(false);
  const [newBlockedEmail, setNewBlockedEmail] = useState('');

  const actionLabels: Record<string, string> = {
    archive: 'Archivieren',
    delete: 'Löschen',
    star: 'Markieren',
    label: 'Label anwenden',
    forward: 'Weiterleiten',
  };

  const handleDeleteFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const handleUnblockAddress = (id: string) => {
    setBlockedAddresses(blockedAddresses.filter(a => a.id !== id));
  };

  const handleBlockAddress = () => {
    if (!newBlockedEmail.trim()) return;
    
    setBlockedAddresses([
      ...blockedAddresses,
      {
        id: `blocked-${Date.now()}`,
        email: newBlockedEmail.trim(),
        addedAt: new Date().toLocaleDateString('de-DE'),
      },
    ]);
    setNewBlockedEmail('');
  };

  return (
    <div className="space-y-4">
      {/* Filter-Übersicht */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn(
            "text-xs font-medium",
            isDark ? "text-gray-300" : "text-gray-700"
          )}>
            E-Mail-Filter
          </h3>
          <Button
            size="sm"
            className="h-7 text-xs bg-[#14ad9f] hover:bg-teal-700"
            onClick={() => setShowNewFilter(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Neuen Filter erstellen
          </Button>
        </div>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Filter werden automatisch auf eingehende E-Mails angewendet und helfen Ihnen, Ihren Posteingang zu organisieren.
        </p>

        {showNewFilter && (
          <div className={cn(
            "p-4 rounded border mb-4 space-y-3",
            isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
          )}>
            <h4 className={cn(
              "text-xs font-medium",
              isDark ? "text-gray-300" : "text-gray-700"
            )}>
              Neuer Filter
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
                  Von
                </label>
                <Input
                  placeholder="absender@example.com"
                  className={cn(
                    "h-7 text-xs mt-1",
                    isDark ? "bg-[#202124] border-[#5f6368] text-white" : "bg-white border-gray-300"
                  )}
                />
              </div>
              <div>
                <label className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
                  An
                </label>
                <Input
                  placeholder="empfaenger@example.com"
                  className={cn(
                    "h-7 text-xs mt-1",
                    isDark ? "bg-[#202124] border-[#5f6368] text-white" : "bg-white border-gray-300"
                  )}
                />
              </div>
              <div>
                <label className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
                  Betreff
                </label>
                <Input
                  placeholder="Enthält..."
                  className={cn(
                    "h-7 text-xs mt-1",
                    isDark ? "bg-[#202124] border-[#5f6368] text-white" : "bg-white border-gray-300"
                  )}
                />
              </div>
              <div>
                <label className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-600")}>
                  Enthält die Wörter
                </label>
                <Input
                  placeholder="Wörter..."
                  className={cn(
                    "h-7 text-xs mt-1",
                    isDark ? "bg-[#202124] border-[#5f6368] text-white" : "bg-white border-gray-300"
                  )}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-[#14ad9f] hover:bg-teal-700"
              >
                Filter erstellen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowNewFilter(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {filters.length > 0 ? (
          <div className="space-y-2">
            {filters.map((filter) => (
              <div 
                key={filter.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded border text-xs",
                  isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Filter className={cn(
                    "w-4 h-4",
                    filter.enabled ? "text-[#14ad9f]" : isDark ? "text-gray-500" : "text-gray-400"
                  )} />
                  <div>
                    <div className={cn(
                      "font-medium",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}>
                      {filter.from && `Von: ${filter.from}`}
                      {filter.subject && `Betreff: ${filter.subject}`}
                      {filter.hasWords && `Enthält: ${filter.hasWords}`}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                        {actionLabels[filter.action]}
                        {filter.actionValue && `: ${filter.actionValue}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0",
                      isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0",
                      isDark ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-600"
                    )}
                    onClick={() => handleDeleteFilter(filter.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={cn(
            "text-xs",
            isDark ? "text-gray-500" : "text-gray-400"
          )}>
            Keine Filter vorhanden. Erstellen Sie einen Filter, um eingehende E-Mails automatisch zu sortieren.
          </p>
        )}
      </div>

      {/* Blockierte Adressen */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Blockierte Adressen
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          E-Mails von blockierten Adressen werden automatisch in den Spam-Ordner verschoben.
        </p>

        {blockedAddresses.length > 0 && (
          <div className="space-y-1 mb-4">
            {blockedAddresses.map((address) => (
              <div 
                key={address.id}
                className={cn(
                  "flex items-center justify-between py-1.5 px-2 rounded text-xs",
                  isDark ? "hover:bg-[#3c4043]" : "hover:bg-gray-50"
                )}
              >
                <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                  {address.email}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs", isDark ? "text-gray-500" : "text-gray-400")}>
                    {address.addedAt}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 text-xs",
                      isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                    )}
                    onClick={() => handleUnblockAddress(address.id)}
                  >
                    Entsperren
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newBlockedEmail}
            onChange={(e) => setNewBlockedEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBlockAddress()}
            placeholder="E-Mail-Adresse blockieren"
            className={cn(
              "h-7 text-xs flex-1 max-w-xs",
              isDark ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
            )}
          />
          <Button
            size="sm"
            className="h-7 text-xs bg-[#14ad9f] hover:bg-teal-700"
            onClick={handleBlockAddress}
            disabled={!newBlockedEmail.trim()}
          >
            Blockieren
          </Button>
        </div>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Filter und blockierte Adressen werden sofort wirksam. Sie können Filter jederzeit bearbeiten oder löschen.
        </p>
      </div>
    </div>
  );
}
