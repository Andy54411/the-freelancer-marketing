'use client';

import React, { useEffect } from 'react';
import { Save } from 'lucide-react';
import CampaignStatusModal from './CampaignStatusModal';
import AdGroupStatusModal from './AdGroupStatusModal';
import FilterSuggestionMenu from './FilterSuggestionMenu';
import FilterEditorModal from './FilterEditorModal';
import { GoogleAdsSettingsService } from '@/services/GoogleAdsSettingsService';

interface GoogleAdsFilterBarProps {
  companyId?: string;
}

export default function GoogleAdsFilterBar({ companyId }: GoogleAdsFilterBarProps) {
  const [selectedStatus, setSelectedStatus] = React.useState('alle');
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
  const statusButtonRef = React.useRef<HTMLDivElement>(null);
  
  const [selectedAdGroupStatus, setSelectedAdGroupStatus] = React.useState('alle');
  const [isAdGroupStatusModalOpen, setIsAdGroupStatusModalOpen] = React.useState(false);
  const adGroupStatusButtonRef = React.useRef<HTMLDivElement>(null);
  
  const [isFilterMenuOpen, setIsFilterMenuOpen] = React.useState(false);
  const [filterInputValue, setFilterInputValue] = React.useState('');
  const filterInputRef = React.useRef<HTMLInputElement>(null);
  
  const [isFilterEditorOpen, setIsFilterEditorOpen] = React.useState(false);
  const [selectedFilterType, setSelectedFilterType] = React.useState('');
  const [appliedFilters, setAppliedFilters] = React.useState<Array<{id: string, type: string, operator: string, value: string}>>([]);

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setIsStatusModalOpen(false);
  };

  const handleAdGroupStatusChange = (status: string) => {
    setSelectedAdGroupStatus(status);
    setIsAdGroupStatusModalOpen(false);
  };

  // Einstellungen beim Laden der Komponente abrufen
  useEffect(() => {
    const loadSettings = async () => {
      if (!companyId) return;
      
      try {
        const settings = await GoogleAdsSettingsService.loadFilterSettings(companyId);
        if (settings) {
          setSelectedStatus(settings.campaignStatus);
          setSelectedAdGroupStatus(settings.adGroupStatus);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Filter-Einstellungen:', error);
      }
    };

    loadSettings();
  }, [companyId]);

  // Einstellungen speichern
  const handleSaveSettings = async () => {
    if (!companyId) {
      alert('Fehler: Company ID nicht verfügbar');
      return;
    }

    try {
      await GoogleAdsSettingsService.saveFilterSettings(companyId, {
        campaignStatus: selectedStatus,
        adGroupStatus: selectedAdGroupStatus
      });
      
      alert('Filter-Einstellungen erfolgreich gespeichert!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Einstellungen');
    }
  };

  // Filter-Input Handler
  const handleFilterInputFocus = () => {
    setIsFilterMenuOpen(true);
  };

  const handleFilterInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterInputValue(e.target.value);
    if (!isFilterMenuOpen) {
      setIsFilterMenuOpen(true);
    }
  };

  const handleFilterSelect = (filter: string) => {
    setSelectedFilterType(filter);
    setIsFilterMenuOpen(false);
    setIsFilterEditorOpen(true);
    setFilterInputValue('');
  };

  const handleFilterApply = (filterData: { operator?: string; value: string }) => {
    const newFilter = {
      id: Date.now().toString(),
      type: selectedFilterType,
      operator: filterData.operator || 'contains',
      value: filterData.value
    };
    
    setAppliedFilters(prev => [...prev, newFilter]);
  };

  const removeFilter = (filterId: string) => {
    setAppliedFilters(prev => prev.filter(f => f.id !== filterId));
  };

  return (
    <>
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-4">
          {/* Filter Label */}
          <span className="text-sm font-medium text-gray-700">Filter</span>

          {/* Screen reader text - hidden */}
          <span className="sr-only">Angewendete Filter:</span>

          {/* Filter Chips Container */}
          <div className="flex flex-wrap items-center space-x-2 flex-1">
            {/* Filter Chip 1 */}
            <div 
              ref={statusButtonRef}
              onClick={() => setIsStatusModalOpen(true)}
              className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm hover:bg-teal-200 cursor-pointer transition-colors"
            >
              <span>Kampagnenstatus: {
                selectedStatus === 'alle' ? 'Alle' :
                selectedStatus === 'aktiviert' ? 'Aktiviert' :
                selectedStatus === 'aktiviert-pausiert' ? 'Aktiviert, Pausiert' : 'Alle'
              }</span>
            </div>

            {/* Filter Chip 2 */}
            <div 
              ref={adGroupStatusButtonRef}
              onClick={() => setIsAdGroupStatusModalOpen(true)}
              className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm hover:bg-teal-200 cursor-pointer transition-colors"
            >
              <span>Anzeigengruppenstatus: {
                selectedAdGroupStatus === 'alle' ? 'Alle' :
                selectedAdGroupStatus === 'aktiviert' ? 'Aktiviert' :
                selectedAdGroupStatus === 'aktiviert-pausiert' ? 'Aktiviert, Pausiert' : 'Alle'
              }</span>
            </div>

            {/* Applied Custom Filters */}
            {appliedFilters.map((filter) => (
              <div 
                key={filter.id}
                className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1"
              >
                <span>{filter.type}: {filter.value}</span>
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="ml-1 hover:bg-teal-200 rounded-full p-0.5"
                >
                  <span className="text-xs">×</span>
                </button>
              </div>
            ))}
            
            {/* Add Filter Input */}
            <input 
              ref={filterInputRef}
              type="text" 
              placeholder="Filter hinzufuegen"
              value={filterInputValue}
              onChange={handleFilterInputChange}
              onFocus={handleFilterInputFocus}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-w-[150px]"
              aria-label="Filter hinzufuegen"
            />
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSaveSettings}
            className="bg-white border border-gray-300 px-4 py-1.5 rounded text-sm hover:bg-gray-50 flex items-center space-x-2 transition-colors"
            title="Filter-Einstellungen speichern"
          >
            <Save className="w-4 h-4 text-gray-600" />
            <span>Speichern</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CampaignStatusModal 
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        buttonRef={statusButtonRef}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
      />
      <AdGroupStatusModal 
        isOpen={isAdGroupStatusModalOpen}
        onClose={() => setIsAdGroupStatusModalOpen(false)}
        buttonRef={adGroupStatusButtonRef}
        selectedStatus={selectedAdGroupStatus}
        onStatusChange={handleAdGroupStatusChange}
      />
      <FilterSuggestionMenu 
        isOpen={isFilterMenuOpen}
        onClose={() => setIsFilterMenuOpen(false)}
        onSelectFilter={handleFilterSelect}
        inputRef={filterInputRef}
      />
      <FilterEditorModal 
        isOpen={isFilterEditorOpen}
        onClose={() => setIsFilterEditorOpen(false)}
        filterType={selectedFilterType}
        onApply={handleFilterApply}
      />
    </>
  );
}