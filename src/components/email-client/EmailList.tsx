'use client';

import React, { useState, useEffect, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  Paperclip,
  Archive,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  RefreshCw,
  Filter,
  SortDesc,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { EmailMessage, EmailFilter } from './types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatEmailBody } from '@/lib/emailUtils';

// Helper function to extract sender name/email from different formats
const getSenderDisplay = (from: any): string => {
  if (!from) return 'Unbekannt';

  // Direct object with name/email
  if (typeof from === 'object' && !Array.isArray(from)) {
    return from?.name || from?.email || 'Unbekannt';
  }

  // String format
  if (typeof from === 'string') {
    return from;
  }

  // Array format
  if (Array.isArray(from) && from.length > 0) {
    const first = from[0];
    if (typeof first === 'object') {
      return first?.name || first?.email || 'Unbekannt';
    }
    return first || 'Unbekannt';
  }

  return 'Unbekannt';
};

// ===== MEMOIZED EMAIL ITEM COMPONENT =====
// Diese Komponente wird nur neu gerendert, wenn sich ihre Props ändern
// NICHT bei jedem Firestore-Update der Liste!
interface EmailItemProps {
  email: EmailMessage;
  isSelected: boolean;
  onSelect: (emailId: string) => void;
  onClick: (email: EmailMessage) => void;
  onStar: (emailId: string) => void;
  onMarkAsRead: (emailIds: string[], read: boolean) => void;
  onArchive: (emailIds: string[]) => void;
  onDelete: (emailIds: string[]) => void;
  onMarkAsSpam?: (emailId: string, isSpam: boolean) => void;
}

const EmailItem = memo(
  ({
    email,
    isSelected,
    onSelect,
    onClick,
    onStar,
    onMarkAsRead,
    onArchive,
    onDelete,
    onMarkAsSpam,
  }: EmailItemProps) => {
    // DEBUG: Log wenn diese Email-Item-Komponente neu rendert

    const formatEmailDate = (timestamp: any): { relative: string; absolute: string } => {
      try {
        let date: Date;

        // Handle Firestore Timestamp objects
        if (timestamp && typeof timestamp === 'object' && '_seconds' in timestamp) {
          date = new Date(timestamp._seconds * 1000);
        }
        // Handle string timestamps
        else if (typeof timestamp === 'string') {
          // Check if it's a Gmail internal date (milliseconds since epoch)
          if (/^\d+$/.test(timestamp)) {
            date = new Date(parseInt(timestamp));
          } else {
            // Try parsing as ISO string or other formats
            date = new Date(timestamp);
          }
        }
        // Handle Date objects
        else if (timestamp instanceof Date) {
          date = timestamp;
        }
        // Handle number timestamps
        else if (typeof timestamp === 'number') {
          date = new Date(timestamp);
        } else {
          return { relative: 'Unbekannt', absolute: '' };
        }

        // Validate the date
        if (isNaN(date.getTime())) {
          return { relative: 'Unbekannt', absolute: '' };
        }

        // Relatives Datum (vor X Minuten)
        const relative = formatDistanceToNow(date, {
          addSuffix: true,
          locale: de,
        });

        // Absolutes Datum (13. Okt 2025, 12:34)
        const absolute = format(date, 'd. MMM yyyy, HH:mm', { locale: de });

        return { relative, absolute };
      } catch (error) {
        return { relative: 'Unbekannt', absolute: '' };
      }
    };

    const getEmailPreview = (email: EmailMessage) => {
      const emailContent = formatEmailBody(email);
      return (
        emailContent.textOnly.substring(0, 100) + (emailContent.textOnly.length > 100 ? '...' : '')
      );
    };

    return (
      <div
        className={cn(
          'group px-2 py-1.5 hover:bg-gray-50/80 cursor-pointer transition-all duration-150 w-full min-w-0 border-l-2 border-l-transparent',
          !email.read && 'bg-blue-50/40 border-l-teal-500 hover:bg-blue-50/60',
          isSelected && 'bg-teal-50 border-l-teal-600',
          email.read && 'hover:bg-gray-50'
        )}
        onClick={() => onClick(email)}
      >
        <div className="flex items-start gap-1.5 w-full min-w-0">
          <div className="relative">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(email.id)}
              onClick={e => e.stopPropagation()}
              className="mt-0.5 h-3.5 w-3.5 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 rounded-sm"
            />

            {!email.read && (
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'p-0 h-auto mt-0.5 hover:bg-transparent',
              email.starred
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-400 hover:text-gray-500'
            )}
            onClick={e => {
              e.stopPropagation();
              onStar(email.id);
            }}
          >
            <Star className={cn('h-3 w-3', email.starred && 'fill-current')} />
          </Button>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between w-full min-w-0">
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      'text-[11px] truncate block leading-tight',
                      !email.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                    )}
                  >
                    {getSenderDisplay(email.from)}
                  </span>
                  {email.attachments && email.attachments.length > 0 && (
                    <Paperclip className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                  )}
                  {email.priority === 'high' && (
                    <Badge variant="destructive" className="text-[9px] h-3 px-0.5">
                      !
                    </Badge>
                  )}
                </div>

                <div className="line-clamp-1">
                  <span
                    className={cn(
                      'text-[11px] leading-tight',
                      !email.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                    )}
                  >
                    {email.subject || '(Kein Betreff)'}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] leading-tight ml-1',
                      !email.read ? 'text-gray-600' : 'text-gray-500'
                    )}
                  >
                    {getEmailPreview(email)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 ml-2">
                <span
                  className={cn(
                    'text-[10px] whitespace-nowrap leading-tight',
                    !email.read ? 'text-gray-700 font-medium' : 'text-gray-500'
                  )}
                >
                  {formatEmailDate(email.timestamp).relative}
                </span>
                <span className="text-[9px] text-gray-400 whitespace-nowrap leading-tight">
                  {formatEmailDate(email.timestamp).absolute}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onMarkAsRead([email.id], !email.read)}>
                      {email.read ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStar(email.id)}>
                      {email.starred ? 'Stern entfernen' : 'Mit Stern markieren'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onArchive([email.id])}>
                      Archivieren
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const isCurrentlySpam = email.labels?.includes('SPAM');
                        onMarkAsSpam?.(email.id, !isCurrentlySpam);
                      }}
                      className="text-orange-600"
                    >
                      {email.labels?.includes('SPAM') ? 'Kein Spam' : 'Als Spam markieren'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete([email.id])} className="text-red-600">
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: Nur neu rendern wenn sich relevante Props ändern
    const shouldSkipRerender =
      prevProps.email.id === nextProps.email.id &&
      prevProps.email.read === nextProps.email.read &&
      prevProps.email.starred === nextProps.email.starred &&
      prevProps.isSelected === nextProps.isSelected;

    // DEBUG: Log Memoization-Entscheidungen
    if (!shouldSkipRerender) {
    }

    return shouldSkipRerender;
  }
);

