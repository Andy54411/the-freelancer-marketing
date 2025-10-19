'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { BookingAccountService, BookingAccount } from '@/services/bookingAccountService';
import { ModalTransaction } from '@/types/banking';

interface BookingAccountSelectionModalProps {
  isOpen: boolean;
  companyId: string;
  transaction: ModalTransaction | null;
  documentType: 'INVOICE' | 'EXPENSE';
  documentNumber?: string;
  onClose: () => void;
  onSelect: (transaction: ModalTransaction, bookingAccount: BookingAccount) => void;
}

export default function BookingAccountSelectionModal({
  isOpen,
  companyId,
  transaction,
  documentType,
  documentNumber,
  onClose,
  onSelect,
}: BookingAccountSelectionModalProps) {
  const [bookingAccounts, setBookingAccounts] = useState<BookingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<BookingAccount | null>(null);

  // Load booking accounts
  useEffect(() => {
    if (isOpen && companyId) {
      loadBookingAccounts();
    }
  }, [isOpen, companyId]);

  const loadBookingAccounts = async () => {
    try {
      setLoading(true);
      const accounts = await BookingAccountService.getBookingAccounts(companyId);
      setBookingAccounts(accounts);
    } catch (error) {
      console.error('Fehler beim Laden der Buchungskonten:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter accounts based on document type
  const getSuggestedAccounts = () => {
    if (documentType === 'INVOICE') {
      // SKR03 Erlös-Konten: 4000-4999 (INCOME) - KORRIGIERT!
      return bookingAccounts.filter(acc => acc.type === 'INCOME' && acc.number.startsWith('4'));
    } else {
      // SKR03 Aufwand-Konten: 5000-7999 (EXPENSE) - KORRIGIERT!
      return bookingAccounts.filter(
        acc => acc.type === 'EXPENSE' && ['5', '6', '7'].includes(acc.number[0])
      );
    }
  };

  const filteredAccounts = getSuggestedAccounts().filter(account => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      account.number.toLowerCase().includes(searchLower) ||
      account.name.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectAccount = () => {
    if (selectedAccount && transaction) {
      onSelect(transaction, selectedAccount);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#14ad9f]" />
            Buchungskonto auswählen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Transaction Summary */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Transaktion</h3>
              {documentType === 'INVOICE' ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{transaction.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Betrag:</span>
                <span
                  className={`ml-2 font-medium ${transaction.betrag > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(transaction.betrag)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Verwendungszweck:</span>
                <span className="ml-2">{transaction.verwendungszweck}</span>
              </div>
              {documentNumber && (
                <div className="col-span-2">
                  <span className="text-gray-600">Dokument:</span>
                  <Badge variant="outline" className="ml-2">
                    {documentNumber}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buchungskonto suchen (Nummer oder Name)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Account Type Info */}
          <div className="flex items-center gap-2">
            <Badge
              variant={documentType === 'INVOICE' ? 'default' : 'destructive'}
              className={
                documentType === 'INVOICE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }
            >
              {documentType === 'INVOICE'
                ? '💰 Erlös-Konten (4000-4999)'
                : '💸 Aufwand-Konten (5000-7999)'}
            </Badge>
            <Badge variant="outline">{filteredAccounts.length} verfügbare Konten</Badge>
          </div>

          {/* Accounts List */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                Keine passenden Buchungskonten gefunden
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredAccounts.map(account => (
                  <div
                    key={account.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedAccount?.id === account.id
                        ? 'bg-[#14ad9f]/10 border-l-4 border-l-[#14ad9f]'
                        : ''
                    }`}
                    onClick={() => setSelectedAccount(account)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-gray-400" />
                            <span className="font-mono font-bold text-lg text-gray-900">
                              {account.number}
                            </span>
                          </div>
                          <Badge
                            variant={account.type === 'INCOME' ? 'default' : 'secondary'}
                            className={
                              account.type === 'INCOME'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {account.type === 'INCOME' ? 'Erlös' : 'Aufwand'}
                          </Badge>
                        </div>
                        <div className="mt-1">
                          <span className="text-sm font-medium text-gray-900">{account.name}</span>
                        </div>
                        {account.automaticBooking && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            Automatische Buchung
                          </Badge>
                        )}
                      </div>
                      {selectedAccount?.id === account.id && (
                        <div className="ml-4">
                          <div className="w-6 h-6 rounded-full bg-[#14ad9f] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {selectedAccount ? (
                <>
                  Gewählt:{' '}
                  <span className="font-medium">
                    {selectedAccount.number} - {selectedAccount.name}
                  </span>
                </>
              ) : (
                'Wählen Sie ein Buchungskonto aus'
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSelectAccount}
                disabled={!selectedAccount}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                Verknüpfen
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
