'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { 
  Menu,
  Search,
  HelpCircle,
  Settings,
  SlidersHorizontal,
  LogOut,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAppUrl } from '@/lib/webmail-urls';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MailSearchFilter, SearchFilters } from './MailSearchFilter';
import { AppLauncher } from './AppLauncher';

interface MailHeaderProps {
  userEmail: string;
  userInitial?: string;
  onMenuToggle?: () => void;
  onSearch?: (query: string) => void;
  onAdvancedSearch?: (filters: SearchFilters) => void;
  onLogout?: () => void;
  onSettingsClick?: () => void;
  mailboxes?: Array<{ path: string; name: string }>;
  searchPlaceholder?: string;
  showAdvancedSearchButton?: boolean;
  // Dynamischer App-Name (z.B. "Drive", "Kalender", "Meet", "Aufgaben")
  appName?: string;
  // App-spezifische Home-URL (falls anders als /webmail)
  appHomeUrl?: string;
  // App-spezifische Toolbar-Elemente (z.B. Kalender-Navigation, View-Wechsel)
  toolbarContent?: React.ReactNode;
  // Suchfeld ausblenden (z.B. fuer Meet oder Kalender)
  hideSearch?: boolean;
  // Rechte Seite: zusaetzliche Elemente vor dem Fragezeichen-Icon (z.B. Calendar/Tasks Switch)
  rightContent?: React.ReactNode;
}

