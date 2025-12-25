'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { 
  Inbox, 
  Send, 
  Trash2, 
  Archive, 
  Star, 
  RefreshCw,
  Mail,
  Paperclip,
  Reply,
  Forward,
  Search,
  X,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  ArrowLeft,
  Pencil,
  AlertTriangle,
  FolderInput,
  Tag,
  Folder,
  Download,
  FileText,
  Image,
  File,
} from 'lucide-react';
import { useWebmail } from '@/hooks/useWebmail';
import { EmailMessage, Mailbox } from '@/services/webmail/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { MailSidebar } from './MailSidebar';
import { MailHeader } from './MailHeader';
import { SearchFilters, filterMessagesClientSide } from './MailSearchFilter';
import { EmailCompose as EmailComposeComponent } from '@/components/email-client/EmailCompose';
import type { EmailCompose as EmailComposeType, EmailMessage as EmailClientMessage } from '@/components/email-client/types';

// Farbpalette für Labels (gleich wie in MailSidebar)
const LABEL_COLORS = [
  { id: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  { id: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  { id: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  { id: 'green', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  { id: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  { id: 'red', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  { id: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { id: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
];

// localStorage Key für Label-Farben (gleich wie in MailSidebar)
const LABEL_COLORS_STORAGE_KEY = 'taskilo-webmail-label-colors';

// Lädt benutzerdefinierte Label-Farben aus localStorage
const getStoredLabelColors = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(LABEL_COLORS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Generiert eine konsistente Farbe basierend auf dem Label-Namen oder gespeicherter Auswahl
const getLabelColor = (labelPath: string) => {
  // Prüfe zuerst benutzerdefinierte Farbe
  const storedColors = getStoredLabelColors();
  if (storedColors[labelPath]) {
    const customColor = LABEL_COLORS.find(c => c.id === storedColors[labelPath]);
    if (customColor) return customColor;
  }
  
  // Fallback: Hash-basierte Farbe
  let hash = 0;
  for (let i = 0; i < labelPath.length; i++) {
    const char = labelPath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % LABEL_COLORS.length;
  return LABEL_COLORS[index];
};

interface WebmailClientProps {
  email: string;
  password: string;
  onLogout?: () => void;
  initialComposeTo?: string;
}

// Helper function to format dates like EmailClient
const formatEmailDate = (date: Date): { relative: string; absolute: string } => {
  try {
    const msgDate = new Date(date);
    if (isNaN(msgDate.getTime())) {
      return { relative: 'Unbekannt', absolute: '' };
    }

    const relative = formatDistanceToNow(msgDate, {
      addSuffix: true,
      locale: de,
    });

    const absolute = format(msgDate, 'd. MMM yyyy, HH:mm', { locale: de });

    return { relative, absolute };
  } catch {
    return { relative: 'Unbekannt', absolute: '' };
  }
};

// ===== MEMOIZED EMAIL ITEM COMPONENT - LIKE EMAILCLIENT =====
interface EmailItemProps {
  email: EmailMessage;
  isSelected: boolean;
  onSelect: (uid: number) => void;
  onClick: (email: EmailMessage) => void;
  onStar: (uid: number) => void;
  onDelete: (uid: number) => void;
  onMarkAsRead: (uid: number) => void;
  onMoveToSpam: (uid: number) => void;
  onMoveToFolder: (uid: number, folder: string) => void;
  mailboxes: Mailbox[];
  currentMailbox: string;
}

const EmailItem = memo(({
  email,
  isSelected,
  onSelect,
  onClick,
  onStar,
  onDelete,
  onMarkAsRead,
  onMoveToSpam,
  onMoveToFolder,
  mailboxes,
  currentMailbox,
}: EmailItemProps) => {
  const isUnread = !email.flags.includes('\\Seen');
  const isStarred = email.flags.includes('\\Flagged');
  const fromName = email.from[0]?.name || email.from[0]?.address || 'Unbekannt';
  const { relative, absolute } = formatEmailDate(email.date);

  return (
    <div
      className={cn(
        'group px-2 py-1.5 hover:bg-gray-50/80 cursor-pointer transition-all duration-150 w-full min-w-0 border-l-2 border-l-transparent',
        isUnread && 'bg-blue-50/40 border-l-teal-500 hover:bg-blue-50/60',
        isSelected && 'bg-teal-50 border-l-teal-600',
        !isUnread && 'hover:bg-gray-50'
      )}
      onClick={() => onClick(email)}
    >
      <div className="flex items-start gap-1 md:gap-1.5 w-full min-w-0">
        <div className="relative">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(email.uid)}
            onClick={e => e.stopPropagation()}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
          />
          {isUnread && (
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'p-0 h-auto mt-0.5 hover:bg-transparent',
            isStarred
              ? 'text-yellow-500 hover:text-yellow-600'
              : 'text-gray-400 hover:text-gray-500'
          )}
          onClick={e => {
            e.stopPropagation();
            onStar(email.uid);
          }}
        >
          <Star className={cn('h-3 w-3', isStarred && 'fill-current')} />
        </Button>

        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-start justify-between w-full min-w-0">
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'text-[11px] truncate block leading-tight',
                    isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                  )}
                >
                  {fromName}
                </span>
                {email.hasAttachments && (
                  <Paperclip className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                )}
              </div>

              <div className="line-clamp-1">
                <span
                  className={cn(
                    'text-[11px] leading-tight',
                    isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                  )}
                >
                  {email.subject || '(Kein Betreff)'}
                </span>
                <span
                  className={cn(
                    'text-[10px] leading-tight ml-1',
                    isUnread ? 'text-gray-600' : 'text-gray-500'
                  )}
                >
                  {email.preview}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 ml-2">
              <span
                className={cn(
                  'text-[10px] whitespace-nowrap leading-tight',
                  isUnread ? 'text-gray-700 font-medium' : 'text-gray-500'
                )}
              >
                {relative}
              </span>
              <span className="text-[9px] text-gray-400 whitespace-nowrap leading-tight">
                {absolute}
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
                  <DropdownMenuItem onClick={() => onMarkAsRead(email.uid)}>
                    {isUnread ? 'Als gelesen markieren' : 'Als ungelesen markieren'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStar(email.uid)}>
                    {isStarred ? 'Stern entfernen' : 'Mit Stern markieren'}
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Folder className="h-4 w-4 mr-2" />
                      Verschieben nach
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-64 overflow-y-auto min-w-48">
                      {/* Standard-Ordner */}
                      {mailboxes.find(mb => mb.path.toLowerCase() === 'inbox') && currentMailbox.toLowerCase() !== 'inbox' && (
                        <DropdownMenuItem
                          onClick={() => onMoveToFolder(email.uid, 'INBOX')}
                        >
                          <Inbox className="h-4 w-4 mr-2" />
                          Posteingang
                        </DropdownMenuItem>
                      )}
                      {mailboxes.find(mb => mb.path.toLowerCase().includes('archive')) && !currentMailbox.toLowerCase().includes('archive') && (
                        <DropdownMenuItem
                          onClick={() => onMoveToFolder(email.uid, mailboxes.find(mb => mb.path.toLowerCase().includes('archive'))?.path || 'Archive')}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archivieren
                        </DropdownMenuItem>
                      )}
                      {mailboxes.find(mb => mb.path.toLowerCase().includes('trash')) && !currentMailbox.toLowerCase().includes('trash') && (
                        <DropdownMenuItem
                          onClick={() => onMoveToFolder(email.uid, mailboxes.find(mb => mb.path.toLowerCase().includes('trash'))?.path || 'Trash')}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          In Papierkorb
                        </DropdownMenuItem>
                      )}
                      
                      {/* Benutzerdefinierte Labels - gefiltert */}
                      {(() => {
                        const hiddenFolders = ['dovecot', '.dovecot', 'virtual', '.virtual', 'dovecot.sieve', 'sieve', 'lda-dupes', 'locks'];
                        const systemFolderPaths = ['inbox', 'sent', 'drafts', 'trash', 'junk', 'spam', 'archive', 'starred', 'flagged'];
                        
                        const customLabels = mailboxes.filter(mb => {
                          const lowerPath = mb.path.toLowerCase();
                          if (mb.path === currentMailbox) return false;
                          if (lowerPath.includes('draft')) return false;
                          if (hiddenFolders.some(h => lowerPath === h.toLowerCase() || lowerPath.startsWith(h.toLowerCase() + '/'))) return false;
                          if (systemFolderPaths.some(s => lowerPath === s || lowerPath.includes(s))) return false;
                          return true;
                        });
                        
                        if (customLabels.length === 0) return null;
                        
                        return (
                          <>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                              Labels
                            </div>
                            {customLabels.map(mb => {
                              const labelColor = getLabelColor(mb.path);
                              return (
                                <DropdownMenuItem
                                  key={mb.path}
                                  onClick={() => onMoveToFolder(email.uid, mb.path)}
                                >
                                  <div className={cn('h-3 w-3 rounded-full mr-2', labelColor.dot)} />
                                  {mb.name}
                                </DropdownMenuItem>
                              );
                            })}
                          </>
                        );
                      })()}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={() => onMoveToSpam(email.uid)} className="text-orange-600">
                    Als Spam markieren
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(email.uid)} className="text-red-600">
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
}, (prevProps, nextProps) => {
  return (
    prevProps.email.uid === nextProps.email.uid &&
    prevProps.email.flags.join(',') === nextProps.email.flags.join(',') &&
    prevProps.isSelected === nextProps.isSelected
  );
});

EmailItem.displayName = 'EmailItem';

// ===== EMAIL VIEWER COMPONENT =====
interface AttachmentInfo {
  filename: string;
  contentType?: string;
  size?: number;
  partId?: string;
}

interface EmailViewerProps {
  email: EmailMessage & { text?: string; html?: string; attachments?: AttachmentInfo[] };
  onClose: () => void;
  onReply: () => void;
  onMoveToSpam: (uid: number) => void;
  onMoveToFolder: (uid: number, folder: string) => void;
  mailboxes: Array<{ path: string; name: string }>;
  currentMailbox: string;
  onForward: () => void;
  onDelete: (uid: number) => void;
  onStar: (uid: number) => void;
  credentials: { email: string; password: string };
}

function EmailViewer({ 
  email, 
  onClose, 
  onReply, 
  onForward, 
  onDelete, 
  onStar,
  onMoveToSpam,
  onMoveToFolder,
  mailboxes,
  currentMailbox,
  credentials,
}: EmailViewerProps) {
  const isStarred = email.flags.includes('\\Flagged');
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);

  // Attachment herunterladen
  const handleDownloadAttachment = async (attachment: AttachmentInfo) => {
    if (!attachment.partId) {
      console.error('Attachment hat keine partId');
      return;
    }

    setDownloadingAttachment(attachment.filename);

    try {
      const response = await fetch('/api/webmail/attachment/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          mailbox: currentMailbox,
          uid: email.uid,
          partId: attachment.partId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Download fehlgeschlagen');
      }

      // Blob erstellen und herunterladen
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Attachment download failed:', error);
    } finally {
      setDownloadingAttachment(null);
    }
  };

  // Icon basierend auf Content-Type
  const getAttachmentIcon = (contentType?: string) => {
    if (!contentType) return <File className="h-4 w-4 text-gray-400" />;
    if (contentType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
    if (contentType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    if (contentType.includes('word') || contentType.includes('document')) return <FileText className="h-4 w-4 text-blue-600" />;
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return <FileText className="h-4 w-4 text-green-600" />;
    return <File className="h-4 w-4 text-gray-400" />;
  };

  // Formatiere Dateigroesse
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Interne Dovecot/Mailcow-Ordner die versteckt werden sollen
  const hiddenFolders = ['dovecot', '.dovecot', 'virtual', '.virtual', 'dovecot.sieve', 'sieve', 'lda-dupes', 'locks'];
  
  // Standard-Systemordner (werden separat angezeigt, nicht als Labels)
  const systemFolderPaths = ['inbox', 'sent', 'drafts', 'trash', 'junk', 'spam', 'archive', 'starred', 'flagged'];
  
  // Get target folders for move - nur benutzerdefinierte Labels anzeigen
  const moveTargets = mailboxes.filter(mb => {
    const lowerPath = mb.path.toLowerCase();
    
    // Aktuellen Ordner ausschließen
    if (mb.path === currentMailbox) return false;
    
    // Entwürfe ausschließen
    if (lowerPath.includes('draft')) return false;
    
    // Versteckte Dovecot-Ordner ausschließen
    if (hiddenFolders.some(hidden => 
      lowerPath === hidden.toLowerCase() || 
      lowerPath.startsWith(hidden.toLowerCase() + '/')
    )) return false;
    
    // System-Ordner ausschließen (werden über spezielle Buttons erreicht)
    if (systemFolderPaths.some(sys => lowerPath === sys || lowerPath.includes(sys))) return false;
    
    return true;
  });
  
  // Standard-Ordner für schnellen Zugriff (Archiv, Papierkorb)
  const archiveFolder = mailboxes.find(mb => 
    mb.path.toLowerCase().includes('archive') || mb.specialUse === '\\Archive'
  );
  const trashFolder = mailboxes.find(mb => 
    mb.path.toLowerCase().includes('trash') || mb.specialUse === '\\Trash'
  );
  const inboxFolder = mailboxes.find(mb => 
    mb.path.toLowerCase() === 'inbox' || mb.specialUse === '\\Inbox'
  );
  
  // Process HTML to open links in new tab
  const processedHtml = email.html 
    ? email.html
        // Add target="_blank" and rel="noopener noreferrer" to all links
        .replace(/<a\s+/gi, '<a target="_blank" rel="noopener noreferrer" ')
        // Remove any existing target attributes to avoid duplicates
        .replace(/target="_blank"\s+target="[^"]*"/gi, 'target="_blank"')
    : '';
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold truncate max-w-xl">{email.subject}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onReply}>
            <Reply className="h-4 w-4 mr-1" />
            Antworten
          </Button>
          <Button variant="ghost" size="sm" onClick={onForward}>
            <Forward className="h-4 w-4 mr-1" />
            Weiterleiten
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStar(email.uid)}
            className={isStarred ? 'text-yellow-500' : ''}
          >
            <Star className={cn('h-4 w-4', isStarred && 'fill-current')} />
          </Button>
          
          {/* Move to Folder Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" title="Verschieben">
                <FolderInput className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {/* Standard-Aktionen */}
              <DropdownMenuItem 
                onClick={() => onMoveToSpam(email.uid)}
                className="text-orange-600"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Als Spam markieren
              </DropdownMenuItem>
              
              {/* Standard-Ordner */}
              {inboxFolder && currentMailbox !== inboxFolder.path && (
                <DropdownMenuItem 
                  onClick={() => onMoveToFolder(email.uid, inboxFolder.path)}
                >
                  <Inbox className="h-4 w-4 mr-2" />
                  Posteingang
                </DropdownMenuItem>
              )}
              {archiveFolder && currentMailbox !== archiveFolder.path && (
                <DropdownMenuItem 
                  onClick={() => onMoveToFolder(email.uid, archiveFolder.path)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archivieren
                </DropdownMenuItem>
              )}
              {trashFolder && currentMailbox !== trashFolder.path && (
                <DropdownMenuItem 
                  onClick={() => onMoveToFolder(email.uid, trashFolder.path)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  In Papierkorb
                </DropdownMenuItem>
              )}
              
              {/* Benutzerdefinierte Labels */}
              {moveTargets.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                    Labels
                  </div>
                  {moveTargets.map(mb => {
                    const labelColor = getLabelColor(mb.path);
                    return (
                      <DropdownMenuItem 
                        key={mb.path}
                        onClick={() => onMoveToFolder(email.uid, mb.path)}
                      >
                        <div className={cn('h-3 w-3 rounded-full mr-2', labelColor.dot)} />
                        {mb.name || mb.path}
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(email.uid)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Sender Info */}
        <div className="flex items-start gap-4 mb-6 pb-4 border-b">
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
            <span className="text-teal-700 font-semibold text-lg">
              {(email.from[0]?.name || email.from[0]?.address || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900">
              {email.from[0]?.name || email.from[0]?.address}
            </div>
            <div className="text-sm text-gray-500">
              {email.from[0]?.address}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              An: {email.to.map(t => t.address).join(', ')}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {new Date(email.date).toLocaleString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium mb-3 flex items-center gap-2 text-gray-700">
              <Paperclip className="h-4 w-4" />
              {email.attachments.length} {email.attachments.length === 1 ? 'Anhang' : 'Anhaenge'}
            </div>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att, i) => (
                <button
                  key={i}
                  onClick={() => handleDownloadAttachment(att)}
                  disabled={downloadingAttachment === att.filename}
                  className="px-3 py-2 bg-white rounded-lg border text-sm flex items-center gap-2 hover:bg-teal-50 hover:border-teal-300 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {downloadingAttachment === att.filename ? (
                    <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  ) : (
                    getAttachmentIcon(att.contentType)
                  )}
                  <span className="max-w-[200px] truncate">{att.filename}</span>
                  {att.size && (
                    <span className="text-xs text-gray-400">({formatFileSize(att.size)})</span>
                  )}
                  <Download className="h-3 w-3 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Email Body */}
        <div className="prose prose-sm max-w-none">
          {email.html ? (
            <div 
              dangerouslySetInnerHTML={{ __html: processedHtml }}
              className="email-content"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
              {email.text}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== WEBMAIL TO EMAIL-CLIENT TYPE CONVERTER =====
const convertWebmailToEmailClientMessage = (msg: EmailMessage): EmailClientMessage => {
  return {
    id: String(msg.uid),
    from: {
      email: msg.from[0]?.address || '',
      name: msg.from[0]?.name || undefined,
    },
    to: msg.to.map(t => ({ email: t.address || '', name: t.name })),
    cc: msg.cc?.map(c => ({ email: c.address || '', name: c.name })),
    subject: msg.subject,
    body: msg.preview || '',
    timestamp: msg.date instanceof Date ? msg.date.toISOString() : String(msg.date),
    read: msg.flags.includes('\\Seen'),
    starred: msg.flags.includes('\\Flagged'),
    folder: {
      id: 'inbox',
      name: 'Posteingang',
      type: 'inbox' as const,
      count: 0,
      unreadCount: 0,
    },
    priority: 'normal' as const,
  };
};

// ===== MAIN WEBMAIL CLIENT - LIKE EMAILCLIENT =====
export function WebmailClient({ email, password, onLogout, initialComposeTo }: WebmailClientProps) {
  const {
    mailboxes,
    messages,
    currentMessage,
    currentMailbox,
    total: _total,
    loading,
    error,
    messageError,
    messageLoading,
    fetchMailboxes,
    fetchMessages,
    fetchMessage,
    sendEmail,
    performAction,
    clearCurrentMessage,
    clearMessageError,
  } = useWebmail({ email, password });

  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<number[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<EmailMessage | null>(null);
  const [composeToEmail, setComposeToEmail] = useState<string | undefined>(undefined);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    fetchMailboxes();
    fetchMessages('INBOX');
  }, [fetchMailboxes, fetchMessages]);

  // Öffne Compose-Dialog wenn initialComposeTo übergeben wurde
  useEffect(() => {
    if (initialComposeTo) {
      setComposeToEmail(initialComposeTo);
      setIsComposeOpen(true);
      // URL-Parameter entfernen nach Verwendung
      window.history.replaceState({}, '', '/webmail');
    }
  }, [initialComposeTo]);

  // Clear selection when changing mailbox
  useEffect(() => {
    setSelectedEmails([]);
    setSelectedEmail(null);
  }, [currentMailbox]);

  const handleSelectMailbox = (path: string) => {
    fetchMessages(path);
    setSelectedEmail(null);
    clearCurrentMessage();
    setSelectedEmails([]);
  };

  const handleEmailClick = useCallback((msg: EmailMessage) => {
    fetchMessage(msg.uid, currentMailbox);
    setSelectedEmail(msg);
  }, [fetchMessage, currentMailbox]);

  const handleCloseEmail = useCallback(() => {
    setSelectedEmail(null);
    clearCurrentMessage();
    clearMessageError();
  }, [clearCurrentMessage, clearMessageError]);

  const handleCompose = useCallback((replyTo?: EmailMessage) => {
    setReplyToEmail(replyTo || null);
    setIsComposeOpen(true);
  }, []);

  const handleSendEmail = useCallback(async (composeData: EmailComposeType) => {
    // Convert EmailComposeType to webmail API format
    const apiData = {
      to: composeData.to,
      subject: composeData.subject,
      text: composeData.body,
      html: composeData.body, // TODO: Implement rich text
      cc: composeData.cc ? composeData.cc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
      bcc: composeData.bcc ? composeData.bcc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
    };
    
    const result = await sendEmail(apiData);
    if (result.success) {
      setIsComposeOpen(false);
      setReplyToEmail(null);
      fetchMessages(currentMailbox);
    }
  }, [sendEmail, fetchMessages, currentMailbox]);

  // Placeholder for save draft functionality (not yet implemented in webmail)
  const handleSaveDraft = useCallback(async (_composeData: EmailComposeType) => {
    // TODO: Implement draft saving for webmail
    setIsComposeOpen(false);
    setReplyToEmail(null);
  }, []);

  const handleDelete = useCallback(async (uid: number) => {
    await performAction('delete', uid);
    if (selectedEmail?.uid === uid) {
      setSelectedEmail(null);
    }
    setSelectedEmails(prev => prev.filter(id => id !== uid));
  }, [performAction, selectedEmail]);

  const handleBulkDelete = useCallback(async () => {
    for (const uid of selectedEmails) {
      await performAction('delete', uid);
    }
    setSelectedEmails([]);
    fetchMessages(currentMailbox);
  }, [selectedEmails, performAction, fetchMessages, currentMailbox]);

  // Move email to Spam/Junk folder
  const handleMoveToSpam = useCallback(async (uid: number) => {
    // Find Junk/Spam folder
    const spamFolder = mailboxes.find(mb => 
      mb.specialUse === '\\Junk' || 
      mb.path.toLowerCase().includes('spam') || 
      mb.path.toLowerCase().includes('junk')
    );
    
    const targetFolder = spamFolder?.path || 'Junk';
    await performAction('move', uid, targetFolder);
    
    if (selectedEmail?.uid === uid) {
      setSelectedEmail(null);
    }
    setSelectedEmails(prev => prev.filter(id => id !== uid));
    fetchMessages(currentMailbox);
  }, [mailboxes, performAction, selectedEmail, fetchMessages, currentMailbox]);

  // Move email to specific folder
  const handleMoveToFolder = useCallback(async (uid: number, targetFolder: string) => {
    await performAction('move', uid, targetFolder);
    
    if (selectedEmail?.uid === uid) {
      setSelectedEmail(null);
    }
    setSelectedEmails(prev => prev.filter(id => id !== uid));
    fetchMessages(currentMailbox);
  }, [performAction, selectedEmail, fetchMessages, currentMailbox]);

  const handleSelectEmail = useCallback((uid: number) => {
    setSelectedEmails(prev => 
      prev.includes(uid) 
        ? prev.filter(id => id !== uid)
        : [...prev, uid]
    );
  }, []);

  const handleStarEmail = useCallback(async (uid: number) => {
    // Find the message to toggle its flag state
    const message = messages.find(m => m.uid === uid);
    const isCurrentlyFlagged = message?.flags.includes('\\Flagged') || false;
    
    await performAction('flag', uid, undefined, !isCurrentlyFlagged);
    fetchMessages(currentMailbox);
  }, [messages, performAction, fetchMessages, currentMailbox]);

  const handleMarkAsRead = useCallback(async (uid: number) => {
    await performAction('markRead', uid);
  }, [performAction]);

  const _getMailboxIcon = (specialUse?: string, path?: string) => {
    if (specialUse === '\\Sent' || path?.toLowerCase().includes('sent')) return Send;
    if (specialUse === '\\Trash' || path?.toLowerCase().includes('trash')) return Trash2;
    if (specialUse === '\\Archive' || path?.toLowerCase().includes('archive')) return Archive;
    if (specialUse === '\\Flagged' || path?.toLowerCase().includes('starred')) return Star;
    return Inbox;
  };

  // Filter messages based on simple search query or advanced filters
  const filteredMessages = (() => {
    let filtered = messages;
    
    // Apply simple text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.subject.toLowerCase().includes(query) ||
        msg.from.some(f => f.address.toLowerCase().includes(query) || f.name?.toLowerCase().includes(query))
      );
    }
    
    // Apply advanced filters
    if (advancedFilters) {
      filtered = filterMessagesClientSide(
        filtered.map(msg => ({
          uid: msg.uid,
          subject: msg.subject,
          from: msg.from,
          to: msg.to,
          date: msg.date.toISOString(),
          size: msg.size,
          hasAttachment: msg.hasAttachments,
          text: msg.preview, // Use preview as text for filtering
        })),
        advancedFilters
      ).map(result => {
        const original = filtered.find(m => m.uid === result.uid);
        return original!;
      }).filter(Boolean);
    }
    
    return filtered;
  })();

  const handleAdvancedSearch = useCallback((filters: SearchFilters) => {
    setAdvancedFilters(filters);
    setSearchQuery(''); // Clear simple search when using advanced
    
    // Handle searchIn filter - switch mailbox if not 'all'
    if (filters.searchIn && filters.searchIn !== 'all') {
      const mailboxMap: Record<string, string> = {
        'inbox': 'INBOX',
        'sent': 'Sent',
        'drafts': 'Drafts',
        'trash': 'Trash',
        'spam': 'Spam',
      };
      const targetMailbox = mailboxMap[filters.searchIn] || filters.searchIn;
      if (targetMailbox !== currentMailbox) {
        fetchMessages(targetMailbox);
      }
    }
  }, [currentMailbox, fetchMessages]);

  const clearAdvancedFilters = useCallback(() => {
    setAdvancedFilters(null);
  }, []);

  const handleSelectAll = () => {
    if (selectedEmails.length === filteredMessages.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredMessages.map(m => m.uid));
    }
  };

  const allSelected = filteredMessages.length > 0 && selectedEmails.length === filteredMessages.length;

  // Error State
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Verbindungsfehler</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => fetchMessages(currentMailbox)} className="bg-teal-600 hover:bg-teal-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading && messages.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin"></div>
          <p className="mt-6 text-gray-600 text-lg font-medium">E-Mails werden geladen...</p>
          <p className="mt-2 text-gray-400 text-sm">Verbindung zu {email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Mail Header */}
      <MailHeader
        userEmail={email}
        onMenuToggle={() => {
          // On mobile, open the drawer; on desktop, collapse sidebar
          if (window.innerWidth < 768) {
            setIsMobileSidebarOpen(true);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }}
        onSearch={(query) => {
          setSearchQuery(query);
          clearAdvancedFilters();
        }}
        onAdvancedSearch={handleAdvancedSearch}
        onLogout={onLogout}
        mailboxes={mailboxes.map(m => ({ path: m.path, name: m.name }))}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Mail Sidebar - Desktop only, mobile uses drawer */}
        <MailSidebar
          mailboxes={mailboxes}
          currentMailbox={currentMailbox}
          onSelectMailbox={handleSelectMailbox}
          onCompose={() => handleCompose()}
          userEmail={email}
          userPassword={password}
          onMailboxesChange={fetchMailboxes}
          collapsed={sidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Email List - Full width on mobile, Fixed Width when email selected on desktop */}
        <div
          className={cn(
            'bg-white flex flex-col overflow-hidden relative min-w-0',
            // Mobile: full width, hide when viewing email
            'md:border-r md:border-gray-200',
            selectedEmail ? 'hidden md:flex md:w-96 md:shrink-0' : 'flex-1'
          )}
        >
        {/* Toolbar */}
        <div className="border-b bg-gray-50/50 px-2 md:px-3 py-1.5 md:py-2 flex items-center gap-2 md:gap-3 shrink-0">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => handleSelectAll(!allSelected)}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
          />

          {selectedEmails.length > 0 && (
            <div className="flex items-center gap-1 md:gap-2">
              <Badge variant="secondary" className="bg-teal-100 text-teal-800 text-[10px] md:text-xs px-1.5 md:px-2">
                {selectedEmails.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 md:h-8 px-1 md:px-2"
                title="Ausgewählte löschen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Active Filter Indicator - compact on mobile */}
          {advancedFilters && (
            <div className="flex items-center gap-1 md:gap-2">
              <Badge variant="secondary" className="bg-teal-100 text-teal-800 text-[10px] md:text-xs hidden md:inline-flex">
                Filter aktiv
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAdvancedFilters}
                className="h-6 w-6 p-0 hover:bg-gray-200"
                title="Filter zurücksetzen"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Search - hidden on mobile (use header search) */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="E-Mails durchsuchen..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) clearAdvancedFilters();
              }}
              className="pl-10 h-8 text-sm"
            />
          </div>

          {/* Spacer on mobile */}
          <div className="flex-1 md:hidden" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchMessages(currentMailbox)}
            disabled={loading}
            title="Aktualisieren"
            className="h-7 md:h-8 px-1.5 md:px-2"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          )}

          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Mail className="h-12 w-12 mb-4" />
              <p>Keine E-Mails in diesem Ordner</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMessages.map((msg) => (
                <EmailItem
                  key={msg.uid}
                  email={msg}
                  isSelected={selectedEmails.includes(msg.uid)}
                  onSelect={handleSelectEmail}
                  onClick={handleEmailClick}
                  onStar={handleStarEmail}
                  onDelete={handleDelete}
                  onMarkAsRead={handleMarkAsRead}
                  onMoveToSpam={handleMoveToSpam}
                  onMoveToFolder={handleMoveToFolder}
                  mailboxes={mailboxes}
                  currentMailbox={currentMailbox}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Viewer - Takes Remaining Space on desktop, full screen on mobile */}
      {selectedEmail && (messageLoading || messageError || currentMessage) && (
        <div className="fixed inset-0 md:relative md:inset-auto md:flex-1 bg-white overflow-hidden min-w-0 z-40 md:z-auto">
          {messageLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Nachricht wird geladen...</p>
              </div>
            </div>
          ) : messageError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Fehler beim Laden</h3>
                <p className="text-gray-600 text-sm mb-4">{messageError}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={handleCloseEmail}>
                    Zurück
                  </Button>
                  <Button onClick={() => fetchMessage(selectedEmail.uid)} className="bg-teal-600 hover:bg-teal-700">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Erneut versuchen
                  </Button>
                </div>
              </div>
            </div>
          ) : currentMessage ? (
            <EmailViewer
              email={currentMessage}
              onClose={handleCloseEmail}
              onReply={() => handleCompose(currentMessage)}
              onForward={() => handleCompose(currentMessage)}
              onDelete={handleDelete}
              onStar={handleStarEmail}
              onMoveToSpam={handleMoveToSpam}
              onMoveToFolder={handleMoveToFolder}
              mailboxes={mailboxes}
              currentMailbox={currentMailbox}
              credentials={{ email, password }}
            />
          ) : null}
        </div>
      )}
      </div>

      {/* Mobile FAB - Compose Button (Gmail-style) */}
      <button
        onClick={() => handleCompose()}
        className="fixed bottom-6 right-6 md:hidden z-30 w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        aria-label="E-Mail schreiben"
      >
        <Pencil className="h-6 w-6" />
      </button>

      {/* Compose Modal */}
      <EmailComposeComponent
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setReplyToEmail(null);
          setComposeToEmail(undefined);
        }}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        replyTo={replyToEmail ? convertWebmailToEmailClientMessage(replyToEmail) : undefined}
        initialTo={composeToEmail}
      />
    </div>
  );
}
