'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface BankDisconnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  bankName?: string;
}

export default function BankDisconnectDialog({
  isOpen,
  onClose,
  onConfirm,
  bankName = 'Bank',
}: BankDisconnectDialogProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConfirm = async () => {
    setIsDisconnecting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Bankverbindung trennen</DialogTitle>
              <DialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4 border border-red-200">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Was passiert beim Trennen der Verbindung?
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Alle gespeicherten Kontodaten werden gelöscht</li>
                <li>• finAPI-Zugangsdaten werden entfernt</li>
                <li>• Keine automatischen Synchronisationen mehr</li>
                <li>• Transaktionsdaten gehen verloren</li>
              </ul>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Nach der Trennung können Sie:
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Eine neue Bankverbindung erstellen</li>
                <li>• Dieselbe Bank erneut verbinden</li>
                <li>• Andere Banking-Features weiterhin nutzen</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600">
              Möchten Sie die Verbindung zu <strong>{bankName}</strong> wirklich trennen?
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose} disabled={isDisconnecting}>
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDisconnecting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird getrennt...
              </>
            ) : (
              'Verbindung trennen'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
