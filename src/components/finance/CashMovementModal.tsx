'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Info } from 'lucide-react';
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
import { toast } from 'sonner';

interface PaymentAccount {
  id: string;
  name: string;
  bankName: string;
  type: string;
  active: boolean;
}

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSuccess?: () => void;
}

export function CashMovementModal({
  isOpen,
  onClose,
  companyId,
  onSuccess,
}: CashMovementModalProps) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [fromDate, setFromDate] = useState(
    new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  );
  const [toDate, setToDate] = useState(
    new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  );
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load payment accounts from Firestore
  useEffect(() => {
    const loadAccounts = async () => {
      if (!companyId) return;

      try {
        setLoadingAccounts(true);
        const { PaymentAccountService } = await import('@/services/paymentAccountService');
        const loadedAccounts = await PaymentAccountService.getPaymentAccounts(companyId);

        // Create default accounts if none exist
        if (loadedAccounts.length === 0) {
          await PaymentAccountService.createDefaultAccounts(companyId);
          const newAccounts = await PaymentAccountService.getPaymentAccounts(companyId);
          setAccounts(newAccounts);
          if (newAccounts.length > 0) {
            setFromAccount(newAccounts[0].name);
          }
        } else {
          setAccounts(loadedAccounts);
          // Set "Kasse" as default from account if it exists
          const kasseAccount = loadedAccounts.find(a => a.name === 'Kasse');
          if (kasseAccount) {
            setFromAccount(kasseAccount.name);
          } else if (loadedAccounts.length > 0) {
            setFromAccount(loadedAccounts[0].name);
          }
        }
      } catch (error) {
        console.error('Error loading payment accounts:', error);
        toast.error('Fehler beim Laden der Konten');
      } finally {
        setLoadingAccounts(false);
      }
    };

    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen, companyId]);

  const handleSubmit = async () => {
    try {
      if (!toAccount || !fromAmount || !toAmount) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      setIsSubmitting(true);

      // Import Firestore functions
      const { collection, addDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const movementAmount = parseFloat(fromAmount);
      const currentDate = new Date().toISOString();

      // Create movement in accountMovements collection
      const accountMovementsRef = collection(db, 'companies', companyId, 'accountMovements');

      await addDoc(accountMovementsRef, {
        type: 'transfer',
        fromAccount,
        toAccount,
        amount: movementAmount,
        fromDate: fromDate,
        toDate: toDate,
        description: `Geldbewegung von ${fromAccount} zu ${toAccount}`,
        category: 'Umbuchung',
        createdAt: serverTimestamp(),
        status: 'completed',
      });

      // If movement involves "Kasse", also create cashbook entries
      if (fromAccount === 'Kasse' || toAccount === 'Kasse') {
        const cashbookRef = collection(db, 'companies', companyId, 'cashbook');

        if (fromAccount === 'Kasse') {
          // Ausgabe aus Kasse
          await addDoc(cashbookRef, {
            type: 'expense',
            amount: -movementAmount,
            description: `Überweisung zu ${toAccount}`,
            category: 'Umbuchung',
            reference: `Transfer-${Date.now()}`,
            date: fromDate,
            createdAt: serverTimestamp(),
            status: 'processed',
            linkedAccount: toAccount,
          });
        }

        if (toAccount === 'Kasse') {
          // Einnahme in Kasse
          await addDoc(cashbookRef, {
            type: 'income',
            amount: movementAmount,
            description: `Überweisung von ${fromAccount}`,
            category: 'Umbuchung',
            reference: `Transfer-${Date.now()}`,
            date: toDate,
            createdAt: serverTimestamp(),
            status: 'processed',
            linkedAccount: fromAccount,
          });
        }
      }

      toast.success('Geldbewegung erfolgreich gebucht');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating cash movement:', error);
      toast.error('Geldbewegung konnte nicht gebucht werden');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-transparent z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal - slides in from right */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-500"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">Geldbewegung</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Von Konto Section */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">Von Konto</div>

              <div className="space-y-4">
                <div>
                  <Select
                    value={fromAccount}
                    onValueChange={setFromAccount}
                    disabled={loadingAccounts}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={loadingAccounts ? 'Lade Konten...' : 'Konto auswählen'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter(a => a.active)
                        .map(account => (
                          <SelectItem key={account.id} value={account.name}>
                            {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from-date">Zahlungsdatum</Label>
                    <div className="relative">
                      <Input
                        id="from-date"
                        type="text"
                        placeholder="TT.MM.JJJJ"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="from-amount">Betrag</Label>
                    <div className="relative">
                      <Input
                        id="from-amount"
                        type="number"
                        step="0.01"
                        placeholder="Betrag angeben"
                        value={fromAmount}
                        onChange={e => setFromAmount(e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        €
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zu Konto Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="text-sm font-medium text-gray-700">Zu Konto</div>

              <div className="space-y-4">
                <div>
                  <Select value={toAccount} onValueChange={setToAccount} disabled={loadingAccounts}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={loadingAccounts ? 'Lade Konten...' : 'Konto auswählen'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter(a => a.active && a.name !== fromAccount)
                        .map(account => (
                          <SelectItem key={account.id} value={account.name}>
                            {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="to-date">Zahlungsdatum</Label>
                    <div className="relative">
                      <Input
                        id="to-date"
                        type="text"
                        placeholder="TT.MM.JJJJ"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="to-amount">Betrag</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        +
                      </span>
                      <Input
                        id="to-amount"
                        type="number"
                        step="0.01"
                        placeholder="Betrag angeben"
                        value={toAmount}
                        onChange={e => setToAmount(e.target.value)}
                        className="pl-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        €
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isSubmitting ? 'Wird gebucht...' : 'Buchen'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="h-5 w-5" />
            <span>Auswirkung auf dein Kassenbuch</span>
          </div>
        </footer>
      </div>
    </>
  );
}
