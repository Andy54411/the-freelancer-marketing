'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ProfileTabProps } from './types';
import { FiMapPin, FiSearch } from 'react-icons/fi';
import { toast } from 'sonner';

const LocationTab: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.PlaceResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Google Places Autocomplete
  const initializeAutocomplete = useCallback(() => {
    if (!window.google || !inputRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(cities)'],
        fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place && place.address_components) {
          updateLocationFromPlace(place);
        }
      });

      autocompleteRef.current = autocomplete;
    } catch {}
  }, []);

  // Update profile location from selected place
  const updateLocationFromPlace = (place: google.maps.places.PlaceResult) => {
    if (!place.address_components) return;

    let city = '';
    let country = '';
    let postalCode = '';
    let street = '';

    place.address_components.forEach(component => {
      const types = component.types;

      if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name;
      } else if (types.includes('route')) {
        street = component.long_name;
      }
    });

    setProfile(prev =>
      prev
        ? {
            ...prev,
            city: city || prev.city,
            country: country || prev.country,
            postalCode: postalCode || prev.postalCode || '',
            street: street || prev.street || '',
            fullAddress: place.formatted_address || prev.fullAddress || '',
            latitude: place.geometry?.location?.lat() || prev.latitude,
            longitude: place.geometry?.location?.lng() || prev.longitude,
          }
        : null
    );

    toast.success('Standort aktualisiert');
  };

  // Search for places manually
  const searchPlaces = async (query: string) => {
    if (!window.google || !query.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoadingPlaces(true);

    try {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));

      const request = {
        query,
        fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      };

      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setSuggestions(results.slice(0, 5));
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
        setIsLoadingPlaces(false);
      });
    } catch {
      setIsLoadingPlaces(false);
    }
  };

  // Handle manual input search
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value.length > 2) {
      searchPlaces(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Load Google Places API script
  React.useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google) {
        initializeAutocomplete();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_Maps_API_KEY}&libraries=places`;
      script.onload = initializeAutocomplete;
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, [initializeAutocomplete]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FiMapPin className="text-[#14ad9f]" size={24} />
        <h3 className="text-lg font-semibold text-gray-900">Standort & Adresse</h3>
      </div>

      {/* Google Places Search */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ort suchen (Google Places)
          </label>
          <div className="relative">
            <div className="relative">
              <FiSearch
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Stadt, Adresse oder Postleitzahl eingeben..."
                onChange={handleSearchInput}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              />
              {isLoadingPlaces && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14ad9f]"></div>
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((place, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      updateLocationFromPlace(place);
                      setShowSuggestions(false);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <FiMapPin className="text-gray-400" size={14} />
                      <div>
                        <div className="font-medium text-gray-900">{place.name}</div>
                        <div className="text-sm text-gray-600">{place.formatted_address}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Address Input */}
      <div className="border-t pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Oder manuell eingeben</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Land</label>
            <input
              type="text"
              value={profile.country}
              onChange={e =>
                setProfile(prev => (prev ? { ...prev, country: e.target.value } : null))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              placeholder="Deutschland"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stadt</label>
            <input
              type="text"
              value={profile.city}
              onChange={e => setProfile(prev => (prev ? { ...prev, city: e.target.value } : null))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              placeholder="Berlin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Postleitzahl</label>
            <input
              type="text"
              value={profile.postalCode || ''}
              onChange={e =>
                setProfile(prev => (prev ? { ...prev, postalCode: e.target.value } : null))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              placeholder="10115"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Straße (optional)
            </label>
            <input
              type="text"
              value={profile.street || ''}
              onChange={e =>
                setProfile(prev => (prev ? { ...prev, street: e.target.value } : null))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              placeholder="Musterstraße 123"
            />
          </div>
        </div>
      </div>

      {/* Current Location Display */}
      {(profile.city || profile.country) && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Aktueller Standort</h4>
          <div className="flex items-center gap-2 text-gray-700">
            <FiMapPin className="text-[#14ad9f]" size={16} />
            <span>
              {[profile.street, profile.city, profile.postalCode, profile.country]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
          {profile.fullAddress && profile.fullAddress !== profile.city && (
            <div className="text-sm text-gray-500 mt-1">Google Places: {profile.fullAddress}</div>
          )}
        </div>
      )}

      {/* API Key Info */}
      {!process.env.NEXT_PUBLIC_Maps_API_KEY && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <FiMapPin size={16} />
            <span className="font-medium">Google Places API nicht konfiguriert</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Füge deinen Google Maps API Key in die Umgebungsvariablen hinzu, um die Ortssuche zu
            aktivieren.
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationTab;
