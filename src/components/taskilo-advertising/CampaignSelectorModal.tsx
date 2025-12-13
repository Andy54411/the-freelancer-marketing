'use client';

import React, { useRef, useEffect } from 'react';
import { Home, Plus } from 'lucide-react';

interface CampaignSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLElement>;
}

export default function CampaignSelectorModal({ isOpen, onClose, buttonRef }: CampaignSelectorModalProps) {
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
        className="absolute bg-white rounded-lg shadow-2xl w-[400px] max-h-[70vh] overflow-hidden border border-gray-200"
        style={{
          top: buttonRef?.current ? 
            (buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 4) + 'px' : 
            '365px',
          left: buttonRef?.current ? 
            buttonRef.current.getBoundingClientRect().left + 'px' : 
            '659px',
          pointerEvents: 'auto'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-900">Ansicht auswählen</h2>
          <button className="text-xs text-gray-500 hover:text-gray-700">
            Feedback
          </button>
        </div>

        {/* Content */}
        <div className="p-0">
          {/* Section Header */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="text-xs text-gray-600 font-medium">Kampagnentypen</div>
          </div>

          {/* Single Item - Alle Kampagnen */}
          <div className="px-4 py-3 border-l-3 border-teal-500 bg-teal-50 flex items-center space-x-3 hover:bg-teal-100 cursor-pointer">
            <Home className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Alle Kampagnen</span>
          </div>

          {/* Empty Space - much smaller */}
          <div className="h-32 bg-white"></div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          <button className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 text-sm font-medium">
            <Plus className="w-4 h-4" />
            <span>Ansicht erstellen</span>
          </button>
        </div>
      </div>
    </div>
  );
}