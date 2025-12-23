'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Menu, Search, HelpCircle, Settings, ChevronDown, Check, Calendar as CalendarIcon, CheckSquare, Sun, Moon, MoreVertical } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setViewDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
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

  // Mobile Header - kompakt mit Dropdown-Menü
  const MobileHeader = () => (
    <header className={`h-14 ${isDark ? 'bg-[#202124]' : 'bg-white border-b border-gray-200'} flex items-center px-2 gap-2`}>
      {/* Hamburger Menu */}
      <button
        onClick={onMenuToggle}
        className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors shrink-0`}
        aria-label="Hauptleiste"
      >
        <Menu className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
      </button>

      {/* Datum und Navigation - zentriert */}
      <div className="flex-1 flex items-center justify-center gap-1">
        <button
          onClick={onPrev}
          className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Zurück"
        >
          <ChevronLeft className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
        
        <button
          onClick={onToday}
          className={`px-3 py-1 ${isDark ? 'text-white' : 'text-gray-800'} font-medium text-sm`}
        >
          {currentDate.getDate()}. {currentDate.toLocaleString('de-DE', { month: 'short' })}
        </button>
        
        <button
          onClick={onNext}
          className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Weiter"
        >
          <ChevronRight className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Rechte Seite - Aktionen */}
      <div className="flex items-center gap-1 shrink-0">
        {/* View Dropdown */}
        <div className="relative" ref={viewDropdownRef}>
          <button 
            onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium ${isDark ? 'bg-[#3c4043] text-white hover:bg-[#4a4d51]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-md transition-colors`}
          >
            {getViewLabel().substring(0, 3)}
            <ChevronDown className={`h-3 w-3 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {viewDropdownOpen && (
            <div className={`absolute right-0 top-full mt-1 w-56 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} border rounded-lg shadow-xl z-50 py-2`}>
              {[
                { key: 'day', label: 'Tag' },
                { key: 'week', label: 'Woche' },
                { key: 'month', label: 'Monat' },
                { key: '4days', label: '4 Tage' },
              ].map((view) => (
                <button
                  key={view.key}
                  onClick={() => {
                    onViewChange(view.key as 'day' | 'week' | 'month' | 'year' | 'agenda' | '4days');
                    setViewDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${
                    viewMode === view.key ? (isDark ? 'bg-teal-500/20' : 'bg-teal-50') : ''
                  }`}
                >
                  <span className="w-5 flex items-center justify-center">
                    {viewMode === view.key && <Check className="h-4 w-4 text-teal-500" />}
                  </span>
                  <span className={viewMode === view.key ? 'text-teal-500 font-medium' : (isDark ? 'text-gray-200' : 'text-gray-700')}>
                    {view.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mehr-Menü */}
        <div className="relative" ref={mobileMenuRef}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          >
            <MoreVertical className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          {mobileMenuOpen && (
            <div className={`absolute right-0 top-full mt-1 w-64 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} border rounded-lg shadow-xl z-50 py-2`}>
              {/* Heute */}
              <button
                onClick={() => { onToday(); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <CalendarIcon className="h-4 w-4" />
                Heute
              </button>

              <div className={`my-2 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />

              {/* Theme Toggle */}
              <button
                onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Heller Modus' : 'Dunkler Modus'}
              </button>

              {/* Suche */}
              <button
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <Search className="h-4 w-4" />
                Suchen
              </button>

              {/* Einstellungen */}
              <button
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <Settings className="h-4 w-4" />
                Einstellungen
              </button>

              <div className={`my-2 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />

              {/* Aufgaben */}
              <button
                onClick={() => { router.push('/webmail/tasks'); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <CheckSquare className="h-4 w-4" />
                Aufgaben
              </button>

              <div className={`my-2 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />

              {/* User Info */}
              <div className={`px-4 py-2 flex items-center gap-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-medium">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm truncate flex-1">{userEmail}</span>
              </div>

              <button
                onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}
              >
                Abmelden
              </button>
            </div>
          )}
        </div>

        {/* Avatar */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-medium shrink-0 ${isDark ? 'hover:ring-2 hover:ring-gray-500' : 'hover:ring-2 hover:ring-gray-300'} transition-all`}
        >
          {userEmail.charAt(0).toUpperCase()}
        </button>
      </div>
    </header>
  );

  // Desktop Header - vollständig
  const DesktopHeader = () => (
    <header className={`h-16 ${isDark ? 'bg-[#202124]' : 'bg-white border-b border-gray-200'} flex items-center px-4 gap-2`}>
      {/* Left Section - Menu and Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onMenuToggle}
          className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Hauptleiste"
        >
          <Menu className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
        
        <Link href="/webmail" className="flex items-center gap-3">
          <Image 
            src="/images/taskilo-logo-transparent.png" 
            alt="Taskilo" 
            width={120} 
            height={34} 
            className="h-8 w-auto"
          />
          <span className={`text-xl font-normal ${isDark ? 'text-white' : 'text-gray-800'}`}>Kalender</span>
        </Link>
      </div>

      {/* Navigation Section */}
      <div className="flex items-center gap-2 ml-6">
        <button
          onClick={onToday}
          className={`px-4 py-1.5 border ${isDark ? 'border-gray-600 text-gray-200 hover:bg-white/10' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-md text-sm font-medium transition-colors`}
        >
          Heute
        </button>

        <div className="flex items-center">
          <button
            onClick={onPrev}
            className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          >
            <ChevronLeft className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={onNext}
            className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          >
            <ChevronRight className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </div>

        <h1 className={`text-xl font-normal ${isDark ? 'text-white' : 'text-gray-800'} ml-2`}>
          {formatDateTitle()}
        </h1>
      </div>

      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
        >
          {isDark ? <Sun className="h-5 w-5 text-gray-300" /> : <Moon className="h-5 w-5 text-gray-600" />}
        </button>

        <button className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}>
          <Search className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        <button className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}>
          <HelpCircle className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        <button className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}>
          <Settings className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        {/* View Dropdown */}
        <div className="relative ml-2" ref={viewDropdownRef}>
          <button 
            onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${isDark ? 'bg-[#3c4043] text-white hover:bg-[#4a4d51]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-md transition-colors`}
          >
            {getViewLabel()}
            <ChevronDown className={`h-4 w-4 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {viewDropdownOpen && (
            <div className={`absolute right-0 top-full mt-1 w-64 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} border rounded-lg shadow-xl z-50 py-2`}>
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
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${
                    viewMode === view.key ? (isDark ? 'bg-teal-500/20' : 'bg-teal-50/50') : ''
                  }`}
                >
                  <span className="w-5 flex items-center justify-center">
                    {viewMode === view.key && <Check className="h-4 w-4 text-teal-500" />}
                  </span>
                  <span className={viewMode === view.key ? 'text-teal-500 font-medium' : (isDark ? 'text-gray-200' : 'text-gray-700')}>
                    {view.label}
                  </span>
                  <span className={`ml-auto text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{view.shortcut}</span>
                </button>
              ))}

              <div className={`my-2 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />

              <button
                onClick={() => onShowWeekendsChange?.(!showWeekends)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <span className="w-5 flex items-center justify-center">
                  {showWeekends && <Check className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />}
                </span>
                <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>Wochenenden anzeigen</span>
              </button>

              <button
                onClick={() => onShowDeclinedEventsChange?.(!showDeclinedEvents)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <span className="w-5 flex items-center justify-center">
                  {showDeclinedEvents && <Check className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />}
                </span>
                <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>Abgelehnte Termine anzeigen</span>
              </button>

              <button
                onClick={() => onShowCompletedTasksChange?.(!showCompletedTasks)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <span className="w-5 flex items-center justify-center">
                  {showCompletedTasks && <Check className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />}
                </span>
                <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>Erledigte Aufgaben anzeigen</span>
              </button>
            </div>
          )}
        </div>

        {/* Calendar/Tasks Toggle */}
        <div className={`flex items-center ml-2 border ${isDark ? 'border-gray-600' : 'border-gray-300'} rounded-lg overflow-hidden`}>
          <button
            className={`p-2 ${isDark ? 'bg-[#3c4043]' : 'bg-teal-500'} transition-colors`}
            aria-current="page"
          >
            <CalendarIcon className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => router.push('/webmail/tasks')}
            className={`p-2 ${isDark ? 'hover:bg-white/10 border-gray-600' : 'hover:bg-gray-100 border-gray-300'} transition-colors border-l`}
          >
            <CheckSquare className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className="ml-2">
          <AppLauncher />
        </div>

        {/* User Profile */}
        <div className="relative ml-1" ref={profileDropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className={`w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-medium ${isDark ? 'hover:ring-2 hover:ring-gray-500' : 'hover:ring-2 hover:ring-gray-300'} transition-all`}
          >
            {userEmail.charAt(0).toUpperCase()}
          </button>
          {profileDropdownOpen && (
            <div className={`absolute right-0 top-full mt-2 w-72 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} border rounded-2xl shadow-xl z-50 p-4`}>
              <div className={`flex items-center gap-3 pb-3 border-b ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-lg font-medium">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{userEmail}</p>
                </div>
              </div>
              <button
                onClick={() => { setProfileDropdownOpen(false); onLogout(); }}
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

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader />
      </div>
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DesktopHeader />
      </div>
    </>
  );
}
