'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Bell,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAppUrl } from '@/lib/webmail-urls';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { getWebmailCredentials } from '@/lib/webmail-session';
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
  // Company ID fuer Company-Dashboard Apps im AppLauncher
  companyId?: string;
  // Im Dashboard: White Mode erzwingen, Icons ausblenden
  isDashboard?: boolean;
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
  companyId,
  isDashboard = false,
}: MailHeaderProps) {
  const { isDark: themeIsDark, toggleTheme } = useWebmailTheme();
  // Im Dashboard immer White Mode
  const isDark = isDashboard ? false : themeIsDark;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Dashboard: Unread counts für Badges
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Fetch unread counts wenn im Dashboard
  useEffect(() => {
    if (!isDashboard || !companyId) return;

    const fetchUnreadCounts = async () => {
      try {
        // Hole Credentials aus localStorage (gespeichert bei Dashboard-Verbindung)
        const credentials = getWebmailCredentials(companyId);
        
        if (credentials && credentials.email && credentials.password) {
          try {
            const emailResponse = await fetch('/api/webmail/mailboxes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                imapHost: 'mail.taskilo.de',
                imapPort: 993,
              }),
            });
            if (emailResponse.ok) {
              const emailData = await emailResponse.json();
              if (emailData.success && emailData.mailboxes) {
                // Finde INBOX und hole unseen count
                const inbox = emailData.mailboxes.find(
                  (mb: { path: string; unseen: number }) => mb.path === 'INBOX'
                );
                if (inbox) {
                  setUnreadEmailsCount(inbox.unseen);
                }
              }
            }
          } catch {
            // Webmail API nicht erreichbar - ignorieren
          }
        }

        // Fetch unread notifications count von bestehender API
        try {
          const notifResponse = await fetch(
            `/api/notifications?userId=${companyId}`
          );
          if (notifResponse.ok) {
            const notifData = await notifResponse.json();
            if (notifData.success && notifData.notifications) {
              // Zähle ungelesene Benachrichtigungen
              const unreadCount = notifData.notifications.filter(
                (n: { isRead?: boolean }) => !n.isRead
              ).length;
              setUnreadNotificationsCount(unreadCount);
            }
          }
        } catch {
          // Notifications API nicht erreichbar - ignorieren
        }
      } catch {
        // Silent fail - counts bleiben bei 0
      }
    };

    // Initial fetch
    fetchUnreadCounts();

    // Polling alle 60 Sekunden
    const pollingInterval = setInterval(fetchUnreadCounts, 60000);

    // Event-Listener für Updates
    const handleEmailUpdate = () => fetchUnreadCounts();
    window.addEventListener('emailReadStatusChanged', handleEmailUpdate);
    window.addEventListener('notificationStatusChanged', handleEmailUpdate);

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener('emailReadStatusChanged', handleEmailUpdate);
      window.removeEventListener('notificationStatusChanged', handleEmailUpdate);
    };
  }, [isDashboard, companyId, userEmail]);

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
                aria-label={isDashboard ? "Dienstleistungen filtern" : "Suchoptionen anzeigen"}
                aria-expanded={showAdvancedSearch}
              >
                <SlidersHorizontal className={cn("h-4 w-4 md:h-5 md:w-5", isDark ? "text-white" : "text-[#5f6368]")} />
              </button>
            )}
          </div>

          {/* Filter Panel - Dienstleistungen im Dashboard, Mail-Suche im Webmailer */}
          {showAdvancedSearchButton && isDashboard && showAdvancedSearch && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                    <option value="">Alle Kategorien</option>
                    <option value="handwerk">Handwerk</option>
                    <option value="haushalt">Haushalt</option>
                    <option value="transport">Transport & Umzug</option>
                    <option value="garten">Garten & Landschaft</option>
                    <option value="wellness">Wellness & Gesundheit</option>
                    <option value="gastronomie">Gastronomie</option>
                    <option value="marketing">Marketing & Medien</option>
                    <option value="finanzen">Finanzen & Recht</option>
                    <option value="bildung">Bildung & Nachhilfe</option>
                    <option value="tiere">Tiere & Tierpflege</option>
                    <option value="kreativ">Kreativ & Design</option>
                    <option value="event">Event & Veranstaltung</option>
                    <option value="buero">IT & Technik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standort</label>
                  <input 
                    type="text" 
                    placeholder="PLZ oder Stadt"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preis</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                    <option value="">Alle Preise</option>
                    <option value="0-50">Bis 50 EUR</option>
                    <option value="50-100">50 - 100 EUR</option>
                    <option value="100-500">100 - 500 EUR</option>
                    <option value="500+">Ab 500 EUR</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  onClick={() => setShowAdvancedSearch(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={() => {
                    setShowAdvancedSearch(false);
                    router.push('/services');
                  }}
                  className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Filter anwenden
                </button>
              </div>
            </div>
          )}

          {/* Mail Search Filter - nur im Webmailer */}
          {showAdvancedSearchButton && !isDashboard && (
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

        {/* Theme Toggle Button - Im Dashboard ausgeblendet */}
        {!isDashboard && (
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
        )}

        {/* Help Button - Im Dashboard ausgeblendet */}
        {!isDashboard && (
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
        )}

        {/* Settings Button - Im Dashboard ausgeblendet */}
        {!isDashboard && (
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
        )}

        {/* Gemini/AI Button - Im Dashboard ausgeblendet */}
        {!isDashboard && (
          <button
            className={cn(
              "hidden md:flex p-3 rounded-full transition-colors",
              isDark ? "hover:bg-white/20" : "hover:bg-gray-200/60"
            )}
            aria-label="AI Assistent"
          >
            <Sparkles className={cn("h-6 w-6", isDark ? "text-white" : "text-[#5f6368]")} />
          </button>
        )}

        {/* Dashboard-spezifische Icons - Nur wenn isDashboard true ist */}
        {isDashboard && companyId && (
          <>
            {/* Benachrichtigungen (Glocke) */}
            <Link
              href={`/dashboard/company/${companyId}`}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Benachrichtigungen"
            >
              <Bell className="h-5 w-5 text-[#5f6368]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-xs font-medium">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </Link>

            {/* E-Mail Badge - Zeigt nur Anzahl ungelesener E-Mails an */}
            <div
              className="relative p-2 rounded-full"
              aria-label="Ungelesene E-Mails"
            >
              <Mail className="h-5 w-5 text-[#5f6368]" />
              {unreadEmailsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-teal-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-xs font-medium">
                  {unreadEmailsCount > 99 ? '99+' : unreadEmailsCount}
                </span>
              )}
            </div>

            {/* Hilfe (Fragezeichen) */}
            <button
              onClick={() => {
                // Trigger Chatbot öffnen
                window.dispatchEvent(new CustomEvent('openHelpChatbot'));
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Hilfe & Support"
            >
              <HelpCircle className="h-5 w-5 text-[#5f6368]" />
            </button>
          </>
        )}

        {/* Apps Grid Button - Auf Mobile und Desktop sichtbar */}
        <AppLauncher hasTheme={isDark} companyId={companyId} isDarkMode={isDark} />

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
