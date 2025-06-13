// src/app/dashboard/user/[uid]/components/OrderDateTimeDuration.tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { FiCalendar } from 'react-icons/fi';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

// Import des DateTimeSelectionPopup
import { DateTimeSelectionPopup, DateTimeSelectionPopupProps } from '../../../../auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup';

interface OrderDateTimeDurationProps {
    selectedDateRange: DateRange | undefined;
    setSelectedDateRange: (dateRange: DateRange | undefined) => void;
    selectedTime: string | undefined;
    setSelectedTime: (time: string | undefined) => void;
    durationInput: string;
    setDurationInput: (duration: string) => void;
    selectedSubcategory: string | null; // Benötigt für bookingSubcategory in DateTimeSelectionPopup
}

const OrderDateTimeDuration: React.FC<OrderDateTimeDurationProps> = ({
    selectedDateRange,
    setSelectedDateRange,
    selectedTime,
    setSelectedTime,
    durationInput,
    setDurationInput,
    selectedSubcategory,
}) => {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const handleOpenDatePicker = useCallback(() => {
        setIsDatePickerOpen(true);
    }, []);

    const handleCloseDatePicker = useCallback(() => {
        setIsDatePickerOpen(false);
    }, []);

    // WICHTIGER HINWEIS: Dies ist der Callback, der die Werte vom Popup empfängt.
    // Die Typen hier MÜSSEN korrekt gehandhabt werden, um die hartnäckigen Fehler zu vermeiden.
    // Ich werde hier die strengste Prüfung anwenden, die TypeScript akzeptiert.
    const handleDateTimeConfirm: DateTimeSelectionPopupProps['onConfirm'] = useCallback((selection, time, duration) => {
        let finalDateRange: DateRange | undefined = undefined;
        // Prüfe und konvertiere selection zu DateRange | undefined
        if (selection instanceof Date) {
            finalDateRange = { from: selection, to: selection };
        } else if (selection && typeof selection === 'object' && 'from' in selection && 'to' in selection) {
            // Sicherstellen, dass die Eigenschaften 'from' und 'to' vom Typ Date sind
            // UND dass 'from' und 'to' tatsächlich Date-Objekte sind, nicht nur Objekte.
            const tempSelection = selection as DateRange; // Typ-Assertion, um auf 'from' und 'to' zuzugreifen
            if (tempSelection.from instanceof Date && (tempSelection.to === undefined || tempSelection.to instanceof Date)) {
                finalDateRange = tempSelection;
            }
        }

        let finalTime: string | undefined = undefined;
        // Prüfe und konvertiere time zu string | undefined
        if (typeof time === 'string') {
            finalTime = time;
        } else if (time === null) { // Behandle null als undefined, falls es vorkommt
            finalTime = undefined;
        }
        // Wenn time ein {} oder ein anderer unerwarteter Typ ist, bleibt finalTime undefined.

        setSelectedDateRange(finalDateRange);
        setSelectedTime(finalTime);
        setDurationInput(duration || ''); // duration ist bereits string | undefined
        setIsDatePickerOpen(false);
    }, [setSelectedDateRange, setSelectedTime, setDurationInput]); // Abhängigkeiten hinzufügen

    return (
        <div className="p-4 border rounded-md bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center"><FiCalendar className="mr-2" /> Wann soll der Task erledigt werden? *</h4>
            <div className="flex flex-col md:flex-row gap-4">
                <Button type="button" onClick={handleOpenDatePicker} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                    Datum & Uhrzeit wählen
                </Button>
            </div>
            {selectedDateRange?.from && (
                <p className="mt-3 text-gray-700 text-sm">
                    Ausgewähltes Datum: {format(selectedDateRange.from, 'dd.MM.yyyy')}
                    {selectedDateRange.to && selectedDateRange.to.getTime() !== selectedDateRange.from.getTime() && ` - ${format(selectedDateRange.to, 'dd.MM.yyyy')}`}
                </p>
            )}
            {selectedTime && <p className="mt-1 text-gray-700 text-sm">Uhrzeit: {selectedTime}</p>}
            {durationInput && <p className="mt-1 text-gray-700 text-sm">Dauer: {durationInput} Stunden</p>}

            {isDatePickerOpen && (
                <DateTimeSelectionPopup
                    isOpen={isDatePickerOpen}
                    onClose={handleCloseDatePicker}
                    onConfirm={handleDateTimeConfirm}
                    initialDateRange={selectedDateRange || undefined}
                    initialTime={selectedTime || undefined}
                    initialDuration={durationInput || undefined}
                    bookingSubcategory={selectedSubcategory || undefined}
                />
            )}
        </div>
    );
};

export default OrderDateTimeDuration;