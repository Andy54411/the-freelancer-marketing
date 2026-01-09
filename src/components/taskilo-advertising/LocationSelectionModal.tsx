'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, Search, MapPin, X } from 'lucide-react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/contexts/GoogleMapsLoaderContext';
import AffiliateLocationModal from './AffiliateLocationModal';

interface LocationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  googleBusinessAccounts?: any[];
}

export default function LocationSelectionModal({
  isOpen,
  onClose,
  onContinue,
  googleBusinessAccounts: _googleBusinessAccounts = [],
}: LocationSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState('google-business');
  const [selectedSubOption, setSelectedSubOption] = useState('dashboard');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showChainStoreModal, setShowChainStoreModal] = useState(false);
  const [mapsSearchQuery, setMapsSearchQuery] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 48.1351, lng: 11.582 }); // München als Standard
  const [mapZoom, setMapZoom] = useState(10);

  const { isLoaded, google } = useGoogleMaps();

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng && google) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        try {
          // Reverse Geocoding um Adresse zu bekommen
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const newLocation = {
                name: results[0].formatted_address,
                address: results[0].formatted_address,
                lat,
                lng,
              };

              // Prüfen ob bereits ausgewählt
              if (
                !selectedLocations.find(
                  loc => Math.abs(loc.lat - lat) < 0.001 && Math.abs(loc.lng - lng) < 0.001
                )
              ) {
                setSelectedLocations(prev => [...prev, newLocation]);
              }
            } else {
              console.log('Geocoding failed:', status);
            }
          });
        } catch (error) {
          console.error('Geocoding error:', error);
        }
      }
    },
    [selectedLocations, google]
  );

  const handleSearchLocation = useCallback(() => {
    console.log('🔍 Maps search triggered:', {
      query: mapsSearchQuery,
      isLoaded,
      hasGoogle: !!google,
    });

    if (!mapsSearchQuery.trim() || !isLoaded || !google) {
      console.warn('⚠️ Search aborted - missing requirements');
      return;
    }

    try {
      console.log('📍 Creating PlacesService...');
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      const request = {
        query: mapsSearchQuery,
        fields: ['name', 'formatted_address', 'geometry'],
      };

      console.log('📤 Sending textSearch request:', request);
      service.textSearch(request, (results, status) => {
        console.log('📥 Search results:', { status, resultsCount: results?.length });

        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const searchResults = results.slice(0, 5).map(place => ({
            name: place.name || 'Unbekannt',
            address: place.formatted_address || '',
            lat: place.geometry?.location?.lat() || 0,
            lng: place.geometry?.location?.lng() || 0,
          }));
          console.log('✅ Mapped results:', searchResults);
          setSearchResults(searchResults);
        } else {
          console.log('❌ Places search failed:', status);
          setSearchResults([]);
        }
      });
    } catch (error) {
      console.error('💥 Search error:', error);
      setSearchResults([]);
    }
  }, [mapsSearchQuery, isLoaded, google]);

  const handleContinue = async () => {
    if (selectedOption === 'google-business' && selectedSubOption === 'dashboard') {
      // Trigger Google Business Profile OAuth
      try {
        const popup = window.open(
          '/api/auth/google-business-profile',
          'googleBusinessProfileAuth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (popup) {
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              // OAuth completed, close modal
              onContinue();
            }
          }, 1000);
        }
      } catch (error) {
        console.error('OAuth error:', error);
      }
    } else {
      onContinue();
    }
  };

  if (!isOpen) return null;

  console.log('🎭 LocationSelectionModal render:', {
    isOpen,
    selectedOption,
    showChainStoreModal,
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      {/* Nur LocationSelectionModal anzeigen wenn NICHT retail selected */}
      {!showChainStoreModal && (
        <div
          className={`bg-white rounded-lg shadow-xl max-w-[90vw] ${selectedOption === 'maps' ? 'w-[1400px] max-h-[85vh] overflow-hidden' : 'w-[800px] max-h-[85vh]'}`}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-normal text-gray-900">Standorte für Ihr Konto auswählen</h1>
          </div>

          {/* Content */}
          <div
            className={`px-6 py-6 ${selectedOption === 'maps' ? 'overflow-y-auto' : ''}`}
            style={{ maxHeight: 'calc(85vh - 120px)' }}
          >
            {/* Top Radio Group - Horizontal */}
            <div className="flex items-center space-x-8 mb-6">
              <label
                className="flex items-center cursor-pointer"
                onClick={() => setSelectedOption('google-business')}
              >
                <div className="relative w-4 h-4 mr-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${selectedOption === 'google-business' ? 'border-teal-600' : 'border-gray-400'} bg-white flex items-center justify-center`}
                  >
                    {selectedOption === 'google-business' && (
                      <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm ${selectedOption === 'google-business' ? 'text-gray-900' : 'text-gray-600'}`}
                >
                  Google Unternehmensprofil
                </span>
              </label>

              <label
                className="flex items-center cursor-pointer"
                onClick={() => {
                  console.log('🔵 Filialgeschäfte clicked - Opening AffiliateLocationModal');
                  setSelectedOption('retail');
                  setShowChainStoreModal(true);
                }}
              >
                <div className="relative w-4 h-4 mr-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${selectedOption === 'retail' ? 'border-teal-600' : 'border-gray-400'} bg-white flex items-center justify-center`}
                  >
                    {selectedOption === 'retail' && (
                      <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm ${selectedOption === 'retail' ? 'text-gray-900' : 'text-gray-600'}`}
                >
                  Filialgeschäfte
                </span>
              </label>

              <label
                className="flex items-center cursor-pointer"
                onClick={() => setSelectedOption('maps')}
              >
                <div className="relative w-4 h-4 mr-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${selectedOption === 'maps' ? 'border-teal-600' : 'border-gray-400'} bg-white flex items-center justify-center`}
                  >
                    {selectedOption === 'maps' && (
                      <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm ${selectedOption === 'maps' ? 'text-gray-900' : 'text-gray-600'}`}
                >
                  Google Maps
                </span>
              </label>
            </div>

            {/* Nested Options - Only show for Google Business Profile */}
            {selectedOption === 'google-business' && (
              <div className="ml-6 space-y-3">
                {/* Dashboard Account Option */}
                <div>
                  <label
                    className="flex items-center cursor-pointer mb-3"
                    onClick={() => setSelectedSubOption('dashboard')}
                  >
                    <div className="relative w-4 h-4 mr-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${selectedSubOption === 'dashboard' ? 'border-teal-600' : 'border-gray-400'} bg-white flex items-center justify-center`}
                      >
                        {selectedSubOption === 'dashboard' && (
                          <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm ${selectedSubOption === 'dashboard' ? 'text-gray-900' : 'text-gray-600'}`}
                    >
                      Unternehmensprofil-Dashboard-Konto auswählen
                    </span>
                    <div className="w-4 h-4 ml-2 rounded-full border border-gray-400 flex items-center justify-center cursor-help">
                      <span className="text-xs text-gray-500">?</span>
                    </div>
                  </label>

                  {/* Dropdown - Only show for dashboard option */}
                  {selectedSubOption === 'dashboard' && (
                    <div className="ml-6">
                      <div
                        className="relative w-80 px-3 py-2 border-2 border-teal-500 rounded bg-white flex items-center justify-between cursor-pointer"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      >
                        <div className="text-center flex-1">
                          <div className="text-sm text-gray-900">a.staudinger32@gmail.com</div>
                          <div className="text-sm text-gray-900">(0 Standorte)</div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-500 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </div>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute z-10 w-80 mt-1 bg-white border border-gray-300 rounded shadow-lg">
                          <div className="px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <div className="text-sm text-gray-900">a.staudinger32@gmail.com</div>
                            <div className="text-sm text-gray-500">(0 Standorte)</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Request Access Option */}
                <label
                  className="flex items-center cursor-pointer"
                  onClick={() => setSelectedSubOption('request')}
                >
                  <div className="relative w-4 h-4 mr-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${selectedSubOption === 'request' ? 'border-teal-600' : 'border-gray-400'} bg-white flex items-center justify-center`}
                    >
                      {selectedSubOption === 'request' && (
                        <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm ${selectedSubOption === 'request' ? 'text-gray-900' : 'text-gray-600'}`}
                  >
                    Zugriff auf ein anderes Unternehmensprofil-Dashboard-Konto anfordern
                  </span>
                  <div className="w-4 h-4 ml-2 rounded-full border border-gray-400 flex items-center justify-center cursor-help">
                    <span className="text-xs text-gray-500">?</span>
                  </div>
                </label>

                {/* Domain Input Option */}
                <label
                  className="flex items-center cursor-pointer"
                  onClick={() => setSelectedSubOption('domain')}
                >
                  <div className="relative w-4 h-4 mr-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${selectedSubOption === 'domain' ? 'border-teal-600' : 'border-gray-400'} bg-white flex items-center justify-center`}
                    >
                      {selectedSubOption === 'domain' && (
                        <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm ${selectedSubOption === 'domain' ? 'text-gray-900' : 'text-gray-600'}`}
                  >
                    Domain eingeben, um Zugriff anzufordern
                  </span>
                </label>
              </div>
            )}

            {/* Other Options Content */}
            {selectedOption === 'retail' && (
              <div className="ml-6 text-sm text-gray-600">
                Filialgeschäfte-Optionen werden hier angezeigt...
              </div>
            )}

            {selectedOption === 'maps' && (
              <div className="ml-6">
                {/* Google Maps Interface */}
                <div className="flex gap-4 h-[500px]">
                  {/* Left Panel - Map */}
                  <div className="flex-1 border border-gray-300 rounded relative overflow-hidden">
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={mapCenter}
                        zoom={mapZoom}
                        onClick={handleMapClick}
                        options={{
                          fullscreenControl: false,
                          mapTypeControl: false,
                          streetViewControl: false,
                          clickableIcons: true,
                          zoomControl: true,
                          gestureHandling: 'cooperative',
                        }}
                      >
                        {/* Marker für ausgewählte Standorte */}
                        {selectedLocations.map(
                          (location, index) =>
                            location.lat &&
                            location.lng && (
                              <Marker
                                key={index}
                                position={{ lat: location.lat, lng: location.lng }}
                                title={location.name}
                              />
                            )
                        )}
                      </GoogleMap>
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-teal-100 to-green-100 rounded flex items-center justify-center">
                        <div className="text-center text-gray-600">
                          <MapPin className="w-8 h-8 mx-auto mb-2 text-teal-500 animate-pulse" />
                          <div className="text-sm font-medium mb-1">
                            Google Maps wird geladen...
                          </div>
                          <div className="text-xs">Bitte warten Sie einen Moment</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Panel - Search and Selection */}
                  <div className="w-96 border border-gray-300 rounded bg-white flex flex-col">
                    {/* Tab Header */}
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center">
                        <div className="px-3 py-1 bg-teal-100 text-teal-700 rounded text-sm font-medium border-b-2 border-teal-500">
                          Suche
                        </div>
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-200">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Suchen"
                          value={mapsSearchQuery}
                          onChange={e => {
                            console.log('📝 Input changed:', e.target.value);
                            setMapsSearchQuery(e.target.value);
                          }}
                          onKeyDown={e => {
                            console.log('⌨️ Key pressed:', e.key);
                            if (e.key === 'Enter') {
                              console.log('🔑 Enter detected - calling handleSearchLocation');
                              handleSearchLocation();
                            }
                          }}
                          className="w-full px-3 py-2 pr-8 border-b border-gray-300 text-sm focus:outline-none focus:border-teal-500 bg-transparent"
                        />
                        <button
                          onClick={() => {
                            console.log('🖱️ Search button clicked');
                            handleSearchLocation();
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-teal-500"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Selection Panel */}
                    <div className="flex-1 flex flex-col">
                      {/* Selected Locations Header */}
                      <div className="p-3 border-b border-gray-200">
                        <div className="text-sm text-gray-900 font-medium">
                          {selectedLocations.length === 0
                            ? 'Nichts ausgewählt'
                            : `${selectedLocations.length} Standort(e) ausgewählt`}
                        </div>
                      </div>

                      {/* Selected Locations List */}
                      {selectedLocations.length > 0 && (
                        <div className="p-3 border-b border-gray-200 max-h-32 overflow-y-auto">
                          {selectedLocations.map((location, index) => (
                            <div key={index} className="flex items-center justify-between py-1">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 text-red-500 mr-2" />
                                <div className="text-sm text-gray-900">{location.name}</div>
                              </div>
                              <button
                                onClick={() =>
                                  setSelectedLocations(prev => prev.filter((_, i) => i !== index))
                                }
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Search Results or Empty State */}
                      <div className="flex-1 p-3 overflow-y-auto">
                        {searchResults.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500 mb-2">
                              Suchergebnisse für &quot;{mapsSearchQuery}&quot;:
                            </div>
                            {searchResults.map((result, index) => (
                              <div
                                key={index}
                                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded border border-gray-200"
                                onClick={() => {
                                  // Zu Karte zentrieren und Standort hinzufügen
                                  setMapCenter({ lat: result.lat, lng: result.lng });
                                  setMapZoom(15);

                                  if (
                                    !selectedLocations.find(
                                      loc =>
                                        Math.abs(loc.lat - result.lat) < 0.001 &&
                                        Math.abs(loc.lng - result.lng) < 0.001
                                    )
                                  ) {
                                    setSelectedLocations(prev => [...prev, result]);
                                  }
                                  setSearchResults([]);
                                  setMapsSearchQuery('');
                                }}
                              >
                                <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm text-gray-900">{result.name}</div>
                                  <div className="text-xs text-gray-500">{result.address}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : mapsSearchQuery && searchResults.length === 0 ? (
                          <div className="text-center text-gray-400">
                            <div className="text-xs">
                              Drücken Sie Enter oder klicken Sie auf das Suchsymbol, um zu suchen
                            </div>
                          </div>
                        ) : selectedLocations.length === 0 ? (
                          <div className="text-center text-gray-400">
                            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <div className="text-xs">
                              Geben Sie einen Suchbegriff ein oder klicken Sie auf die Karte, um
                              Standorte auszuwählen
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Info Text - INNERHALB des rechten Panels */}
                      <div className="p-3 bg-teal-50 border-t border-teal-200">
                        <div className="flex items-start">
                          <div className="w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0">
                            <span className="text-white text-xs">i</span>
                          </div>
                          <div className="text-xs text-teal-800">
                            <p className="font-medium mb-1">
                              Interaktive Google Maps Standortauswahl
                            </p>
                            <p>
                              Klicken Sie direkt auf die Karte, um Standorte hinzuzufügen, oder
                              nutzen Sie die Suchfunktion, um nach spezifischen Adressen,
                              Unternehmen oder Sehenswürdigkeiten zu suchen.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleContinue}
              disabled={selectedOption === 'maps' && selectedLocations.length === 0}
              className={`px-4 py-2 text-sm font-medium rounded ${
                selectedOption === 'maps' && selectedLocations.length === 0
                  ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  : 'text-white bg-teal-600 hover:bg-teal-700'
              }`}
            >
              Weiter
            </button>
          </div>
        </div>
      )}

      {/* Affiliate Location Modal */}
      <AffiliateLocationModal
        isOpen={showChainStoreModal}
        onClose={() => setShowChainStoreModal(false)}
        onContinue={selectedItems => {
          console.log('Affiliate locations selected:', selectedItems);
          setShowChainStoreModal(false);
          onContinue();
        }}
      />
    </div>
  );
}
