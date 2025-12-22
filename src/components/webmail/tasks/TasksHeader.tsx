'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Search, HelpCircle, Settings, ChevronDown, Check, Calendar as CalendarIcon, CheckSquare, Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLauncher } from '../AppLauncher';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface TasksHeaderProps {
  onMenuToggle: () => void;
  userEmail: string;
  onLogout: () => void;
  sortOrder: 'date' | 'custom' | 'title';
  onSortOrderChange: (order: 'date' | 'custom' | 'title') => void;
}

export function TasksHeader({
  onMenuToggle,
  userEmail,
  onLogout,
  sortOrder,
  onSortOrderChange,
}: TasksHeaderProps) {
  const router = useRouter();
  const { isDark, toggleTheme } = useWebmailTheme();
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
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

  return (
    <header className={`h-16 ${isDark ? 'bg-[#202124]' : 'bg-white border-b border-gray-200'} flex items-center px-4 gap-2`}>
      {/* Left Section - Menu and Logo */}
      <div className="flex items-center gap-3">
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
          <span className={`text-xl font-normal ${isDark ? 'text-white' : 'text-gray-800'}`}>Aufgaben</span>
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label={isDark ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}
          title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-gray-300" />
          ) : (
            <Moon className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {/* Search */}
        <button
          className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Suchen"
        >
          <Search className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        {/* Sort Dropdown */}
        <div className="relative ml-2" ref={sortDropdownRef}>
          <button 
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${isDark ? 'bg-[#3c4043] text-white hover:bg-[#4a4d51]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-md transition-colors`}
            aria-expanded={sortDropdownOpen}
            aria-haspopup="menu"
          >
            <span>Sortieren: {getSortLabel()}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortDropdownOpen && (
            <div className={`absolute right-0 top-full mt-1 w-56 ${isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200'} border rounded-lg shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150`}>
              {[
                { key: 'custom', label: 'Eigene Reihenfolge' },
                { key: 'date', label: 'Datum' },
                { key: 'title', label: 'Titel' },
              ].map((option) => (
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
                  <span className={sortOrder === option.key ? 'text-teal-500 font-medium' : (isDark ? 'text-gray-200' : 'text-gray-700')}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Help */}
        <button
          className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Support"
        >
          <HelpCircle className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        {/* Settings */}
        <button
          className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
          aria-label="Einstellungen"
        >
          <Settings className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>

        {/* Calendar and Tasks Icons - Navigation */}
        <div className={`flex items-center ml-2 border ${isDark ? 'border-gray-600' : 'border-gray-300'} rounded-lg overflow-hidden`}>
          <button
            onClick={() => router.push('/webmail/calendar')}
            className={`p-2 ${isDark ? 'hover:bg-white/10 border-gray-600' : 'hover:bg-gray-100 border-gray-300'} transition-colors`}
            aria-label="Kalender"
          >
            <CalendarIcon className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button
            className={`p-2 ${isDark ? 'bg-[#3c4043]' : 'bg-teal-500'} transition-colors border-l ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
            aria-label="Aufgaben"
            aria-current="page"
          >
            <CheckSquare className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* App Launcher */}
        <div className="ml-2">
          <AppLauncher />
        </div>

        {/* User Profile */}
        <div className="relative ml-1" ref={profileDropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className={`w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-medium ${isDark ? 'hover:ring-2 hover:ring-gray-500' : 'hover:ring-2 hover:ring-gray-300'} transition-all`}
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
