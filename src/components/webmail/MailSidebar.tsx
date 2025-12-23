'use client';

import { useState, useEffect } from 'react';
import { 
  Inbox, 
  Star, 
  Clock, 
  Send, 
  FileText, 
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Tag,
  X,
  Loader2,
  MoreHorizontal,
  Archive,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Mailbox {
  path: string;
  name: string;
  specialUse?: string;
  unseen: number;
  exists?: number;
  delimiter?: string;
  flags?: string[];
}

interface MailSidebarProps {
  mailboxes: Mailbox[];
  currentMailbox: string;
  onSelectMailbox: (path: string) => void;
  onCompose: () => void;
  userEmail: string;
  userPassword: string;
  onMailboxesChange: () => void;
  collapsed?: boolean;
  // Mobile drawer props
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

// Farbpalette für Labels (Teal-basiert für Branding + ergänzende Farben)
const LABEL_COLORS = [
  { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
];

// Generiert eine konsistente Farbe basierend auf dem Label-Namen
const getLabelColor = (labelName: string) => {
  let hash = 0;
  for (let i = 0; i < labelName.length; i++) {
    const char = labelName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % LABEL_COLORS.length;
  return LABEL_COLORS[index];
};

// Folder icon mapping
const getMailIcon = (specialUse?: string, path?: string) => {
  const lowerPath = path?.toLowerCase() || '';
  
  // Check specialUse first
  if (specialUse === '\\Inbox') return Inbox;
  if (specialUse === '\\Sent') return Send;
  if (specialUse === '\\Drafts') return FileText;
  if (specialUse === '\\Trash') return Trash2;
  if (specialUse === '\\Junk') return AlertTriangle;
  if (specialUse === '\\Flagged') return Star;
  if (specialUse === '\\Archive') return Archive;
  
  // Check path with German aliases
  if (lowerPath === 'inbox' || lowerPath.includes('posteingang')) return Inbox;
  if (lowerPath.includes('sent') || lowerPath.includes('gesendet')) return Send;
  if (lowerPath.includes('draft') || lowerPath.includes('entwu')) return FileText;
  if (lowerPath.includes('trash') || lowerPath.includes('papierkorb') || lowerPath.includes('geloescht') || lowerPath.includes('gelöscht')) return Trash2;
  if (lowerPath.includes('spam') || lowerPath.includes('junk')) return AlertTriangle;
  if (lowerPath.includes('starred') || lowerPath.includes('flagged') || lowerPath.includes('markiert')) return Star;
  if (lowerPath.includes('snoozed') || lowerPath.includes('zurueck') || lowerPath.includes('zurück')) return Clock;
  if (lowerPath.includes('archive') || lowerPath.includes('archiv')) return Archive;
  
  return Tag;
};

// Folder name mapping (German)
const getMailName = (mailbox: Mailbox) => {
  const lowerPath = mailbox.path.toLowerCase();
  
  // Check specialUse first
  if (mailbox.specialUse === '\\Inbox') return 'Posteingang';
  if (mailbox.specialUse === '\\Sent') return 'Gesendet';
  if (mailbox.specialUse === '\\Drafts') return 'Entwürfe';
  if (mailbox.specialUse === '\\Trash') return 'Papierkorb';
  if (mailbox.specialUse === '\\Junk') return 'Spam';
  if (mailbox.specialUse === '\\Flagged') return 'Markiert';
  if (mailbox.specialUse === '\\Archive') return 'Archiv';
  
  // Check path
  if (lowerPath === 'inbox' || lowerPath.includes('posteingang')) return 'Posteingang';
  if (lowerPath.includes('sent') || lowerPath.includes('gesendet')) return 'Gesendet';
  if (lowerPath.includes('draft') || lowerPath.includes('entwu')) return 'Entwürfe';
  if (lowerPath.includes('trash') || lowerPath.includes('papierkorb') || lowerPath.includes('geloescht') || lowerPath.includes('gelöscht')) return 'Papierkorb';
  if (lowerPath.includes('spam') || lowerPath.includes('junk')) return 'Spam';
  if (lowerPath.includes('starred') || lowerPath.includes('flagged') || lowerPath.includes('markiert')) return 'Markiert';
  if (lowerPath.includes('archive') || lowerPath.includes('archiv')) return 'Archiv';
  
  return mailbox.name;
};

export function MailSidebar({ 
  mailboxes, 
  currentMailbox, 
  onSelectMailbox, 
  onCompose,
  userEmail,
  userPassword,
  onMailboxesChange,
  collapsed = false,
  isMobileOpen = false,
  onMobileClose,
}: MailSidebarProps) {
  const [showMore, setShowMore] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Handle mailbox selection on mobile (close drawer after selection)
  const handleMobileSelectMailbox = (path: string) => {
    onSelectMailbox(path);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  // Helper to check if mailbox matches a folder type
  const matchesFolder = (mailbox: Mailbox, folderType: string): boolean => {
    const lowerPath = mailbox.path.toLowerCase();
    const lowerType = folderType.toLowerCase();
    
    // Check specialUse first (most reliable)
    if (mailbox.specialUse) {
      const specialMap: Record<string, string[]> = {
        'inbox': ['\\Inbox'],
        'sent': ['\\Sent'],
        'drafts': ['\\Drafts'],
        'trash': ['\\Trash'],
        'junk': ['\\Junk'],
        'spam': ['\\Junk'],
        'archive': ['\\Archive'],
        'starred': ['\\Flagged'],
      };
      if (specialMap[lowerType]?.includes(mailbox.specialUse)) return true;
    }
    
    // Check path - include German names
    const pathAliases: Record<string, string[]> = {
      'sent': ['sent', 'gesendet', 'gesendete'],
      'drafts': ['draft', 'entwurf', 'entwuerfe', 'entwürfe'],
      'trash': ['trash', 'papierkorb', 'deleted', 'geloescht', 'gelöscht'],
      'junk': ['junk', 'spam'],
      'spam': ['spam', 'junk'],
      'archive': ['archive', 'archiv'],
      'inbox': ['inbox', 'posteingang'],
      'starred': ['starred', 'flagged', 'markiert'],
      'snoozed': ['snoozed', 'zurueck', 'zurück'],
    };
    
    const aliases = pathAliases[lowerType] || [lowerType];
    return aliases.some(alias => lowerPath.includes(alias));
  };

  // Split mailboxes into primary (always shown) and labels (custom folders)
  const systemFolderTypes = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk', 'Spam', 'Archive'];
  const primaryFolderTypes = ['INBOX', 'Starred', 'Snoozed', 'Sent', 'Drafts'];
  // Interne Dovecot/Mailcow-Ordner die versteckt werden sollen
  const hiddenFolders = ['dovecot', '.dovecot', 'virtual', '.virtual', 'dovecot.sieve', 'sieve'];
  
  // Filtere versteckte Ordner aus allen Mailboxen
  const visibleMailboxes = mailboxes.filter(m => 
    !hiddenFolders.some(hidden => m.path.toLowerCase() === hidden.toLowerCase() || m.path.toLowerCase().startsWith(hidden.toLowerCase() + '/'))
  );
  
  const primaryMailboxes = visibleMailboxes.filter(m => 
    primaryFolderTypes.some(f => matchesFolder(m, f))
  );
  
  const secondaryMailboxes = visibleMailboxes.filter(m => 
    !primaryFolderTypes.some(f => matchesFolder(m, f)) &&
    systemFolderTypes.some(f => matchesFolder(m, f))
  );

  // Labels are custom folders (not system folders)
  const labelMailboxes = visibleMailboxes.filter(m => 
    !systemFolderTypes.some(f => matchesFolder(m, f)) &&
    !primaryFolderTypes.some(f => matchesFolder(m, f))
  );

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/webmail/mailbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password: userPassword,
          name: newLabelName.trim(),
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }

      setNewLabelName('');
      setIsCreatingLabel(false);
      onMailboxesChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLabel = async (path: string) => {
    if (!confirm(`Label "${path}" wirklich löschen?`)) return;
    
    try {
      const response = await fetch('/api/webmail/mailbox', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password: userPassword,
          path,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }

      onMailboxesChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  // Sidebar content component (reused for both desktop and mobile)
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "h-full bg-[#f6f8fc] flex flex-col select-none transition-all duration-200",
      isMobile ? "w-[280px]" : collapsed ? "w-[72px]" : "w-[256px]"
    )}>
      {/* Mobile Header with close button */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700 truncate">{userEmail}</span>
          <button
            onClick={onMobileClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Menue schliessen"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Compose Button - Taskilo Style */}
      <div className={cn("p-4 pb-2", !isMobile && collapsed && "px-3")}>
        <button
          onClick={() => {
            onCompose();
            if (isMobile && onMobileClose) onMobileClose();
          }}
          className={cn(
            "flex items-center bg-teal-600 hover:bg-teal-700 hover:shadow-md rounded-2xl shadow-sm transition-all duration-200 group",
            !isMobile && collapsed 
              ? "w-12 h-12 justify-center p-0" 
              : "gap-3 px-6 py-3.5"
          )}
          title={!isMobile && collapsed ? "Schreiben" : undefined}
        >
          <Pencil className={cn("text-white", !isMobile && collapsed ? "h-5 w-5" : "h-6 w-6")} />
          {(isMobile || !collapsed) && <span className="text-[15px] font-medium text-white">Schreiben</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* Primary Folders */}
        <div className="space-y-0.5">
          {primaryMailboxes.map((mailbox) => {
            const Icon = getMailIcon(mailbox.specialUse, mailbox.path);
            const isActive = mailbox.path === currentMailbox;
            const displayName = getMailName(mailbox);
            const showCollapsed = !isMobile && collapsed;
            
            return (
              <button
                key={mailbox.path}
                onClick={() => isMobile ? handleMobileSelectMailbox(mailbox.path) : onSelectMailbox(mailbox.path)}
                title={showCollapsed ? displayName : undefined}
                className={cn(
                  'w-full flex items-center transition-colors text-[14px]',
                  showCollapsed 
                    ? 'justify-center py-3 mx-auto rounded-full hover:bg-teal-50'
                    : 'pl-6 pr-4 py-1.5 rounded-r-full',
                  isActive 
                    ? showCollapsed 
                      ? 'bg-teal-100 text-teal-900' 
                      : 'bg-teal-100 text-teal-900 font-medium'
                    : 'hover:bg-teal-50 text-gray-700'
                )}
                style={{ marginRight: showCollapsed ? '0' : '8px', width: showCollapsed ? '48px' : '100%', marginLeft: showCollapsed ? '12px' : '0' }}
              >
                <Icon className={cn(
                  'h-5 w-5 shrink-0',
                  !showCollapsed && 'mr-4',
                  isActive ? 'text-teal-700' : 'text-gray-500'
                )} />
                {!showCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{displayName}</span>
                    {mailbox.unseen > 0 && (
                      <span className={cn(
                        'text-xs font-medium ml-2',
                        isActive ? 'text-teal-800' : 'text-gray-600'
                      )}>
                        {mailbox.unseen}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* More/Less Toggle - hide when collapsed */}
        {secondaryMailboxes.length > 0 && (isMobile || !collapsed) && (
          <>
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center pl-6 pr-4 py-1.5 mt-1 rounded-r-full hover:bg-teal-50 text-gray-700 text-[14px] transition-colors"
              style={{ marginRight: '8px' }}
            >
              {showMore ? (
                <ChevronUp className="h-5 w-5 mr-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 mr-4 text-gray-500" />
              )}
              <span className="flex-1 text-left">{showMore ? 'Weniger' : 'Mehr'}</span>
            </button>

            {/* Secondary Folders (expandable) */}
            {showMore && (
              <div className="space-y-0.5 mt-1">
                {secondaryMailboxes.map((mailbox) => {
                  const Icon = getMailIcon(mailbox.specialUse, mailbox.path);
                  const isActive = mailbox.path === currentMailbox;
                  const displayName = getMailName(mailbox);
                  
                  return (
                    <button
                      key={mailbox.path}
                      onClick={() => isMobile ? handleMobileSelectMailbox(mailbox.path) : onSelectMailbox(mailbox.path)}
                      className={cn(
                        'w-full flex items-center pl-6 pr-4 py-1.5 rounded-r-full transition-colors text-[14px]',
                        isActive 
                          ? 'bg-teal-100 text-teal-900 font-medium' 
                          : 'hover:bg-teal-50 text-gray-700'
                      )}
                      style={{ marginRight: '8px' }}
                    >
                      <Icon className={cn(
                        'h-5 w-5 mr-4 shrink-0',
                        isActive ? 'text-teal-700' : 'text-gray-500'
                      )} />
                      <span className="flex-1 text-left truncate">{displayName}</span>
                      {mailbox.unseen > 0 && (
                        <span className={cn(
                          'text-xs font-medium ml-2',
                          isActive ? 'text-teal-800' : 'text-gray-600'
                        )}>
                          {mailbox.unseen}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Labels Section Header - hide when collapsed */}
        {(isMobile || !collapsed) && (
          <div className="flex items-center justify-between px-6 py-3 mt-4">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Labels</span>
            <button 
              onClick={() => setIsCreatingLabel(true)}
              className="p-1 hover:bg-teal-50 rounded-full transition-colors"
              title="Neues Label erstellen"
            >
              <Plus className="h-4 w-4 text-gray-500 hover:text-teal-600" />
            </button>
          </div>
        )}

        {/* Create Label Input - hide when collapsed */}
        {isCreatingLabel && (isMobile || !collapsed) && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label-Name..."
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateLabel();
                  if (e.key === 'Escape') {
                    setIsCreatingLabel(false);
                    setNewLabelName('');
                  }
                }}
                autoFocus
                disabled={isLoading}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreatingLabel(false);
                  setNewLabelName('');
                  setError(null);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-1 px-1">{error}</p>
            )}
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={handleCreateLabel}
                disabled={isLoading || !newLabelName.trim()}
                className="h-7 text-xs bg-teal-600 hover:bg-teal-700"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Erstellen'}
              </Button>
            </div>
          </div>
        )}

        {/* Custom Labels - hide when collapsed */}
        {(isMobile || !collapsed) && labelMailboxes.length > 0 ? (
          <div className="space-y-0.5">
            {labelMailboxes.map((mailbox) => {
              const isActive = mailbox.path === currentMailbox;
              const labelColor = getLabelColor(mailbox.path);
              
              return (
                <div
                  key={mailbox.path}
                  className={cn(
                    'group w-full flex items-center pl-6 pr-2 py-1.5 rounded-r-full transition-colors text-[14px]',
                    isActive 
                      ? `${labelColor.bg} font-medium` 
                      : 'hover:bg-gray-50 text-gray-700'
                  )}
                  style={{ marginRight: '8px' }}
                >
                  <button
                    onClick={() => isMobile ? handleMobileSelectMailbox(mailbox.path) : onSelectMailbox(mailbox.path)}
                    className="flex-1 flex items-center min-w-0"
                  >
                    <div className={cn(
                      'h-3 w-3 rounded-full mr-4 shrink-0',
                      labelColor.dot
                    )} />
                    <span className={cn(
                      'flex-1 text-left truncate',
                      isActive && labelColor.text
                    )}>{mailbox.name}</span>
                    {mailbox.unseen > 0 && (
                      <span className={cn(
                        'text-xs font-medium ml-2',
                        isActive ? labelColor.text : 'text-gray-600'
                      )}>
                        {mailbox.unseen}
                      </span>
                    )}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity">
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem
                        onClick={() => handleDeleteLabel(mailbox.path)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        ) : (
          !isCreatingLabel && (isMobile || !collapsed) && (
            <div className="px-6 py-2 text-xs text-gray-500">
              Keine benutzerdefinierten Labels
            </div>
          )
        )}
      </nav>

      {/* User Info Footer - hide when collapsed (desktop only, mobile has header) */}
      {!isMobile && !collapsed && (
        <div className="p-4 border-t border-teal-100">
          <div className="text-xs text-gray-600 truncate">
            {userEmail}
          </div>
        </div>
      )}
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
