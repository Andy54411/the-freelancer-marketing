import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { Job } from '@/lib/mock-jobs';

interface FilterGroupProps {
  title: string;
  items: { label: string; count: number; value: string }[];
  isOpen?: boolean;
  selectedValues?: string[];
  onSelect?: (value: string) => void;
}

function FilterGroup({ title, items, isOpen = true, selectedValues = [], onSelect }: FilterGroupProps) {
  const [open, setOpen] = useState(isOpen);

  if (items.length === 0) return null;

  return (
    <div className="mb-4 border-b border-gray-200 pb-4 last:border-0">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left font-semibold text-gray-800 mb-2 hover:text-teal-600"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {open && (
        <ul className="space-y-1">
          {items.map((item) => {
            const isSelected = selectedValues.includes(item.value);
            return (
              <li key={item.value}>
                <button 
                  onClick={() => onSelect && onSelect(item.value)}
                  className={`flex items-center justify-between w-full text-sm px-2 py-1 rounded group transition-colors ${
                    isSelected ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-left flex items-center gap-2 ${isSelected ? 'text-teal-700' : 'group-hover:text-teal-600'}`}>
                    {isSelected && <Check className="w-3 h-3" />}
                    {item.label}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400 group-hover:bg-teal-50 group-hover:text-teal-600'
                  }`}>
                    {item.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface JobFilterSidebarProps {
  jobs?: Job[];
  onClearFilters?: () => void;
  activeFilters?: Record<string, string[]>;
  onFilterChange?: (category: string, value: string) => void;
}

export function JobFilterSidebar({ jobs = [], onClearFilters, activeFilters = {}, onFilterChange }: JobFilterSidebarProps) {
  
  const facets = useMemo(() => {
    const locations: Record<string, number> = {};
    const types: Record<string, number> = {};
    const industries: Record<string, number> = {};
    const jobGroups: Record<string, number> = {};
    const dates: Record<string, number> = {
      '< 3 Tage': 0,
      '3 - 7 Tage': 0,
      '7 - 14 Tage': 0,
      '2 - 4 Wochen': 0,
      '> 4 Wochen': 0
    };
    
    // Helper to parse German date DD.MM.YYYY
    const parseDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split('.').map(Number);
      return new Date(year, month - 1, day);
    };

    const now = new Date(); 

    jobs.forEach(job => {
      // Location
      if (job.location) {
        const loc = job.location.split(',')[0].trim(); 
        locations[loc] = (locations[loc] || 0) + 1;
      }

      // Type
      if (job.type) {
        const typeList = job.type.split(',').map(t => t.trim());
        typeList.forEach(t => {
          types[t] = (types[t] || 0) + 1;
        });
      }

      // Industry
      if (job.industry) {
        industries[job.industry] = (industries[job.industry] || 0) + 1;
      }

      // Job Group
      if (job.jobGroup) {
        jobGroups[job.jobGroup] = (jobGroups[job.jobGroup] || 0) + 1;
      }

      // Date
      if (job.date) {
        try {
          const jobDate = parseDate(job.date);
          const diffTime = Math.abs(now.getTime() - jobDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 3) dates['< 3 Tage']++;
          else if (diffDays <= 7) dates['3 - 7 Tage']++;
          else if (diffDays <= 14) dates['7 - 14 Tage']++;
          else if (diffDays <= 28) dates['2 - 4 Wochen']++;
          else dates['> 4 Wochen']++;
        } catch (e) {
          // ignore invalid dates
        }
      }
    });

    return {
      locations: Object.entries(locations).map(([label, count]) => ({ label, count, value: label })).sort((a, b) => b.count - a.count),
      types: Object.entries(types).map(([label, count]) => ({ label, count, value: label })).sort((a, b) => b.count - a.count),
      industries: Object.entries(industries).map(([label, count]) => ({ label, count, value: label })).sort((a, b) => b.count - a.count),
      jobGroups: Object.entries(jobGroups).map(([label, count]) => ({ label, count, value: label })).sort((a, b) => b.count - a.count),
      dates: Object.entries(dates).filter(([, count]) => count > 0).map(([label, count]) => ({ label, count, value: label }))
    };
  }, [jobs]);

  return (
    <div className="bg-white border border-gray-200 p-4 rounded-sm">
      {/* Active Filters Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900">Filter</h3>
          <button 
            onClick={onClearFilters}
            className="text-xs text-blue-600 hover:underline"
          >
            Alle entfernen
          </button>
        </div>
      </div>

      <FilterGroup 
        title="Berufsgruppe"
        items={facets.jobGroups}
        selectedValues={activeFilters.jobGroup}
        onSelect={(val) => onFilterChange && onFilterChange('jobGroup', val)}
      />

      <FilterGroup 
        title="Ort"
        items={facets.locations}
        selectedValues={activeFilters.location}
        onSelect={(val) => onFilterChange && onFilterChange('location', val)}
      />

      <FilterGroup 
        title="Branche"
        items={facets.industries}
        selectedValues={activeFilters.industry}
        onSelect={(val) => onFilterChange && onFilterChange('industry', val)}
      />

      <FilterGroup 
        title="Anstellung"
        items={facets.types}
        selectedValues={activeFilters.type}
        onSelect={(val) => onFilterChange && onFilterChange('type', val)}
      />

      <FilterGroup 
        title="Datum"
        items={facets.dates}
        selectedValues={activeFilters.date}
        onSelect={(val) => onFilterChange && onFilterChange('date', val)}
      />
    </div>
  );
}
