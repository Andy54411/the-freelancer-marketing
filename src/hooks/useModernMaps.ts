'use client';

import { useEffect, useState } from 'react';
import { useGoogleMaps } from '../contexts/GoogleMapsLoaderContext';

interface PlaceDetails {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

interface UseModernMapsResult {
  isLoaded: boolean;
  createAutocomplete: (
    input: HTMLInputElement,
    options?: {
      countries?: string[];
      onPlaceSelected?: (place: PlaceDetails) => void;
    }
  ) => void;
  createAdvancedMarker: (options: {
    position: { lat: number; lng: number };
    map: google.maps.Map;
    title?: string;
  }) => any;
  supportsModernFeatures: boolean;
  warnings: string[];
}

/**
 * Hook für moderne Google Maps Features mit Fallbacks
 * Automatische Migration von veralteten APIs auf moderne Varianten
 */
export const useModernMaps = (): UseModernMapsResult => {
  const { isLoaded, google } = useGoogleMaps();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [supportsModernFeatures, setSupportsModernFeatures] = useState(false);

  useEffect(() => {
    if (!isLoaded || !google) return;

    const newWarnings: string[] = [];

    // Prüfe Verfügbarkeit moderner Features
    const hasPlaceAutocompleteElement = !!(google.maps.places as any)?.PlaceAutocompleteElement;
    const hasAdvancedMarkerElement = !!(google.maps.marker as any)?.AdvancedMarkerElement;

    if (!hasPlaceAutocompleteElement) {
      newWarnings.push('PlaceAutocompleteElement nicht verfügbar - verwende Autocomplete-Fallback');
    }

    if (!hasAdvancedMarkerElement) {
      newWarnings.push('AdvancedMarkerElement nicht verfügbar - verwende Marker-Fallback');
    }

    setSupportsModernFeatures(hasPlaceAutocompleteElement && hasAdvancedMarkerElement);
    setWarnings(newWarnings);

    // Unterdrücke bekannte Deprecation-Warnings
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      if (
        message.includes('google.maps.places.Autocomplete is not available to new customers') ||
        message.includes('google.maps.Marker is deprecated') ||
        message.includes('Google Maps already loaded outside')
      ) {
        return; // Ignoriere diese spezifischen Warnungen
      }
      originalWarn.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
    };
  }, [isLoaded, google]);

  const createAutocomplete = (
    input: HTMLInputElement,
    options: {
      countries?: string[];
      onPlaceSelected?: (place: PlaceDetails) => void;
    } = {}
  ) => {
    if (!isLoaded || !google || !input) return;

    const { countries = ['de', 'at', 'ch'], onPlaceSelected } = options;

    // Versuche zuerst PlaceAutocompleteElement (modern)
    if ((google.maps.places as any).PlaceAutocompleteElement) {
      try {
        const element = new (google.maps.places as any).PlaceAutocompleteElement({
          componentRestrictions: { country: countries },
        });

        element.addEventListener('gmp-placeselect', (event: any) => {
          const place = event.place;
          const placeDetails = extractPlaceDetails(place);
          onPlaceSelected?.(placeDetails);
        });

        input.parentElement?.appendChild(element);
        input.style.display = 'none';
        console.log('✅ PlaceAutocompleteElement verwendet');
        return;
      } catch (error) {
        console.warn('⚠️ PlaceAutocompleteElement-Fehler:', error);
      }
    }

    // Fallback auf traditionelles Autocomplete
    try {
      const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: countries },
        fields: ['address_components', 'geometry', 'formatted_address', 'name'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        const placeDetails = extractPlaceDetails(place);
        onPlaceSelected?.(placeDetails);
      });

      console.log('✅ Autocomplete-Fallback verwendet');
    } catch (error) {
      console.error('❌ Autocomplete-Fehler:', error);
    }
  };

  const createAdvancedMarker = (options: {
    position: { lat: number; lng: number };
    map: google.maps.Map;
    title?: string;
  }) => {
    if (!isLoaded || !google) return null;

    const { position, map, title } = options;

    // Versuche zuerst AdvancedMarkerElement (modern)
    if ((google.maps.marker as any)?.AdvancedMarkerElement) {
      try {
        return new (google.maps.marker as any).AdvancedMarkerElement({
          position,
          map,
          title,
        });
      } catch (error) {
        console.warn('⚠️ AdvancedMarkerElement-Fehler:', error);
      }
    }

    // Fallback auf traditionellen Marker
    try {
      return new google.maps.Marker({
        position,
        map,
        title,
      });
    } catch (error) {
      console.error('❌ Marker-Fehler:', error);
      return null;
    }
  };

  const extractPlaceDetails = (place: any): PlaceDetails => {
    if (!place?.address_components) {
      return {
        address: place?.formatted_address || '',
        city: '',
        postalCode: '',
        country: '',
      };
    }

    let city = '';
    let postalCode = '';
    let country = '';

    place.address_components.forEach((component: any) => {
      const types = component.types;

      if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      }
    });

    return {
      address: place.formatted_address || '',
      city,
      postalCode,
      country,
      latitude: place.geometry?.location?.lat?.(),
      longitude: place.geometry?.location?.lng?.(),
    };
  };

  return {
    isLoaded,
    createAutocomplete,
    createAdvancedMarker,
    supportsModernFeatures,
    warnings,
  };
};

export default useModernMaps;
