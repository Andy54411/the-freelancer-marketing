'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Plus,
  Home,
  AtSign,
  Star,
  ChevronDown,
  ChevronRight,
  Users,
  Bot,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { useChatSettings } from '@/hooks/useChatSettings';
import { NewChatModal } from './NewChatModal';

interface Space {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  createdAt: Date;
}

interface ChatSidebarProps {
  collapsed?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  onCreateSpace?: () => void;
  onSearchSpaces?: () => void;
  onSearchApps?: () => void;
  onMessageRequests?: () => void;
  onStartChat?: (recipients: string[]) => void;
  spaces?: Space[];
  onSpaceClick?: (spaceId: string) => void;
  userEmail?: string;
}

// Verknüpfungen (Shortcuts) Section
const shortcuts = [
  { id: 'overview', label: 'Übersicht', icon: Home },
  { id: 'mentions', label: 'Erwähnungen', icon: AtSign },
  { id: 'starred', label: 'Markiert', icon: Star },
];

// Mock-Daten für Direktnachrichten (später durch echte Daten ersetzen)
const mockDirectMessages: Array<{
  id: string;
  name: string;
  avatar?: string;
  unread?: boolean;
  online?: boolean;
}> = [];

// Gruppenbereiche werden jetzt über Props übergeben

// Mock-Daten für Apps
const mockApps: Array<{
  id: string;
  name: string;
  icon?: string;
}> = [];

