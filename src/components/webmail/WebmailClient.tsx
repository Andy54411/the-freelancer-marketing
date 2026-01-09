'use client';

import { useState, useEffect, memo, useCallback, useMemo } from 'react';
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
  Loader2,
  AlertCircle,
  MoreHorizontal,
  MoreVertical,
  ArrowLeft,
  Pencil,
  AlertTriangle,
  FolderInput,
  Tag,
  Folder,
  Download,
  FileText,
  Image as ImageIcon,
  File,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Bell,
} from 'lucide-react';
import { useWebmail } from '@/hooks/useWebmail';
import { EmailMessage, Mailbox } from '@/services/webmail/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { MailSidebar } from './MailSidebar';
import { MailHeader } from './MailHeader';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { QuickSettings, loadSettings, getThemeById, WebmailSettings } from './QuickSettings';
import { SearchFilters, filterMessagesClientSide } from './MailSearchFilter';
import { EmailCompose as EmailComposeComponent } from '@/components/email-client/EmailCompose';
import type { EmailCompose as EmailComposeType, EmailMessage as EmailClientMessage } from '@/components/email-client/types';

// Debug-Logging für Hydration
const webmailClientLog = (_step: string, _data?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
  } else {
  }
};

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

// E-Mail Kategorien für Gmail-Style Tabs
type EmailCategory = 'primary' | 'promotions' | 'social' | 'updates';

// Intelligente E-Mail-Kategorisierung
const categorizeEmail = (email: EmailMessage): EmailCategory => {
  const fromAddress = email.from[0]?.address?.toLowerCase() || '';
  const fromName = email.from[0]?.name?.toLowerCase() || '';
  const subject = email.subject?.toLowerCase() || '';
  const fromDomain = fromAddress.split('@')[1] || '';

  // Soziale Netzwerke - bekannte Domains und Absender
  const socialDomains = [
    'facebook.com', 'facebookmail.com', 'fb.com',
    'twitter.com', 'x.com',
    'linkedin.com', 'linkedinmail.com',
    'instagram.com',
    'xing.com', 'xing.de',
    'tiktok.com',
    'youtube.com',
    'pinterest.com',
    'snapchat.com',
    'reddit.com',
    'tumblr.com',
    'whatsapp.com',
    'telegram.org',
    'discord.com',
    'slack.com',
    'teams.microsoft.com',
  ];
  
  const socialKeywords = [
    'friend request', 'freundschaftsanfrage',
    'followed you', 'folgt dir',
    'liked your', 'gefaellt',
    'commented on', 'kommentiert',
    'mentioned you', 'erwaehnt',
    'tagged you', 'markiert',
    'connection request', 'vernetzungsanfrage',
    'new message from', 'neue nachricht von',
    'invitation to connect', 'einladung',
  ];

  if (socialDomains.some(d => fromDomain.includes(d)) ||
      socialKeywords.some(k => subject.includes(k) || fromName.includes(k))) {
    return 'social';
  }

  // Werbung / Promotions - Newsletter, Marketing, Angebote
  const promoDomains = [
    'newsletter', 'marketing', 'promo', 'deals', 'offers',
    'mailchimp.com', 'sendgrid.net', 'amazonses.com',
    'mailgun.org', 'constantcontact.com', 'hubspot.com',
    'klaviyo.com', 'brevo.com', 'sendinblue.com',
  ];

  const promoKeywords = [
    'newsletter', 'unsubscribe', 'abmelden', 'abbestellen',
    'angebot', 'offer', 'sale', 'rabatt', 'discount',
    'gutschein', 'coupon', 'voucher', 'code:',
    'limited time', 'nur heute', 'nur jetzt',
    'free shipping', 'kostenloser versand',
    'deal', 'promotion', 'aktion',
    'black friday', 'cyber monday',
    'exklusiv', 'exclusive',
    'jetzt kaufen', 'buy now', 'shop now',
    'neue kollektion', 'new collection',
    'sonderangebot', 'special offer',
  ];

  const promoSenders = [
    'noreply', 'no-reply', 'newsletter', 'marketing',
    'promo', 'deals', 'offers', 'news@', 'info@',
    'shop@', 'store@', 'sales@',
  ];

  if (promoDomains.some(d => fromDomain.includes(d) || fromAddress.includes(d)) ||
      promoKeywords.some(k => subject.includes(k)) ||
      promoSenders.some(s => fromAddress.includes(s))) {
    return 'promotions';
  }

  // Benachrichtigungen / Updates - Transaktional, Bestaetigungen, Alerts
  const updateDomains = [
    'paypal.com', 'paypal.de',
    'amazon.com', 'amazon.de',
    'ebay.com', 'ebay.de',
    'dhl.com', 'dhl.de',
    'dpd.de', 'hermes.de', 'ups.com',
    'bank', 'sparkasse', 'volksbank', 'commerzbank', 'deutsche-bank',
    'stripe.com', 'revolut.com',
  ];

  const updateKeywords = [
    'bestaetigung', 'confirmation', 'confirmed',
    'rechnung', 'invoice', 'receipt', 'quittung',
    'versand', 'shipping', 'delivery', 'lieferung', 'zustellung',
    'bestellung', 'order', 'ihre bestellung',
    'passwort', 'password', 'reset', 'zuruecksetzen',
    'verifizierung', 'verification', 'verify', 'bestaetigen',
    'sicherheit', 'security', 'alert', 'warnung',
    'login', 'anmeldung', 'sign in',
    'zahlung', 'payment', 'transaktion', 'transaction',
    'konto', 'account', 'ihr konto',
    'termin', 'appointment', 'reminder', 'erinnerung',
    'update', 'aktualisierung',
    'benachrichtigung', 'notification',
    'ticket', 'support', 'anfrage',
  ];

  const updateSenders = [
    'support@', 'service@', 'help@', 'billing@',
    'notifications@', 'alerts@', 'security@',
    'noreply@', 'no-reply@', 'donotreply@',
    'system@', 'automated@', 'mailer-daemon',
  ];

  if (updateDomains.some(d => fromDomain.includes(d)) ||
      updateKeywords.some(k => subject.includes(k)) ||
      updateSenders.some(s => fromAddress.includes(s))) {
    return 'updates';
  }

  // Alles andere ist "Allgemein" / Primary
  return 'primary';
};

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
  companyId?: string;
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
  density: 'default' | 'comfortable' | 'compact';
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
  density,
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
  // Read isDark directly from context - this ensures it always has the correct value
  const { isDark } = useWebmailTheme();
  const isUnread = !email.flags.includes('\\Seen');
  const isStarred = email.flags.includes('\\Flagged');
  const fromName = email.from[0]?.name || email.from[0]?.address || 'Unbekannt';
  const { relative, absolute } = formatEmailDate(email.date);

  // Padding basierend auf Kompaktheitsgrad
  const densityClasses = {
    default: 'px-2 py-2.5',
    comfortable: 'px-2 py-3.5',
    compact: 'px-2 py-1',
  };

  // Berechne Hintergrund- und Hover-Klassen basierend auf Status
  const getRowClasses = () => {
    if (isSelected) {
      return isDark 
        ? 'bg-teal-900/40 border-l-teal-500 hover:bg-teal-900/50' 
        : 'bg-teal-100 border-l-teal-600 hover:bg-teal-200';
    }
    if (isUnread) {
      return isDark 
        ? 'bg-[#3c4043] border-l-teal-500 hover:bg-[#4a4d50]' 
        : 'bg-blue-50 border-l-teal-500 hover:bg-blue-100';
    }
    return isDark 
      ? 'hover:bg-[#3c4043]' 
      : 'hover:bg-gray-100';
  };

  // Berechne Textfarben basierend auf Status
  const getTextClasses = (isMainText: boolean) => {
    if (isUnread) {
      return isDark 
        ? 'font-semibold text-white' 
        : 'font-semibold text-gray-900';
    }
    return isDark 
      ? (isMainText ? 'font-medium text-white' : 'text-white')
      : (isMainText ? 'font-medium text-gray-700' : 'text-gray-500');
  };

  return (
    <div
      className={cn(
        'group cursor-pointer transition-all duration-150 w-full min-w-0 border-l-2 border-l-transparent',
        densityClasses[density],
        getRowClasses()
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
              : isDark ? 'text-gray-500 hover:text-white' : 'text-white hover:text-gray-500'
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
                <span className={cn('text-[11px] truncate block leading-tight', getTextClasses(true))}>
                  {fromName}
                </span>
                {email.hasAttachments && (
                  <Paperclip className={cn("h-2.5 w-2.5 shrink-0", isDark ? "text-gray-500" : "text-white")} />
                )}
              </div>

              <div className="line-clamp-1">
                <span className={cn('text-[11px] leading-tight', getTextClasses(true))}>
                  {email.subject || '(Kein Betreff)'}
                </span>
                <span className={cn('text-[10px] leading-tight ml-1', getTextClasses(false))}>
                  {email.preview}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 ml-2">
              <span className={cn('text-[10px] whitespace-nowrap leading-tight', getTextClasses(true))}>
                {relative}
              </span>
              <span className={cn("text-[9px] whitespace-nowrap leading-tight", isDark ? "text-gray-500" : "text-white")}>
                {absolute}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                      isDark ? "hover:bg-[#5f6368]" : "hover:bg-gray-200"
                    )}
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreHorizontal className={cn("h-3.5 w-3.5", isDark ? "text-white" : "text-gray-500")} />
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
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.density === nextProps.density
  );
});

