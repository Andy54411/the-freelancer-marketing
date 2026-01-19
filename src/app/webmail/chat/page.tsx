'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Menu, 
  Search, 
  HelpCircle, 
  Settings, 
  ChevronDown,
  Calendar,
  StickyNote,
  CheckSquare,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { ChatSidebar } from '@/components/webmail/chat/ChatSidebar';
import { ChatHome } from '@/components/webmail/chat/ChatHome';
import { CreateSpaceModal } from '@/components/webmail/chat/CreateSpaceModal';
import { SpaceView } from '@/components/webmail/chat/SpaceView';
import { AddMembersModal } from '@/components/webmail/chat/AddMembersModal';
import { useWebmailSession } from '@/app/webmail/layout';

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

  return (
    <div className={cn(
      "h-screen flex flex-col overflow-hidden",
      isDark ? "bg-[#202124]" : "bg-[#f6f8fc]"
    )}>
      {/* Header */}
      <header className={cn(
        "flex items-center gap-2 px-4 py-2 border-b shrink-0",
        isDark ? "bg-[#202124] border-white/10" : "bg-white border-gray-200"
      )}>
        {/* Hamburger Menu (Mobile) */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            "p-2 rounded-full md:hidden",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )}
          aria-label="Menü öffnen"
        >
          <Menu className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
        </button>

        {/* Sidebar Toggle (Desktop) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "p-2 rounded-full hidden md:flex",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )}
          aria-label="Sidebar umschalten"
        >
          <Menu className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
        </button>

        {/* Logo / App Name */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 px-2 py-1",
            isDark ? "text-white" : "text-gray-900"
          )}>
            <svg 
              className="h-8 w-8" 
              viewBox="0 0 48 48" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M40 16H8V8H40V16Z" 
                fill="#00897B" 
              />
              <path 
                d="M40 40H8V16H40V40Z" 
                fill="#00BFA5" 
              />
              <path 
                d="M32 24H16V20H32V24Z" 
                fill="white" 
              />
              <path 
                d="M32 32H16V28H32V32Z" 
                fill="white" 
              />
            </svg>
            <span className="text-xl font-medium">Chat</span>
          </div>
        </div>

        {/* Suchleiste */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            isDark 
              ? "bg-[#3c4043] hover:bg-[#4a4d50]" 
              : "bg-gray-100 hover:bg-gray-200",
            "transition-colors cursor-pointer"
          )}>
            <Search className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
            <span className={cn(
              "text-sm flex-1",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              In Chat suchen
            </span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className={cn(
          "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer",
          isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
        )}>
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className={cn(
            "text-sm",
            isDark ? "text-white" : "text-gray-700"
          )}>
            Aktiv
          </span>
          <ChevronDown className={cn("h-4 w-4", isDark ? "text-gray-400" : "text-gray-500")} />
        </div>

        {/* Rechte Icons */}
        <div className="flex items-center gap-1">
          <button
            className={cn(
              "p-2 rounded-full",
              isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
            )}
            title="Hilfe"
          >
            <HelpCircle className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
          <button
            className={cn(
              "p-2 rounded-full",
              isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
            )}
            title="Einstellungen"
          >
            <Settings className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
        </div>
      </header>

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
    </div>
  );
}
