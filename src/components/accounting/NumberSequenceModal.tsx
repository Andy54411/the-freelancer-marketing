'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NumberSequence } from './NumberSequencesTab';

interface NumberSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sequence: NumberSequence) => void;
  sequence: NumberSequence | null;
}

export default function NumberSequenceModal({
  isOpen,
  onClose,
  onSave,
  sequence,
}: NumberSequenceModalProps) {
  const [format, setFormat] = useState('');
  const [nextNumber, setNextNumber] = useState(1000);
  const [preview, setPreview] = useState('');
  const [formatError, setFormatError] = useState('');

  // Form zurücksetzen wenn Modal öffnet/schließt
  useEffect(() => {
    if (isOpen && sequence) {
      setFormat(sequence.format);
      setNextNumber(sequence.nextNumber);
      updatePreview(sequence.format, sequence.nextNumber);
      setFormatError('');
    }
  }, [isOpen, sequence]);

  // Vorschau aktualisieren
  const updatePreview = (currentFormat: string, currentNumber: number) => {
    if (!currentFormat.includes('%NUMBER')) {
      setFormatError('Das Format muss %NUMBER enthalten');
      setPreview('');
      return;
    }

    setFormatError('');

    const now = new Date();
    let formattedPreview = currentFormat;

    // Datum-Variablen ersetzen
    formattedPreview = formattedPreview.replace(/%YYYY/g, now.getFullYear().toString());
    formattedPreview = formattedPreview.replace(/%YY/g, now.getFullYear().toString().slice(-2));
    formattedPreview = formattedPreview.replace(
      /%MM/g,
      (now.getMonth() + 1).toString().padStart(2, '0')
    );
    formattedPreview = formattedPreview.replace(/%M/g, (now.getMonth() + 1).toString());
    formattedPreview = formattedPreview.replace(/%DD/g, now.getDate().toString().padStart(2, '0'));
    formattedPreview = formattedPreview.replace(/%D/g, now.getDate().toString());

    // %NUMBER ersetzen
    formattedPreview = formattedPreview.replace(/%NUMBER/g, currentNumber.toString());

    setPreview(formattedPreview);
  };

  const handleFormatChange = (value: string) => {
    setFormat(value);
    updatePreview(value, nextNumber);
  };

  const handleNextNumberChange = (value: number) => {
    setNextNumber(value);
    updatePreview(format, value);
  };

  const handleSave = () => {
    if (!sequence) return;

    if (!format.includes('%NUMBER')) {
      setFormatError('Das Format muss %NUMBER enthalten');
      return;
    }

    const updatedSequence: NumberSequence = {
      ...sequence,
      format,
      nextNumber,
      nextFormatted: preview,
    };

    onSave(updatedSequence);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!sequence) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{sequence.type} Nummernkreis bearbeiten</DialogTitle>
          <DialogDescription className="text-sm">
            Passen Sie das Format und die nächste Nummer für diesen Nummernkreis an
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Linke Spalte - Formular */}
          <div className="space-y-4">
            {/* Format */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="format" className="text-sm">
                  Format
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Hier kannst du das Format anpassen. Die Variable %NUMBER muss vorhanden
                        sein.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="format"
                value={format}
                onChange={e => handleFormatChange(e.target.value)}
                placeholder="z.B. RE-%NUMBER"
                className={`text-sm ${formatError ? 'border-red-500' : ''}`}
              />

              {formatError && <p className="text-xs text-red-500">{formatError}</p>}
            </div>

            {/* Nächste Zahl */}
            <div className="space-y-1">
              <Label htmlFor="nextNumber" className="text-sm">
                Nächste Zahl
              </Label>
              <Input
                id="nextNumber"
                type="number"
                value={nextNumber}
                onChange={e => handleNextNumberChange(parseInt(e.target.value) || 1000)}
                min="1"
                className="text-sm"
              />
            </div>

            {/* Vorschau */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="preview" className="text-sm">
                  Vorschau
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Vorschau der nächsten Nummer</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input id="preview" value={preview} disabled className="bg-muted text-sm" />
            </div>
          </div>

          {/* Rechte Spalte - Hilfsinformationen */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Verfügbare Variablen</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">
                  %NUMBER
                </code>
                <div className="flex-1">
                  <div className="text-xs">Nächste Zahl</div>
                  <div className="text-xs text-muted-foreground">Obligatorisch</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">%YYYY</code>
                <div className="flex-1">
                  <div className="text-xs">Aktuelles Jahr (2025)</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">%YY</code>
                <div className="flex-1">
                  <div className="text-xs">Aktuelles Jahr (25)</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">%MM</code>
                <div className="flex-1">
                  <div className="text-xs">Aktueller Monat (09)</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">%M</code>
                <div className="flex-1">
                  <div className="text-xs">Aktueller Monat (9)</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">%DD</code>
                <div className="flex-1">
                  <div className="text-xs">Aktueller Tag (14)</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">%D</code>
                <div className="flex-1">
                  <div className="text-xs">Aktueller Tag (14)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!!formatError}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
