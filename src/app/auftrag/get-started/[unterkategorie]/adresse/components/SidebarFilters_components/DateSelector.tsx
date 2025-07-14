// src/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/DateSelector.tsx
'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { DateRange } from 'react-day-picker';
import { format, addDays, isValid } from 'date-fns';
import { de } from 'date-fns/locale';

interface DateSelectorProps {
  selectedSubcategory: string | null;
  finalSelectedDateRange: DateRange | undefined;
  onDateTimeConfirm: (selection?: Date | DateRange, time?: string, duration?: string) => void;
  onOpenDatePicker: () => void;
  finalSelectedTime: string; // Wird benötigt, um ihn bei onDateTimeConfirm mitzugeben
}

export default function DateSelector({
  selectedSubcategory,
  finalSelectedDateRange,
  onDateTimeConfirm,
  onOpenDatePicker,
  finalSelectedTime, // Muss hier empfangen werden
}: DateSelectorProps) {
  // Bestimme, ob der Datumsbereichsmodus aktiv ist (für Daueraufträge)
  // Annahme: "Mietkoch" ist ein Beispiel für einen Dauerauftrag.
  const isRangeMode = selectedSubcategory?.toLowerCase() === 'mietkoch';

  // Handler für die Schnellauswahl des Datums
  const handleQuickDateSelect = (type: 'today' | '3days' | '7days') => {
    const today = new Date();
    let dateSelection: Date | DateRange;

    if (type === 'today') {
      dateSelection = isRangeMode ? { from: today, to: today } : today;
    } else if (type === '3days') {
      const futureDate = addDays(today, 3);
      dateSelection = isRangeMode ? { from: today, to: futureDate } : futureDate;
    } else {
      // 7days
      const futureDate = addDays(today, 7);
      dateSelection = isRangeMode ? { from: today, to: futureDate } : futureDate;
    }
    // Wichtig: onDateTimeConfirm aufrufen, um die Auswahl nach oben zu geben,
    // inklusive der aktuellen finalSelectedTime
    onDateTimeConfirm(dateSelection, finalSelectedTime || undefined);
  };

  return (
    <div className="pt-4 border-t border-gray-200">
      <Label className="text-sm font-medium text-gray-700">Datum</Label>
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          onClick={() => handleQuickDateSelect('today')}
          className="rounded-full border border-gray-300 px-3 py-1 text-sm bg-white text-gray-700 hover:bg-[#14ad9f] hover:text-white transition-colors"
        >
          Heute
        </button>
        <button
          onClick={() => handleQuickDateSelect('3days')}
          className="rounded-full border border-gray-300 px-3 py-1 text-sm bg-white text-gray-700 hover:bg-[#14ad9f] hover:text-white transition-colors"
        >
          Innerh. 3 Tagen
        </button>
        <button
          onClick={() => handleQuickDateSelect('7days')}
          className="rounded-full border border-gray-300 px-3 py-1 text-sm bg-white text-gray-700 hover:bg-[#14ad9f] hover:text-white transition-colors"
        >
          Innerh. 1 Woche
        </button>
        <button
          onClick={onOpenDatePicker}
          className="rounded-full border border-gray-300 px-3 py-1 text-sm bg-white text-gray-700 hover:bg-[#14ad9f] hover:text-white transition-colors"
        >
          Datum auswählen
        </button>
      </div>
      {finalSelectedDateRange?.from && isValid(finalSelectedDateRange.from) && (
        <p className="text-xs text-gray-600 mt-2">
          Gewählt: {format(finalSelectedDateRange.from, 'dd.MM.yyyy', { locale: de })}
          {/* Nur den "bis"-Teil anzeigen, wenn es ein Datumsbereich ist UND es nicht der gleiche Tag ist */}
          {finalSelectedDateRange.to &&
            isValid(finalSelectedDateRange.to) &&
            finalSelectedDateRange.to.getTime() !== finalSelectedDateRange.from.getTime() &&
            ` - ${format(finalSelectedDateRange.to, 'dd.MM.yyyy', { locale: de })}`}
          {/* Die Zeit wird hier NICHT angezeigt, da sie in DateTimeSelector ist */}
        </p>
      )}
      {/* Optional: Meldung, wenn ein Datumsbereich gewählt ist */}
      {finalSelectedDateRange?.from &&
        isValid(finalSelectedDateRange.from) &&
        finalSelectedDateRange?.to &&
        isValid(finalSelectedDateRange.to) &&
        finalSelectedDateRange.to.getTime() !== finalSelectedDateRange.from.getTime() && (
          <p className="text-xs text-gray-500 mt-1">
            {isRangeMode ? 'Dauerauftrag (Datumsbereich)' : 'Einmalauftrag (Einzeldatum)'}
          </p>
        )}
    </div>
  );
}
