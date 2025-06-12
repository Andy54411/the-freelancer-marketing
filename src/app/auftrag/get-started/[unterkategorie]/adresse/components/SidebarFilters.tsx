// /Users/andystaudinger/Tasko/src/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters.tsx
'use client';

import { Label } from '@/components/ui/label';
import { Autocomplete } from '@react-google-maps/api';
import { DateRange } from 'react-day-picker';
import React, { useMemo } from 'react';


// Importiere die spezifischen Komponenten
import DateSelector from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/DateSelector';
import DateTimeSelector from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/DateTimeSelector';
import PriceFilter from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/PriceFilter'; // NEU: Importiere PriceFilter
import { categories } from '@/lib/categories';

// NEU: Importiere PriceDistributionData von PriceFilter.tsx
import type { PriceDistributionData } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/PriceFilter';


// renderPriceHistogram wird jetzt in PriceFilter.tsx definiert, also hier entfernt
// const renderPriceHistogram = (data: PriceDistributionData[], loading: boolean) => { /* ... */ };

interface SidebarFiltersProps {
  city: string;
  setCity: (city: string) => void;
  postalCode: string;
  setPostalCode: (postalCode: string) => void;
  isLoaded: boolean;
  onLoad: (autocomplete: google.maps.places.Autocomplete) => void;
  onPlaceChanged: () => void;
  finalSelectedDateRange: DateRange | undefined;
  finalSelectedTime: string;
  onDateTimeConfirm: (selection?: Date | DateRange, time?: string, duration?: string) => void;
  onOpenDatePicker: () => void;
  currentMaxPrice: number;
  dynamicSliderMin: number;
  dynamicSliderMax: number;
  handlePriceSliderChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  resetPriceFilter: () => void;
  loadingSubcategoryData: boolean;
  averagePriceForSubcategory: number | null;
  priceDistribution: PriceDistributionData[] | null; // Dieser Typ ist jetzt importiert
  selectedSubcategory: string | null;
  setFinalSelectedTime: (time: string) => void;
}

export default function SidebarFilters({
  city,
  setCity,
  postalCode,
  setPostalCode,
  isLoaded,
  onLoad,
  onPlaceChanged,
  finalSelectedDateRange,
  finalSelectedTime,
  onDateTimeConfirm,
  onOpenDatePicker,
  currentMaxPrice,
  dynamicSliderMin,
  dynamicSliderMax,
  handlePriceSliderChange,
  resetPriceFilter,
  loadingSubcategoryData,
  averagePriceForSubcategory,
  priceDistribution,
  selectedSubcategory,
  setFinalSelectedTime,
}: SidebarFiltersProps) {

  const subcategoriesToShowDateTimeFilters = useMemo(() => {
    const handwerkSubcategories = categories.find(cat => cat.title === "Handwerk")?.subcategories || [];
    const haushaltReinigungSubcategories = categories.find(cat => cat.title === "Haushalt & Reinigung")?.subcategories || [];
    return new Set([...handwerkSubcategories, ...haushaltReinigungSubcategories]);
  }, []);

  const shouldShowDateTimeFilters = useMemo(() => {
    return selectedSubcategory !== null && subcategoriesToShowDateTimeFilters.has(selectedSubcategory);
  }, [selectedSubcategory, subcategoriesToShowDateTimeFilters]);


  return (
    <div className="w-full lg:w-1/3 bg-white rounded-lg shadow-md p-4 space-y-6 flex-shrink-0 self-start">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Filter & Standort</h2>
      <div>
        <Label className="text-base font-medium text-gray-800 dark:text-white">Ort oder Adresse</Label>
        {isLoaded ? (
          <Autocomplete
            onLoad={onLoad}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Adresse, Stadt oder Land"
              className="w-full rounded-md border p-2 mt-2"
            />
          </Autocomplete>
        ) : (
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Kartenkomponente wird geladen..."
            className="w-full rounded-md border p-2 mt-2 bg-gray-100"
            disabled
          />
        )}
      </div>
      <div>
        <Label className="text-base font-medium text-gray-800 dark:text-white">Postleitzahl</Label>
        <input
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Postleitzahl"
          className="w-full rounded-md border p-2 mt-2"
        />
      </div>

      {shouldShowDateTimeFilters && (
        <>
          <DateSelector
            selectedSubcategory={selectedSubcategory}
            finalSelectedDateRange={finalSelectedDateRange}
            onDateTimeConfirm={onDateTimeConfirm}
            onOpenDatePicker={onOpenDatePicker}
            finalSelectedTime={finalSelectedTime}
          />

          <DateTimeSelector
            finalSelectedTime={finalSelectedTime}
            setFinalSelectedTime={setFinalSelectedTime}
          />
        </>
      )}

      {/* Hier wird der gesamte Preisfilter-Bereich durch die neue Komponente ersetzt */}
      <PriceFilter
        currentMaxPrice={currentMaxPrice}
        dynamicSliderMin={dynamicSliderMin}
        dynamicSliderMax={dynamicSliderMax}
        handlePriceSliderChange={handlePriceSliderChange}
        resetPriceFilter={resetPriceFilter}
        loadingSubcategoryData={loadingSubcategoryData}
        averagePriceForSubcategory={averagePriceForSubcategory}
        priceDistribution={priceDistribution}
      />

      <div className="pt-4 border-t border-gray-200">
        <Label className="text-sm font-medium text-gray-700">Kategorien</Label>
        <div className="mt-2 text-sm text-gray-600">
          <div><input type="checkbox" className="mr-2 accent-[#14ad9f]" />Pro-Tasker</div>
        </div>
      </div>
    </div>
  );
}
