'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoogleMaps } from '@/contexts/GoogleMapsLoaderContext';
import {
  GooglePlacesAffiliateService,
  AffiliateCountry,
  AffiliateChain,
} from '@/services/GooglePlacesAffiliateService';

interface AffiliateLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (selectedItems: SelectedItem[]) => void;
}

// Interfaces werden jetzt aus dem Service importiert
type Country = AffiliateCountry;
type Chain = AffiliateChain;

interface SelectedItem {
  type: 'country' | 'chain';
  countryId: string;
  countryName: string;
  chainId?: string;
  chainName?: string;
  locationCount: number;
  placeId?: string;
  category?: string;
}

// Länder werden jetzt dynamisch von Google Places API geladen

export default function AffiliateLocationModal({
  isOpen,
  onClose,
  onContinue,
}: AffiliateLocationModalProps) {
  const { isLoaded, google } = useGoogleMaps();
  const [selectedChainType, setSelectedChainType] = useState<string>('general-retail');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState<boolean>(false);
  const [isLoadingChains, setIsLoadingChains] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Chain[]>([]);

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCountryClick = async (countryId: string) => {
    if (expandedCountry === countryId) {
      setExpandedCountry(null);
      return;
    }

    setExpandedCountry(countryId);

    // Lade Ketten für das Land, falls noch nicht geladen
    const country = countries.find(c => c.id === countryId);
    if (country && (!country.chains || country.chains.length === 0)) {
      setIsLoadingChains(true);
      try {
        const chains = await GooglePlacesAffiliateService.getChainsByCountry(country.countryCode);

        // Aktualisiere das Land mit den geladenen Ketten
        setCountries(prev =>
          prev.map(c => (c.id === countryId ? { ...c, chains, hasChains: chains.length > 0 } : c))
        );
      } catch (error) {
        console.error('Fehler beim Laden der Ketten:', error);
      } finally {
        setIsLoadingChains(false);
      }
    }
  };

  const handleChainSelect = (country: Country, chain: Chain) => {
    const newItem: SelectedItem = {
      type: 'chain',
      countryId: country.id,
      countryName: country.name,
      chainId: chain.id,
      chainName: chain.name,
      locationCount: chain.locationCount,
      placeId: chain.placeId,
      category: chain.category,
    };

    setSelectedItems(prev => {
      const exists = prev.find(item => item.chainId === chain.id && item.countryId === country.id);

      if (exists) {
        return prev.filter(item => !(item.chainId === chain.id && item.countryId === country.id));
      } else {
        return [...prev, newItem];
      }
    });
  };

  const isChainSelected = (countryId: string, chainId: string) => {
    return selectedItems.some(item => item.countryId === countryId && item.chainId === chainId);
  };

  const handleContinue = () => {
    onContinue(selectedItems);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length > 2) {
      setIsLoadingChains(true);
      try {
        const results = await GooglePlacesAffiliateService.searchChains(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Fehler bei der Suche:', error);
        setSearchResults([]);
      } finally {
        setIsLoadingChains(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Initialisiere PlacesService wenn Google Maps geladen ist
  useEffect(() => {
    console.log('🔄 AffiliateLocationModal - Google Maps status:', {
      isLoaded,
      hasGoogle: !!google,
    });
    if (isLoaded && google) {
      console.log('🎯 Initializing GooglePlacesAffiliateService...');
      GooglePlacesAffiliateService.initialize();
    }
  }, [isLoaded, google]);

  const loadCountries = useCallback(async () => {
    console.log('🌍 loadCountries() START');
    setIsLoadingCountries(true);
    try {
      console.log('📡 Calling GooglePlacesAffiliateService.getAvailableCountries()...');
      const loadedCountries = await GooglePlacesAffiliateService.getAvailableCountries();
      console.log('✅ Countries loaded successfully:', loadedCountries.length, 'countries');
      console.log(
        '  Countries:',
        loadedCountries.map(c => `${c.name} (${c.chains.length} chains)`)
      );
      setCountries(loadedCountries);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Länder:', error);
      console.log('⚠️ Falling back to mock countries');
      // Fallback zu Mock-Daten
      setCountries([
        { id: 'usa', name: 'USA', countryCode: 'US', hasChains: true, chains: [] },
        { id: 'germany', name: 'Deutschland', countryCode: 'DE', hasChains: true, chains: [] },
        {
          id: 'uk',
          name: 'Vereinigtes Königreich',
          countryCode: 'GB',
          hasChains: true,
          chains: [],
        },
      ]);
    } finally {
      setIsLoadingCountries(false);
    }
  }, []);

  // Lade Länder beim Öffnen des Modals
  useEffect(() => {
    console.log('📝 AffiliateLocationModal - Load countries check:', {
      isOpen,
      hasCountries: countries.length > 0,
      isLoaded,
    });

    if (isOpen && countries.length === 0 && isLoaded) {
      console.log('▶️ Starting to load countries...');
      loadCountries();
    }
  }, [isOpen, isLoaded, countries.length, loadCountries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-teal-900 bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Standorte für Ihr Konto auswählen</h1>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200">
            {/* Chain Type Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Handelskettentyp
              </label>
              <div className="relative">
                <select
                  value={selectedChainType}
                  onChange={e => setSelectedChainType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] outline-none appearance-none"
                >
                  <option value="general-retail">Einzelhändler allgemein</option>
                  <option value="automotive">Automobilhändler</option>
                  <option value="restaurants">Restaurants</option>
                  <option value="hotels">Hotels</option>
                  <option value="gas-stations">Tankstellen</option>
                </select>
                <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nach Ländern oder Handelsketten suchen..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] outline-none"
              />
              {isLoadingChains && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
          </div>

          {/* Countries List */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex">
              {/* Left Column - Countries */}
              <div className="flex-1 border-r border-gray-200">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-700">
                    {isLoadingCountries ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Lade Länder...
                      </div>
                    ) : searchResults.length > 0 ? (
                      `${searchResults.length} Suchergebnisse`
                    ) : (
                      `${filteredCountries.length} Länder`
                    )}
                  </div>
                </div>
                <div className="overflow-y-auto max-h-96">
                  {isLoadingCountries ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-500">Lade Länder und Handelsketten...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    // Suchergebnisse anzeigen
                    searchResults.map(chain => (
                      <div
                        key={chain.id}
                        className="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                        onClick={() => {
                          // Erstelle ein temporäres Land-Objekt für die Suche
                          const tempCountry: Country = {
                            id: 'search-result',
                            name: 'Suchergebnis',
                            countryCode: 'XX',
                            hasChains: true,
                            chains: [chain],
                          };
                          handleChainSelect(tempCountry, chain);
                        }}
                      >
                        <div
                          className={`w-4 h-4 border-2 rounded mr-3 flex items-center justify-center ${
                            selectedItems.some(item => item.chainId === chain.id)
                              ? 'border-[#14ad9f] bg-[#14ad9f]'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedItems.some(item => item.chainId === chain.id) && (
                            <svg
                              className="w-2 h-2 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">{chain.name}</div>
                          <div className="text-xs text-gray-500">
                            {chain.locationCount.toLocaleString()} Standorte
                          </div>
                          {chain.category && (
                            <div className="text-xs text-blue-600 capitalize">{chain.category}</div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    // Normale Länder-Liste
                    filteredCountries.map(country => (
                      <div key={country.id}>
                        {/* Country Row */}
                        <div
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                          onClick={() => handleCountryClick(country.id)}
                        >
                          <span className="text-sm text-gray-900">{country.name}</span>
                          <div className="flex items-center gap-2">
                            {isLoadingChains && expandedCountry === country.id && (
                              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                            )}
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform ${
                                expandedCountry === country.id ? 'rotate-90' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Chains (when expanded) */}
                        {expandedCountry === country.id && country.chains && (
                          <div className="bg-gray-50">
                            {country.chains.length === 0 && !isLoadingChains ? (
                              <div className="px-8 py-4 text-sm text-gray-500">
                                Keine Handelsketten gefunden
                              </div>
                            ) : (
                              country.chains.map(chain => (
                                <div
                                  key={chain.id}
                                  className="flex items-center px-8 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                                  onClick={() => handleChainSelect(country, chain)}
                                >
                                  <div
                                    className={`w-4 h-4 border-2 rounded mr-3 flex items-center justify-center ${
                                      isChainSelected(country.id, chain.id)
                                        ? 'border-[#14ad9f] bg-[#14ad9f]'
                                        : 'border-gray-300'
                                    }`}
                                  >
                                    {isChainSelected(country.id, chain.id) && (
                                      <svg
                                        className="w-2 h-2 text-white"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm text-gray-900">{chain.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {chain.locationCount.toLocaleString()} Standorte
                                    </div>
                                    {chain.category && (
                                      <div className="text-xs text-blue-600 capitalize">
                                        {chain.category}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column - Shopping Cart */}
              <div className="w-80">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-700">
                    {selectedItems.length === 0
                      ? 'Nichts ausgewählt'
                      : `${selectedItems.length} Kette${selectedItems.length !== 1 ? 'n' : ''} ausgewählt`}
                  </div>
                </div>
                <div className="overflow-y-auto max-h-96">
                  {selectedItems.length === 0 ? (
                    <div className="p-4">
                      <div className="text-sm text-gray-500 text-center">
                        Wählen Sie Länder und Handelsketten aus der Liste aus, um sie hier
                        anzuzeigen.
                      </div>
                    </div>
                  ) : (
                    <div className="p-2">
                      {selectedItems.map((item, index) => (
                        <div
                          key={`${item.countryId}-${item.chainId}`}
                          className="flex items-center justify-between p-3 mb-2 bg-white border border-gray-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {item.chainName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.countryName} • {item.locationCount.toLocaleString()} Standorte
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedItems(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleContinue}
            disabled={selectedItems.length === 0}
            className="bg-[#14ad9f] hover:bg-[#129a8f] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Weiter
          </Button>
        </div>
      </div>
    </div>
  );
}
