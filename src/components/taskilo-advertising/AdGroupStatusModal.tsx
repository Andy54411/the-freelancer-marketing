'use client';

import React from 'react';
import { X } from 'lucide-react';

interface AdGroupStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  buttonRef: React.RefObject<HTMLElement>;
}

const statusOptions = [
  { value: 'alle', label: 'Alle' },
  { value: 'aktiviert', label: 'Aktiviert' },
  { value: 'aktiviert-pausiert', label: 'Aktiviert, Pausiert' }
];

export default function AdGroupStatusModal({ 
  isOpen, 
  onClose, 
  selectedStatus, 
  onStatusChange, 
  buttonRef 
}: AdGroupStatusModalProps) {
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
    }
  }, [isOpen, buttonRef]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        const modal = document.getElementById('adgroup-status-modal');
        if (modal && !modal.contains(event.target as Node)) {
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
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  return (
    <div 
      id="adgroup-status-modal"
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '280px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Anzeigengruppenstatus</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-2">
        <div className="space-y-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onStatusChange(option.value);
                onClose();
              }}
              className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors flex items-center ${
                selectedStatus === option.value 
                  ? 'bg-teal-50 text-teal-700 font-medium' 
                  : 'text-gray-700'
              }`}
            >
              {selectedStatus === option.value && (
                <div className="w-1 h-4 bg-teal-600 rounded-full mr-3" />
              )}
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}