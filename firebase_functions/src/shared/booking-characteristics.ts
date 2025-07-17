// /Users/andystaudinger/Tasko/firebase_functions/src/shared/booking-characteristics.ts

export interface BookingCharacteristics {
    isDurationPerDay: boolean;
    // NEU: Hinzugefügte Felder, die vom Frontend benötigt werden.
    datePickerMode: 'single' | 'range';
    defaultDurationHours: number;
    durationLabel: string;
    durationPlaceholder: string;
    durationHint: string;
}

/**
 * Definiert die Buchungseigenschaften basierend auf der Unterkategorie.
 * Diese Logik muss mit der Frontend-Version identisch sein.
 * @param subcategory Die Unterkategorie des Dienstes (z.B. 'Mietkoch').
 * @returns Ein Objekt, das angibt, ob die Buchung pro Tag erfolgt.
 */
export function getBookingCharacteristics(subcategory: string | null): BookingCharacteristics {
    switch (subcategory) {
        // --- PRO-TAG-DIENSTLEISTUNGEN ---
        // Diese blockieren den gesamten Tag/die gesamten Tage.
        case 'Mietkoch':
        case 'Maler & Lackierer':
            return {
                isDurationPerDay: true,
                datePickerMode: 'range',
                defaultDurationHours: 8,
                durationLabel: 'Stunden pro Tag',
                durationPlaceholder: 'z.B. 8',
                durationHint: 'Geben Sie die durchschnittliche Arbeitszeit pro Tag an.',
            };

        // --- STUNDENBASIERTE DIENSTLEISTUNGEN ---
        // Diese können mehrfach am selben Tag gebucht werden, bis ein Limit erreicht ist.
        case 'Gartenarbeit':
        case 'IT-Support':
        case 'Möbelmontage':
        case 'Elektrikarbeiten':
        case 'Umzug':
            return {
                isDurationPerDay: false,
                datePickerMode: 'single',
                defaultDurationHours: 2,
                durationLabel: 'Geschätzte Dauer (Stunden)',
                durationPlaceholder: 'z.B. 3.5',
                durationHint: 'Geben Sie die Gesamtdauer des Auftrags an.',
            };

        // Standard für alle anderen und unbekannten Dienstleistungen
        default:
            return {
                isDurationPerDay: false,
                datePickerMode: 'single',
                defaultDurationHours: 2,
                durationLabel: 'Geschätzte Dauer (Stunden)',
                durationPlaceholder: 'z.B. 2',
                durationHint: 'Geben Sie die geschätzte Gesamtdauer des Auftrags an.',
            };
    }
}