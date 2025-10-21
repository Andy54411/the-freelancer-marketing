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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface OpenCashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function OpenCashRegisterModal({ isOpen, onClose, onConfirm }: OpenCashRegisterModalProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleConfirm = () => {
    if (!agreedToTerms) return;

    onConfirm();

    // Reset state
    setAgreedToTerms(false);
  };

  const handleClose = () => {
    setAgreedToTerms(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full" style={{ maxWidth: '350px' }}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-center">Kasse eröffnen</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Teaser */}
          <div className="text-center space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Hinweise zur ordnungsgemäßen Kassenführung
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed px-2">
              Um eine Kasse ordnungsgemäß zu führen, gibt es einiges zu beachten. Die wichtigsten
              Grundsätze erläutern wir in unserem Hilfeartikel.
            </p>
          </div>

          {/* Checkbox with Terms */}
          <div className="px-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={checked => setAgreedToTerms(checked as boolean)}
                className="mt-1 flex-shrink-0"
              />
              <label htmlFor="terms" className="text-sm cursor-pointer text-gray-700 flex-1">
                Ich habe den Artikel{' '}
                <a
                  href="https://hilfe.sevdesk.de/de/articles/9360787-kassenbuch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#14ad9f] hover:text-[#0f9d84] underline"
                >
                  Kassen richtig führen
                </a>{' '}
                gelesen und verstanden.<span className="text-red-500">*</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} type="button">
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!agreedToTerms}
            className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            Eröffnen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
