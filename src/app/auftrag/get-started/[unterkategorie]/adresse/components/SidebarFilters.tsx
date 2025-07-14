// /Users/andystaudinger/Taskilo/src/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters.tsx
'use client';

import { Label } from '@/components/ui/label';
import { DateRange } from 'react-day-picker';
import React, { useMemo, useRef, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';

// Importiere die spezifischen Komponenten
import DateSelector from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/DateSelector';
import DateTimeSelector from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/DateTimeSelector';
import PriceFilter from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/PriceFilter';
import { categories } from '@/lib/categories';

// Importiere PriceDistributionData von PriceFilter.tsx
import type { PriceDistributionData } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/PriceFilter';

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
  priceDistribution: PriceDistributionData[] | null;
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
    const handwerkSubcategories =
      categories.find(cat => cat.title === 'Handwerk')?.subcategories || [];
    const haushaltReinigungSubcategories =
      categories.find(cat => cat.title === 'Haushalt & Reinigung')?.subcategories || [];
    return new Set([...handwerkSubcategories, ...haushaltReinigungSubcategories]);
  }, []);

  const shouldShowDateTimeFilters = useMemo(() => {
    return (
      selectedSubcategory !== null && subcategoriesToShowDateTimeFilters.has(selectedSubcategory)
    );
  }, [selectedSubcategory, subcategoriesToShowDateTimeFilters]);

  const autocompleteInputRef = useRef<HTMLInputElement>(null);

  // Lokaler Event-Handler für place_changed mit direkter Postleitzahl-Aktualisierung
  const handlePlaceChanged = (autocompleteInstance: google.maps.places.Autocomplete) => {
    const place = autocompleteInstance.getPlace();

    if (place && place.address_components) {
      let foundCity = '';
      let foundPostalCode = '';

      // Extrahiere Stadt und Postleitzahl aus den Adresskomponenten
      place.address_components.forEach(component => {
        const types = component.types;

        // Stadt/Ort
        if (types.includes('locality')) {
          foundCity = component.long_name;
        } else if (types.includes('postal_town') && !foundCity) {
          foundCity = component.long_name;
        } else if (types.includes('sublocality') && !foundCity) {
          foundCity = component.long_name;
        } else if (types.includes('administrative_area_level_2') && !foundCity) {
          foundCity = component.long_name;
        }

        // Postleitzahl
        if (types.includes('postal_code')) {
          foundPostalCode = component.long_name;
        }
      });

      // Aktualisiere die lokalen Felder direkt
      if (foundCity && foundCity !== city) {
        setCity(foundCity);
      }

      if (foundPostalCode && foundPostalCode !== postalCode) {
        setPostalCode(foundPostalCode);
      }
    }

    // Rufe auch den übergeordneten Callback auf
    onPlaceChanged();
  };

  // Effekt zum Initialisieren der Autocomplete-Instanz - VOLLSTÄNDIG STABILISIERT
  useEffect(() => {
    if (isLoaded && autocompleteInputRef.current && window.google?.maps?.places?.Autocomplete) {
      let autocompleteInstance: google.maps.places.Autocomplete | null = null;

      try {
        // Unterdrücke Google Maps Autocomplete Deprecation-Warnungen temporär
        const originalConsoleWarn = console.warn;
        console.warn = (...args) => {
          const message = args.join(' ');
          if (
            message.includes('google.maps.places.Autocomplete is not available to new customers') ||
            message.includes('PlaceAutocompleteElement')
          ) {
            return; // Ignoriere diese spezifische Warnung
          }
          originalConsoleWarn.apply(console, args);
        };

        autocompleteInstance = new window.google.maps.places.Autocomplete(
          autocompleteInputRef.current,
          {
            componentRestrictions: { country: ['de', 'at', 'ch'] },
            fields: ['address_components', 'geometry', 'formatted_address', 'name'],
          }
        );

        // Rufe onLoad direkt auf, um das autocomplete-Objekt zu setzen (ohne useCallback-Wrapper)
        onLoad(autocompleteInstance);

        // Event-Listener mit lokalem Handler für direkte Postleitzahl-Aktualisierung
        const placeChangedListener = () => {
          if (autocompleteInstance) {
            handlePlaceChanged(autocompleteInstance);
          }
        };
        autocompleteInstance.addListener('place_changed', placeChangedListener);

        // console.warn wiederherstellen
        console.warn = originalConsoleWarn;
      } catch (error) {
        console.error('Fehler beim Initialisieren der Autocomplete-Instanz:', error);
      }

      return () => {
        // Cleanup: Entferne alle Event Listener
        if (autocompleteInstance && window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteInstance);
        }
      };
    }
    // ESLint-disable um die Endlosschleife zu vermeiden - onLoad und onPlaceChanged werden als stabil angenommen
    // handlePlaceChanged nutzt setCity und setPostalCode, aber diese sind stabil von der übergeordneten Komponente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]); // NUR isLoaded als Abhängigkeit

  return (
    <div className="w-full lg:w-1/3 bg-white rounded-lg shadow-md p-4 space-y-6 flex-shrink-0 self-start">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Filter & Standort</h2>
      <div>
        <Label className="text-base font-medium text-gray-800 dark:text-white">
          Ort oder Adresse
        </Label>
        {isLoaded ? (
          <input
            ref={autocompleteInputRef}
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Adresse, Stadt oder Land"
            className="w-full rounded-md border p-2 mt-2"
          />
        ) : (
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
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
          onChange={e => setPostalCode(e.target.value)}
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

      {/* Preisfilter-Komponente */}
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
          <div>
            <input type="checkbox" className="mr-2 accent-[#14ad9f]" />
            Pro-Tasker
          </div>
        </div>
      </div>
    </div>
  );
}
