'use client';

import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface DifferenceReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  differenceAmount: number;
}

const DIFFERENCE_REASONS = [
  { value: 'rundung', label: 'Rundungsdifferenz' },
  { value: 'skonto', label: 'Skonto abgezogen' },
  { value: 'gebuehren', label: 'Bankgebühren' },
  { value: 'wechselkurs', label: 'Wechselkursdifferenz' },
  { value: 'teilzahlung', label: 'Teilzahlung' },
  { value: 'rabatt', label: 'Rabatt/Nachlass' },
  { value: 'korrektur', label: 'Korrektur/Anpassung' },
  { value: 'andere', label: 'Andere Gründe' }
];

export default function DifferenceReasonModal({
  isOpen,
  onClose,
  onConfirm,
  differenceAmount
}: DifferenceReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleConfirm = () => {
    if (selectedReason) {
      const reasonLabel = DIFFERENCE_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
      onConfirm(reasonLabel);
      setSelectedReason('');
      setDropdownOpen(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDropdownOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <dialog
        aria-label="Differenzgrund auswählen"
        aria-modal="true"
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-100"
        open
      >
        <div className="flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Differenzgrund auswählen
              </h1>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all duration-200"
              type="button"
              aria-label="close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Main Content */}
          <main className={`p-6 space-y-6 transition-all duration-300 ease-out ${dropdownOpen ? 'min-h-[400px]' : 'min-h-fit'}`}>
            {/* Difference Amount Display */}
            <div className="text-center bg-gray-50 rounded-xl p-4">
              <span className="text-sm text-gray-600">Differenz von </span>
              <span className="font-bold text-xl text-[#14ad9f]">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(Math.abs(differenceAmount))}
              </span>
            </div>

            {/* Dropdown Select */}
            <div className="relative">
              <div className="relative">
                <button
                  type="button"
                  role="combobox"
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl bg-white text-left text-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] hover:border-[#14ad9f] transition-all duration-200"
                >
                  <span className="block truncate text-gray-900">
                    {selectedReason ? 
                      DIFFERENCE_REASONS.find(r => r.value === selectedReason)?.label : 
                      'Bitte auswählen'
                    }
                  </span>
                  <ChevronDown 
                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </button>

                {/* Dropdown Options */}
                {dropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                    {DIFFERENCE_REASONS.map((reason, index) => (
                      <button
                        key={reason.value}
                        type="button"
                        onClick={() => {
                          setSelectedReason(reason.value);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors duration-150 ${
                          selectedReason === reason.value ? 'bg-[#14ad9f] text-white hover:bg-[#129488]' : 'text-gray-900'
                        } ${index === 0 ? 'rounded-t-xl' : ''} ${index === DIFFERENCE_REASONS.length - 1 ? 'rounded-b-xl' : ''}`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="p-6 border-t border-gray-100 bg-gray-50/50">
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2 transition-all duration-200"
                type="button"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedReason}
                className={`px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  selectedReason
                    ? 'bg-[#14ad9f] text-white hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2 shadow-sm hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                type="button"
              >
                Buchen
              </button>
            </div>
          </footer>
        </div>
      </dialog>
    </div>
  );
}