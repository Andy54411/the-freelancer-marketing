'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  Filter,
  X,
  Globe,
  Users,
  MapPin,
  Clock,
  BadgeCheck,
  Zap,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

export interface ServiceFiltersState {
  budgetRanges: string[];
  languages: string[];
  businessTypes: string[];
  employeeSizes: string[];
  locations: string[];
  verifiedOnly: boolean;
  instantAvailable: boolean;
}

interface ServiceFiltersProps {
  filters: ServiceFiltersState;
  onFiltersChange: (filters: ServiceFiltersState) => void;
  availableLanguages: string[];
  availableLocations: string[];
  resultCount: number;
}

const BUDGET_RANGES = [
  { id: '0-25', label: 'Bis 25€/h', min: 0, max: 25 },
  { id: '25-50', label: '25€ - 50€/h', min: 25, max: 50 },
  { id: '50-100', label: '50€ - 100€/h', min: 50, max: 100 },
  { id: '100+', label: 'Ab 100€/h', min: 100, max: Infinity },
];

const BUSINESS_TYPES = [
  { id: 'vor-ort', label: 'Vor Ort' },
  { id: 'online', label: 'Online/Remote' },
  { id: 'hybrid', label: 'Hybrid' },
];

const EMPLOYEE_SIZES = [
  { id: '1', label: 'Einzelunternehmer' },
  { id: '2-5', label: '2-5 Mitarbeiter' },
  { id: '6-10', label: '6-10 Mitarbeiter' },
  { id: '11+', label: '11+ Mitarbeiter' },
];

const LANGUAGES = [
  'Deutsch',
  'Englisch',
  'Französisch',
  'Spanisch',
  'Italienisch',
  'Türkisch',
  'Russisch',
  'Polnisch',
  'Arabisch',
];

