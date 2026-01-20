'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronDown,
  Calendar,
  StickyNote,
  CheckSquare,
  Users,
  Circle,
  Clock,
  MinusCircle,
  Moon,
  Search,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { MailHeader } from '@/components/webmail/MailHeader';
import { ChatSidebar } from '@/components/webmail/chat/ChatSidebar';
import { ChatHome } from '@/components/webmail/chat/ChatHome';
import { CreateSpaceModal } from '@/components/webmail/chat/CreateSpaceModal';
import { SpaceView } from '@/components/webmail/chat/SpaceView';
import { AddMembersModal } from '@/components/webmail/chat/AddMembersModal';
import { ChatSettingsModal } from '@/components/webmail/chat/ChatSettingsModal';
import { useWebmailSession } from '@/app/webmail/layout';
import { getAppUrl } from '@/lib/webmail-urls';

interface Space {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  createdAt: Date;
}

export default function ChatPage() {
  const { isDark } = useWebmailTheme();
  const { session } = useWebmailSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [showCompanionApps] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Status State
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'dnd' | 'offline'>('online');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  
  // Spaces State
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);

  // Benutzername aus E-Mail extrahieren
  const userName = session?.email?.split('@')[0] || 'Benutzer';
  const userEmail = session?.email;

  // Spaces aus der API laden
  const loadSpaces = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/webmail/chat/spaces?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      if (data.success && data.spaces) {
        setSpaces(data.spaces.map((s: { id: string; name: string; emoji: string; memberCount: number; createdAt: string }) => ({
          id: s.id,
          name: s.name,
          emoji: s.emoji,
          memberCount: s.memberCount,
          createdAt: new Date(s.createdAt),
        })));
      }
    } catch (error) {
      // Fehler stillschweigend ignorieren
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  // Spaces beim Laden der Seite abrufen
  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

  // Companion Apps (rechte Seitenleiste)
  const companionApps = [
    { id: 'calendar', icon: Calendar, label: 'Kalender', href: '/webmail/calendar' },
    { id: 'keep', icon: StickyNote, label: 'Notizen', href: '/webmail/notes' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', href: '/webmail/tasks' },
    { id: 'contacts', icon: Users, label: 'Kontakte', href: '/webmail/contacts' },
  ];

  const handleStartChat = () => {
    setActiveSection('new-chat');
  };

  const handleSearchSpaces = () => {
    setActiveSection('search-spaces');
  };

  const handleDiscoverApps = () => {
    setActiveSection('discover-apps');
  };

  const handleCreateSpace = async (name: string, emoji: string) => {
    if (!userEmail) return;
    
    try {
      const response = await fetch('/api/webmail/chat/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, name, emoji }),
      });
      
      const data = await response.json();
      
      if (data.success && data.space) {
        const newSpace: Space = {
          id: data.space.id,
          name: data.space.name,
          emoji: data.space.emoji,
          memberCount: data.space.memberCount,
          createdAt: new Date(data.space.createdAt),
        };
        setSpaces(prev => [...prev, newSpace]);
        setActiveSpace(newSpace);
        setActiveSection(`space-${newSpace.id}`);
      }
    } catch (error) {
      // Fehler stillschweigend ignorieren
    }
  };

  const handleSpaceClick = (spaceId: string) => {
    const space = spaces.find(s => s.id === spaceId);
    if (space) {
      setActiveSpace(space);
      setActiveSection(`space-${spaceId}`);
    }
  };

  const handleBackFromSpace = () => {
    setActiveSpace(null);
    setActiveSection('overview');
  };

  // Status-Optionen
  const statusOptions = [
    { id: 'online' as const, label: 'Aktiv', color: 'bg-green-500', icon: Circle },
    { id: 'away' as const, label: 'Abwesend', color: 'bg-yellow-500', icon: Clock },
    { id: 'dnd' as const, label: 'Nicht stören', color: 'bg-red-500', icon: MinusCircle },
    { id: 'offline' as const, label: 'Offline', color: 'bg-gray-400', icon: Moon },
  ];

  const currentStatus = statusOptions.find(s => s.id === userStatus) || statusOptions[0];

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Status Indicator Component für Toolbar (dezent, neben Icons)
  const StatusIndicator = () => (
    <div className="relative" ref={statusDropdownRef}>
      <button
        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors",
          isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
        )}
        title={currentStatus.label}
      >
        <div className={cn("h-2 w-2 rounded-full", currentStatus.color)} />
        <span className={cn(
          "text-sm",
          isDark ? "text-gray-300" : "text-gray-600"
        )}>
          {currentStatus.label}
        </span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-transform",
          showStatusDropdown && "rotate-180",
          isDark ? "text-gray-400" : "text-gray-500"
        )} />
      </button>
      
      {/* Dropdown */}
      {showStatusDropdown && (
        <div className={cn(
          "absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border z-50",
          isDark ? "bg-[#2d2e31] border-white/10" : "bg-white border-gray-200"
        )}>
          <div className="py-1">
            {statusOptions.map((status) => {
              const Icon = status.icon;
              return (
                <button
                  key={status.id}
                  onClick={() => {
                    setUserStatus(status.id);
                    setShowStatusDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                    userStatus === status.id
                      ? isDark ? "bg-white/10" : "bg-gray-100"
                      : isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                    isDark ? "text-gray-200" : "text-gray-700"
                  )}
                >
                  <div className={cn("h-2.5 w-2.5 rounded-full", status.color)} />
                  <span>{status.label}</span>
                  {userStatus === status.id && (
                    <span className="ml-auto text-[#14ad9f]">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn(
      "h-screen flex flex-col overflow-hidden",
      isDark ? "bg-[#202124]" : "bg-[#f6f8fc]"
    )}>
      {/* Einheitlicher MailHeader */}
      <MailHeader
        userEmail={session?.email || ''}
        onLogout={() => window.location.href = getAppUrl('/webmail')}
        onMenuToggle={() => {
          setSidebarCollapsed(!sidebarCollapsed);
          setMobileMenuOpen(true);
        }}
        appName="Chat"
        appHomeUrl="/webmail/chat"
        searchPlaceholder="In Chats suchen"
        onSearch={(query) => {
          setSearchQuery(query);
          if (query.trim()) {
            const filtered = spaces.filter(space => 
              space.name.toLowerCase().includes(query.toLowerCase()) ||
              space.emoji.includes(query)
            );
            setFilteredSpaces(filtered);
            setActiveSection('search-results');
          } else {
            setFilteredSpaces([]);
            setActiveSection('overview');
          }
        }}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        rightContent={<StatusIndicator />}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <ChatSidebar
          collapsed={sidebarCollapsed}
          isMobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          activeSection={activeSection}
          onSectionChange={(section) => {
            if (section.startsWith('space-')) {
              handleSpaceClick(section.replace('space-', ''));
            } else {
              setActiveSection(section);
            }
          }}
          onCreateSpace={() => setIsCreateSpaceModalOpen(true)}
          onSearchSpaces={handleSearchSpaces}
          spaces={spaces}
          onSpaceClick={handleSpaceClick}
          userEmail={userEmail}
        />

        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {activeSpace ? (
            <SpaceView
              space={activeSpace}
              userEmail={userEmail}
              onBack={handleBackFromSpace}
              onAddMembers={() => setIsAddMembersModalOpen(true)}
              onShareFile={() => {}}
              onAssignTask={() => {}}
            />
          ) : activeSection === 'overview' || activeSection === 'mentions' || activeSection === 'starred' ? (
            <ChatHome
              userName={userName}
              onStartChat={handleStartChat}
              onSearchSpaces={handleSearchSpaces}
              onDiscoverApps={handleDiscoverApps}
            />
          ) : activeSection === 'search-results' ? (
            <div className={cn(
              "flex-1 overflow-y-auto p-6",
              isDark ? "bg-[#202124]" : "bg-[#f6f8fc]"
            )}>
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <Search className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
                  <h2 className={cn(
                    "text-lg font-medium",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    Suchergebnisse für "{searchQuery}"
                  </h2>
                </div>
                
                {filteredSpaces.length > 0 ? (
                  <div className="space-y-2">
                    {filteredSpaces.map((space) => (
                      <button
                        key={space.id}
                        onClick={() => handleSpaceClick(space.id)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left",
                          isDark 
                            ? "bg-[#2d2e31] hover:bg-[#3c4043]" 
                            : "bg-white hover:bg-gray-50 border border-gray-200"
                        )}
                      >
                        <div className="text-2xl">{space.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-medium truncate",
                            isDark ? "text-white" : "text-gray-900"
                          )}>
                            {space.name}
                          </h3>
                          <p className={cn(
                            "text-sm",
                            isDark ? "text-gray-400" : "text-gray-500"
                          )}>
                            {space.memberCount} Mitglieder
                          </p>
                        </div>
                        <MessageSquare className={cn(
                          "h-5 w-5",
                          isDark ? "text-gray-500" : "text-gray-400"
                        )} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={cn(
                    "text-center py-12",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Chats gefunden für "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeSection === 'new-chat' ? (
            <div className={cn(
              "flex-1 flex items-center justify-center",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              <div className="text-center">
                <h2 className={cn(
                  "text-xl font-medium mb-2",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  Neuer Chat
                </h2>
                <p>Chat-Funktion wird implementiert...</p>
              </div>
            </div>
          ) : (
            <div className={cn(
              "flex-1 flex items-center justify-center",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              <div className="text-center">
                <h2 className={cn(
                  "text-xl font-medium mb-2",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  {activeSection}
                </h2>
                <p>Diese Sektion wird implementiert...</p>
              </div>
            </div>
          )}
        </main>

        {/* Right Companion Sidebar */}
        {showCompanionApps && (
          <aside className={cn(
            "hidden xl:flex flex-col w-14 border-l shrink-0",
            isDark ? "bg-[#202124] border-white/10" : "bg-white border-gray-200"
          )}>
            <div className="flex flex-col items-center py-3 gap-1">
              {companionApps.map((app) => {
                const Icon = app.icon;
                return (
                  <a
                    key={app.id}
                    href={app.href}
                    className={cn(
                      "p-3 rounded-full transition-colors",
                      isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                    )}
                    title={app.label}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )} />
                  </a>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={isCreateSpaceModalOpen}
        onClose={() => setIsCreateSpaceModalOpen(false)}
        onCreateSpace={handleCreateSpace}
      />

      {/* Add Members Modal */}
      <AddMembersModal
        isOpen={isAddMembersModalOpen}
        onClose={() => setIsAddMembersModalOpen(false)}
        spaceName={activeSpace?.name}
        userEmail={session?.email}
        userPassword={session?.password}
        onAddMembers={async (members) => {
          if (!activeSpace || !userEmail) return;
          
          try {
            const response = await fetch(`/api/webmail/chat/spaces/${activeSpace.id}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userEmail,
                members: members.map(m => ({
                  email: m.email,
                  name: m.name,
                  role: 'member',
                })),
              }),
            });
            
            const data = await response.json();
            
            if (data.success) {
              // Space aktualisieren mit neuer Mitgliederzahl
              setSpaces(prev => prev.map(s => 
                s.id === activeSpace.id 
                  ? { ...s, memberCount: data.memberCount } 
                  : s
              ));
              
              if (activeSpace) {
                setActiveSpace({ ...activeSpace, memberCount: data.memberCount });
              }
            }
          } catch (error) {
            // Fehler stillschweigend ignorieren
          }
        }}
      />

      {/* Settings Modal */}
      <ChatSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        userEmail={session?.email}
      />
    </div>
  );
}
