'use client';

import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface CampaignStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLElement>;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

export default function CampaignStatusModal({ isOpen, onClose, buttonRef, selectedStatus, onStatusChange }: CampaignStatusModalProps) {
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
        className="absolute bg-white rounded-lg shadow-xl border border-gray-200"
        style={{
          top: buttonRef?.current ? 
            (buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 4) + 'px' : 
            '100px',
          left: buttonRef?.current ? 
            buttonRef.current.getBoundingClientRect().left + 'px' : 
            '100px',
          pointerEvents: 'auto',
          minWidth: '280px'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Kampagnenstatus</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Schließen"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="space-y-1">
            {/* Option: Alle */}
            <div 
              onClick={() => onStatusChange('Alle')}
              className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                selectedStatus === 'Alle'
                  ? 'text-gray-900 bg-teal-50 border-l-3 border-teal-500 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              role="option"
              tabIndex={0}
              aria-selected={selectedStatus === 'Alle'}
            >
              Alle
            </div>

            {/* Option: Aktiviert */}
            <div 
              onClick={() => onStatusChange('Aktiviert')}
              className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                selectedStatus === 'Aktiviert'
                  ? 'text-gray-900 bg-teal-50 border-l-3 border-teal-500 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              role="option"
              tabIndex={0}
              aria-selected={selectedStatus === 'Aktiviert'}
            >
              Aktiviert
            </div>

            {/* Option: Aktiviert, Pausiert */}
            <div 
              onClick={() => onStatusChange('Aktiviert, Pausiert')}
              className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                selectedStatus === 'Aktiviert, Pausiert'
                  ? 'text-gray-900 bg-teal-50 border-l-3 border-teal-500 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              role="option"
              tabIndex={0}
              aria-selected={selectedStatus === 'Aktiviert, Pausiert'}
            >
              Aktiviert, Pausiert
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}