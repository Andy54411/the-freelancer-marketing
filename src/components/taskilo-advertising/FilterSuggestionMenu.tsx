'use client';

import React from 'react';

interface FilterSuggestionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFilter: (filter: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const filterOptions = [
  'Gebotsstrategie-Name',
  'Gebotsstrategietyp',
  'Kampagne',
  'Kampagnenlabel',
  'Kampagnenname',
  'Kampagnentyp'
];

export default function FilterSuggestionMenu({ 
  isOpen, 
  onClose, 
  onSelectFilter, 
  inputRef 
}: FilterSuggestionMenuProps) {
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 });

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen, inputRef]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        const menu = document.getElementById('filter-suggestion-menu');
        if (menu && !menu.contains(event.target as Node)) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, inputRef]);

  if (!isOpen) return null;

  return (
    <div 
      id="filter-suggestion-menu"
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: `${position.width}px`
      }}
    >
      <div className="py-1">
        {filterOptions.map((option, index) => (
          <button
            key={option}
            onClick={() => {
              onSelectFilter(option);
              onClose();
            }}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center ${
              index === 0 ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
            }`}
            role="menuitem"
          >
            <span>{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}