'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface TasksToolbarProps {
  sortOrder: 'date' | 'custom' | 'title';
  onSortOrderChange: (order: 'date' | 'custom' | 'title') => void;
}

export function TasksToolbar({
  sortOrder,
  onSortOrderChange,
}: TasksToolbarProps) {
  const { isDark } = useWebmailTheme();
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSortLabel = () => {
    switch (sortOrder) {
      case 'date':
        return 'Datum';
      case 'custom':
        return 'Eigene Reihenfolge';
      case 'title':
        return 'Titel';
      default:
        return 'Eigene Reihenfolge';
    }
  };

  const sortOptions = [
    { key: 'custom', label: 'Eigene Reihenfolge' },
    { key: 'date', label: 'Datum' },
    { key: 'title', label: 'Titel' },
  ];

  return (
    <div className="flex items-center gap-4">
      {/* Sort Dropdown */}
      <div className="relative" ref={sortDropdownRef}>
        <button 
          onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
          className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 text-sm font-medium ${isDark ? 'bg-[#3c4043] text-white hover:bg-[#4a4d51]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-md transition-colors`}
          aria-expanded={sortDropdownOpen}
          aria-haspopup="menu"
        >
          <span className="hidden sm:inline">Sortieren: {getSortLabel()}</span>
          <span className="sm:hidden">{getSortLabel().substring(0, 6)}...</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {sortDropdownOpen && (
          <div className={`absolute right-0 top-full mt-1 w-56 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} border rounded-lg shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150`}>
            {sortOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => {
                  onSortOrderChange(option.key as 'date' | 'custom' | 'title');
                  setSortDropdownOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors ${
                  sortOrder === option.key ? (isDark ? 'bg-teal-500/20' : 'bg-teal-50/50') : ''
                }`}
              >
                <span className="w-5 flex items-center justify-center">
                  {sortOrder === option.key && <Check className="h-4 w-4 text-teal-500" />}
                </span>
                <span className={sortOrder === option.key ? 'text-teal-500 font-medium' : (isDark ? 'text-white' : 'text-gray-700')}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
