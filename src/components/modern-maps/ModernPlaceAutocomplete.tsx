'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface PlaceDetails {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

interface ModernPlaceAutocompleteProps {
  onPlaceSelected: (place: PlaceDetails) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  countries?: string[];
}

/**
 * Moderne Google Places Autocomplete Komponente
 * Verwendet PlaceAutocompleteElement wenn verfügbar, fällt auf Autocomplete zurück
 */
export const ModernPlaceAutocomplete: React.FC<ModernPlaceAutocompleteProps> = ({
  onPlaceSelected,
  placeholder = 'Adresse, Stadt oder Land',
  value = '',
  onChange,
  className = 'w-full rounded-md border p-2',
  countries = ['de', 'at', 'ch'],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const elementRef = useRef<any>(null);

  const handlePlaceSelection = useCallback(
    (place: any) => {
      if (!place?.address_components) return;

      const address = place.formatted_address || '';
      let city = '';
      let postalCode = '';
      let country = '';
      let state = '';

      place.address_components.forEach((component: any) => {
        const types = component.types;

        if (types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('postal_code')) {
          postalCode = component.long_name;
        } else if (types.includes('country')) {
          country = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
      });

      const placeDetails: PlaceDetails = {
        address,
        city,
        postalCode,
        country,
        state,
        latitude: place.geometry?.location?.lat?.(),
        longitude: place.geometry?.location?.lng?.(),
      };

      onPlaceSelected(placeDetails);
    },
    [onPlaceSelected]
  );

  useEffect(() => {
    if (!window.google?.maps?.places) return;

    // Versuche zuerst das moderne PlaceAutocompleteElement zu verwenden
    if (window.google.maps.places.PlaceAutocompleteElement && containerRef.current) {
      try {
        const element = new window.google.maps.places.PlaceAutocompleteElement({
          componentRestrictions: { country: countries },
        });

        element.addEventListener('gmp-placeselect', (event: any) => {
          const place = event.place;
          handlePlaceSelection(place);
        });

        containerRef.current.appendChild(element);
        elementRef.current = element;

        return;
      } catch {}
    }

    // Fallback auf traditionelles Autocomplete
    if (window.google.maps.places.Autocomplete && inputRef.current) {
      try {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: countries },
          fields: ['address_components', 'geometry', 'formatted_address', 'name'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          handlePlaceSelection(place);
        });
      } catch {}
    }

    return () => {
      // Cleanup
      if (elementRef.current && containerRef.current?.contains(elementRef.current)) {
        containerRef.current.removeChild(elementRef.current);
      }
    };
  }, [countries, placeholder, handlePlaceSelection]);

  return (
    <div className="relative">
      {/* Container für modernes PlaceAutocompleteElement */}
      <div ref={containerRef} className="w-full" />

      {/* Fallback Input für traditionelles Autocomplete */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={className}
        style={{ display: elementRef.current ? 'none' : 'block' }}
      />
    </div>
  );
};

export default ModernPlaceAutocomplete;
