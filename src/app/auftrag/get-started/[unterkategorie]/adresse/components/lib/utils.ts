//Users/andystaudinger/Tasko/src/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/utils.ts

// Stellen Sie sicher, dass BookingCharacteristics hier importiert wird,
// falls es in einer separaten Typendatei definiert ist (z.B. '@/types/types').
import { BookingCharacteristics } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/types'; // Passen Sie den Pfad bei Bedarf an

/**
 * Gibt eine Zeichenkette von Sternen (voll, halb, leer) basierend auf einer Bewertung zurück.
 * @param rating Die numerische Bewertung (z.B. 3.5).
 * @returns Eine String-Darstellung der Sterne.
 */
export function renderStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return '★'.repeat(fullStars) + (hasHalfStar ? '⭑' : '') + '☆'.repeat(emptyStars);
}

// renderPriceHistogram ist nur ein Platzhalter, falls komplexer, auch hierher.
// export function renderPriceHistogram() { /* ... */ return <div/>; }

/**
 * Definiert die Eigenschaften der Buchungsoberfläche basierend auf der Unterkategorie des Dienstes.
 * Dies steuert, wie Datum, Zeit und Dauer ausgewählt werden.
 * @param subcategory Die Unterkategorie des Dienstes (z.B. 'Mietkoch', 'Maler & Lackierer').
 * @returns Ein Objekt vom Typ BookingCharacteristics.
 */
export function getBookingCharacteristics(subcategory: string | null): BookingCharacteristics { // Expliziter Rückgabetyp
  switch (subcategory) {
    case 'Mietkoch':
      return {
        datePickerMode: 'range', // Literal-Typ 'single'
        durationLabel: 'Dauer (Stunden)',
        durationPlaceholder: 'z.B. 4',
        durationHint: 'Geschätzte Dauer des gesamten Einsatzes.',
        isDurationPerDay: false,
        defaultDurationHours: 4,
      };

    case 'Maler & Lackierer':
      return {
        datePickerMode: 'range', // Literal-Typ 'range'
        durationLabel: 'Stunden pro Tag',
        durationPlaceholder: 'z.B. 8',
        durationHint: 'Geschätzte Stunden, die pro Tag gearbeitet werden.',
        isDurationPerDay: true,
        defaultDurationHours: 8,
      };

    default:
      return {
        datePickerMode: 'single', // Literal-Typ 'single'
        durationLabel: 'Dauer (Stunden)',
        durationPlaceholder: 'z.B. 2',
        durationHint: 'Geschätzte Dauer der Aufgabe.',
        isDurationPerDay: false,
        defaultDurationHours: 2,
      };
  }
}