EmailItem.displayName = 'EmailItem';

// ===== END MEMOIZED EMAIL ITEM =====

interface EmailListProps {
  emails: EmailMessage[];
  selectedEmails: string[];
  onSelectEmail: (emailId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onEmailClick: (email: EmailMessage) => void;
  onStarEmail: (emailId: string) => void;
  onArchiveEmails: (emailIds: string[]) => void;
  onDeleteEmails: (emailIds: string[]) => void;
  onMarkAsRead: (emailIds: string[], read: boolean) => void;
  onMarkAsSpam?: (emailId: string, isSpam: boolean) => void;
  filter: EmailFilter;
  onFilterChange: (filter: EmailFilter) => void;
  onSync?: () => void;
  isLoading?: boolean;
  realtimeStatus?: {
    connected: boolean;
    lastActivity: Date | null;
  };
  isCompact?: boolean; // Neue Prop für kompakte Ansicht
  className?: string;
}

export function EmailList({
  emails,
  selectedEmails,
  onSelectEmail,
  onSelectAll,
  onEmailClick,
  onStarEmail,
  onArchiveEmails,
  onDeleteEmails,
  onMarkAsRead,
  onMarkAsSpam,
  filter,
  onFilterChange,
  onSync,
  isLoading = false,
  realtimeStatus,
  isCompact = false,
  className,
}: EmailListProps) {
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'from'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [prevEmailCount, setPrevEmailCount] = useState(0);

  // Log email count changes
  useEffect(() => {
    if (emails.length !== prevEmailCount) {
      if (emails.length > prevEmailCount) {
      }
      setPrevEmailCount(emails.length);
    }
  }, [emails.length, prevEmailCount]);

  // DEBUG: Log wenn die komplette Liste neu rendert

  const allSelected = emails.length > 0 && selectedEmails.length === emails.length;
  const someSelected = selectedEmails.length > 0 && selectedEmails.length < emails.length;

  // Prüfe ob alle ausgewählten Emails gelesen/ungelesen sind
  const selectedEmailsObjects = emails.filter(e => selectedEmails.includes(e.id));
  const allSelectedAreRead =
    selectedEmailsObjects.length > 0 && selectedEmailsObjects.every(e => e.read);
  const allSelectedAreUnread =
    selectedEmailsObjects.length > 0 && selectedEmailsObjects.every(e => !e.read);

  // DEBUG: Log selection state
  if (selectedEmails.length > 0) {
  }

  const handleSelectAll = () => {
    onSelectAll(!allSelected);
  };

  const formatEmailDate = (timestamp: any): { relative: string; absolute: string } => {
    try {
      let date: Date;

      if (!timestamp) {
        return { relative: 'Unbekannt', absolute: '' };
      }

      // Handle Firestore Timestamp objects
      if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      }
      // Handle string timestamps
      else if (typeof timestamp === 'string') {
        // Check if it's a Gmail internal date (milliseconds since epoch)
        if (/^\d+$/.test(timestamp)) {
          date = new Date(parseInt(timestamp));
        } else {
          // Try parsing as ISO string or other formats
          date = new Date(timestamp);
        }
      }
      // Handle Date objects
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Handle number timestamps
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        console.warn('Unknown timestamp format:', timestamp);
        return { relative: 'Unbekannt', absolute: '' };
      }

      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return { relative: 'Unbekannt', absolute: '' };
      }