EmailItem.displayName = 'EmailItem';

// ===== EMAIL VIEWER COMPONENT =====
interface AttachmentInfo {
  filename: string;
  contentType?: string;
  size?: number;
  partId?: string;
  contentId?: string;
  data?: string;
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
  const { isDark } = useWebmailTheme();
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
    if (!contentType) return <File className="h-4 w-4 text-white" />;
    if (contentType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (contentType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    if (contentType.includes('word') || contentType.includes('document')) return <FileText className="h-4 w-4 text-blue-600" />;
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return <FileText className="h-4 w-4 text-green-600" />;
    return <File className="h-4 w-4 text-white" />;
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
    mb.path.toLowerCase().includes('archive')
  );
  const trashFolder = mailboxes.find(mb => 
    mb.path.toLowerCase().includes('trash') || mb.path.toLowerCase().includes('papierkorb')
  );
  const inboxFolder = mailboxes.find(mb => 
    mb.path.toLowerCase() === 'inbox'
  );
  
  // Process HTML to open links in new tab and replace CID images with inline data
  const processedHtml = (() => {
    if (!email.html) return '';
    
    let html = email.html
      // Add target="_blank" and rel="noopener noreferrer" to all links
      .replace(/<a\s+/gi, '<a target="_blank" rel="noopener noreferrer" ')
      // Remove any existing target attributes to avoid duplicates
      .replace(/target="_blank"\s+target="[^"]*"/gi, 'target="_blank"')
      // Add referrerpolicy="no-referrer" to all images to allow external images (e.g. Gmail signatures)
      .replace(/<img\s+/gi, '<img referrerpolicy="no-referrer" ');
    
    // Replace CID images with Base64 data from inline attachments
    if (email.attachments && email.attachments.length > 0) {
      email.attachments.forEach(att => {
        if (att.contentId && att.data) {
          // CID kann mit oder ohne < > sein
          const cidClean = att.contentId.replace(/^<|>$/g, '');
          const dataUrl = `data:${att.contentType};base64,${att.data}`;
          
          // Ersetze alle Varianten von CID-Referenzen
          html = html
            .replace(new RegExp(`src=["']cid:${cidClean}["']`, 'gi'), `src="${dataUrl}"`)
            .replace(new RegExp(`src=["']cid:${att.contentId}["']`, 'gi'), `src="${dataUrl}"`);
        }
      });
    }
    
    return html;
  })();
  
  return (
    <div className={cn("h-full flex flex-col", isDark ? "bg-[#2d2e30]" : "bg-white")}>
      {/* Header */}
      <div className={cn("border-b px-6 py-4 flex items-center justify-between shrink-0", isDark ? "border-[#5f6368]" : "")}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className={cn("text-lg font-semibold truncate", isDark ? "text-white" : "")}>{email.subject}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button variant="ghost" size="sm" onClick={onReply}>
            <Reply className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Antworten</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onForward}>
            <Forward className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Weiterleiten</span>
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
            <div className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>
              {email.from[0]?.name || email.from[0]?.address}
            </div>
            <div className={cn("text-sm", isDark ? "text-white" : "text-gray-500")}>
              {email.from[0]?.address}
            </div>
            <div className={cn("text-sm mt-1", isDark ? "text-white" : "text-gray-500")}>
              An: {email.to.map(t => t.address).join(', ')}
            </div>
            <div className={cn("text-sm mt-1", isDark ? "text-gray-500" : "text-white")}>
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
          <div className={cn("mb-6 p-4 rounded-lg", isDark ? "bg-[#3c4043]" : "bg-gray-50")}>
            <div className={cn("text-sm font-medium mb-3 flex items-center gap-2", isDark ? "text-white" : "text-gray-700")}>
              <Paperclip className="h-4 w-4" />
              {email.attachments.length} {email.attachments.length === 1 ? 'Anhang' : 'Anhaenge'}
            </div>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att, i) => (
                <button
                  key={i}
                  onClick={() => handleDownloadAttachment(att)}
                  disabled={downloadingAttachment === att.filename}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50",
                    isDark 
                      ? "bg-[#2d2e30] border-[#5f6368] hover:bg-[#4a4d50] hover:border-teal-500" 
                      : "bg-white border-gray-200 hover:bg-teal-50 hover:border-teal-300"
                  )}
                >
                  {downloadingAttachment === att.filename ? (
                    <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  ) : (
                    getAttachmentIcon(att.contentType)
                  )}
                  <span className="max-w-[200px] truncate">{att.filename}</span>
                  {att.size && (
                    <span className="text-xs text-white">({formatFileSize(att.size)})</span>
                  )}
                  <Download className="h-3 w-3 text-white" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Email Body - Always light background for readability */}
        <div className={cn(
          "prose prose-sm max-w-none rounded-lg",
          isDark && "bg-white p-4"
        )}>
          {email.html ? (
            <div 
              dangerouslySetInnerHTML={{ __html: processedHtml }}
              className="email-content"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-gray-800">
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
export function WebmailClient({ email, password, onLogout, initialComposeTo, companyId }: WebmailClientProps) {
  webmailClientLog('RENDER_START', { 
    hasEmail: !!email, 
    hasPassword: !!password, 
    hasCompanyId: !!companyId,
    initialComposeTo
  });
  
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
  
  // Mehrere Compose-Fenster Support (Gmail-style)
  interface ComposeWindow {
    id: string;
    isMinimized: boolean;
    replyTo?: EmailMessage | null;
    initialTo?: string;
  }
  const [composeWindows, setComposeWindows] = useState<ComposeWindow[]>([]);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>('basicwhite');
  const [currentDensity, setCurrentDensity] = useState<'default' | 'comfortable' | 'compact'>('default');
  const [currentInboxType, setCurrentInboxType] = useState<'default' | 'important-first' | 'unread-first' | 'starred-first' | 'priority' | 'multiple'>('default');
  const [activeCategory, setActiveCategory] = useState<EmailCategory>('primary');
  
  // States für Mehrere Posteingänge
  const [draftsMessages, setDraftsMessages] = useState<EmailMessage[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [sentMessages, setSentMessages] = useState<EmailMessage[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [trashMessages, setTrashMessages] = useState<EmailMessage[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [spamMessages, setSpamMessages] = useState<EmailMessage[]>([]);
  const [spamLoading, setSpamLoading] = useState(false);
  const [archiveMessages, setArchiveMessages] = useState<EmailMessage[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Lade Theme, Dichte und Posteingang-Typ aus Einstellungen
  useEffect(() => {
    const savedSettings = loadSettings();
    setCurrentTheme(savedSettings.theme);
    setCurrentDensity(savedSettings.density);
    setCurrentInboxType(savedSettings.inboxType);
  }, []);

  // Handler für Einstellungsänderungen
  const handleSettingsChange = (settings: WebmailSettings) => {
    setCurrentTheme(settings.theme);
    setCurrentDensity(settings.density);
    setCurrentInboxType(settings.inboxType);
  };

  // Alle Mailboxen laden für Mehrere Posteingänge
  useEffect(() => {
    if (currentInboxType === 'multiple' && email && password) {
      // Helper Funktion zum Laden einer Mailbox
      const loadMailbox = async (
        mailboxName: string, 
        setMessages: React.Dispatch<React.SetStateAction<EmailMessage[]>>,
        setLoading: React.Dispatch<React.SetStateAction<boolean>>
      ) => {
        setLoading(true);
        try {
          const res = await fetch('/api/webmail/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, mailbox: mailboxName }),
          });
          const data = await res.json();
          if (data.success && data.messages) {
            setMessages(data.messages.map((m: { date: string | number | Date }) => ({
              ...m,
              date: new Date(m.date),
            })));
          } else {
            setMessages([]);
          }
        } catch {
          setMessages([]);
        } finally {
          setLoading(false);
        }
      };

      // Alle Mailboxen parallel laden
      loadMailbox('Drafts', setDraftsMessages, setDraftsLoading);
      loadMailbox('Sent', setSentMessages, setSentLoading);
      loadMailbox('Trash', setTrashMessages, setTrashLoading);
      loadMailbox('Junk', setSpamMessages, setSpamLoading);
      loadMailbox('Archive', setArchiveMessages, setArchiveLoading);
    }
  }, [currentInboxType, email, password]);

  // Theme-Hintergrundbild berechnen
  const themeData = getThemeById(currentTheme);
  const { isDark } = useWebmailTheme();
  const backgroundStyle = themeData?.backgroundUrl 
    ? { 
        backgroundImage: `url(${themeData.backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } 
    : {};

  useEffect(() => {
    fetchMailboxes();
    fetchMessages('INBOX');
  }, [fetchMailboxes, fetchMessages]);

  // Öffne Compose-Dialog wenn initialComposeTo übergeben wurde
  useEffect(() => {
    if (initialComposeTo) {
      // Neues Compose-Fenster öffnen
      const newId = `compose-${Date.now()}`;
      setComposeWindows(prev => [...prev, { id: newId, isMinimized: false, initialTo: initialComposeTo }]);
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
    
    // Automatisch als gelesen markieren, wenn ungelesen
    const isUnread = !msg.flags.includes('\\Seen');
    if (isUnread) {
      performAction('markRead', msg.uid).then(() => {
        // Aktualisiere die Nachrichten-Liste um das UI zu aktualisieren
        fetchMessages(currentMailbox);
      });
    }
  }, [fetchMessage, currentMailbox, performAction, fetchMessages]);

  const handleCloseEmail = useCallback(() => {
    setSelectedEmail(null);
    clearCurrentMessage();
    clearMessageError();
  }, [clearCurrentMessage, clearMessageError]);

  // Neues Compose-Fenster öffnen (Gmail-style: mehrere möglich)
  const handleCompose = useCallback((replyTo?: EmailMessage) => {
    const newId = `compose-${Date.now()}`;
    setComposeWindows(prev => [...prev, { id: newId, isMinimized: false, replyTo: replyTo || null }]);
  }, []);

  // Compose-Fenster schließen
  const handleCloseCompose = useCallback((windowId: string) => {
    setComposeWindows(prev => prev.filter(w => w.id !== windowId));
  }, []);

  // Compose-Fenster minimieren/maximieren
  const handleToggleMinimize = useCallback((windowId: string) => {
    setComposeWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isMinimized: !w.isMinimized } : w
    ));
  }, []);

  const handleSendEmail = useCallback(async (composeData: EmailComposeType, windowId?: string) => {
    // Convert EmailComposeType to webmail API format
    // Parse 'to' field - kann kommagetrennt sein oder einzelne Adresse
    const toAddresses = composeData.to.split(',').map(e => e.trim()).filter(Boolean);
    const toValue = toAddresses.length === 1 ? toAddresses[0] : toAddresses;
    
    const apiData = {
      to: toValue,
      subject: composeData.subject,
      text: composeData.body,
      html: composeData.body, // TODO: Implement rich text
      cc: composeData.cc ? composeData.cc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
      bcc: composeData.bcc ? composeData.bcc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
      attachments: composeData.attachments,
    };
    
    const result = await sendEmail(apiData);
    if (result.success) {
      // Compose-Fenster schließen
      if (windowId) {
        setComposeWindows(prev => prev.filter(w => w.id !== windowId));
      }
      fetchMessages(currentMailbox);
    }
  }, [sendEmail, fetchMessages, currentMailbox]);

  // Save draft functionality
  const handleSaveDraft = useCallback(async (composeData: EmailComposeType, windowId?: string) => {
    if (!email || !password) return;

    // Check if there's any content worth saving
    const hasContent = composeData.to || composeData.subject || composeData.body;
    if (!hasContent) {
      // Compose-Fenster schließen
      if (windowId) {
        setComposeWindows(prev => prev.filter(w => w.id !== windowId));
      }
      return;
    }

    try {
      const response = await fetch('/api/webmail/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          action: 'saveDraft',
          draft: {
            to: composeData.to || undefined,
            cc: composeData.cc ? composeData.cc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
            bcc: composeData.bcc ? composeData.bcc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
            subject: composeData.subject || '',
            html: composeData.body || '',
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Entwurf gespeichert');
        // Reload drafts if in multiple inbox view
        if (currentInboxType === 'multiple') {
          setDraftsLoading(true);
          fetch('/api/webmail/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, mailbox: 'Drafts' }),
          })
            .then(res => res.json())
            .then(result => {
              if (result.success && result.messages) {
                setDraftsMessages(result.messages.map((m: { date: string | number | Date }) => ({
                  ...m,
                  date: new Date(m.date),
                })));
              }
            })
            .finally(() => setDraftsLoading(false));
        }
      } else {
        toast.error('Entwurf konnte nicht gespeichert werden');
      }
    } catch {
      toast.error('Fehler beim Speichern des Entwurfs');
    }

    // Compose-Fenster schließen
    if (windowId) {
      setComposeWindows(prev => prev.filter(w => w.id !== windowId));
    }
  }, [email, password, currentInboxType]);

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
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    
    // Apply category filter (nur im Posteingang)
    if (currentMailbox.toLowerCase() === 'inbox') {
      filtered = filtered.filter(msg => categorizeEmail(msg) === activeCategory);
    }
    
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
    
    // Sortierung basierend auf Posteingang-Typ anwenden
    if (currentInboxType !== 'default') {
      filtered = [...filtered].sort((a, b) => {
        const aUnread = !a.flags.includes('\\Seen');
        const bUnread = !b.flags.includes('\\Seen');
        const aStarred = a.flags.includes('\\Flagged');
        const bStarred = b.flags.includes('\\Flagged');
        const aDate = new Date(a.date).getTime();
        const bDate = new Date(b.date).getTime();
        
        switch (currentInboxType) {
          case 'unread-first':
            // Ungelesene zuerst, dann nach Datum
            if (aUnread !== bUnread) return aUnread ? -1 : 1;
            return bDate - aDate;
            
          case 'starred-first':
            // Markierte zuerst, dann nach Datum
            if (aStarred !== bStarred) return aStarred ? -1 : 1;
            return bDate - aDate;
            
          case 'important-first':
            // Wichtige (markiert + ungelesen) zuerst
            const aImportant = aStarred || aUnread;
            const bImportant = bStarred || bUnread;
            if (aImportant !== bImportant) return aImportant ? -1 : 1;
            return bDate - aDate;
            
          case 'priority':
            // Priorität: Markiert > Ungelesen > Rest
            const aPriority = aStarred ? 2 : aUnread ? 1 : 0;
            const bPriority = bStarred ? 2 : bUnread ? 1 : 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            return bDate - aDate;
            
          default:
            return bDate - aDate;
        }
      });
    }
    
    return filtered;
  }, [messages, currentMailbox, activeCategory, searchQuery, advancedFilters, currentInboxType]);

  // Zaehle E-Mails pro Kategorie und hole neueste ungelesene fuer Vorschau
  const categoryData = (() => {
    if (currentMailbox.toLowerCase() !== 'inbox') {
      return { 
        primary: { count: 0, preview: null },
        promotions: { count: 0, preview: null },
        social: { count: 0, preview: null },
        updates: { count: 0, preview: null }
      };
    }
    
    const data: Record<EmailCategory, { count: number; preview: EmailMessage | null }> = {
      primary: { count: 0, preview: null },
      promotions: { count: 0, preview: null },
      social: { count: 0, preview: null },
      updates: { count: 0, preview: null }
    };
    
    // Sortiere nach Datum (neueste zuerst)
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    sortedMessages.forEach(msg => {
      const category = categorizeEmail(msg);
      const isUnread = !msg.flags.includes('\\Seen');
      
      if (isUnread) {
        data[category].count++;
        // Speichere nur die erste (neueste) ungelesene E-Mail als Vorschau
        if (!data[category].preview) {
          data[category].preview = msg;
        }
      }
    });
    
    return data;
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
      <div className={`fixed inset-0 flex items-center justify-center ${isDark ? 'bg-[#202124]' : 'bg-white'}`}>
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Verbindungsfehler</h3>
          <p className={`mb-6 ${isDark ? 'text-white' : 'text-gray-600'}`}>{error}</p>
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
      <div className={`fixed inset-0 flex items-center justify-center ${isDark ? 'bg-[#202124]' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`inline-block w-16 h-16 border-4 border-t-teal-600 rounded-full animate-spin ${isDark ? 'border-gray-700' : 'border-gray-200'}`}></div>
          <p className={`mt-6 text-lg font-medium ${isDark ? 'text-white' : 'text-gray-600'}`}>E-Mails werden geladen...</p>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-white'}`}>Verbindung zu {email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 flex flex-col ${isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]'}`} style={backgroundStyle}>
      {/* Mail Header - muss über allem liegen */}
      <div className="relative z-50">
        <MailHeader
          userEmail={email}
          companyId={companyId}
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
          onSettingsClick={() => setShowQuickSettings(true)}
          mailboxes={mailboxes.map(m => ({ path: m.path, name: m.name }))}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-w-0 relative z-10 p-4 gap-4">
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
            'flex flex-col overflow-hidden relative min-w-0 rounded-2xl',
            // Transparenter Hintergrund wenn Theme aktiv
            themeData?.backgroundUrl 
              ? 'bg-white/90 shadow-lg' 
              : isDark 
                ? 'bg-[#2d2e30]' 
                : 'bg-white',
            // Mobile: full width, hide when viewing email
            selectedEmail ? 'hidden md:flex md:w-96 md:shrink-0' : 'flex-1'
          )}
        >
        {/* Gmail-Style Toolbar */}
        <div className={cn(
          "border-b px-2 md:px-3 py-1 flex items-center gap-2 shrink-0",
          isDark ? "border-[#5f6368]" : "border-gray-200/50"
        )}>
          {/* Checkbox mit Dropdown */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => handleSelectAll()}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchMessages(currentMailbox)}
            disabled={loading}
            title="Aktualisieren"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn('h-4 w-4', isDark ? 'text-white' : 'text-gray-600', loading && 'animate-spin')} />
          </Button>

          {/* Drei-Punkte-Menu */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Weitere Aktionen"
          >
            <MoreVertical className={cn("h-4 w-4", isDark ? "text-white" : "text-gray-600")} />
          </Button>

          {selectedEmails.length > 0 && (
            <div className={cn("flex items-center gap-1 border-l pl-2 ml-1", isDark ? "border-[#5f6368]" : "border-gray-300")}>
              <Badge variant="secondary" className="bg-teal-100 text-teal-800 text-xs px-2">
                {selectedEmails.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                title="Ausgewählte löschen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Pagination */}
          <div className={cn("hidden md:flex items-center gap-1 text-sm", isDark ? "text-white" : "text-gray-600")}>
            <span>1-{Math.min(filteredMessages.length, 50)} von {filteredMessages.length}</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Gmail-Style Category Tabs - nur im Posteingang und NICHT bei Mehrere Posteingänge anzeigen */}
        {currentMailbox.toLowerCase() === 'inbox' && currentInboxType !== 'multiple' && (
          <div className="flex items-stretch border-b border-gray-200/50 overflow-x-auto scrollbar-hide">
            {/* Allgemein Tab */}
            <button 
              onClick={() => setActiveCategory('primary')}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-colors shrink-0',
                activeCategory === 'primary'
                  ? 'font-medium text-blue-600 border-b-[3px] border-blue-600'
                  : isDark ? 'text-white hover:bg-white/10 border-b-[3px] border-transparent' : 'text-gray-700 hover:bg-gray-50/50 border-b-[3px] border-transparent'
              )}
            >
              <Inbox className="h-5 w-5 shrink-0" />
              <div className="flex flex-col items-start text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span>Allgemein</span>
                  {categoryData.primary.count > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500 text-white rounded">
                      {categoryData.primary.count} neu
                    </span>
                  )}
                </div>
                {categoryData.primary.preview && activeCategory !== 'primary' && (
                  <span className="text-xs text-gray-500 truncate max-w-[180px]">
                    {categoryData.primary.preview.from[0]?.name || categoryData.primary.preview.from[0]?.address?.split('@')[0]} – {categoryData.primary.preview.subject?.substring(0, 20)}...
                  </span>
                )}
              </div>
            </button>

            {/* Werbung Tab */}
            <button 
              onClick={() => setActiveCategory('promotions')}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-colors shrink-0',
                activeCategory === 'promotions'
                  ? 'font-medium text-green-600 border-b-[3px] border-green-600'
                  : isDark ? 'text-white hover:bg-white/10 border-b-[3px] border-transparent' : 'text-gray-700 hover:bg-gray-50/50 border-b-[3px] border-transparent'
              )}
            >
              <Tag className="h-5 w-5 shrink-0" />
              <div className="flex flex-col items-start text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span>Werbung</span>
                  {categoryData.promotions.count > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-green-500 text-white rounded">
                      {categoryData.promotions.count} neu
                    </span>
                  )}
                </div>
                {categoryData.promotions.preview && activeCategory !== 'promotions' && (
                  <span className="text-xs text-gray-500 truncate max-w-[180px]">
                    {categoryData.promotions.preview.from[0]?.name || categoryData.promotions.preview.from[0]?.address?.split('@')[0]} – {categoryData.promotions.preview.subject?.substring(0, 20)}...
                  </span>
                )}
              </div>
            </button>

            {/* Soziale Netzwerke Tab */}
            <button 
              onClick={() => setActiveCategory('social')}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-colors shrink-0',
                activeCategory === 'social'
                  ? 'font-medium text-red-600 border-b-[3px] border-red-600'
                  : isDark ? 'text-white hover:bg-white/10 border-b-[3px] border-transparent' : 'text-gray-700 hover:bg-gray-50/50 border-b-[3px] border-transparent'
              )}
            >
              <Users className="h-5 w-5 shrink-0" />
              <div className="flex flex-col items-start text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span>Soziale Netzwerke</span>
                  {categoryData.social.count > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded">
                      {categoryData.social.count} neu
                    </span>
                  )}
                </div>
                {categoryData.social.preview && activeCategory !== 'social' && (
                  <span className="text-xs text-gray-500 truncate max-w-[180px]">
                    {categoryData.social.preview.from[0]?.name || categoryData.social.preview.from[0]?.address?.split('@')[0]} – {categoryData.social.preview.subject?.substring(0, 20)}...
                  </span>
                )}
              </div>
            </button>

            {/* Benachrichtigungen Tab */}
            <button 
              onClick={() => setActiveCategory('updates')}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-colors shrink-0',
                activeCategory === 'updates'
                  ? 'font-medium text-yellow-600 border-b-[3px] border-yellow-600'
                  : isDark ? 'text-white hover:bg-white/10 border-b-[3px] border-transparent' : 'text-gray-700 hover:bg-gray-50/50 border-b-[3px] border-transparent'
              )}
            >
              <Bell className="h-5 w-5 shrink-0" />
              <div className="flex flex-col items-start text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span>Benachrichtigungen</span>
                  {categoryData.updates.count > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-500 text-white rounded">
                      {categoryData.updates.count} neu
                    </span>
                  )}
                </div>
                {categoryData.updates.preview && activeCategory !== 'updates' && (
                  <span className="text-xs text-gray-500 truncate max-w-[180px]">
                    {categoryData.updates.preview.from[0]?.name || categoryData.updates.preview.from[0]?.address?.split('@')[0]} – {categoryData.updates.preview.subject?.substring(0, 20)}...
                  </span>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          )}

          {filteredMessages.length === 0 && currentInboxType !== 'multiple' ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Mail className="h-12 w-12 mb-4" />
              <p>Keine E-Mails in diesem Ordner</p>
            </div>
          ) : currentInboxType === 'multiple' ? (
            /* Mehrere Posteingänge Layout - alle Mailboxen untereinander wie Gmail */
            <div>
              {/* Markierte E-Mails Sektion */}
              {(() => {
                const starredMessages = messages.filter(m => m.flags.includes('\\Flagged'));
                const isCollapsed = collapsedSections['starred'];
                return (
                  <div className={cn("border-b", isDark ? "border-[#5f6368]" : "border-gray-300")}>
                    <div 
                      className={cn("flex items-center justify-between px-3 py-1.5 cursor-pointer select-none", isDark ? "bg-[#2d2e30] hover:bg-[#3c4043]" : "bg-white hover:bg-gray-50")}
                      onClick={() => setCollapsedSections(prev => ({ ...prev, starred: !prev.starred }))}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isDark ? "text-white" : "text-gray-500", isCollapsed && "-rotate-90")} />
                        <span className={cn("text-sm", isDark ? "text-white" : "text-gray-700")}>is:starred</span>
                      </div>
                      <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-white" : "text-gray-500")}>
                        <span>{starredMessages.length > 0 ? `1-${starredMessages.length} von ${starredMessages.length}` : '0'}</span>
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                    {!isCollapsed && starredMessages.length > 0 && (
                      <div className={cn("divide-y", isDark ? "divide-[#5f6368]" : "divide-gray-100")}>
                        {starredMessages.map((msg) => (
                          <EmailItem
                            key={`starred-${msg.uid}`}
                            email={msg}
                            isSelected={selectedEmails.includes(msg.uid)}
                            density={currentDensity}
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
                );
              })()}

              {/* Entwürfe Sektion */}
              {(() => {
                const isCollapsed = collapsedSections['drafts'];
                return (
                  <div className={cn("border-b", isDark ? "border-[#5f6368]" : "border-gray-300")}>
                    <div 
                      className={cn("flex items-center justify-between px-3 py-1.5 cursor-pointer select-none", isDark ? "bg-[#2d2e30] hover:bg-[#3c4043]" : "bg-white hover:bg-gray-50")}
                      onClick={() => setCollapsedSections(prev => ({ ...prev, drafts: !prev.drafts }))}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isDark ? "text-white" : "text-gray-500", isCollapsed && "-rotate-90")} />
                        <span className={cn("text-sm", isDark ? "text-white" : "text-gray-700")}>is:drafts</span>
                      </div>
                      <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-white" : "text-gray-500")}>
                        {draftsLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span>{draftsMessages.length > 0 ? `1-${draftsMessages.length} von ${draftsMessages.length}` : '0'}</span>
                        )}
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                    {!isCollapsed && !draftsLoading && draftsMessages.length > 0 && (
                      <div className={cn("divide-y", isDark ? "divide-[#5f6368]" : "divide-gray-100")}>
                        {draftsMessages.map((msg) => (
                          <div
                            key={`draft-${msg.uid}`}
                            className="group flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50/80 cursor-pointer transition-all duration-150 w-full"
                            onClick={() => {
                              fetchMessage(msg.uid, 'Drafts');
                              setSelectedEmail(msg);
                            }}
                          >
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" onClick={e => e.stopPropagation()} />
                            <Star className="h-4 w-4 text-white" />
                            <span className="text-red-500 font-medium text-sm shrink-0">Entwurf</span>
                            <span className="text-gray-800 text-sm truncate flex-1">{msg.subject || '(kein Betreff)'}</span>
                            <span className="text-xs text-gray-500 shrink-0">{formatEmailDate(msg.date).relative}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Posteingang Sektion */}
              {(() => {
                const inboxMessages = messages.filter(m => !m.flags.includes('\\Flagged'));
                const isCollapsed = collapsedSections['inbox'];
                return (
                  <div className={cn("border-b", isDark ? "border-[#5f6368]" : "border-gray-300")}>
                    <div 
                      className={cn("flex items-center justify-between px-3 py-1.5 cursor-pointer select-none", isDark ? "bg-[#2d2e30] hover:bg-[#3c4043]" : "bg-white hover:bg-gray-50")}
                      onClick={() => setCollapsedSections(prev => ({ ...prev, inbox: !prev.inbox }))}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isDark ? "text-white" : "text-gray-500", isCollapsed && "-rotate-90")} />
                        <span className={cn("text-sm", isDark ? "text-white" : "text-gray-700")}>Posteingang</span>
                      </div>
                      <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-white" : "text-gray-500")}>
                        <span>{inboxMessages.length > 0 ? `1-${Math.min(inboxMessages.length, 50)} von ${inboxMessages.length}` : '0'}</span>
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                    {!isCollapsed && inboxMessages.length > 0 && (
                      <div className={cn("divide-y", isDark ? "divide-[#5f6368]" : "divide-gray-100")}>
                        {inboxMessages.slice(0, 50).map((msg) => (
                          <EmailItem
                            key={`inbox-${msg.uid}`}
                            email={msg}
                            isSelected={selectedEmails.includes(msg.uid)}
                            density={currentDensity}
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
                );
              })()}

              {/* Gesendet Sektion */}
              {(() => {
                const isCollapsed = collapsedSections['sent'];
                return (
                  <div className={cn("border-b", isDark ? "border-[#5f6368]" : "border-gray-300")}>
                    <div 
                      className={cn("flex items-center justify-between px-3 py-1.5 cursor-pointer select-none", isDark ? "bg-[#2d2e30] hover:bg-[#3c4043]" : "bg-white hover:bg-gray-50")}
                      onClick={() => setCollapsedSections(prev => ({ ...prev, sent: !prev.sent }))}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isDark ? "text-white" : "text-gray-500", isCollapsed && "-rotate-90")} />
                        <span className={cn("text-sm", isDark ? "text-white" : "text-gray-700")}>Gesendet</span>
                      </div>
                      <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-white" : "text-gray-500")}>
                        {sentLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span>{sentMessages.length > 0 ? `1-${Math.min(sentMessages.length, 25)} von ${sentMessages.length}` : '0'}</span>
                        )}
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                    {!isCollapsed && !sentLoading && sentMessages.length > 0 && (
                      <div className={cn("divide-y", isDark ? "divide-[#5f6368]" : "divide-gray-100")}>
                        {sentMessages.slice(0, 25).map((msg) => (
                          <EmailItem
                            key={`sent-${msg.uid}`}
                            email={msg}
                            isSelected={selectedEmails.includes(msg.uid)}
                            density={currentDensity}
                            onSelect={handleSelectEmail}
                            onClick={(email) => {
                              fetchMessage(email.uid, 'Sent');
                              setSelectedEmail(email);
                            }}
                            onStar={handleStarEmail}
                            onDelete={handleDelete}
                            onMarkAsRead={handleMarkAsRead}
                            onMoveToSpam={handleMoveToSpam}
                            onMoveToFolder={handleMoveToFolder}
                            mailboxes={mailboxes}
                            currentMailbox="Sent"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Archiv Sektion */}
              {(() => {
                const isCollapsed = collapsedSections['archive'];
                return (
                  <div className={cn("border-b", isDark ? "border-[#5f6368]" : "border-gray-300")}>
                    <div 
                      className={cn("flex items-center justify-between px-3 py-1.5 cursor-pointer select-none", isDark ? "bg-[#2d2e30] hover:bg-[#3c4043]" : "bg-white hover:bg-gray-50")}
                      onClick={() => setCollapsedSections(prev => ({ ...prev, archive: !prev.archive }))}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isDark ? "text-white" : "text-gray-500", isCollapsed && "-rotate-90")} />
                        <span className={cn("text-sm", isDark ? "text-white" : "text-gray-700")}>Archiv</span>
                      </div>
                      <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-white" : "text-gray-500")}>
                        {archiveLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span>{archiveMessages.length > 0 ? `1-${Math.min(archiveMessages.length, 25)} von ${archiveMessages.length}` : '0'}</span>
                        )}
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                    {!isCollapsed && !archiveLoading && archiveMessages.length > 0 && (
                      <div className={cn("divide-y", isDark ? "divide-[#5f6368]" : "divide-gray-100")}>
                        {archiveMessages.slice(0, 25).map((msg) => (
                          <EmailItem
                            key={`archive-${msg.uid}`}
                            email={msg}
                            isSelected={selectedEmails.includes(msg.uid)}
                            density={currentDensity}
                            onSelect={handleSelectEmail}
                            onClick={(email) => {
                              fetchMessage(email.uid, 'Archive');
                              setSelectedEmail(email);
                            }}
                            onStar={handleStarEmail}
                            onDelete={handleDelete}
                            onMarkAsRead={handleMarkAsRead}
                            onMoveToSpam={handleMoveToSpam}
                            onMoveToFolder={handleMoveToFolder}
                            mailboxes={mailboxes}
                            currentMailbox="Archive"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Spam Sektion */}
              {(() => {
                const isCollapsed = collapsedSections['spam'];
                return (
                  <div className={cn("border-b", isDark ? "border-[#5f6368]" : "border-gray-300")}>
                    <div 
                      className={cn("flex items-center justify-between px-3 py-1.5 cursor-pointer select-none", isDark ? "bg-[#2d2e30] hover:bg-[#3c4043]" : "bg-white hover:bg-gray-50")}
                      onClick={() => setCollapsedSections(prev => ({ ...prev, spam: !prev.spam }))}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isDark ? "text-white" : "text-gray-500", isCollapsed && "-rotate-90")} />
                        <span className={cn("text-sm", isDark ? "text-white" : "text-gray-700")}>Spam</span>
                      </div>
                      <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-white" : "text-gray-500")}>
                        {spamLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span>{spamMessages.length > 0 ? `1-${Math.min(spamMessages.length, 25)} von ${spamMessages.length}` : '0'}</span>
                        )}
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                    {!isCollapsed && !spamLoading && spamMessages.length > 0 && (
                      <div className={cn("divide-y", isDark ? "divide-[#5f6368]" : "divide-gray-100")}>
                        {spamMessages.slice(0, 25).map((msg) => (
                          <EmailItem
                            key={`spam-${msg.uid}`}
                            email={msg}
                            isSelected={selectedEmails.includes(msg.uid)}
                            density={currentDensity}
                            onSelect={handleSelectEmail}
                            onClick={(email) => {
                              fetchMessage(email.uid, 'Junk');
                              setSelectedEmail(email);
                            }}
                            onStar={handleStarEmail}
                            onDelete={handleDelete}
                            onMarkAsRead={handleMarkAsRead}
                            onMoveToSpam={handleMoveToSpam}
                            onMoveToFolder={handleMoveToFolder}
                            mailboxes={mailboxes}
                            currentMailbox="Junk"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Papierkorb Sektion */}
              {(() => {
                const isCollapsed = collapsedSections['trash'];
                return (
                  <div className={cn("border-b", isDark ? "border-[#5f6368]" : "border-gray-300")}>
                    <div 
                      className={cn("flex items-center justify-between px-3 py-1.5 cursor-pointer select-none", isDark ? "bg-[#2d2e30] hover:bg-[#3c4043]" : "bg-white hover:bg-gray-50")}
                      onClick={() => setCollapsedSections(prev => ({ ...prev, trash: !prev.trash }))}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isDark ? "text-white" : "text-gray-500", isCollapsed && "-rotate-90")} />
                        <span className={cn("text-sm", isDark ? "text-white" : "text-gray-700")}>Papierkorb</span>
                      </div>
                      <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-white" : "text-gray-500")}>
                        {trashLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span>{trashMessages.length > 0 ? `1-${Math.min(trashMessages.length, 25)} von ${trashMessages.length}` : '0'}</span>
                        )}
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                    {!isCollapsed && !trashLoading && trashMessages.length > 0 && (
                      <div className={cn("divide-y", isDark ? "divide-[#5f6368]" : "divide-gray-100")}>
                        {trashMessages.slice(0, 25).map((msg) => (
                          <EmailItem
                            key={`trash-${msg.uid}`}
                            email={msg}
                            isSelected={selectedEmails.includes(msg.uid)}
                            density={currentDensity}
                            onSelect={handleSelectEmail}
                            onClick={(email) => {
                              fetchMessage(email.uid, 'Trash');
                              setSelectedEmail(email);
                            }}
                            onStar={handleStarEmail}
                            onDelete={handleDelete}
                            onMarkAsRead={handleMarkAsRead}
                            onMoveToSpam={handleMoveToSpam}
                            onMoveToFolder={handleMoveToFolder}
                            mailboxes={mailboxes}
                            currentMailbox="Trash"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className={cn("divide-y", isDark ? "divide-[#5f6368]" : "divide-gray-100")}>
              {filteredMessages.map((msg) => (
                <EmailItem
                  key={msg.uid}
                  email={msg}
                  isSelected={selectedEmails.includes(msg.uid)}
                  density={currentDensity}
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
        <div className={cn(
          "fixed inset-0 md:relative md:inset-auto md:flex-1 overflow-hidden min-w-0 z-40 md:z-auto md:rounded-2xl",
          themeData?.backgroundUrl 
            ? 'bg-white/90 md:shadow-lg' 
            : isDark 
              ? 'bg-[#2d2e30]' 
              : 'bg-white'
        )}>
          {messageLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className={cn("inline-block w-12 h-12 border-4 border-t-teal-600 rounded-full animate-spin", isDark ? "border-gray-700" : "border-gray-200")}></div>
                <p className={cn("mt-4", isDark ? "text-white" : "text-gray-600")}>Nachricht wird geladen...</p>
              </div>
            </div>
          ) : messageError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className={cn("text-base font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>Fehler beim Laden</h3>
                <p className={cn("text-sm mb-4", isDark ? "text-white" : "text-gray-600")}>{messageError}</p>
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

      {/* Compose Windows - Gmail style multiple windows at bottom */}
      {composeWindows.map((window, index) => (
        <EmailComposeComponent
          key={window.id}
          _windowId={window.id}
          windowIndex={index}
          isOpen={true}
          isMinimizedExternal={window.isMinimized}
          onToggleMinimize={() => handleToggleMinimize(window.id)}
          onClose={() => handleCloseCompose(window.id)}
          onSend={(emailData) => handleSendEmail(emailData, window.id)}
          onSaveDraft={(emailData) => handleSaveDraft(emailData, window.id)}
          replyTo={window.replyTo ? convertWebmailToEmailClientMessage(window.replyTo) : undefined}
          initialTo={window.initialTo}
        />
      ))}

      {/* Gmail-style Chat Widget - bottom right */}
      <div className="fixed bottom-0 right-4 z-40 hidden md:flex items-end gap-2">
        {/* Chat Button */}
        <div className="bg-white rounded-t-lg shadow-lg border border-gray-200 border-b-0">
          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
            onClick={() => {/* TODO: Implement chat */}}
          >
            <Users className="h-4 w-4" />
            <span>Chat</span>
          </button>
        </div>
        {/* Meet Button */}
        <div className="bg-white rounded-t-lg shadow-lg border border-gray-200 border-b-0">
          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
            onClick={() => {/* TODO: Implement meet */}}
          >
            <Mail className="h-4 w-4" />
            <span>Meet</span>
          </button>
        </div>
      </div>

      {/* Quick Settings Panel */}
      <QuickSettings
        isOpen={showQuickSettings}
        onClose={() => setShowQuickSettings(false)}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}
