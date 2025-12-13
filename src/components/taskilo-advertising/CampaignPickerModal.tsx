'use client';

import React, { useRef, useEffect } from 'react';
import { Filter, Search, ArrowUpDown, ChevronDown } from 'lucide-react';

interface CampaignPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLElement>;
}

export default function CampaignPickerModal({ isOpen, onClose, buttonRef }: CampaignPickerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="absolute z-50" style={{ top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <div 
        ref={modalRef}
        className="absolute bg-white rounded-lg shadow-2xl w-[600px] max-h-[80vh] overflow-hidden border border-gray-200"
        style={{
          top: buttonRef?.current ? 
            (buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 4) + 'px' : 
            '200px',
          left: buttonRef?.current ? 
            buttonRef.current.getBoundingClientRect().left + 'px' : 
            '300px',
          pointerEvents: 'auto'
        }}
      >
        {/* Filter Bar */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            {/* Filter Button */}
            <button className="p-2 hover:bg-gray-100 rounded-full relative">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                1
              </span>
            </button>

            {/* Active Filter Chip */}
            <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm flex items-center">
              <span>Kampagnenstatus: Aktiviert, Pausiert</span>
            </div>

            {/* Add Filter Input */}
            <input 
              type="text" 
              placeholder="Filter hinzufügen"
              className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Search and Sort Bar */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Kampagne aufrufen"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            {/* Sort Dropdown */}
            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <ArrowUpDown className="w-4 h-4 text-gray-600" />
              <span>Alphabetisch</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-gray-600 text-sm">
            Keine Kampagne entspricht den Filtern.
          </div>
        </div>
      </div>
    </div>
  );
}