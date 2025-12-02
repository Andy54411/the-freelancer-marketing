import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { JobPosting } from '@/types/career';
import { findCategoryBySubcategory } from '@/lib/categoriesData';
import { Slider } from '@/components/ui/slider';

interface FilterGroupProps {
  title: string;
  items: { label: string; count: number; value: string }[];
  isOpen?: boolean;
  selectedValues?: string[];
  onSelect?: (value: string) => void;
}

function FilterGroup({
  title,
  items,
  isOpen = true,
  selectedValues = [],
  onSelect,
}: FilterGroupProps) {
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
          {items.map(item => {
            const isSelected = selectedValues.includes(item.value);
            return (
              <li key={item.value}>
                <button
                  onClick={() => onSelect && onSelect(item.value)}
                  className={`flex items-center justify-between w-full text-sm px-2 py-1 rounded group transition-colors ${
                    isSelected
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`text-left flex items-center gap-2 ${isSelected ? 'text-teal-700' : 'group-hover:text-teal-600'}`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {item.label}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-gray-100 text-gray-400 group-hover:bg-teal-50 group-hover:text-teal-600'
                    }`}
                  >
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

interface SalaryFilterProps {
  min: number;
  max: number;
  currentMin?: number;
  currentMax?: number;
  onChange: (min: number, max: number) => void;
}

function SalaryFilter({ min, max, currentMin, currentMax, onChange }: SalaryFilterProps) {
  const [open, setOpen] = useState(true);
  const [localValue, setLocalValue] = useState([currentMin || min, currentMax || max]);

  // Only show if we have a valid range
  if (min >= max) return null;

  return (
    <div className="mb-4 border-b border-gray-200 pb-4 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left font-semibold text-gray-800 mb-2 hover:text-teal-600"
      >
        Gehalt (Jährlich)
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="px-2 py-2">
          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <span>{localValue[0].toLocaleString()} €</span>
            <span>{localValue[1].toLocaleString()} €</span>
          </div>
          <Slider
            defaultValue={[min, max]}
            value={localValue}
            min={min}
            max={max}
            step={1000}
            onValueChange={setLocalValue}
            onValueCommit={val => onChange(val[0], val[1])}
            className="my-4"
          />
        </div>
      )}
    </div>
  );
}

interface JobFilterSidebarProps {
  jobs?: JobPosting[];
  onClearFilters?: () => void;
  activeFilters?: Record<string, string[]>;
  onFilterChange?: (category: string, value: string | number | number[]) => void;
  salaryRange?: { min: number; max: number };
}

export function JobFilterSidebar({
  jobs = [],
  onClearFilters,
  activeFilters = {},
  onFilterChange,
  salaryRange,
}: JobFilterSidebarProps) {
  const facets = React.useMemo(() => {
    const categories: Record<string, number> = {};
    const regions: Record<string, number> = {};
    const languages: Record<string, number> = {};
    const careerLevels: Record<string, number> = {};
    const locations: Record<string, number> = {};
    const types: Record<string, number> = {};
    const titles: Record<string, number> = {};
    const industries: Record<string, number> = {};
    const dates: Record<string, number> = {
      '< 3 Tage': 0,
      '3 - 7 Tage': 0,
      '7 - 14 Tage': 0,
      '2 - 4 Wochen': 0,
      '> 4 Wochen': 0,
    };

    const jobTypeTranslations: Record<string, string> = {
      'full-time': 'Vollzeit',
      'part-time': 'Teilzeit',
      contract: 'Zeit- / Saisonvertrag',
      freelance: 'Freiberuflich / Selbständig',
      internship: 'Praktikum / Ausbildung',
      apprenticeship: 'Ausbildung',
      working_student: 'Werkstudent',
    };

    const now = new Date();

    jobs.forEach(job => {
      // Category (Berufsgruppe)
      if (job.category) {
        categories[job.category] = (categories[job.category] || 0) + 1;
      }

      // Region (Ort)
      if (job.region) {
        regions[job.region] = (regions[job.region] || 0) + 1;
      }

      // Languages (Sprache)
      if (job.languages && Array.isArray(job.languages)) {
        job.languages.forEach(lang => {
          languages[lang] = (languages[lang] || 0) + 1;
        });
      }

      // Career Level (Rang)
      if (job.careerLevel) {
        careerLevels[job.careerLevel] = (careerLevels[job.careerLevel] || 0) + 1;
      }

      // Location (Stadt)
      if (job.location) {
        const loc = job.location.split(',')[0].trim();
        locations[loc] = (locations[loc] || 0) + 1;
      }

      // Type
      if (job.type) {
        const typeList = job.type.split(',').map(t => t.trim());
        typeList.forEach(t => {
          const label = jobTypeTranslations[t] || t;
          types[label] = (types[label] || 0) + 1;
        });
      }

      // Title (Beruf)
      if (job.title) {
        titles[job.title] = (titles[job.title] || 0) + 1;
      }

      // Industry (Branche)
      let industry = job.industry;

      if (!industry) {
        industry = findCategoryBySubcategory(job.title);
      }

      if (!industry) {
        // Fallback: Guess from Company Name
        const companyLower = job.companyName.toLowerCase();
        if (companyLower.includes('hotel') || companyLower.includes('resort'))
          industry = 'Hotellerie';
        else if (
          companyLower.includes('restaurant') ||
          companyLower.includes('bar') ||
          companyLower.includes('café') ||
          companyLower.includes('bistro')
        )
          industry = 'Gastronomie';
        else if (companyLower.includes('gmbh') || companyLower.includes('ag'))
          industry = 'Dienstleistung';
      }

      if (industry) {
        industries[industry] = (industries[industry] || 0) + 1;
      }

      // Date
      if (job.postedAt) {
        try {
          const jobDate = new Date(job.postedAt);
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
      categories: Object.entries(categories)
        .map(([label, count]) => ({ label, count, value: label }))
        .sort((a, b) => b.count - a.count),
      regions: Object.entries(regions)
        .map(([label, count]) => ({ label, count, value: label }))
        .sort((a, b) => b.count - a.count),
      languages: Object.entries(languages)
        .map(([label, count]) => ({ label, count, value: label }))
        .sort((a, b) => b.count - a.count),
      careerLevels: Object.entries(careerLevels)
        .map(([label, count]) => ({ label, count, value: label }))
        .sort((a, b) => b.count - a.count),
      locations: Object.entries(locations)
        .map(([label, count]) => ({ label, count, value: label }))
        .sort((a, b) => b.count - a.count),
      types: Object.entries(types)
        .map(([value, count]) => ({
          label: value,
          count,
          value,
        }))
        .sort((a, b) => b.count - a.count),
      titles: Object.entries(titles)
        .map(([label, count]) => ({ label, count, value: label }))
        .sort((a, b) => b.count - a.count),
      industries: Object.entries(industries)
        .map(([label, count]) => ({ label, count, value: label }))
        .sort((a, b) => b.count - a.count),
      dates: Object.entries(dates)
        .filter(([, count]) => count > 0)
        .map(([label, count]) => ({ label, count, value: label })),
    };
  }, [jobs]);

  return (
    <div className="bg-white border border-gray-200 p-4 rounded-sm">
      {/* Active Filters Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900">Filter</h3>
          <button onClick={onClearFilters} className="text-xs text-teal-600 hover:underline">
            Alle entfernen
          </button>
        </div>
      </div>

      {salaryRange && (
        <SalaryFilter
          min={salaryRange.min}
          max={salaryRange.max}
          currentMin={activeFilters.salaryMin ? Number(activeFilters.salaryMin[0]) : undefined}
          currentMax={activeFilters.salaryMax ? Number(activeFilters.salaryMax[0]) : undefined}
          onChange={(min, max) => {
            if (onFilterChange) {
              // We pass these as separate filter updates
              onFilterChange('salaryMin', min);
              onFilterChange('salaryMax', max);
            }
          }}
        />
      )}

      <FilterGroup
        title="Berufsgruppe / Beruf"
        items={facets.categories}
        selectedValues={activeFilters.category}
        onSelect={val => onFilterChange && onFilterChange('category', val)}
      />

      <FilterGroup
        title="Ort"
        items={facets.regions}
        selectedValues={activeFilters.region}
        onSelect={val => onFilterChange && onFilterChange('region', val)}
      />

      <FilterGroup
        title="Sprache"
        items={facets.languages}
        selectedValues={activeFilters.languages}
        onSelect={val => onFilterChange && onFilterChange('languages', val)}
      />

      <FilterGroup
        title="Branche"
        items={facets.industries}
        selectedValues={activeFilters.industry}
        onSelect={val => onFilterChange && onFilterChange('industry', val)}
      />

      <FilterGroup
        title="Rang"
        items={facets.careerLevels}
        selectedValues={activeFilters.careerLevel}
        onSelect={val => onFilterChange && onFilterChange('careerLevel', val)}
      />

      <FilterGroup
        title="Anstellung"
        items={facets.types}
        selectedValues={activeFilters.type}
        onSelect={val => onFilterChange && onFilterChange('type', val)}
      />

      <FilterGroup
        title="Datum"
        items={facets.dates}
        selectedValues={activeFilters.date}
        onSelect={val => onFilterChange && onFilterChange('date', val)}
      />
    </div>
  );
}
