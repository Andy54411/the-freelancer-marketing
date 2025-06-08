// lib/utils.ts
export function renderStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return '★'.repeat(fullStars) + (hasHalfStar ? '⭑' : '') + '☆'.repeat(emptyStars);
}

// renderPriceHistogram ist nur ein Platzhalter, falls komplexer, auch hierher.
// export function renderPriceHistogram() { /* ... */ return <div/>; }

export interface BookingCharacteristics {
  datePickerMode?: 'single' | 'range';
  defaultDurationHours?: number;
  durationLabel?: string;
  durationPlaceholder?: string;
  durationHint?: string;
  isDurationPerDay?: boolean;
  // Add other relevant characteristics as needed
}

// TODO: Implementierung für getBookingCharacteristics hinzufügen
// Annahme: Es gibt ein Interface BookingCharacteristics, das importiert oder hier definiert werden muss.
// Beispiel-Platzhalter:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getBookingCharacteristics(_subcategory: string | null): BookingCharacteristics { // Parameter als _unused markiert, Rückgabetyp spezifiziert
  // Hier kommt die Logik zur Bestimmung der Buchungsmerkmale basierend auf der Unterkategorie
  return { datePickerMode: 'single', durationLabel: 'Dauer (Stunden)', durationPlaceholder: 'z.B. 2', durationHint: 'Geschätzte Dauer der Aufgabe.' }; // Beispielhafte Rückgabe
}