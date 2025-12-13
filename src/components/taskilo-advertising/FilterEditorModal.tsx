'use client';

import React from 'react';
import { X, ChevronDown } from 'lucide-react';

interface FilterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterType: string;
  onApply: (filterData: { operator?: string; value: string }) => void;
}

const operatorOptions = [
  { value: 'contains', label: 'enthält' },
  { value: 'not_contains', label: 'enthält nicht' },
  { value: 'contains_case_sensitive', label: 'enthält (Groß- und Kleinschreibung berücksichtigen)' },
  { value: 'not_contains_case_sensitive', label: 'enthält nicht (Groß- und Kleinschreibung berücksichtigen)' },
  { value: 'equals_case_sensitive', label: 'gleich (Groß-/Kleinschreibung beachten)' },
  { value: 'starts_with', label: 'beginnt mit' }
];

const bidStrategyTypes = [
  'Ziel-CPA', 'Ziel-CPC', 'Ziel-ROAS', 'Klicks maximieren', 'Ziel-CPV',
  'Conversions maximieren', 'Conversion-Wert maximieren', 'Ausrichtung auf Suchseitenposition',
  'Kompetitive Auktionsposition', 'Auto-optimierter CPC', 'Fester CPM', 'Share of Voice (SOV)',
  'Ziel-CPM', 'Prozentualer CPC', 'Angestrebter Anteil an möglichen Impressionen',
  'Kaufbereitschaft maximieren', 'Provision', 'Zielposition', 'Manueller CPC',
  'Sichtbarer CPM', 'Maximaler CPV', 'Automatisch', 'CPA (Ziel)', 'Ungültig'
];

const campaignTypes = [
  'Suchnetzwerk', 'Displaynetzwerk', 'Shopping', 'Video', 'App', 'Smart',
  'Hotel', 'Demand Gen', 'Lokal', 'Performance Max-Kampagne'
];

const mockCampaigns = [
  { id: '1', name: 'Brand Campaign', status: 'Aktiviert' },
  { id: '2', name: 'Shopping Campaign', status: 'Pausiert' },
  { id: '3', name: 'Display Campaign', status: 'Aktiviert' },
  { id: '4', name: 'Video Campaign', status: 'Aktiviert' },
  { id: '5', name: 'Search Campaign', status: 'Pausiert' }
];

