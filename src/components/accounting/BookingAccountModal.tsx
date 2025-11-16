'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookingAccount } from './BookingAccountsTab';
import COMPLETE_DATEV_ACCOUNTS from '@/data/complete-datev-accounts';

interface BookingAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<BookingAccount, 'id'>) => void;
  account?: BookingAccount | null;
  companyUid: string;
}

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Aktiva' },
  { value: 'LIABILITY', label: 'Passiva' },
  { value: 'INCOME', label: 'Ertrag' },
  { value: 'EXPENSE', label: 'Aufwand' },
];

// Vollständige DATEV-Buchungskonten (656+ Konten)
const STANDARD_ACCOUNTS = COMPLETE_DATEV_ACCOUNTS;

function BookingAccountModal({
  isOpen,
  onClose,
  onSave,
  account,
  companyUid,
}: BookingAccountModalProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customNumber, setCustomNumber] = useState<string>('');
  const [customType, setCustomType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Reset modal when opening/closing or account changes
  useEffect(() => {
    if (isOpen) {
      if (account) {
        // Bearbeitung eines bestehenden Kontos
        setIsCustom(true);
        setCustomNumber(account.number);
        setCustomName(account.name);
        setCustomType(account.type);
        setSelectedAccount('');
      } else {
        // Neues Konto
        setIsCustom(false);
        setSelectedAccount('');
        setCustomName('');
        setCustomNumber('');
        setCustomType('');
      }
      setSearchTerm('');
      setIsDropdownOpen(false);
    }
  }, [isOpen, account]);

  // Gefilterte Konten basierend auf Suchbegriff
  const filteredAccounts = STANDARD_ACCOUNTS.filter(
    acc =>
      acc.number.includes(searchTerm) || acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAccountSelect = (accountNumber: string) => {
    if (accountNumber === 'custom') {
      setIsCustom(true);
      setSelectedAccount('');
      setCustomName('');
      setCustomNumber('');
      setCustomType('');
    } else {
      const selectedStandardAccount = STANDARD_ACCOUNTS.find(acc => acc.number === accountNumber);
      if (selectedStandardAccount) {
        setIsCustom(false);
        setSelectedAccount(accountNumber);
        setCustomName(selectedStandardAccount.name);
        setCustomNumber(selectedStandardAccount.number);
        setCustomType(selectedStandardAccount.type);
      }
    }
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const handleSave = () => {
    if (!customName.trim()) return;

    const accountData = {
      number: customNumber || selectedAccount,
      name: customName.trim(),
      type: customType as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE',
      automaticBooking: false, // Standard: keine automatische Buchung
    };

    onSave(accountData);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const isFormValid = () => {
    return customName.trim() && (customNumber || selectedAccount) && customType;
  };

  // Modal title based on context
  const modalTitle = account ? 'Buchungskonto bearbeiten' : 'Buchungskonto hinzufügen';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[900px] max-w-none h-[600px] flex flex-col">
        <DialogHeader className="shrink-0 bg-[#14ad9f] text-white p-4 -m-6 mb-4 rounded-t-lg">
          <DialogTitle className="text-lg">{modalTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {/* Buchungskonto Auswahl */}
          {!account && (
            <div className="space-y-2">
              <Label htmlFor="account-select" className="text-sm font-medium">
                Buchungskonto <span className="text-red-500">*</span>
              </Label>

              {/* Suchfeld */}
              <div className="relative">
                <Input
                  placeholder="Konto suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="text-sm h-9"
                />

                {/* Dropdown mit gefilterten Ergebnissen */}
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    {/* Benutzerdefiniertes Konto Option */}
                    <div
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b text-sm"
                      onClick={() => handleAccountSelect('custom')}
                    >
                      <div className="font-medium">Benutzerdefiniertes Konto</div>
                    </div>

                    {/* Gefilterte Konten */}
                    {filteredAccounts.length > 0 ? (
                      <>
                        {['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE'].map(type => {
                          const accountsOfType = filteredAccounts.filter(acc => acc.type === type);
                          if (accountsOfType.length === 0) return null;

                          const typeLabel = ACCOUNT_TYPES.find(t => t.value === type)?.label;

                          return (
                            <div key={type}>
                              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                                {typeLabel} ({accountsOfType.length})
                              </div>
                              {accountsOfType.map(acc => (
                                <div
                                  key={acc.number}
                                  className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-sm"
                                  onClick={() => handleAccountSelect(acc.number)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs">({acc.number})</span>
                                    <span className="text-xs truncate">{acc.name}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">Keine Konten gefunden</div>
                    )}
                  </div>
                )}

                {/* Overlay zum Schließen */}
                {isDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                )}
              </div>

              {/* Anzeige der aktuellen Auswahl */}
              {(selectedAccount || isCustom) && (
                <div className="p-2 bg-gray-50 rounded-md">
                  <div className="text-xs font-medium">
                    {isCustom
                      ? 'Benutzerdefiniertes Konto'
                      : `(${selectedAccount}) ${STANDARD_ACCOUNTS.find(acc => acc.number === selectedAccount)?.name}`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Anzeigename */}
          <div className="space-y-2">
            <Label htmlFor="account-name" className="text-sm">
              {isCustom || account ? 'Kontoname' : 'Anzeigename'}
            </Label>
            <Input
              id="account-name"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={isCustom || account ? 'Kontoname eingeben' : ''}
              disabled={!isCustom && !account && !selectedAccount}
              className="text-sm"
            />
          </div>

          {/* Benutzerdefinierte Felder */}
          {(isCustom || account) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="account-number" className="text-sm">
                  Kontonummer <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="account-number"
                  value={customNumber}
                  onChange={e => setCustomNumber(e.target.value)}
                  placeholder="z.B. 8400"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-type" className="text-sm">
                  Kontotyp <span className="text-red-500">*</span>
                </Label>
                <Select value={customType} onValueChange={setCustomType}>
                  <SelectTrigger id="account-type" className="text-sm">
                    <SelectValue placeholder="Kontotyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-sm">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 mt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isFormValid()}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            {account ? 'Speichern' : 'Hinzufügen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BookingAccountModal;
export { BookingAccountModal };
