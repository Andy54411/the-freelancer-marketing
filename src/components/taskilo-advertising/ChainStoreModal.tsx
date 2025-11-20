'use client';

import React, { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';

interface ChainStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const countries = [
  'USA',
  'Vereinigtes Königreich',
  'Australien',
  'Deutschland',
  'Kanada',
  'Brasilien',
  'Niederlande',
  'Frankreich',
  'Japan',
  'Dänemark',
  'Italien',
  'Schweiz',
  'Schweden',
  'Spanien',
  'Norwegen',
  'Mexiko',
  'Belgien',
  'Österreich',
  'Indien',
  'Singapur',
  'Neuseeland',
  'Türkei',
  'Taiwan',
  'Argentinien',
  'Kolumbien',
  'Hongkong',
  'Malaysia',
  'Thailand',
  'Vietnam',
  'Polen',
  'Chile',
  'Portugal',
  'Vereinigte Arabische Emirate',
  'Südafrika',
  'Philippinen',
  'Bahrain',
  'Tschechien',
  'Estland',
  'Finnland',
  'Griechenland',
  'Kroatien',
  'Ungarn',
  'Irland',
  'Israel',
  'Südkorea',
  'Litauen',
  'Marokko',
  'Peru',
  'Pakistan',
  'Puerto Rico',
  'Rumänien',
  'Serbien',
  'Saudi-Arabien',
  'Slowakei',
  'Uruguay',
];

export default function ChainStoreModal({ isOpen, onClose, onContinue }: ChainStoreModalProps) {
  const [selectedOption, setSelectedOption] = useState('retail');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const filteredCountries = countries.filter(country =>
    country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCountryClick = (country: string) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(selectedCountries.filter(c => c !== country));
    } else {
      setSelectedCountries([...selectedCountries, country]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[900px] max-w-[90vw] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-normal text-gray-900">Standorte für Ihr Konto auswählen</h1>
        </div>

        {/* Content */}
        <div className="px-6 py-6 flex-1 overflow-hidden">
          {/* Top Radio Group - Horizontal */}
          <div className="flex items-center space-x-8 mb-6">
            <label
              className="flex items-center cursor-pointer"
              onClick={() => setSelectedOption('google-business')}
            >
              <div className="relative w-4 h-4 mr-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${selectedOption === 'google-business' ? 'border-blue-600' : 'border-gray-400'} bg-white flex items-center justify-center`}
                >
                  {selectedOption === 'google-business' && (
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
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
              onClick={() => setSelectedOption('retail')}
            >
              <div className="relative w-4 h-4 mr-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${selectedOption === 'retail' ? 'border-blue-600' : 'border-gray-400'} bg-white flex items-center justify-center`}
                >
                  {selectedOption === 'retail' && (
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
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
                  className={`w-4 h-4 rounded-full border-2 ${selectedOption === 'maps' ? 'border-blue-600' : 'border-gray-400'} bg-white flex items-center justify-center`}
                >
                  {selectedOption === 'maps' && (
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
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

          {/* Chain Store Content */}
          {selectedOption === 'retail' && (
            <div className="flex flex-1 min-h-0">
              {/* Left Side - Countries List */}
              <div className="flex-1 mr-6">
                {/* Search Box */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Suchen"
                      className="w-full pl-4 pr-10 py-2 border-b-2 border-gray-300 focus:border-blue-500 outline-none bg-transparent"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Countries Section */}
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-3">
                    {filteredCountries.length} Länder
                  </div>
                </div>

                {/* Countries List */}
                <div className="flex-1 overflow-y-auto max-h-96 border border-gray-200 rounded">
                  {filteredCountries.map((country, index) => (
                    <div
                      key={country}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleCountryClick(country)}
                    >
                      <span className="text-sm text-gray-900">{country}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side - Selection Summary */}
              <div className="w-80">
                <div className="border border-gray-200 rounded p-4 h-full">
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    {selectedCountries.length === 0
                      ? 'Nichts ausgewählt'
                      : `${selectedCountries.length} ausgewählt`}
                  </div>

                  {selectedCountries.length > 0 && (
                    <div className="space-y-2">
                      {selectedCountries.map(country => (
                        <div key={country} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{country}</span>
                          <button
                            onClick={() => handleCountryClick(country)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Business Profile Content */}
          {selectedOption === 'google-business' && (
            <div className="text-sm text-gray-600">
              Google Unternehmensprofil-Optionen werden hier angezeigt...
            </div>
          )}

          {/* Google Maps Content */}
          {selectedOption === 'maps' && (
            <div className="text-sm text-gray-600">
              Google Maps-Optionen werden hier angezeigt...
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
            onClick={onContinue}
            className={`px-4 py-2 text-sm font-medium rounded ${
              selectedCountries.length > 0 || selectedOption !== 'retail'
                ? 'text-white bg-blue-600 hover:bg-blue-700'
                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
            }`}
            disabled={selectedOption === 'retail' && selectedCountries.length === 0}
          >
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
}
