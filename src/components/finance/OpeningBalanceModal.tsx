'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (balance: number, date: string) => void;
  companyId: string;
}

export function OpeningBalanceModal({
  isOpen,
  onClose,
  onSuccess,
  companyId,
}: OpeningBalanceModalProps) {
  const [balanceValue, setBalanceValue] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxDate = new Date().toISOString().split('T')[0];

  const handleFinish = async () => {
    const balance = parseFloat(balanceValue);

    // Validation
    if (!balanceValue || isNaN(balance) || balance < 0) {
      toast.error('Bitte geben Sie einen gültigen Betrag ein (mindestens 0)');
      return;
    }

    if (!bookingDate) {
      toast.error('Bitte wählen Sie ein Buchungsdatum');
      return;
    }

    try {
      setIsSubmitting(true);

      // Save to Firestore: companies/{companyId}/cashbook/{docId}
      const cashbookRef = collection(db, 'companies', companyId, 'cashbook');

      await addDoc(cashbookRef, {
        type: 'opening_balance',
        amount: balance,
        date: bookingDate,
        description: 'Anfangsbestand Kasse',
        category: 'Anfangsbestand',
        createdAt: serverTimestamp(),
        status: 'processed',
      });

      toast.success('Anfangsbestand wurde erfolgreich gebucht');
      onSuccess(balance, bookingDate);
      handleClose();
    } catch (error) {
      console.error('Error saving opening balance:', error);
      toast.error('Fehler beim Buchen des Anfangsbestands');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setBalanceValue('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full" style={{ maxWidth: '500px' }}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Anfangsbestand</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Hier kannst du einen Anfangsbestand für die Kasse buchen.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Betrag */}
            <div className="space-y-2">
              <Label htmlFor="balance-amount" className="text-sm font-medium">
                Betrag
              </Label>
              <div className="relative">
                <Input
                  id="balance-amount"
                  name="balanceValue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={balanceValue}
                  onChange={e => setBalanceValue(e.target.value)}
                  className="pr-12"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  EUR
                </span>
              </div>
              {balanceValue && parseFloat(balanceValue) < 0 && (
                <p className="text-xs text-red-600">Kasse darf nicht ins Negative fallen.</p>
              )}
            </div>

            {/* Buchungstag */}
            <div className="space-y-2">
              <Label htmlFor="booking-date" className="text-sm font-medium">
                Buchungstag
              </Label>
              <div className="relative">
                <Input
                  id="booking-date"
                  type="date"
                  max={maxDate}
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  className="pr-10"
                  required
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} type="button" disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button
            onClick={handleFinish}
            disabled={!balanceValue || parseFloat(balanceValue) < 0 || !bookingDate || isSubmitting}
            className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            {isSubmitting ? 'Wird gebucht...' : 'Buchen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
