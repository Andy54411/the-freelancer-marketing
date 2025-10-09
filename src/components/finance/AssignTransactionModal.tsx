'use client';

import React from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AssignTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptAmount: number;
  transactionAmount: number;
  onAssign: () => void;
  onCancel: () => void;
}

export default function AssignTransactionModal({
  open,
  onOpenChange,
  receiptAmount,
  transactionAmount,
  onAssign,
  onCancel
}: AssignTransactionModalProps) {
  // Erkenne Storno-Rechnungen (negative Beträge)
  const isStorno = receiptAmount < 0;
  
  // Berechne die Differenz korrekt (ohne Math.abs bei der Differenz selbst)
  const difference = Math.abs(Math.abs(receiptAmount) - Math.abs(transactionAmount));
  
  const formattedReceiptAmount = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(Math.abs(receiptAmount));
  
  const formattedTransactionAmount = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(Math.abs(transactionAmount));
  
  const formattedDifference = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(difference);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!max-w-[500px]" 
        style={{ width: '500px', maxWidth: '500px' }}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">
            Buchung zuordnen
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Schließen</span>
          </button>
        </DialogHeader>

        <div className="py-4">
          {/* Storno-Warnung */}
          {isStorno && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                <strong>⚠️ Storno-Rechnung:</strong> Dies ist eine Stornierung (negativer Betrag).
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-4">
            Der Betrag dieses Belegs ist nicht identisch mit dem Betrag der Zahlung. 
            Bitte gib im nächsten Schritt den Grund der Differenz an.
          </p>

          {/* Betragsvergleich */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Belegbetrag:</span>
              <span className={`text-sm font-semibold ${isStorno ? 'text-orange-600' : 'text-gray-900'}`}>
                {isStorno && '- '}{formattedReceiptAmount}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Transaktionsbetrag:</span>
              <span className="text-sm font-semibold text-gray-900">
                {formattedTransactionAmount}
              </span>
            </div>
            
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Differenz:</span>
                <span className="text-sm font-bold text-red-600">
                  {formattedDifference}
                </span>
              </div>
            </div>
          </div>

          {/* Info-Hinweis */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800">
              💡 <strong>Hinweis:</strong> Nach der Zuordnung kannst du die Differenz als 
              Skonto, Gebühr oder Rundungsdifferenz verbuchen.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto">
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={onAssign}
            className="w-full sm:w-auto bg-[#14ad9f] hover:bg-[#129488] text-white">
            Transaktion zuordnen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
