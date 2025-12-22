'use client';

import { useState } from 'react';
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
}

// Folder icon mapping
const getMailIcon = (specialUse?: string, path?: string) => {
  const lowerPath = path?.toLowerCase() || '';
  if (specialUse === '\\Inbox' || lowerPath === 'inbox') return Inbox;
  if (specialUse === '\\Flagged' || lowerPath.includes('starred') || lowerPath.includes('flagged')) return Star;
  if (lowerPath.includes('snoozed') || lowerPath.includes('zurueck')) return Clock;
  if (specialUse === '\\Sent' || lowerPath.includes('sent') || lowerPath.includes('gesendet')) return Send;
  if (specialUse === '\\Drafts' || lowerPath.includes('draft') || lowerPath.includes('entwu')) return FileText;
  if (specialUse === '\\Junk' || lowerPath.includes('spam') || lowerPath.includes('junk')) return AlertTriangle;
  if (specialUse === '\\Trash' || lowerPath.includes('trash') || lowerPath.includes('papierkorb')) return Trash2;
  return Tag;
};

// Folder name mapping (German)
const getMailName = (mailbox: Mailbox) => {
  const lowerPath = mailbox.path.toLowerCase();
  if (lowerPath === 'inbox') return 'Posteingang';
  if (lowerPath.includes('sent')) return 'Gesendet';
  if (lowerPath.includes('draft')) return 'Entwuerfe';
  if (lowerPath.includes('trash')) return 'Papierkorb';
  if (lowerPath.includes('spam') || lowerPath.includes('junk')) return 'Spam';
  if (lowerPath.includes('starred') || lowerPath.includes('flagged')) return 'Markiert';
  if (lowerPath.includes('archive')) return 'Archiv';
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
}: MailSidebarProps) {
  const [showMore, setShowMore] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Split mailboxes into primary (always shown) and labels (custom folders)
  const systemFolders = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk', 'Spam', 'Archive'];
  const primaryFolders = ['INBOX', 'Starred', 'Snoozed', 'Sent', 'Drafts'];
  
  const primaryMailboxes = mailboxes.filter(m => 
    primaryFolders.some(f => m.path.toLowerCase().includes(f.toLowerCase()) || m.path === 'INBOX')
  );
  
  const secondaryMailboxes = mailboxes.filter(m => 
    !primaryFolders.some(f => m.path.toLowerCase().includes(f.toLowerCase()) || m.path === 'INBOX') &&
    systemFolders.some(f => m.path.toLowerCase().includes(f.toLowerCase()))
  );

  // Labels are custom folders (not system folders)
  const labelMailboxes = mailboxes.filter(m => 
    !systemFolders.some(f => m.path.toLowerCase().includes(f.toLowerCase())) &&
    !primaryFolders.some(f => m.path.toLowerCase().includes(f.toLowerCase()))
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
    if (!confirm(`Label "${path}" wirklich loeschen?`)) return;
    
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
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen');
    }
  };

  return (
    <div className={cn(
      "h-full bg-[#f6f8fc] flex flex-col select-none transition-all duration-200",
      collapsed ? "w-[72px]" : "w-[256px]"
    )}>
      {/* Compose Button - Taskilo Style */}
      <div className={cn("p-4 pb-2", collapsed && "px-3")}>
        <button
          onClick={onCompose}
          className={cn(
            "flex items-center bg-teal-600 hover:bg-teal-700 hover:shadow-md rounded-2xl shadow-sm transition-all duration-200 group",
            collapsed 
              ? "w-12 h-12 justify-center p-0" 
              : "gap-3 px-6 py-3.5"
          )}
          title={collapsed ? "Schreiben" : undefined}
        >
          <Pencil className={cn("text-white", collapsed ? "h-5 w-5" : "h-6 w-6")} />
          {!collapsed && <span className="text-[15px] font-medium text-white">Schreiben</span>}
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
            
            return (
              <button
                key={mailbox.path}
                onClick={() => onSelectMailbox(mailbox.path)}
                title={collapsed ? displayName : undefined}
                className={cn(
                  'w-full flex items-center transition-colors text-[14px]',
                  collapsed 
                    ? 'justify-center py-3 mx-auto rounded-full hover:bg-teal-50'
                    : 'pl-6 pr-4 py-1.5 rounded-r-full',
                  isActive 
                    ? collapsed 
                      ? 'bg-teal-100 text-teal-900' 
                      : 'bg-teal-100 text-teal-900 font-medium'
                    : 'hover:bg-teal-50 text-gray-700'
                )}
                style={{ marginRight: collapsed ? '0' : '8px', width: collapsed ? '48px' : '100%', marginLeft: collapsed ? '12px' : '0' }}
              >
                <Icon className={cn(
                  'h-5 w-5 shrink-0',
                  !collapsed && 'mr-4',
                  isActive ? 'text-teal-700' : 'text-gray-500'
                )} />
                {!collapsed && (
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
        {secondaryMailboxes.length > 0 && !collapsed && (
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
                      onClick={() => onSelectMailbox(mailbox.path)}
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
        {!collapsed && (
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
        {isCreatingLabel && !collapsed && (
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
        {!collapsed && labelMailboxes.length > 0 ? (
          <div className="space-y-0.5">
            {labelMailboxes.map((mailbox) => {
              const isActive = mailbox.path === currentMailbox;
              
              return (
                <div
                  key={mailbox.path}
                  className={cn(
                    'group w-full flex items-center pl-6 pr-2 py-1.5 rounded-r-full transition-colors text-[14px]',
                    isActive 
                      ? 'bg-teal-100 text-teal-900 font-medium' 
                      : 'hover:bg-teal-50 text-gray-700'
                  )}
                  style={{ marginRight: '8px' }}
                >
                  <button
                    onClick={() => onSelectMailbox(mailbox.path)}
                    className="flex-1 flex items-center min-w-0"
                  >
                    <Tag className={cn(
                      'h-5 w-5 mr-4 shrink-0',
                      isActive ? 'text-teal-700' : 'text-gray-500'
                    )} />
                    <span className="flex-1 text-left truncate">{mailbox.name}</span>
                    {mailbox.unseen > 0 && (
                      <span className={cn(
                        'text-xs font-medium ml-2',
                        isActive ? 'text-teal-800' : 'text-gray-600'
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
                        Loeschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        ) : (
          !isCreatingLabel && !collapsed && (
            <div className="px-6 py-2 text-xs text-gray-500">
              Keine benutzerdefinierten Labels
            </div>
          )
        )}
      </nav>

      {/* User Info Footer - hide when collapsed */}
      {!collapsed && (
        <div className="p-4 border-t border-teal-100">
          <div className="text-xs text-gray-600 truncate">
            {userEmail}
          </div>
        </div>
      )}
    </div>
  );
}