export default function ServiceFilters({
  filters,
  onFiltersChange,
  availableLanguages,
  availableLocations,
  resultCount,
}: ServiceFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const updateFilter = <K extends keyof ServiceFiltersState>(
    key: K,
    value: ServiceFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: 'budgetRanges' | 'languages' | 'businessTypes' | 'employeeSizes' | 'locations', value: string) => {
    const currentArray = filters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      budgetRanges: [],
      languages: [],
      businessTypes: [],
      employeeSizes: [],
      locations: [],
      verifiedOnly: false,
      instantAvailable: false,
    });
  };

  const activeFilterCount =
    filters.budgetRanges.length +
    filters.languages.length +
    filters.businessTypes.length +
    filters.employeeSizes.length +
    filters.locations.length +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.instantAvailable ? 1 : 0);

  const languagesToShow = availableLanguages.length > 0 ? availableLanguages : LANGUAGES;

  return (
    <>
      {/* Desktop Filter Bar */}
      <div className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Filter Dropdowns */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Budget Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`gap-2 ${filters.budgetRanges.length > 0 ? 'border-teal-500 bg-teal-50 text-teal-700' : ''}`}
                  >
                    Budget
                    {filters.budgetRanges.length > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-teal-100 text-teal-700">
                        {filters.budgetRanges.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Stundensatz</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {BUDGET_RANGES.map(range => (
                    <DropdownMenuCheckboxItem
                      key={range.id}
                      checked={filters.budgetRanges.includes(range.id)}
                      onCheckedChange={() => toggleArrayFilter('budgetRanges', range.id)}
                    >
                      {range.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Anbieter-Details Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`gap-2 ${filters.employeeSizes.length > 0 || filters.businessTypes.length > 0 ? 'border-teal-500 bg-teal-50 text-teal-700' : ''}`}
                  >
                    <Users className="h-4 w-4" />
                    Anbieter-Details
                    {(filters.employeeSizes.length + filters.businessTypes.length) > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-teal-100 text-teal-700">
                        {filters.employeeSizes.length + filters.businessTypes.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Firmengröße</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {EMPLOYEE_SIZES.map(size => (
                    <DropdownMenuCheckboxItem
                      key={size.id}
                      checked={filters.employeeSizes.includes(size.id)}
                      onCheckedChange={() => toggleArrayFilter('employeeSizes', size.id)}
                    >
                      {size.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Arbeitsweise</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {BUSINESS_TYPES.map(type => (
                    <DropdownMenuCheckboxItem
                      key={type.id}
                      checked={filters.businessTypes.includes(type.id)}
                      onCheckedChange={() => toggleArrayFilter('businessTypes', type.id)}
                    >
                      {type.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sprachen Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`gap-2 ${filters.languages.length > 0 ? 'border-teal-500 bg-teal-50 text-teal-700' : ''}`}
                  >
                    <Globe className="h-4 w-4" />
                    Sprachen
                    {filters.languages.length > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-teal-100 text-teal-700">
                        {filters.languages.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Sprachkenntnisse</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {languagesToShow.map(lang => (
                    <DropdownMenuCheckboxItem
                      key={lang}
                      checked={filters.languages.includes(lang)}
                      onCheckedChange={() => toggleArrayFilter('languages', lang)}
                    >
                      {lang}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Standort Filter */}
              {availableLocations.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className={`gap-2 ${filters.locations.length > 0 ? 'border-teal-500 bg-teal-50 text-teal-700' : ''}`}
                    >
                      <MapPin className="h-4 w-4" />
                      Standort
                      {filters.locations.length > 0 && (
                        <Badge variant="secondary" className="ml-1 bg-teal-100 text-teal-700">
                          {filters.locations.length}
                        </Badge>
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
                    <DropdownMenuLabel>Region/Stadt</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableLocations.slice(0, 15).map(loc => (
                      <DropdownMenuCheckboxItem
                        key={loc}
                        checked={filters.locations.includes(loc)}
                        onCheckedChange={() => toggleArrayFilter('locations', loc)}
                      >
                        {loc}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Right: Toggle Switches */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="verified"
                  checked={filters.verifiedOnly}
                  onCheckedChange={(checked) => updateFilter('verifiedOnly', checked)}
                />
                <label
                  htmlFor="verified"
                  className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1.5"
                >
                  <BadgeCheck className="h-4 w-4 text-teal-600" />
                  Verifiziert
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="instant"
                  checked={filters.instantAvailable}
                  onCheckedChange={(checked) => updateFilter('instantAvailable', checked)}
                />
                <label
                  htmlFor="instant"
                  className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="h-4 w-4 text-amber-500" />
                  Sofort verfügbar
                </label>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">Aktive Filter:</span>
              <div className="flex flex-wrap gap-2">
                {filters.budgetRanges.map(id => {
                  const range = BUDGET_RANGES.find(r => r.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="bg-teal-100 text-teal-700 cursor-pointer hover:bg-teal-200"
                      onClick={() => toggleArrayFilter('budgetRanges', id)}
                    >
                      {range?.label}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  );
                })}
                {filters.languages.map(lang => (
                  <Badge
                    key={lang}
                    variant="secondary"
                    className="bg-teal-100 text-teal-700 cursor-pointer hover:bg-teal-200"
                    onClick={() => toggleArrayFilter('languages', lang)}
                  >
                    {lang}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                {filters.businessTypes.map(id => {
                  const type = BUSINESS_TYPES.find(t => t.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="bg-teal-100 text-teal-700 cursor-pointer hover:bg-teal-200"
                      onClick={() => toggleArrayFilter('businessTypes', id)}
                    >
                      {type?.label}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  );
                })}
                {filters.employeeSizes.map(id => {
                  const size = EMPLOYEE_SIZES.find(s => s.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="bg-teal-100 text-teal-700 cursor-pointer hover:bg-teal-200"
                      onClick={() => toggleArrayFilter('employeeSizes', id)}
                    >
                      {size?.label}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  );
                })}
                {filters.locations.map(loc => (
                  <Badge
                    key={loc}
                    variant="secondary"
                    className="bg-teal-100 text-teal-700 cursor-pointer hover:bg-teal-200"
                    onClick={() => toggleArrayFilter('locations', loc)}
                  >
                    {loc}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                {filters.verifiedOnly && (
                  <Badge
                    variant="secondary"
                    className="bg-teal-100 text-teal-700 cursor-pointer hover:bg-teal-200"
                    onClick={() => updateFilter('verifiedOnly', false)}
                  >
                    Verifiziert
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {filters.instantAvailable && (
                  <Badge
                    variant="secondary"
                    className="bg-teal-100 text-teal-700 cursor-pointer hover:bg-teal-200"
                    onClick={() => updateFilter('instantAvailable', false)}
                  >
                    Sofort verfügbar
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700 ml-2"
              >
                Alle zurücksetzen
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{resultCount} Ergebnisse</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileFiltersOpen(true)}
            className={`gap-2 ${activeFilterCount > 0 ? 'border-teal-500 bg-teal-50 text-teal-700' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-teal-100 text-teal-700">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileFiltersOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filter</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              {/* Budget Section */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Budget</h3>
                <div className="space-y-2">
                  {BUDGET_RANGES.map(range => (
                    <label key={range.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.budgetRanges.includes(range.id)}
                        onChange={() => toggleArrayFilter('budgetRanges', range.id)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Firmengröße Section */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Firmengröße</h3>
                <div className="space-y-2">
                  {EMPLOYEE_SIZES.map(size => (
                    <label key={size.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.employeeSizes.includes(size.id)}
                        onChange={() => toggleArrayFilter('employeeSizes', size.id)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">{size.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Arbeitsweise Section */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Arbeitsweise</h3>
                <div className="space-y-2">
                  {BUSINESS_TYPES.map(type => (
                    <label key={type.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.businessTypes.includes(type.id)}
                        onChange={() => toggleArrayFilter('businessTypes', type.id)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sprachen Section */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Sprachen</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {languagesToShow.map(lang => (
                    <label key={lang} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.languages.includes(lang)}
                        onChange={() => toggleArrayFilter('languages', lang)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Toggles Section */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-teal-600" />
                    Nur verifizierte Anbieter
                  </label>
                  <Switch
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) => updateFilter('verifiedOnly', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Sofort verfügbar
                  </label>
                  <Switch
                    checked={filters.instantAvailable}
                    onCheckedChange={(checked) => updateFilter('instantAvailable', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={clearAllFilters}
              >
                Zurücksetzen
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={() => setMobileFiltersOpen(false)}
              >
                {resultCount} Ergebnisse anzeigen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper function to check if a provider matches the budget filter
export function matchesBudgetFilter(hourlyRate: number | undefined, budgetRanges: string[]): boolean {
  if (budgetRanges.length === 0) return true;
  if (!hourlyRate) return false;

  return budgetRanges.some(range => {
    switch (range) {
      case '0-25':
        return hourlyRate <= 25;
      case '25-50':
        return hourlyRate > 25 && hourlyRate <= 50;
      case '50-100':
        return hourlyRate > 50 && hourlyRate <= 100;
      case '100+':
        return hourlyRate > 100;
      default:
        return false;
    }
  });
}

// Helper function to check employee size filter
export function matchesEmployeeSizeFilter(employees: string | undefined, sizes: string[]): boolean {
  if (sizes.length === 0) return true;
  if (!employees) return sizes.includes('1'); // Default to single

  // Normalize the employee value
  const normalized = employees.toLowerCase().trim();

  return sizes.some(size => {
    if (size === '1' && (normalized === '1' || normalized === 'einzelunternehmer')) return true;
    if (size === '2-5' && normalized === '2-5') return true;
    if (size === '6-10' && normalized === '6-10') return true;
    if (size === '11+' && (normalized === '11+' || normalized === '11-50' || normalized === '50+')) return true;
    return false;
  });
}

// Helper function to check business type filter
export function matchesBusinessTypeFilter(businessType: string | undefined, types: string[]): boolean {
  if (types.length === 0) return true;
  if (!businessType) return true; // Include if no type specified

  return types.includes(businessType.toLowerCase());
}

// Helper function to check language filter
export function matchesLanguageFilter(
  languages: Array<{ language: string; proficiency?: string }> | undefined,
  selectedLanguages: string[]
): boolean {
  if (selectedLanguages.length === 0) return true;
  if (!languages || languages.length === 0) return false;

  return selectedLanguages.some(selectedLang =>
    languages.some(lang => lang.language.toLowerCase() === selectedLang.toLowerCase())
  );
}

// Helper function to check location filter
export function matchesLocationFilter(
  city: string | undefined,
  serviceAreas: string[] | undefined,
  selectedLocations: string[]
): boolean {
  if (selectedLocations.length === 0) return true;

  const providerLocations = [
    city,
    ...(serviceAreas || [])
  ].filter(Boolean).map(l => l?.toLowerCase());

  return selectedLocations.some(loc =>
    providerLocations.some(pLoc => pLoc?.includes(loc.toLowerCase()))
  );
}
