// /Users/andystaudinger/Tasko/src/app/auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup.tsx
'use client';

import Image from 'next/image';
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FiX, FiMessageCircle } from 'react-icons/fi';
import { DateRange, SelectSingleEventHandler, SelectRangeEventHandler } from 'react-day-picker';
import { format, isValid, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

import type { Company as AnbieterDetails } from '@/types/types';
import { PAGE_LOG } from '../../../../../../lib/constants';

// Ersetzt den lokalen Import durch die zentrale, geteilte Logik
import { getBookingCharacteristics } from '@/shared/booking-characteristics';

// Optionen für die Uhrzeit für das Popup (00:00 bis 23:30 in 30-Minuten-Schritten)
const generalTimeOptionsForPopup: string[] = (() => {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return times;
})();

export interface DateTimeSelectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dateSelection?: Date | DateRange, time?: string, duration?: string) => void;
  initialDateRange?: DateRange;
  initialTime?: string;
  initialDuration?: string;
  contextCompany?: AnbieterDetails | null;
  bookingSubcategory?: string | null;
}

export function DateTimeSelectionPopup({
  isOpen, onClose, onConfirm, initialDateRange, initialTime, initialDuration,
  contextCompany, bookingSubcategory,
}: DateTimeSelectionPopupProps) {


  const characteristics = useMemo(
    () => getBookingCharacteristics(bookingSubcategory ?? null),
    [bookingSubcategory]
  );

  const currentCalendarMode = characteristics.datePickerMode; // <-- Hier wird der Modus genutzt

  const [selectedDateValue, setSelectedDateValue] = useState<Date | DateRange | undefined>(undefined);
  const [selectedTimeInPopup, setSelectedTimeInPopup] = useState<string>('');
  const [durationInput, setDurationInput] = useState<string>('');
  const [durationError, setDurationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      let newDateSelection: Date | DateRange | undefined;
      const defaultToday = new Date();

      if (currentCalendarMode === 'single') {
        newDateSelection = (initialDateRange?.from && isValid(initialDateRange.from))
          ? initialDateRange.from
          : defaultToday;
      } else { // 'range' mode
        const fromDate = (initialDateRange?.from && isValid(initialDateRange.from))
          ? initialDateRange.from
          : defaultToday;
        const toDate = (initialDateRange?.to && isValid(initialDateRange.to))
          ? initialDateRange.to
          : fromDate;
        newDateSelection = { from: fromDate, to: toDate };
      }
      setSelectedDateValue(newDateSelection);

      const initialTimeValue = initialTime || generalTimeOptionsForPopup.find(t => t === "09:00") || (generalTimeOptionsForPopup.length > 0 ? generalTimeOptionsForPopup[0] : "00:00");
      setSelectedTimeInPopup(initialTimeValue);

      const initialDurationValue = initialDuration || characteristics.defaultDurationHours?.toString() || '';
      setDurationInput(initialDurationValue);
      setDurationError(null); // Fehler beim Öffnen zurücksetzen
    }
  }, [isOpen, currentCalendarMode, initialDateRange, initialTime, initialDuration, characteristics.defaultDurationHours]);

  const handleSingleDateSelect: SelectSingleEventHandler = (day) => {
    setSelectedDateValue(day);
  };

  const handleRangeDateSelect: SelectRangeEventHandler = (range) => {
    if (range?.from && !range.to) {
      setSelectedDateValue({ from: range.from, to: range.from });
    } else {
      setSelectedDateValue(range);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDurationInput(value);

    if (value === '') {
      setDurationError(null);
    } else {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        setDurationError('Bitte geben Sie eine positive Zahl ein.');
      } else {
        setDurationError(null);
      }
    }
  };

  const handleConfirmClick = () => {
    if (durationError) {
      // Verhindere das Bestätigen, wenn ein Fehler vorliegt
      return;
    }
    onConfirm(selectedDateValue, selectedTimeInPopup, durationInput);
  };

  if (!isOpen) return null;

  let footerSummaryText = "Bitte ein Datum auswählen.";
  if (selectedDateValue instanceof Date && isValid(selectedDateValue)) {
    footerSummaryText = `Gewählt: ${format(selectedDateValue, 'PPP', { locale: de })}`;
  } else if (selectedDateValue && typeof selectedDateValue === 'object' && (selectedDateValue as DateRange).from && isValid((selectedDateValue as DateRange).from!)) {
    const range = selectedDateValue as DateRange;
    const fromDateValid = range.from!;
    if (range.to && isValid(range.to) && fromDateValid.getTime() !== range.to!.getTime()) {
      footerSummaryText = `Zeitraum: ${format(fromDateValid, 'dd.MM.yy', { locale: de })} - ${format(range.to, 'dd.MM.yy', { locale: de })}`;
    } else {
      footerSummaryText = `Gewählt: ${format(fromDateValid, 'PPP', { locale: de })}`;
    }
  }

  const popupTitle = contextCompany?.companyName ? `Termin für ${contextCompany.companyName}` : "Datum, Zeit & Dauer auswählen";
  const showTwoColumnLayout = currentCalendarMode === 'range' && !!contextCompany;

  let calendarDefaultMonth: Date | undefined;
  if (selectedDateValue instanceof Date && isValid(selectedDateValue)) {
    calendarDefaultMonth = selectedDateValue;
  } else if (selectedDateValue && (selectedDateValue as DateRange).from && isValid((selectedDateValue as DateRange).from!)) {
    calendarDefaultMonth = (selectedDateValue as DateRange).from;
  } else if (initialDateRange?.from && isValid(initialDateRange.from)) {
    calendarDefaultMonth = initialDateRange.from;
  } else {
    calendarDefaultMonth = new Date();
  }

  let displayDateStringForRightColumn = 'Datum nicht gewählt';
  if (selectedDateValue && typeof selectedDateValue === 'object' && (selectedDateValue as DateRange).from && isValid((selectedDateValue as DateRange).from!)) {
    const fromDate = (selectedDateValue as DateRange).from!;
    const toDate = (selectedDateValue as DateRange).to;
    const fromFormatted = format(fromDate, 'd. MMM yy', { locale: de });
    let toFormatted = '';
    if (toDate && isValid(toDate) && fromDate.getTime() !== toDate.getTime()) {
      toFormatted = ` - ${format(toDate, 'd. MMM yy', { locale: de })}`;
    }
    displayDateStringForRightColumn = `${fromFormatted}${toFormatted}`;
  } else if (selectedDateValue instanceof Date && isValid(selectedDateValue)) {
    displayDateStringForRightColumn = format(selectedDateValue, 'd. MMM yy', { locale: de });
  }

  const { durationLabel, durationPlaceholder, durationHint } = characteristics;

  const isConfirmButtonDisabled = durationError !== null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-xl shadow-2xl w-full p-6 md:p-8 relative ${showTwoColumnLayout ? 'max-w-4xl' : 'max-w-md'}`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10" aria-label="Schließen">
          <FiX size={24} />
        </button>
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6 text-center">{popupTitle}</h2>
        <div className={`flex flex-col ${showTwoColumnLayout ? 'md:flex-row' : ''} gap-6 md:gap-8`}>
          <div className={`w-full ${showTwoColumnLayout ? 'md:flex-1' : ''} space-y-4`}>
            {showTwoColumnLayout && contextCompany?.companyName && (
              <div className="flex items-center space-x-3 mb-3 border-b border-gray-200 pb-4">
                <Image src={contextCompany.profilePictureURL || '/default-avatar.jpg'} alt={contextCompany.companyName || 'Anbieter'} width={40} height={40} className="w-10 h-10 rounded-full object-cover border" />
                <p className="text-md font-semibold text-gray-700">Verfügbarkeit prüfen für {contextCompany.companyName}</p>
              </div>
            )}
            <div className="flex justify-center">
              {currentCalendarMode === 'single' && (
                <Calendar
                  mode="single"
                  selected={selectedDateValue as Date | undefined}
                  onSelect={handleSingleDateSelect}
                  locale={de}
                  fromDate={new Date()}
                  numberOfMonths={showTwoColumnLayout ? 2 : 1}
                  defaultMonth={calendarDefaultMonth}
                  className="rounded-md p-0"
                  disabled={{ before: new Date() }}
                />
              )}
              {currentCalendarMode === 'range' && (
                <Calendar
                  mode="range"
                  selected={selectedDateValue as DateRange | undefined}
                  onSelect={handleRangeDateSelect}
                  locale={de}
                  fromDate={new Date()}
                  numberOfMonths={showTwoColumnLayout ? 2 : 1}
                  defaultMonth={calendarDefaultMonth}
                  className="rounded-md p-0"
                  disabled={{ before: new Date() }}
                />
              )}
            </div>
            <div className="text-xs text-center text-gray-500 h-4">{footerSummaryText}</div>
            <div className="pt-2">
              <Label htmlFor="time-select-popup" className="text-sm font-medium text-gray-700">Startzeit (am ersten Tag)</Label>
              <select id="time-select-popup" value={selectedTimeInPopup} onChange={(e) => setSelectedTimeInPopup(e.target.value)} className="w-full mt-1 border-gray-300 rounded-lg shadow-sm p-2.5 focus:border-[#14ad9f] focus:ring-1 focus:ring-[#14ad9f]">
                {generalTimeOptionsForPopup.map((timeOpt: string) => <option key={timeOpt} value={timeOpt}>{timeOpt}</option>)}
              </select>
            </div>
            <div className="pt-2">
              <Label htmlFor="duration-input-popup" className="text-sm font-medium text-gray-700">{durationLabel}</Label>
              <Input id="duration-input-popup" type="number" placeholder={durationPlaceholder} value={durationInput} onChange={handleDurationChange} className={`w-full mt-1 border-gray-300 rounded-lg shadow-sm p-2.5 focus:border-[#14ad9f] focus:ring-1 focus:ring-[#14ad9f] ${durationError ? 'border-red-500' : ''}`} />
              <p className="text-xs text-gray-500 mt-1">{durationHint}</p>
              {durationError && (
                <p className="text-xs text-red-500 mt-1">{durationError}</p>
              )}
            </div>
            {showTwoColumnLayout && (<p className="text-xs text-gray-500 pt-2">Nach der Buchung könnt ihr im Chat weitere Details klären.</p>)}
          </div>
          {showTwoColumnLayout && (
            <div className="w-full md:w-auto md:min-w-[280px] p-6 border border-gray-200 rounded-lg bg-gray-50 flex flex-col justify-between space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Ausgewählte Zeit für:</p>
                <p className="text-xl font-semibold text-gray-800">{displayDateStringForRightColumn}</p>
                <p className="text-xl font-semibold text-[#14ad9f]">{selectedTimeInPopup || 'Uhrzeit wählen'}</p>
                {durationInput && <p className="text-sm text-gray-600 mt-1">Dauer: {durationInput} {characteristics.isDurationPerDay ? "Std./Tag" : "Std. gesamt"}</p>}
              </div>
              <div className="w-full space-y-3">
                <button onClick={handleConfirmClick} disabled={isConfirmButtonDisabled} className="w-full bg-[#14ad9f] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#129a8f] transition-colors text-base disabled:opacity-50 disabled:cursor-not-allowed">Termin & Dauer bestätigen</button>
                <p className="text-xs text-gray-500 flex items-start"><FiMessageCircle className="w-5 h-5 mr-1.5 shrink-0 text-gray-400" /><span>Bestätige die Auswahl, um mit dem Anbieter in Kontakt zu treten.</span></p>
              </div>
            </div>
          )}
        </div>
        {(!showTwoColumnLayout) && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button onClick={handleConfirmClick} disabled={isConfirmButtonDisabled} className="w-full bg-[#14ad9f] text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-[#129a8f] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {currentCalendarMode === 'single' ? 'Datum, Zeit & Dauer bestätigen' : 'Zeitraum, Zeit & Dauer bestätigen'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}