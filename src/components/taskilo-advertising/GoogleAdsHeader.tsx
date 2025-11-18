'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import CampaignSelectorModal from './CampaignSelectorModal';
import CampaignPickerModal from './CampaignPickerModal';

interface GoogleAdsHeaderProps {
  companyId: string;
}

export default function GoogleAdsHeader({ companyId }: GoogleAdsHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const pickerButtonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <CampaignSelectorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        buttonRef={buttonRef}
      />
      <CampaignPickerModal 
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        buttonRef={pickerButtonRef}
      />
    <div className="flex items-center justify-between py-4 border-b border-gray-200">
      <div className="flex items-center space-x-6">
        <h2 className="text-xl font-medium text-gray-900">Übersicht</h2>
        
        {/* Campaign Dropdown - Compact */}
        <button 
          ref={pickerButtonRef}
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center space-x-2 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          <div className="text-left">
            <div className="text-xs text-gray-500">Kampagnen (0)</div>
            <div className="text-sm text-gray-900">Kampagne auswählen</div>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        
        {/* Ansicht Filter - Compact */}
        <button 
          ref={buttonRef}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          <div className="text-left">
            <div className="text-xs text-gray-500">Ansicht (2 Filter)</div>
            <div className="text-sm text-gray-900">Alle Kampagnen</div>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
      </div>
      
      {/* Right Panel - Compact */}
      <div className="flex items-center space-x-3">
        <span className="text-xs text-gray-500">Benutzerdefiniert</span>
        
        <button className="flex items-center space-x-1 px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
          <span className="font-medium">22. Okt bis 18. Nov 2025</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        
        {/* Navigation - Smaller */}
        <div className="flex border border-gray-300 rounded">
          <button className="p-1 hover:bg-gray-100 border-r border-gray-300">
            <ChevronLeft className="w-3 h-3 text-gray-500" />
          </button>
          <button className="p-1 hover:bg-gray-100 opacity-50 cursor-not-allowed">
            <ChevronRight className="w-3 h-3 text-gray-500" />
          </button>
        </div>
        
        {/* Last 30 Days Button - Smaller */}
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 font-medium">
          Letzte 30 Tage anzeigen
        </button>
      </div>
    </div>
    </>
  );
}