'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface CalendarToolbarProps {
  currentDate: Date;
  viewMode: 'day' | 'week' | 'month' | 'year' | 'agenda' | '4days';
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: 'day' | 'week' | 'month' | 'year' | 'agenda' | '4days') => void;
  showWeekends?: boolean;
  onShowWeekendsChange?: (show: boolean) => void;
  showDeclinedEvents?: boolean;
  onShowDeclinedEventsChange?: (show: boolean) => void;
  showCompletedTasks?: boolean;
  onShowCompletedTasksChange?: (show: boolean) => void;
}

export function CalendarToolbar({
  currentDate,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  showWeekends = true,
  onShowWeekendsChange,
  showDeclinedEvents = false,
  onShowDeclinedEventsChange,
  showCompletedTasks = true,
  onShowCompletedTasksChange,
}: CalendarToolbarProps) {
  const { isDark } = useWebmailTheme();
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setViewDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateTitle = () => {
    const month = currentDate.toLocaleString('de-DE', { month: 'long' });
    const year = currentDate.getFullYear();
    return `${month} ${year}`;
  };

  const getViewLabel = () => {
    switch (viewMode) {
      case 'day':
        return 'Tag';
      case 'week':
        return 'Woche';
      case 'month':
        return 'Monat';
      case 'year':
        return 'Jahr';
      case 'agenda':
        return 'Terminübersicht';
      case '4days':
        return '4 Tage';
      default:
        return 'Woche';
    }
  };

  const viewOptions = [
    { key: 'day', label: 'Tag', shortcut: 'D' },
    { key: 'week', label: 'Woche', shortcut: 'W' },
    { key: 'month', label: 'Monat', shortcut: 'M' },
    { key: '4days', label: '4 Tage', shortcut: 'X' },
    { key: 'year', label: 'Jahr', shortcut: 'Y' },
    { key: 'agenda', label: 'Terminübersicht', shortcut: 'A' },
  ];

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* Heute Button */}
      <button
        onClick={onToday}
        className={`px-3 md:px-4 py-1.5 border ${isDark ? 'border-gray-600 text-white hover:bg-white/10' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-md text-sm font-medium transition-colors`}
      >
        Heute
      </button>

      {/* Navigation Arrows */}
      <div className="flex items-center">
        <button
          onClick={onPrev}
          className={`p-1.5 md:p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Zurück"
        >
          <ChevronLeft className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-600'}`} />
        </button>
        <button
          onClick={onNext}
          className={`p-1.5 md:p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Weiter"
        >
          <ChevronRight className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Current Date Display */}
      <h1 className={`text-base md:text-xl font-normal ${isDark ? 'text-white' : 'text-gray-800'} whitespace-nowrap`}>
        {formatDateTitle()}
      </h1>

      {/* View Dropdown */}
      <div className="relative ml-auto md:ml-4" ref={viewDropdownRef}>
        <button 
          onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
          className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 text-sm font-medium ${isDark ? 'border-gray-600 text-white hover:bg-white/10' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} border rounded-md transition-colors`}
        >
          <span className="hidden sm:inline">{getViewLabel()}</span>
          <span className="sm:hidden">{getViewLabel().substring(0, 3)}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {viewDropdownOpen && (
          <div className={`absolute right-0 top-full mt-1 w-56 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} border rounded-lg shadow-xl z-50 py-2`}>
            {viewOptions.map((view) => (
              <button
                key={view.key}
                onClick={() => {
                  onViewChange(view.key as 'day' | 'week' | 'month' | 'year' | 'agenda' | '4days');
                  setViewDropdownOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${
                  viewMode === view.key ? (isDark ? 'bg-teal-500/20' : 'bg-teal-50') : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 flex items-center justify-center">
                    {viewMode === view.key && <Check className="h-4 w-4 text-teal-500" />}
                  </span>
                  <span className={viewMode === view.key ? 'text-teal-500 font-medium' : (isDark ? 'text-white' : 'text-gray-700')}>
                    {view.label}
                  </span>
                </div>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-white'}`}>{view.shortcut}</span>
              </button>
            ))}

            {/* Separator */}
            <div className={`my-2 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />

            {/* Wochenenden anzeigen */}
            <button
              onClick={() => onShowWeekendsChange?.(!showWeekends)}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            >
              <span className="w-5 flex items-center justify-center">
                {showWeekends && <Check className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-600'}`} />}
              </span>
              <span className={isDark ? 'text-white' : 'text-gray-700'}>Wochenenden anzeigen</span>
            </button>

            {/* Abgelehnte Termine anzeigen */}
            <button
              onClick={() => onShowDeclinedEventsChange?.(!showDeclinedEvents)}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            >
              <span className="w-5 flex items-center justify-center">
                {showDeclinedEvents && <Check className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-600'}`} />}
              </span>
              <span className={isDark ? 'text-white' : 'text-gray-700'}>Abgelehnte Termine anzeigen</span>
            </button>

            {/* Erledigte Aufgaben anzeigen */}
            <button
              onClick={() => onShowCompletedTasksChange?.(!showCompletedTasks)}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            >
              <span className="w-5 flex items-center justify-center">
                {showCompletedTasks && <Check className={`h-4 w-4 ${isDark ? 'text-white' : 'text-gray-600'}`} />}
              </span>
              <span className={isDark ? 'text-white' : 'text-gray-700'}>Erledigte Aufgaben anzeigen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
