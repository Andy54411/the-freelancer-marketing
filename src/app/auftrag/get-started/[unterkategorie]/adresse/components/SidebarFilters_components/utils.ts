// src/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/utils.ts

import { categories } from '@/lib/categories'; // NEU: Importiere die Kategorien

export interface BookingCharacteristics {
  datePickerMode: 'single' | 'range';
  durationLabel: string;
  durationPlaceholder: string;
  durationHint: string;
  isDurationPerDay: boolean;
  defaultDurationHours: number;
}

export const getBookingCharacteristics = (subcategory: string | null): BookingCharacteristics => {
  let datePickerMode: 'single' | 'range' = 'single'; // Standard ist 'single'
  let durationLabel = 'Dauer (in Stunden)';
  let durationPlaceholder = 'z.B. 4 oder 8.5';
  let durationHint = 'Gesamtzahl der Stunden, die der Auftrag dauert.';
  let isDurationPerDay = false;
  let defaultDurationHours = 4; // Standardwert

  if (subcategory) {
    const lowerCaseSubcategory = subcategory.toLowerCase();

    // Logik für Datumsbereich (Daueraufträge)
    if (lowerCaseSubcategory === 'mietkoch' || lowerCaseSubcategory === 'mietkellner') {
      datePickerMode = 'range';
      durationLabel = 'Dauer pro Tag (in Stunden)';
      durationPlaceholder = 'z.B. 4 oder 8';
      durationHint = 'Anzahl der Stunden, die der Auftrag pro Tag dauert.';
      isDurationPerDay = true;
      defaultDurationHours = 8; // Typischerweise längere Einsätze
    }

    // Logik für Einzelauswahl (Einmalaufträge in Handwerk & Haushalt & Reinigung)
    // Finde die Hauptkategorie der aktuellen Unterkategorie
    const mainCategory = categories.find(cat => cat.subcategories.includes(subcategory))?.title;

    if (mainCategory === 'Handwerk' || mainCategory === 'Haushalt & Reinigung') {
      // Diese Kategorien sollen nur Einzelauswahl haben,
      // auch wenn 'Mietkoch' oder 'Mietkellner' vorher 'range' gesetzt haben.
      // Wenn eine Unterkategorie in diesen Hauptkategorien ist,
      // überschreiben wir den datePickerMode auf 'single'.
      datePickerMode = 'single';
      // Dauer-Labels bleiben bei 'gesamt' für Einmalaufträge, die nicht 'Mietkoch' sind
      durationLabel = 'Dauer (in Stunden)';
      durationPlaceholder = 'z.B. 4 oder 8.5';
      durationHint = 'Gesamtzahl der Stunden, die der Auftrag dauert.';
      isDurationPerDay = false;
      defaultDurationHours = 4;
    }
  }

  return {
    datePickerMode,
    durationLabel,
    durationPlaceholder,
    durationHint,
    isDurationPerDay,
    defaultDurationHours,
  };
};