export default function FilterEditorModal({ 
  isOpen, 
  onClose, 
  filterType, 
  onApply 
}: FilterEditorModalProps) {
  const [selectedOperator, setSelectedOperator] = React.useState('contains');
  const [filterValue, setFilterValue] = React.useState('');
  const [isOperatorDropdownOpen, setIsOperatorDropdownOpen] = React.useState(false);
  const [selectedBidStrategies, setSelectedBidStrategies] = React.useState<string[]>([]);
  const [selectedCampaignTypes, setSelectedCampaignTypes] = React.useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const isCheckboxMode = filterType === 'Gebotsstrategietyp' || filterType === 'Kampagnentyp';
  const isCampaignPickerMode = filterType === 'Kampagne';
  const isLabelPickerMode = filterType === 'Kampagnenlabel';
  const isTextareaMode = false; // ALLE Inputs sind einzeilig
  const isAdvancedTextMode = filterType === 'Kampagnenname';

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        const modal = document.getElementById('filter-editor-modal');
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
  }, [isOpen, onClose]);

  const handleApply = () => {
    if (isLabelPickerMode) {
      if (searchQuery.trim()) {
        onApply({
          operator: selectedOperator,
          value: searchQuery.trim()
        });
        onClose();
        setSearchQuery('');
      }
    } else if (isCampaignPickerMode) {
      if (selectedCampaigns.length > 0) {
        onApply({
          value: getSelectedCampaignNames()
        });
        onClose();
        setSelectedCampaigns([]);
      }
    } else if (isCheckboxMode) {
      if (filterType === 'Gebotsstrategietyp' && selectedBidStrategies.length > 0) {
        onApply({
          value: selectedBidStrategies.join(', ')
        });
        onClose();
        setSelectedBidStrategies([]);
      } else if (filterType === 'Kampagnentyp' && selectedCampaignTypes.length > 0) {
        onApply({
          value: selectedCampaignTypes.join(', ')
        });
        onClose();
        setSelectedCampaignTypes([]);
      }
    } else {
      if (filterValue.trim()) {
        onApply({
          operator: selectedOperator,
          value: filterValue.trim()
        });
        onClose();
        setFilterValue('');
      }
    }
  };

  const toggleBidStrategy = (strategy: string) => {
    setSelectedBidStrategies(prev => 
      prev.includes(strategy) 
        ? prev.filter(s => s !== strategy)
        : [...prev, strategy]
    );
  };

  const toggleCampaignType = (type: string) => {
    setSelectedCampaignTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const getSelectedCampaignNames = () => {
    return mockCampaigns
      .filter(campaign => selectedCampaigns.includes(campaign.id))
      .map(campaign => campaign.name)
      .join(', ');
  };

  const getOperatorLabel = (value: string) => {
    return operatorOptions.find(op => op.value === value)?.label || 'enthält';
  };

  if (!isOpen) return null;

  return (
    <div 
      id="filter-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div 
        className="bg-white rounded-lg shadow-xl mx-4 border border-gray-300"
        style={{
          width: isCampaignPickerMode ? '720px' : (isAdvancedTextMode ? '480px' : '320px')
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">{filterType}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className={isCampaignPickerMode || isLabelPickerMode ? '' : 'p-4 space-y-4'}>
          {isCampaignPickerMode ? (
            /* Campaign Picker Mode - Google Ads Style */
            <div className="flex h-80">
              {/* Linke Spalte - Kampagnen-Liste */}
              <div className="flex-1 border-r border-gray-300">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      disabled
                      className="w-4 h-4 border-2 border-gray-400 rounded opacity-50"
                    />
                    <span className="text-sm font-medium text-gray-700">Keine Kampagnen</span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6 text-center">
                  <div className="text-gray-500 text-base mb-4">Keine Ergebnisse</div>
                  {/* Mock-Kampagnen für Demo ausgeblendet, da "Keine Ergebnisse" angezeigt werden soll */}
                </div>
              </div>
              
              {/* Rechte Spalte - Shopping Cart */}
              <div className="w-64">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                  <div className="text-sm font-medium text-gray-700">
                    {selectedCampaigns.length === 0 ? 'Nichts ausgewählt' : `${selectedCampaigns.length} ausgewählt`}
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  {selectedCampaigns.length === 0 ? (
                    <div className="text-sm text-gray-500 leading-relaxed">
                      Wählen Sie Kampagnen aus, nach denen gefiltert werden soll
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCampaigns.map((campaignId) => {
                        const campaign = mockCampaigns.find(c => c.id === campaignId);
                        return (
                          <div key={campaignId} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded">
                            <span className="truncate">{campaign?.name}</span>
                            <button
                              onClick={() => toggleCampaign(campaignId)}
                              className="ml-2 text-gray-500 hover:text-red-600 text-lg"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : isLabelPickerMode ? (
            /* Label Picker Mode with Search */
            <div>
              {/* Operator Dropdown */}
              <div className="px-4 py-3 border-b border-gray-200">
                <button
                  onClick={() => setIsOperatorDropdownOpen(!isOperatorDropdownOpen)}
                  className="relative flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-white text-sm hover:bg-gray-50 min-w-[120px]"
                >
                  <span>{getOperatorLabel(selectedOperator)}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500 ml-2" />
                </button>
                
                {isOperatorDropdownOpen && (
                  <div className="absolute mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 min-w-[120px]">
                    {operatorOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedOperator(option.value);
                          setIsOperatorDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Search Section */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Suchen"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border-b border-gray-300 bg-transparent text-sm focus:outline-none focus:border-teal-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              
              {/* Results Section */}
              <div className="h-48">
                <div className="p-6 text-center text-gray-500">
                  Keine Ergebnisse
                </div>
              </div>
            </div>
          ) : isCheckboxMode ? (
            /* Checkbox Mode for Gebotsstrategietyp */
            <div>
              <div className="text-sm text-gray-700 mb-3">
                Stimmt überein mit:
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {(filterType === 'Gebotsstrategietyp' ? bidStrategyTypes : campaignTypes).map((option) => (
                  <label
                    key={option}
                    className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={filterType === 'Gebotsstrategietyp' 
                        ? selectedBidStrategies.includes(option)
                        : selectedCampaignTypes.includes(option)
                      }
                      onChange={() => filterType === 'Gebotsstrategietyp' 
                        ? toggleBidStrategy(option)
                        : toggleCampaignType(option)
                      }
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            /* Text Input Mode for other filter types */
            <>
              {/* Operator Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsOperatorDropdownOpen(!isOperatorDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-white text-sm hover:bg-gray-50"
                >
                  <span>{getOperatorLabel(selectedOperator)}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                
                {isOperatorDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {operatorOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedOperator(option.value);
                          setIsOperatorDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md whitespace-nowrap"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Value Input */}
              <div>
                <div className="text-xs text-gray-600 mb-2">
                  Wert eingeben
                </div>
                <div className="relative">
                  <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-teal-600 font-medium">
                    Wert
                  </label>
                  {isTextareaMode ? (
                    <textarea
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder=""
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-teal-500 rounded text-sm focus:outline-none focus:border-teal-600 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 border-2 border-teal-500 rounded text-sm focus:outline-none focus:border-teal-600"
                    />
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Suchbegriff für den Filter eingeben
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={handleApply}
            disabled={
              isLabelPickerMode ? !searchQuery.trim() :
              isCampaignPickerMode ? selectedCampaigns.length === 0 :
              isCheckboxMode ? (filterType === 'Gebotsstrategietyp' ? selectedBidStrategies.length === 0 : selectedCampaignTypes.length === 0) : 
              !filterValue.trim()
            }
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}