export function MailHeader({
  userEmail,
  userInitial,
  onMenuToggle,
  onSearch,
  onAdvancedSearch,
  onLogout,
  onSettingsClick,
  mailboxes = [],
  searchPlaceholder = 'In E-Mails suchen',
  showAdvancedSearchButton = true,
  appName,
  appHomeUrl,
  toolbarContent,
  hideSearch = false,
  rightContent,
}: MailHeaderProps) {
  const { isDark, toggleTheme } = useWebmailTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleAdvancedSearch = (filters: SearchFilters) => {
    if (onAdvancedSearch) {
      onAdvancedSearch(filters);
    }
    setShowAdvancedSearch(false);
  };

  const handleCreateFilter = (filters: SearchFilters) => {
    // TODO: Implement filter creation
    console.info('Create filter:', filters);
    setShowAdvancedSearch(false);
  };

  return (
    <header className={cn(
      "h-14 md:h-16 flex items-center px-2 md:px-4 shrink-0",
      isDark ? "bg-[#202124]" : "bg-[#f6f8fc]"
    )}>
      {/* Left Section - Menu Button & Logo */}
      <div className="flex items-center gap-2 md:gap-4 md:min-w-[200px]">
        {/* Hamburger Menu - No circle/ring like Gmail */}
        <button
          onClick={onMenuToggle}
          className={cn(
            "p-2 rounded-full transition-colors",
            isDark ? "hover:bg-white/20" : "hover:bg-gray-100"
          )}
          aria-label="Hauptmenue"
        >
          <Menu className={cn("h-5 w-5 md:h-6 md:w-6", isDark ? "text-white" : "text-[#5f6368]")} />
        </button>

        {/* Logo - Taskilo Logo - smaller on mobile */}
        <a href={getAppUrl(appHomeUrl || '/webmail')} className="flex items-center gap-2">
          <Image
            src={isDark ? "/images/taskilo-logo-white.png" : "/images/taskilo-logo-transparent.png"}
            alt="Taskilo"
            width={120}
            height={34}
            className="h-6 md:h-8 w-auto"
          />
          {appName && (
            <span className={cn(
              "text-lg md:text-xl font-normal hidden sm:inline",
              isDark ? "text-white" : "text-gray-600"
            )}>
              {appName}
            </span>
          )}
        </a>
      </div>

      {/* Center Section - App-spezifische Toolbar ODER Suchleiste */}
      {toolbarContent ? (
        <div className="flex-1 flex items-center justify-center">
          {toolbarContent}
        </div>
      ) : !hideSearch ? (
        <div className="flex-1 max-w-[720px] mx-auto relative" ref={searchContainerRef}>
          <div
            className={cn(
              'flex items-center h-10 md:h-12 rounded-full transition-all duration-200',
              isSearchFocused || showAdvancedSearch
                ? isDark ? 'bg-[#303134] shadow-lg' : 'bg-white shadow-lg' 
                : isDark ? 'bg-[#303134] hover:shadow-md' : 'bg-[#eaf1fb] hover:shadow-md'
            )}
          >
            {/* Search Icon */}
            <button
              onClick={handleSearch}
              className="pl-4 pr-3 h-full flex items-center"
              aria-label={searchPlaceholder}
            >
              <Search className={cn("h-5 w-5", isDark ? "text-white" : "text-[#5f6368]")} />
            </button>

            {/* Search Input */}
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 100)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={cn(
                "flex-1 h-full bg-transparent border-0 outline-none text-[16px]",
                isDark ? "text-white placeholder:text-white" : "text-[#202124] placeholder:text-[#5f6368]"
              )}
            />

            {/* Advanced Search Button - nur wenn aktiviert */}
            {showAdvancedSearchButton && (
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={cn(
                  'px-3 h-full flex items-center rounded-r-full transition-colors',
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200/40',
                  showAdvancedSearch && (isDark ? 'bg-white/20' : 'bg-gray-200/60')
                )}
                aria-label="Suchoptionen anzeigen"
                aria-expanded={showAdvancedSearch}
              >
                <SlidersHorizontal className={cn("h-4 w-4 md:h-5 md:w-5", isDark ? "text-white" : "text-[#5f6368]")} />
              </button>
            )}
          </div>

          {/* Advanced Search Filter Panel */}
          {showAdvancedSearchButton && (
            <MailSearchFilter
              isOpen={showAdvancedSearch}
              onClose={() => setShowAdvancedSearch(false)}
              onSearch={handleAdvancedSearch}
              onCreateFilter={handleCreateFilter}
              mailboxes={mailboxes}
              anchorRef={searchContainerRef}
            />
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right Section - Actions & Profile - pushed to end */}
      <div className="flex items-center gap-1 md:gap-1 ml-auto pr-1 md:pr-2 shrink-0">
        {/* App-spezifische rechte Inhalte (z.B. Calendar/Tasks Switch) */}
        {rightContent}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={cn(
            "hidden md:flex p-3 rounded-full transition-colors",
            isDark ? "hover:bg-white/20" : "hover:bg-gray-100"
          )}
          aria-label={isDark ? "Zum Light Mode wechseln" : "Zum Dark Mode wechseln"}
          title={isDark ? "Light Mode" : "Dark Mode"}
        >
          {isDark ? (
            <Sun className="h-6 w-6 text-white" />
          ) : (
            <Moon className="h-6 w-6 text-[#5f6368]" />
          )}
        </button>

        {/* Help Button - Hidden on mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "hidden md:flex p-3 rounded-full transition-colors",
                isDark ? "hover:bg-white/20" : "hover:bg-gray-100"
              )}
              aria-label="Support"
            >
              <HelpCircle className={cn("h-6 w-6", isDark ? "text-white" : "text-[#5f6368]")} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Hilfe</DropdownMenuItem>
            <DropdownMenuItem>Tastenkuerzel</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Feedback senden</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Button - Hidden on mobile */}
        <button
          onClick={onSettingsClick}
          className={cn(
            "hidden md:flex p-3 rounded-full transition-colors",
            isDark ? "hover:bg-white/20" : "hover:bg-gray-200/60"
          )}
          aria-label="Einstellungen"
        >
          <Settings className={cn("h-6 w-6", isDark ? "text-white" : "text-[#5f6368]")} />
        </button>

        {/* Gemini/AI Button - Hidden on mobile */}
        <button
          className={cn(
            "hidden md:flex p-3 rounded-full transition-colors",
            isDark ? "hover:bg-white/20" : "hover:bg-gray-200/60"
          )}
          aria-label="AI Assistent"
        >
          <Sparkles className={cn("h-6 w-6", isDark ? "text-white" : "text-[#5f6368]")} />
        </button>

        {/* Apps Grid Button - Auf Mobile und Desktop sichtbar */}
        <AppLauncher hasTheme={isDark} />

        {/* User Profile - Gmail Style Ring - IMMER sichtbar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-0.5 rounded-full hover:bg-gray-200/60 transition-colors shrink-0"
              aria-label={`Konto: ${userEmail}`}
            >
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center ring-2 ring-transparent hover:ring-teal-200 transition-all">
                <span className="text-white font-medium text-sm">
                  {userInitial || userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {userInitial || userEmail.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userEmail.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
              </div>
            </div>
            <div className="py-2">
              <DropdownMenuItem>Konto verwalten</DropdownMenuItem>
              <DropdownMenuItem>Weiteres Konto hinzufuegen</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onLogout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
