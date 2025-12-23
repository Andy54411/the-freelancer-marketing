'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Menu, Search, HelpCircle, Settings, ChevronDown, Check, Calendar as CalendarIcon, CheckSquare, Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLauncher } from '../AppLauncher';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: 'day' | 'week' | 'month' | 'year' | 'agenda' | '4days';
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: 'day' | 'week' | 'month' | 'year' | 'agenda' | '4days') => void;
  userEmail: string;
  onLogout: () => void;
  onMenuToggle: () => void;
  showWeekends?: boolean;
  onShowWeekendsChange?: (show: boolean) => void;
  showDeclinedEvents?: boolean;
  onShowDeclinedEventsChange?: (show: boolean) => void;
  showCompletedTasks?: boolean;
  onShowCompletedTasksChange?: (show: boolean) => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  userEmail,
  onLogout,
  onMenuToggle,
  showWeekends = true,
  onShowWeekendsChange,
  showDeclinedEvents = false,
  onShowDeclinedEventsChange,
  showCompletedTasks = true,
  onShowCompletedTasksChange,
}: CalendarHeaderProps) {
  const router = useRouter();
  const { isDark, toggleTheme } = useWebmailTheme();
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setViewDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
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

  return (
    <header className={`h-14 md:h-16 ${isDark ? 'bg-[#202124]' : 'bg-white border-b border-gray-200'} flex items-center px-2 md:px-4 gap-1 md:gap-2`}>
      {/* Left Section - Menu and Logo */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <button
          onClick={onMenuToggle}
          className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Hauptleiste"
        >
          <Menu className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
        
        <Link href="/webmail" className="flex items-center gap-2 md:gap-3">
          <Image 
            src="/images/taskilo-logo-transparent.png" 
            alt="Taskilo" 
            width={120} 
            height={34} 
            className="h-6 md:h-8 w-auto"
          />
          <span className={`text-lg md:text-xl font-normal ${isDark ? 'text-white' : 'text-gray-800'} hidden sm:inline`}>Kalender</span>
        </Link>
      </div>

      {/* Navigation Section */}
      <div className="flex items-center gap-1 md:gap-2 ml-2 md:ml-6">
        {/* Today Button */}
        <button
          onClick={onToday}
          className={`px-2 md:px-4 py-1 md:py-1.5 border ${isDark ? 'border-gray-600 text-gray-200 hover:bg-white/10' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-md text-xs md:text-sm font-medium transition-colors`}
        >
          Heute
        </button>

        {/* Navigation Arrows */}
        <div className="flex items-center">
          <button
            onClick={onPrev}
            className={`p-1 md:p-1.5 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
            aria-label="Zurück"
          >
            <ChevronLeft className={`h-4 w-4 md:h-5 md:w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={onNext}
            className={`p-1 md:p-1.5 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
            aria-label="Weiter"
          >
            <ChevronRight className={`h-4 w-4 md:h-5 md:w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Date Title - kürzere Version auf Mobile */}
        <h1 className={`text-sm md:text-xl font-normal ${isDark ? 'text-white' : 'text-gray-800'} ml-1 md:ml-2 whitespace-nowrap`}>
          <span className="hidden sm:inline">{formatDateTitle()}</span>
          <span className="sm:hidden">{currentDate.toLocaleString('de-DE', { month: 'short' })} {currentDate.getFullYear()}</span>
        </h1>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right Section */}
      <div className="flex items-center gap-0 md:gap-1 shrink-0">
        {/* Theme Toggle - auf Mobile sichtbar */}
        <button
          onClick={toggleTheme}
          className={`p-1.5 md:p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label={isDark ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}
          title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
        >
          {isDark ? (
            <Sun className="h-4 w-4 md:h-5 md:w-5 text-gray-300" />
          ) : (
            <Moon className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
          )}
        </button>

        {/* Search - versteckt auf Mobile */}
        <button
          className={`hidden md:flex p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Suchen"
        >
          <Search className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        {/* Help - versteckt auf Mobile */}
        {/* Help - versteckt auf Mobile */}
        <button
          className={`hidden md:flex p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Support"
        >
          <HelpCircle className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        {/* Settings - versteckt auf Mobile */}
        <button
          className={`hidden md:flex p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Einstellungen"
        >
          <Settings className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        {/* View Dropdown - kompakter auf Mobile */}
        <div className="relative ml-1 md:ml-2" ref={viewDropdownRef}>
          <button 
            onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium ${isDark ? 'bg-[#3c4043] text-white hover:bg-[#4a4d51]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-md transition-colors`}
            aria-expanded={viewDropdownOpen}
            aria-haspopup="menu"
          >
            <span className="hidden sm:inline">{getViewLabel()}</span>
            <span className="sm:hidden">{getViewLabel().substring(0, 3)}</span>
            <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {viewDropdownOpen && (
            <div className={`absolute right-0 top-full mt-1 w-64 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} border rounded-lg shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150`}>
              {/* View Options */}
              {[
                { key: 'day', label: 'Tag', shortcut: 'D' },
                { key: 'week', label: 'Woche', shortcut: 'W' },
                { key: 'month', label: 'Monat', shortcut: 'M' },
                { key: 'year', label: 'Jahr', shortcut: 'Y' },
                { key: 'agenda', label: 'Terminübersicht', shortcut: 'A' },
                { key: '4days', label: '4 Tage', shortcut: 'X' },
              ].map((view) => (
                <button
                  key={view.key}
                  onClick={() => {
                    onViewChange(view.key as 'day' | 'week' | 'month' | 'year' | 'agenda' | '4days');
                    setViewDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors ${
                    viewMode === view.key ? (isDark ? 'bg-teal-500/20' : 'bg-teal-50/50') : ''
                  }`}
                >
                  <span className="w-5 flex items-center justify-center">
                    {viewMode === view.key && <Check className="h-4 w-4 text-teal-500" />}
                  </span>
                  <span className={viewMode === view.key ? 'text-teal-500 font-medium' : (isDark ? 'text-gray-200' : 'text-gray-700')}>
                    {view.label}
                  </span>
                  <span className={`ml-auto text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} font-medium`}>{view.shortcut}</span>
                </button>
              ))}

              {/* Separator */}
              <div className={`my-2 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />

              {/* Toggle Options */}
              <button
                onClick={() => onShowWeekendsChange?.(!showWeekends)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
              >
                <span className="w-5 flex items-center justify-center">
                  {showWeekends && <Check className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />}
                </span>
                <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>Wochenenden anzeigen</span>
              </button>

              <button
                onClick={() => onShowDeclinedEventsChange?.(!showDeclinedEvents)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
              >
                <span className="w-5 flex items-center justify-center">
                  {showDeclinedEvents && <Check className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />}
                </span>
                <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>Abgelehnte Termine anzeigen</span>
              </button>

              <button
                onClick={() => onShowCompletedTasksChange?.(!showCompletedTasks)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
              >
                <span className="w-5 flex items-center justify-center">
                  {showCompletedTasks && <Check className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />}
                </span>
                <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>Erledigte Aufgaben anzeigen</span>
              </button>
            </div>
          )}
        </div>

        {/* Calendar and Tasks Icons - Navigation */}
        <div className={`flex items-center ml-2 border ${isDark ? 'border-gray-600' : 'border-gray-300'} rounded-lg overflow-hidden`}>
          <button
            className={`p-2 ${isDark ? 'bg-[#3c4043]' : 'bg-teal-500'} transition-colors`}
            aria-label="Kalender"
            aria-current="page"
          >
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </button>
          <button
            onClick={() => router.push('/webmail/tasks')}
            className={`p-1.5 md:p-2 ${isDark ? 'hover:bg-white/10 border-gray-600' : 'hover:bg-gray-100 border-gray-300'} transition-colors border-l`}
            aria-label="Aufgaben"
          >
            <CheckSquare className={`h-4 w-4 md:h-5 md:w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* App Launcher */}
        <div className="ml-1 md:ml-2">
          <AppLauncher />
        </div>

        {/* User Profile */}
        <div className="relative ml-1" ref={profileDropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className={`w-7 h-7 md:w-9 md:h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs md:text-sm font-medium ${isDark ? 'hover:ring-2 hover:ring-gray-500' : 'hover:ring-2 hover:ring-gray-300'} transition-all shrink-0`}
            aria-label="Konto"
          >
            {userEmail.charAt(0).toUpperCase()}
          </button>
          {profileDropdownOpen && (
            <div className={`absolute right-0 top-full mt-2 w-72 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} border rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-1 duration-150`}>
              <div className={`flex items-center gap-3 pb-3 border-b ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-lg font-medium">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{userEmail}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onLogout();
                }}
                className={`w-full mt-3 px-4 py-2 text-sm ${isDark ? 'text-gray-200 border-gray-600 hover:bg-white/10' : 'text-gray-700 border-gray-300 hover:bg-gray-50'} border rounded-full transition-colors`}
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