export function ChatSidebar({ 
  collapsed = false,
  isMobileOpen = false,
  onMobileClose,
  activeSection = 'overview',
  onSectionChange,
  onCreateSpace,
  onSearchSpaces,
  spaces = [],
  onSpaceClick,
  onSearchApps,
  onMessageRequests,
  onStartChat,
  userEmail,
}: ChatSidebarProps) {
  const { isDark } = useWebmailTheme();
  const chatSettings = useChatSettings({ email: userEmail, enabled: !!userEmail });
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const newChatButtonRef = useRef<HTMLButtonElement>(null);
  const [expandedSections, setExpandedSections] = useState({
    shortcuts: true,
    directMessages: true,
    spaces: true,
    apps: true,
  });
  const [showUnreadOnly, setShowUnreadOnly] = useState({
    directMessages: false,
    spaces: false,
  });

  // Close mobile drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onMobileClose) {
        onMobileClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen, onMobileClose]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleUnreadFilter = (section: 'directMessages' | 'spaces') => {
    setShowUnreadOnly(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleSectionClick = (sectionId: string) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
  };

  // Sidebar content component
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "h-full flex flex-col select-none transition-all duration-200",
      isDark ? "bg-[#202124]" : "bg-white",
      isMobile ? "w-[280px]" : collapsed ? "w-[72px]" : "w-[256px]"
    )}>
      {/* Mobile Header with close button */}
      {isMobile && (
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-700')}>Chat</span>
          <button
            onClick={onMobileClose}
            className={cn('p-2 rounded-full transition-colors', isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')}
            aria-label="Menü schließen"
          >
            <X className={cn('h-5 w-5', isDark ? 'text-white' : 'text-gray-500')} />
          </button>
        </div>
      )}

      {/* Neuer Chat Button - FAB Style */}
      <div className={cn("p-4", !isMobile && collapsed && "px-3")}>
        <button
          ref={!isMobile ? newChatButtonRef : undefined}
          onClick={() => setIsNewChatModalOpen(true)}
          className={cn(
            "flex items-center bg-white border shadow-sm hover:shadow-md rounded-full transition-all duration-200",
            isDark 
              ? "bg-[#3c4043] border-[#3c4043] hover:bg-[#4a4d50]" 
              : "border-gray-300 hover:bg-gray-50",
            !isMobile && collapsed 
              ? "w-12 h-12 justify-center p-0" 
              : "gap-3 px-5 py-3"
          )}
          title={!isMobile && collapsed ? "Neuer Chat" : undefined}
        >
          <Plus className={cn(
            !isMobile && collapsed ? "h-6 w-6" : "h-5 w-5",
            isDark ? "text-[#8ab4f8]" : "text-gray-600"
          )} />
          {(isMobile || !collapsed) && (
            <span className={cn(
              "text-[14px] font-medium",
              isDark ? "text-white" : "text-gray-700"
            )}>
              Neuer Chat
            </span>
          )}
        </button>

        {/* NewChat Modal */}
        <NewChatModal
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
          anchorRef={newChatButtonRef}
          onStartChat={onStartChat}
          onCreateSpace={onCreateSpace}
          onSearchSpaces={onSearchSpaces}
          onSearchApps={onSearchApps}
          onMessageRequests={onMessageRequests}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {/* Verknüpfungen Section */}
        <div className="mb-2">
          {(isMobile || !collapsed) && (
            <button
              onClick={() => toggleSection('shortcuts')}
              className={cn(
                "w-full flex items-center px-4 py-2 text-xs font-medium uppercase tracking-wide",
                isDark ? "text-gray-400 hover:bg-white/5" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {expandedSections.shortcuts ? (
                <ChevronDown className="h-4 w-4 mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              Verknüpfungen
            </button>
          )}
          
          {(expandedSections.shortcuts || collapsed) && (
            <div className="space-y-0.5">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const showCollapsed = !isMobile && collapsed;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionClick(item.id)}
                    title={showCollapsed ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center transition-colors text-[14px]',
                      showCollapsed 
                        ? 'justify-center py-3 mx-auto rounded-full'
                        : 'pl-6 pr-4 py-2 rounded-r-full',
                      isActive 
                        ? isDark 
                          ? 'bg-[#394457] text-[#8ab4f8]' 
                          : 'bg-teal-50 text-teal-700 font-medium'
                        : isDark
                          ? 'hover:bg-white/5 text-white'
                          : 'hover:bg-gray-50 text-gray-700'
                    )}
                    style={{ 
                      marginRight: showCollapsed ? '0' : '8px', 
                      width: showCollapsed ? '48px' : 'calc(100% - 8px)', 
                      marginLeft: showCollapsed ? '12px' : '0' 
                    }}
                  >
                    <Icon className={cn(
                      'h-5 w-5 shrink-0',
                      !showCollapsed && 'mr-4',
                      isActive 
                        ? isDark ? 'text-[#8ab4f8]' : 'text-teal-600'
                        : isDark ? 'text-gray-400' : 'text-gray-500'
                    )} />
                    {!showCollapsed && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Direktnachrichten Section */}
        <div className="mb-2">
          {(isMobile || !collapsed) && (
            <div className={cn(
              "flex items-center px-4 py-2",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              <button
                onClick={() => toggleSection('directMessages')}
                className="flex items-center flex-1 text-xs font-medium uppercase tracking-wide hover:text-gray-700"
              >
                {expandedSections.directMessages ? (
                  <ChevronDown className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2" />
                )}
                Direktnachrichten
              </button>
              <button
                onClick={() => toggleUnreadFilter('directMessages')}
                className={cn(
                  "p-1 rounded-full transition-colors",
                  showUnreadOnly.directMessages
                    ? isDark ? "bg-[#394457] text-[#8ab4f8]" : "bg-teal-100 text-teal-600"
                    : isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
                title="Nur ungelesene anzeigen"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {expandedSections.directMessages && (isMobile || !collapsed) && (
            <div className="space-y-0.5">
              {mockDirectMessages.length === 0 ? (
                <div className={cn(
                  "px-6 py-3 text-sm",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Keine Direktnachrichten
                </div>
              ) : (
                mockDirectMessages.map((dm) => (
                  <button
                    key={dm.id}
                    onClick={() => handleSectionClick(`dm-${dm.id}`)}
                    className={cn(
                      'w-full flex items-center pl-6 pr-4 py-2 rounded-r-full transition-colors text-[14px]',
                      isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-700'
                    )}
                    style={{ marginRight: '8px' }}
                  >
                    <div className="relative mr-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                        isDark ? "bg-[#3c4043] text-white" : "bg-gray-200 text-gray-600"
                      )}>
                        {dm.name.charAt(0).toUpperCase()}
                      </div>
                      {dm.online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <span className={cn(
                      "flex-1 text-left truncate",
                      dm.unread && "font-medium"
                    )}>
                      {dm.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Gruppenbereiche Section */}
        <div className="mb-2">
          {(isMobile || !collapsed) && (
            <div className={cn(
              "flex items-center px-4 py-2",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              <button
                onClick={() => toggleSection('spaces')}
                className="flex items-center flex-1 text-xs font-medium uppercase tracking-wide hover:text-gray-700"
              >
                {expandedSections.spaces ? (
                  <ChevronDown className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2" />
                )}
                Gruppenbereiche
              </button>
              <button
                onClick={() => toggleUnreadFilter('spaces')}
                className={cn(
                  "p-1 rounded-full transition-colors",
                  showUnreadOnly.spaces
                    ? isDark ? "bg-[#394457] text-[#8ab4f8]" : "bg-teal-100 text-teal-600"
                    : isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
                title="Nur ungelesene anzeigen"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {expandedSections.spaces && (isMobile || !collapsed) && (
            <div className="space-y-0.5">
              {spaces.length === 0 ? (
                <div className={cn(
                  "px-6 py-3 text-sm",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  <div className="mb-1">Gruppenbereich zum Chatten und</div>
                  <div className="mb-1">Zusammenarbeiten erstellen</div>
                  <button
                    onClick={onCreateSpace}
                    className={cn(
                      "text-sm font-medium",
                      isDark ? "text-[#8ab4f8] hover:underline" : "text-teal-600 hover:underline"
                    )}
                  >
                    Gruppenbereich suchen, um
                  </button>
                  <div>teilzunehmen</div>
                </div>
              ) : (
                <>
                  {spaces.map((space) => {
                    const isActive = activeSection === `space-${space.id}`;
                    const isCompact = chatSettings.settings.compactMode;
                    return (
                      <button
                        key={space.id}
                        onClick={() => {
                          if (onSpaceClick) {
                            onSpaceClick(space.id);
                          }
                          handleSectionClick(`space-${space.id}`);
                        }}
                        className={cn(
                          'w-full flex items-center pl-6 pr-4 rounded-r-full transition-colors',
                          isCompact ? 'py-1 text-[13px]' : 'py-2 text-[14px]',
                          isActive
                            ? isDark ? 'bg-[#394457] text-[#8ab4f8]' : 'bg-teal-50 text-teal-700 font-medium'
                            : isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-700'
                        )}
                        style={{ marginRight: '8px' }}
                      >
                        <div className={cn(
                          "rounded-lg mr-3 flex items-center justify-center",
                          isCompact ? "h-6 w-6 text-base" : "h-8 w-8 text-lg",
                          isDark ? "bg-[#3c4043]" : "bg-gray-100"
                        )}>
                          {space.emoji}
                        </div>
                        <span className="flex-1 text-left truncate">
                          {space.name}
                        </span>
                      </button>
                    );
                  })}
                  {/* In Gruppenbereichen suchen Link */}
                  <button
                    onClick={onSearchSpaces}
                    className={cn(
                      'w-full flex items-center pl-6 pr-4 py-2 rounded-r-full transition-colors text-[14px]',
                      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    )}
                    style={{ marginRight: '8px' }}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-lg mr-3 flex items-center justify-center",
                      isDark ? "bg-transparent" : "bg-transparent"
                    )}>
                      <Users className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
                    </div>
                    <span className={cn(
                      "flex-1 text-left truncate",
                      isDark ? "text-[#8ab4f8]" : "text-teal-600"
                    )}>
                      In Gruppenbereichen suchen
                    </span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Apps Section */}
        <div className="mb-2">
          {(isMobile || !collapsed) && (
            <button
              onClick={() => toggleSection('apps')}
              className={cn(
                "w-full flex items-center px-4 py-2 text-xs font-medium uppercase tracking-wide",
                isDark ? "text-gray-400 hover:bg-white/5" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {expandedSections.apps ? (
                <ChevronDown className="h-4 w-4 mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              Apps
            </button>
          )}
          
          {expandedSections.apps && (isMobile || !collapsed) && (
            <div className="space-y-0.5">
              {mockApps.length === 0 ? (
                <div className={cn(
                  "px-6 py-3 text-sm",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  Keine Apps
                </div>
              ) : (
                mockApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleSectionClick(`app-${app.id}`)}
                    className={cn(
                      'w-full flex items-center pl-6 pr-4 py-2 rounded-r-full transition-colors text-[14px]',
                      isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-700'
                    )}
                    style={{ marginRight: '8px' }}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-lg mr-3 flex items-center justify-center",
                      isDark ? "bg-[#3c4043]" : "bg-gray-200"
                    )}>
                      <Bot className="h-4 w-4 text-gray-500" />
                    </div>
                    <span className="flex-1 text-left truncate">{app.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block h-full">
        <SidebarContent isMobile={false} />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 max-w-[85vw] animate-in slide-in-from-left duration-300">
            <SidebarContent isMobile={true} />
          </div>
        </div>
      )}
    </>
  );
}
