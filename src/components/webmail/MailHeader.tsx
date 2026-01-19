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
  Smartphone,
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
import { MobileSetupModal } from './MobileSetupModal';
import { getSettings } from '@/lib/webmail-settings-api';

// Debug-Logging für Hydration
const mailHeaderLog = (_step: string, _data?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
  } else {
  }
};

interface MailHeaderProps {
  userEmail: string;
  userInitial?: string;
  profileImage?: string;
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
  // Meet-Style: Minimalistischer Header wie Google Meet (kein Hamburger, keine Suche, nur Logo + Datum + Avatar)
  isMeetStyle?: boolean;
  // Photos-Style: Google Fotos Layout (Logo links, breites Suchfeld Mitte, Icons rechts)
  isPhotosStyle?: boolean;
  // Callback für Suche in Photos
  onPhotosSearch?: (query: string) => void;
  // Callback für Upload-Button in Photos
  onUploadClick?: () => void;
}

export function MailHeader({
  userEmail,
  userInitial,
  profileImage: propProfileImage,
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
  isMeetStyle = false,
  isPhotosStyle = false,
  onPhotosSearch,
  onUploadClick,
}: MailHeaderProps) {
  mailHeaderLog('RENDER_START', {
    userEmail,
    appName,
    isDashboard,
    hasCompanyId: !!companyId,
    isServer: typeof window === 'undefined'
  });
  
  const { isDark: themeIsDark, toggleTheme } = useWebmailTheme();
  // Im Dashboard immer White Mode
  const isDark = isDashboard ? false : themeIsDark;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showMobileSetup, setShowMobileSetup] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  mailHeaderLog('STATE_INITIALIZED', {
    isDark,
    searchQuery,
    isSearchFocused,
    showAdvancedSearch
  });

  // Dashboard: Unread counts für Badges
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  
  // Profilbild aus Settings laden
  const [profileImage, setProfileImage] = useState<string | undefined>(propProfileImage);
  
  // Lade Profilbild vom Hetzner-Server wenn nicht über Props übergeben
  useEffect(() => {
    if (propProfileImage) {
      setProfileImage(propProfileImage);
      return;
    }
    
    if (!userEmail) return;
    
    const loadProfileImage = async () => {
      try {
        console.log('[MailHeader] Loading profile image for:', userEmail);
        const settings = await getSettings(userEmail);
        console.log('[MailHeader] Settings loaded:', settings?.profileImage ? 'Has image' : 'No image');
        if (settings?.profileImage) {
          setProfileImage(settings.profileImage);
        }
      } catch (err) {
        console.error('[MailHeader] Error loading profile image:', err);
        // Fehler ignorieren - Fallback auf Initial
      }
    };
    
    loadProfileImage();
  }, [userEmail, propProfileImage]);

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

  // Photos-Style Header - wie Google Fotos (Logo links, breites Suchfeld, Icons rechts)
  if (isPhotosStyle) {
    return (
      <header className={cn(
        "h-14 md:h-16 flex items-center justify-between px-2 sm:px-4 shrink-0",
        isDark ? "bg-[#202124]" : "bg-white"
      )}>
        {/* Links: Hamburger + Logo */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Hamburger Menu */}
          <button
            onClick={onMenuToggle}
            className={cn(
              "p-1.5 sm:p-2 rounded-full transition-colors",
              isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
            )}
            aria-label="Hauptmenü"
          >
            <Menu className={cn("w-5 h-5 sm:w-6 sm:h-6", isDark ? "text-gray-300" : "text-gray-700")} />
          </button>
          
          <Link href={appHomeUrl || '/webmail/photos'} className="flex items-center">
            <Image 
              src={isDark ? "/images/taskilo-logo-white.png" : "/images/taskilo-logo-transparent.png"} 
              alt="Taskilo" 
              width={120} 
              height={34} 
              className="h-5 sm:h-6 md:h-8 w-auto"
              style={{ maxWidth: '100px', maxHeight: '32px' }}
              priority
            />
          </Link>
        </div>
        
        {/* Mitte: Breites Suchfeld */}
        <div className="flex-1 max-w-2xl mx-2 sm:mx-4 md:mx-8">
          <div className="relative">
            <Search className={cn(
              "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5",
              isDark ? "text-gray-500" : "text-gray-400"
            )} />
            <input
              type="text"
              placeholder={searchPlaceholder || 'In Fotos suchen'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onPhotosSearch?.(e.target.value);
              }}
              className={cn(
                "w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base border-0 focus:outline-none focus:ring-2 focus:ring-teal-500",
                isDark 
                  ? "bg-[#303134] text-gray-200 placeholder-gray-500" 
                  : "bg-gray-100 text-gray-900 placeholder-gray-500"
              )}
            />
          </div>
        </div>
        
        {/* Rechts: Icons */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Hochladen Button - immer sichtbar */}
          <button
            onClick={onUploadClick}
            className={cn(
              "p-1.5 sm:p-2 md:p-2.5 rounded-full transition-colors",
              isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"
            )}
            title="Hochladen"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
          
          {/* Hilfe - Tablet und Desktop */}
          <button className={cn(
            "p-1.5 sm:p-2 md:p-2.5 rounded-full transition-colors hidden sm:flex",
            isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"
          )}>
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          {/* Einstellungen - Tablet und Desktop */}
          <button 
            onClick={onSettingsClick}
            className={cn(
              "p-1.5 sm:p-2 md:p-2.5 rounded-full transition-colors hidden sm:flex",
              isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"
            )}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          {/* Apps Grid */}
          <AppLauncher isDarkMode={isDark} companyId={companyId} />
          
          {/* Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 sm:ml-2 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium cursor-pointer ring-2 ring-transparent hover:ring-teal-200 focus:outline-none overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  userInitial || userEmail?.charAt(0)?.toUpperCase() || 'U'
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{userEmail}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme}>
                {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  }

  // Meet-Style Header - minimalistisch wie Google Meet
  if (isMeetStyle) {
    return (
      <header className={cn(
        "h-14 md:h-16 flex items-center justify-between px-2 sm:px-4 md:px-6 border-b shrink-0",
        isDark ? "border-gray-700 bg-[#202124]" : "border-gray-200 bg-white"
      )}>
        {/* Links: Hamburger + Logo */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          {/* Hamburger Menu */}
          <button
            onClick={onMenuToggle}
            className={cn(
              "p-1.5 sm:p-2 rounded-full transition-colors",
              isDark ? "hover:bg-white/20" : "hover:bg-gray-100"
            )}
            aria-label="Hauptmenue"
          >
            <Menu className={cn("w-5 h-5 md:w-6 md:h-6", isDark ? "text-gray-300" : "text-gray-700")} />
          </button>
          
          <a href={getAppUrl(appHomeUrl || '/webmail')} className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className={cn("text-lg sm:text-xl font-normal hidden sm:inline", isDark ? "text-white" : "text-gray-700")}>
              Taskilo <span className={isDark ? "text-gray-400" : "text-gray-500"}>{appName || 'Meet'}</span>
            </span>
          </a>
        </div>
        
        {/* Rechts: Datum, Icons, Avatar */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          {/* Datum - nur Desktop */}
          <span className={cn("text-xs sm:text-sm hidden lg:block", isDark ? "text-gray-400" : "text-gray-600")}>
            {new Date().toLocaleDateString('de-DE', { 
              hour: '2-digit',
              minute: '2-digit',
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            })}
          </span>
          
          {/* Hilfe - Tablet und Desktop */}
          <button className={cn("p-1.5 sm:p-2 rounded-full hidden sm:flex", isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600")}>
            <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          
          {/* Feedback - nur Desktop */}
          <button className={cn("p-1.5 sm:p-2 rounded-full hidden lg:flex", isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600")}>
            <Mail className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          
          {/* Einstellungen - Tablet und Desktop */}
          <button 
            onClick={onSettingsClick}
            className={cn("p-1.5 sm:p-2 rounded-full hidden sm:flex", isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600")}
          >
            <Settings className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          
          {/* Apps Grid */}
          <AppLauncher isDarkMode={isDark} companyId={companyId} />
          
          {/* Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium cursor-pointer ring-2 ring-transparent hover:ring-teal-200 focus:outline-none overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  userInitial || userEmail?.charAt(0)?.toUpperCase() || 'U'
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{userEmail}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme}>
                {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  }

  return (
    <header className={cn(
      "h-14 md:h-16 flex items-center px-2 md:px-4 shrink-0",
      isDark ? "bg-[#202124]" : "bg-[#f6f8fc]"
    )}>
      {/* Left Section - Menu Button & Logo */}
      <div className="flex items-center gap-1 md:gap-4 shrink-0">
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

        {/* Logo - Taskilo Logo - smaller on mobile, hidden text on small screens */}
        <a href={getAppUrl(appHomeUrl || '/webmail')} className="flex items-center gap-2">
          <Image
            src={isDark ? "/images/taskilo-logo-white.png" : "/images/taskilo-logo-transparent.png"}
            alt="Taskilo"
            width={120}
            height={34}
            className="h-5 sm:h-6 md:h-8 w-auto"
            style={{ maxWidth: '100px', maxHeight: '32px' }}
            priority
          />
          {appName && (
            <span className={cn(
              "text-lg md:text-xl font-normal hidden md:inline",
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
        <div className="flex-1 max-w-[720px] mx-2 md:mx-auto relative" ref={searchContainerRef}>
          <div
            className={cn(
              'flex items-center h-9 md:h-12 rounded-full transition-all duration-200',
              isSearchFocused || showAdvancedSearch
                ? isDark ? 'bg-[#303134] shadow-lg' : 'bg-white shadow-lg' 
                : isDark ? 'bg-[#303134] hover:shadow-md' : 'bg-[#eaf1fb] hover:shadow-md'
            )}
          >
            {/* Search Icon */}
            <button
              onClick={handleSearch}
              className="pl-3 md:pl-4 pr-2 md:pr-3 h-full flex items-center"
              aria-label={searchPlaceholder}
            >
              <Search className={cn("h-4 w-4 md:h-5 md:w-5", isDark ? "text-white" : "text-[#5f6368]")} />
            </button>

            {/* Search Input */}
            <input
              type="text"
              placeholder={isSearchFocused ? searchPlaceholder : ''}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 100)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={cn(
                "flex-1 h-full bg-transparent border-0 outline-none text-sm md:text-[16px] min-w-0",
                isDark ? "text-white placeholder:text-white" : "text-[#202124] placeholder:text-[#5f6368]"
              )}
            />

            {/* Advanced Search Button - versteckt auf sehr kleinen Bildschirmen */}
            {showAdvancedSearchButton && (
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={cn(
                  'px-2 md:px-3 h-full hidden sm:flex items-center rounded-r-full transition-colors',
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
      <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 ml-auto pr-1 md:pr-2 shrink-0">
        {/* App-spezifische rechte Inhalte (z.B. Calendar/Tasks Switch) - auf Mobile versteckt */}
        <div className="hidden sm:contents">
          {rightContent}
        </div>

        {/* Theme Toggle Button - Nur Desktop */}
        {!isDashboard && (
          <button
            onClick={toggleTheme}
            className={cn(
              "hidden lg:flex p-2 md:p-3 rounded-full transition-colors",
              isDark ? "hover:bg-white/20" : "hover:bg-gray-100"
            )}
            aria-label={isDark ? "Zum Light Mode wechseln" : "Zum Dark Mode wechseln"}
            title={isDark ? "Light Mode" : "Dark Mode"}
          >
            {isDark ? (
              <Sun className="h-5 w-5 md:h-6 md:w-6 text-white" />
            ) : (
              <Moon className="h-5 w-5 md:h-6 md:w-6 text-[#5f6368]" />
            )}
          </button>
        )}

        {/* Help Button - Tablet und Desktop */}
        {!isDashboard && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "hidden sm:flex p-2 md:p-3 rounded-full transition-colors",
                  isDark ? "hover:bg-white/20" : "hover:bg-gray-100"
                )}
                aria-label="Support"
              >
                <HelpCircle className={cn("h-5 w-5 md:h-6 md:w-6", isDark ? "text-white" : "text-[#5f6368]")} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Hilfe</DropdownMenuItem>
              <DropdownMenuItem>Tastenkuerzel</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setShowMobileSetup(true)}>
                <Smartphone className="h-4 w-4 mr-2" />
                E-Mail auf Handy einrichten
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Feedback senden</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Settings Button - Tablet und Desktop */}
        {!isDashboard && (
          <button
            onClick={onSettingsClick}
            className={cn(
              "hidden sm:flex p-2 md:p-3 rounded-full transition-colors",
              isDark ? "hover:bg-white/20" : "hover:bg-gray-200/60"
            )}
            aria-label="Einstellungen"
          >
            <Settings className={cn("h-5 w-5 md:h-6 md:w-6", isDark ? "text-white" : "text-[#5f6368]")} />
          </button>
        )}

        {/* Gemini/AI Button - Nur Desktop */}
        {!isDashboard && (
          <button
            className={cn(
              "hidden lg:flex p-2 md:p-3 rounded-full transition-colors",
              isDark ? "hover:bg-white/20" : "hover:bg-gray-200/60"
            )}
            aria-label="AI Assistent"
          >
            <Sparkles className={cn("h-5 w-5 md:h-6 md:w-6", isDark ? "text-white" : "text-[#5f6368]")} />
          </button>
        )}

        {/* Dashboard-spezifische Icons - Nur wenn isDashboard true ist */}
        {isDashboard && companyId && (
          <>
            {/* Benachrichtigungen (Glocke) - Tablet und Desktop */}
            <Link
              href={`/dashboard/company/${companyId}`}
              className="relative p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors hidden sm:flex"
              aria-label="Benachrichtigungen"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-[#5f6368]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full min-w-4 sm:min-w-[18px] h-4 sm:h-[18px] flex items-center justify-center text-[10px] sm:text-xs font-medium">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </Link>

            {/* E-Mail Badge - Zeigt nur Anzahl ungelesener E-Mails an - Tablet und Desktop */}
            <div
              className="relative p-1.5 sm:p-2 rounded-full hidden sm:flex"
              aria-label="Ungelesene E-Mails"
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-[#5f6368]" />
              {unreadEmailsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-teal-500 text-white rounded-full min-w-4 sm:min-w-[18px] h-4 sm:h-[18px] flex items-center justify-center text-[10px] sm:text-xs font-medium">
                  {unreadEmailsCount > 99 ? '99+' : unreadEmailsCount}
                </span>
              )}
            </div>

            {/* Hilfe (Fragezeichen) - Nur Desktop */}
            <button
              onClick={() => {
                // Trigger Chatbot öffnen
                window.dispatchEvent(new CustomEvent('openHelpChatbot'));
              }}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors hidden lg:flex"
              aria-label="Hilfe & Support"
            >
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#5f6368]" />
            </button>
          </>
        )}

        {/* Apps Grid Button - Auf allen Bildschirmen sichtbar */}
        <AppLauncher hasTheme={isDark} companyId={companyId} isDarkMode={isDark} />

        {/* User Profile - Gmail Style Ring - IMMER sichtbar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-0.5 rounded-full hover:bg-gray-200/60 transition-colors shrink-0"
              aria-label={`Konto: ${userEmail}`}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-600 flex items-center justify-center ring-2 ring-transparent hover:ring-teal-200 transition-all overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-medium text-xs sm:text-sm">
                    {userInitial || userEmail.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 sm:w-72">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profil" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-medium">
                      {userInitial || userEmail.charAt(0).toUpperCase()}
                    </span>
                  )}
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
                onSelect={() => setShowMobileSetup(true)}
                className="cursor-pointer"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                E-Mail auf Handy einrichten
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault();
                  if (onLogout) onLogout();
                }}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Setup Modal */}
      <MobileSetupModal
        isOpen={showMobileSetup}
        onClose={() => setShowMobileSetup(false)}
        userEmail={userEmail}
        userName={userEmail.split('@')[0]}
      />
    </header>
  );
}