      // Relatives Datum (vor X Minuten)
      const relative = formatDistanceToNow(date, {
        addSuffix: true,
        locale: de,
      });

      // Absolutes Datum (13. Okt 2025, 12:34)
      const absolute = format(date, 'd. MMM yyyy, HH:mm', { locale: de });

      return { relative, absolute };
    } catch (error) {
      console.error('Error formatting date:', error, 'timestamp:', timestamp);
      return { relative: 'Unbekannt', absolute: '' };
    }
  };

  const getEmailPreview = (email: EmailMessage) => {
    const emailContent = formatEmailBody(email);
    // Use textOnly for clean preview, never HTML
    return (
      emailContent.textOnly.substring(0, 100) + (emailContent.textOnly.length > 100 ? '...' : '')
    );
  };

  const sortedEmails = [...emails].sort((a, b) => {
    let aValue: string | Date;
    let bValue: string | Date;

    switch (sortBy) {
      case 'date':
        aValue = new Date(a.timestamp);
        bValue = new Date(b.timestamp);
        break;
      case 'subject':
        aValue = a.subject.toLowerCase();
        bValue = b.subject.toLowerCase();
        break;
      case 'from':
        aValue = getSenderDisplay(a.from).toLowerCase();
        bValue = getSenderDisplay(b.from).toLowerCase();
        break;
      default:
        aValue = new Date(a.timestamp);
        bValue = new Date(b.timestamp);
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  return (
    <Card className={cn('h-[800px] flex flex-col overflow-hidden bg-white', className)}>
      {/* Toolbar - Kompakt oder Normal */}
      <div className={cn('border-b bg-gray-50/50 shrink-0', isCompact ? 'p-2' : 'p-4')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
            />

            {selectedEmails.length > 0 && !isCompact && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-teal-100 text-teal-800 text-xs">
                  {selectedEmails.length} ausgewählt
                </Badge>
                {/* Als gelesen markieren - nur anzeigen wenn NICHT alle gelesen sind */}
                {!allSelectedAreRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onMarkAsRead(selectedEmails, true);
                    }}
                    className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                    title="Ausgewählte als gelesen markieren"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    <span className="text-xs">Als gelesen</span>
                  </Button>
                )}
                {/* Als ungelesen markieren - nur anzeigen wenn NICHT alle ungelesen sind */}
                {!allSelectedAreUnread && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsRead(selectedEmails, false)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Ausgewählte als ungelesen markieren"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    <span className="text-xs">Als ungelesen</span>
                  </Button>
                )}
                <div className="h-6 w-px bg-gray-300 mx-1" /> {/* Divider */}
                <Button variant="ghost" size="sm" onClick={() => onArchiveEmails(selectedEmails)}>
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDeleteEmails(selectedEmails)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn('bg-teal-100 text-teal-800', isCompact ? 'text-xs px-2 py-1' : '')}
            >
              {emails.length} E-Mails
            </Badge>

            {/* Real-time Status - nur wenn nicht kompakt */}
            {realtimeStatus && !isCompact && (
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    realtimeStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  )}
                />

                <span className="text-xs text-gray-500">
                  {realtimeStatus.connected ? 'Live' : 'Offline'}
                </span>
              </div>
            )}

            {!isCompact && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <SortDesc className="h-4 w-4 mr-2" />
                    Sortieren
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('date')}>Nach Datum</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('subject')}>
                    Nach Betreff
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('from')}>
                    Nach Absender
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortOrder('desc')}>
                    Absteigend
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('asc')}>
                    Aufsteigend
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!isCompact && (
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onSync}
              disabled={isLoading}
              title="E-Mails aktualisieren"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      {/* Email List - GLEICHE HÖHE WIE CONTENT */}
      <div className="h-[720px] overflow-y-auto overflow-x-hidden bg-white">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
            <p className="text-gray-500">E-Mails werden geladen...</p>
          </div>
        ) : sortedEmails.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="h-16 w-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine E-Mails</h3>
            <p className="text-gray-500">In diesem Ordner befinden sich keine E-Mails.</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedEmails.map(email => (
              <EmailItem
                key={email.id}
                email={email}
                isSelected={selectedEmails.includes(email.id)}
                onSelect={onSelectEmail}
                onClick={onEmailClick}
                onStar={onStarEmail}
                onMarkAsRead={onMarkAsRead}
                onArchive={onArchiveEmails}
                onDelete={onDeleteEmails}
                onMarkAsSpam={onMarkAsSpam}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ===== MEMOIZE THE ENTIRE EMAIL LIST =====
// Verhindert unnötige Re-Renders der gesamten Liste
export const MemoizedEmailList = memo(EmailList, (prevProps, nextProps) => {
  // Nur neu rendern wenn sich relevante Props ändern
  const shouldSkipRerender =
    prevProps.emails.length === nextProps.emails.length &&
    prevProps.selectedEmails.length === nextProps.selectedEmails.length &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.filter === nextProps.filter &&
    prevProps.isCompact === nextProps.isCompact &&
    // Prüfe ob sich die emails-Array-Referenz geändert hat
    prevProps.emails === nextProps.emails &&
    prevProps.selectedEmails === nextProps.selectedEmails;

  if (!shouldSkipRerender) {
  }

  return shouldSkipRerender;
});

MemoizedEmailList.displayName = 'MemoizedEmailList';
