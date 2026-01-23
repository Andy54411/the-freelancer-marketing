'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DrivePickerModal } from '@/components/webmail/drive/DrivePickerModal';
import { PhotosPickerModal } from '@/components/webmail/photos/PhotosPickerModal';
import { GoogleDrivePicker, type GoogleDriveFile } from './GoogleDrivePicker';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Paperclip,
  X,
  Link,
  Image as ImageIcon,
  Smile,
  Clock,
  Minimize2,
  Save,
  FileText,
  Receipt,
  File as FileIcon,
  ChevronDown,
  Mail,
  MessageSquare,
  Video,
  Calendar,
  ExternalLink,
  UserPlus,
  Expand,
  Shrink,
  Check,
  PenLine,
  Settings,
} from 'lucide-react';
import type { EmailCompose as EmailComposeType, EmailMessage } from './types';
import { cn } from '@/lib/utils';
import { getSettings } from '@/lib/webmail-settings-api';
import type { EmailSignature } from '@/components/webmail/settings/types';
import { db } from '@/firebase/clients';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { PDFGenerationService } from '@/services/pdfGenerationService';
// Webmail Cookie zum Lesen der Credentials
const COOKIE_NAME = 'webmail_session';

function decodeCredentials(encoded: string): { email: string; password: string } | null {
  try {
    const binString = atob(encoded);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function getWebmailCookie(): { email: string; password: string } | null {
  if (typeof window === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME && value) {
      return decodeCredentials(value);
    }
  }
  return null;
}
import { toast } from 'sonner';

interface EmailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: EmailComposeType) => Promise<void>;
  onSaveDraft: (email: EmailComposeType) => Promise<void>;
  replyTo?: EmailMessage;
  forwardEmail?: EmailMessage;
  initialTo?: string;
  className?: string;
  companyId?: string;
  emailProvider?: 'webmail' | 'gmail' | null;
  // Multiple compose window support
  _windowId?: string;
  windowIndex?: number;
  isMinimizedExternal?: boolean;
  onToggleMinimize?: () => void;
}

interface FirestoreDocument {
  id: string;
  number?: string;
  invoiceNumber?: string;
  quoteNumber?: string;
  fileName?: string;
  name?: string;
  createdAt?: { toDate?: () => Date } | Date;
  pdfUrl?: string;
  fileUrl?: string;
  type: 'invoice' | 'quote' | 'document';
  pdfGenerated?: boolean; // Flag für bereits generierte PDFs
  eInvoiceData?: {
    format: string;
    guid: string;
    validationStatus: string;
    version: string;
    createdAt: string;
  }; // E-Invoice data for ZUGFeRD generation
}

// Helper function to convert HTML to plain text
const htmlToPlainText = (html: string): string => {
  if (!html) return '';

  // Remove style tags and their content
  let cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove script tags and their content
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Replace common block elements with line breaks
  cleaned = cleaned.replace(/<(div|p|br|tr|h[1-6])[^>]*>/gi, '\n');
  cleaned = cleaned.replace(/<\/(div|p|h[1-6]|td)>/gi, '\n');

  // Create a temporary div to parse remaining HTML
  const temp = document.createElement('div');
  temp.innerHTML = cleaned;

  // Get text content (strips remaining HTML tags)
  let text = temp.textContent || temp.innerText || '';

  // Clean up excessive whitespace and newlines
  text = text
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
    .replace(/^\s+|\s+$/g, '') // Trim start/end
    .replace(/[ \t]+/g, ' '); // Multiple spaces to single space

  return text;
};

// Helper zum Escapen von RegExp-Sonderzeichen
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper to safely extract sender info
const getSenderInfo = (from: string | { email?: string; name?: string } | Array<{ email?: string; name?: string }> | null | undefined): string => {
  if (!from) return 'Unbekannt';

  // String format: "Name <email>" or just "email"
  if (typeof from === 'string') {
    const match = from.match(/^(.+?)\s*<(.+?)>$/);
    if (match) return `${match[1]} <${match[2]}>`;
    return from;
  }

  // Object format
  if (typeof from === 'object' && !Array.isArray(from)) {
    const name = from.name || '';
    const email = from.email || '';
    if (name && email) return `${name} <${email}>`;
    return name || email || 'Unbekannt';
  }

  // Array format (Gmail style)
  if (Array.isArray(from) && from.length > 0) {
    return getSenderInfo(from[0]);
  }

  return 'Unbekannt';
};

// Helper to safely format timestamp
const formatTimestamp = (timestamp: string | number | Date | { _seconds: number } | null | undefined): string => {
  if (!timestamp) return 'Unbekanntes Datum';

  try {
    let date: Date;

    // Firestore Timestamp
    if (timestamp && typeof timestamp === 'object' && '_seconds' in timestamp && timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    }
    // Gmail internalDate (string of milliseconds)
    else if (typeof timestamp === 'string' && /^\d+$/.test(timestamp)) {
      date = new Date(parseInt(timestamp));
    }
    // ISO string
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }
    // Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Number (milliseconds or seconds)
    else if (typeof timestamp === 'number') {
      date = timestamp < 4102444800 ? new Date(timestamp * 1000) : new Date(timestamp);
    } else {
      return 'Unbekanntes Datum';
    }

    if (isNaN(date.getTime())) return 'Unbekanntes Datum';

    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unbekanntes Datum';
  }
};

export function EmailCompose({
  isOpen,
  onClose,
  onSend,
  onSaveDraft,
  replyTo,
  forwardEmail,
  initialTo,
  className,
  companyId,
  emailProvider,
  _windowId,
  windowIndex = 0,
  isMinimizedExternal,
  onToggleMinimize,
}: EmailComposeProps) {
  const [email, setEmail] = useState<EmailComposeType>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    priority: 'normal',
  });

  // Use external minimize state if provided, otherwise use internal state
  const [isMinimizedInternal, setIsMinimizedInternal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const isMinimized = isMinimizedExternal !== undefined ? isMinimizedExternal : isMinimizedInternal;
  const toggleMinimize = onToggleMinimize || (() => setIsMinimizedInternal(!isMinimizedInternal));
  const toggleMaximize = () => setIsMaximized(!isMaximized);
  
  const [isSending, setIsSending] = useState(false);
  const [_isDraft, setIsDraft] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loadingAttachmentNames, setLoadingAttachmentNames] = useState<Set<string>>(new Set());
  const [firestoreAttachments, setFirestoreAttachments] = useState<FirestoreDocument[]>([]);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [documentPickerType, setDocumentPickerType] = useState<
    'invoice' | 'quote' | 'customer-doc' | null
  >(null);
  const [availableDocuments, setAvailableDocuments] = useState<FirestoreDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null); // ID des Dokuments, für das PDF generiert wird
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(true);
  const [selectedFont, setSelectedFont] = useState('Sans Serif');
  const [selectedSize, setSelectedSize] = useState('Normal');
  const [selectedTextColor, setSelectedTextColor] = useState('#000000');
  const [_colorTab, _setColorTab] = useState<'bg' | 'text'>('text');
  
  // Link-Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  
  // Emoji-Picker State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Drive Picker State
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
  const [showTaskiloPhotosPicker, setShowTaskiloPhotosPicker] = useState(false);
  
  // UserId für Webmail (aus Cookie)
  const userId = emailProvider === 'webmail' ? getWebmailCookie()?.email : undefined;
  
  // Signatur State
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  
  // Kontakte für Autovervollständigung
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [toRecipients, setToRecipients] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [toSearchTerm, setToSearchTerm] = useState('');
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const toInputRef = useRef<HTMLInputElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const sizeDropdownRef = useRef<HTMLDivElement>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const alignDropdownRef = useRef<HTMLDivElement>(null);
  const linkPopoverRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const pdfCacheRef = useRef<Map<string, File>>(new Map()); // Session Cache für generierte PDFs

  // Schriftgrößen wie bei Gmail
  const fontSizeOptions = [
    { name: 'Klein', size: '2', css: '10px' },
    { name: 'Normal', size: '3', css: '13px' },
    { name: 'Groß', size: '5', css: '18px' },
    { name: 'Riesig', size: '7', css: '32px' },
  ];

  // Farbpalette wie bei Gmail
  const colorPalette = [
    // Zeile 1 - Schwarz bis Weiß
    ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff'],
    // Zeile 2 - Bunte Farben Reihe 1
    ['#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'],
    // Zeile 3-8 - Farbabstufungen
    ['#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'],
    ['#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd'],
    ['#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0'],
    ['#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'],
    ['#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47'],
    ['#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'],
  ];

  // Selektion speichern
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  // Selektion wiederherstellen
  const restoreSelection = () => {
    const selection = window.getSelection();
    if (selection && savedSelectionRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
    }
  };

  // Spezielle Funktion für Liste-Befehle
  const _applyListFormat = (listType: 'ordered' | 'unordered' | 'indent' | 'outdent') => {
    if (!editorRef.current) return;
    
    // Fokus setzen
    editorRef.current.focus();
    
    // Selektion wiederherstellen
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    
    // Kurze Verzögerung damit der Browser die Selektion verarbeiten kann
    setTimeout(() => {
      let command = '';
      switch (listType) {
        case 'ordered': command = 'insertOrderedList'; break;
        case 'unordered': command = 'insertUnorderedList'; break;
        case 'indent': command = 'indent'; break;
        case 'outdent': command = 'outdent'; break;
      }
      document.execCommand(command, false);
      
      // State aktualisieren
      if (editorRef.current) {
        setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
      }
      
      // Neue Selektion speichern
      saveSelection();
    }, 10);
  };

  // Schriftarten wie bei Gmail
  const fontOptions = [
    { name: 'Sans Serif', fontFamily: 'Arial, Helvetica, sans-serif' },
    { name: 'Serif', fontFamily: 'Times New Roman, serif' },
    { name: 'Festbreitenschrift', fontFamily: 'Courier New, monospace' },
    { name: 'Wide', fontFamily: 'Arial Black, sans-serif', fontStretch: 'expanded' },
    { name: 'Narrow', fontFamily: 'Arial Narrow, sans-serif' },
    { name: 'Comic Sans MS', fontFamily: 'Comic Sans MS, cursive' },
    { name: 'Garamond', fontFamily: 'Garamond, serif' },
    { name: 'Georgia', fontFamily: 'Georgia, serif' },
    { name: 'Tahoma', fontFamily: 'Tahoma, sans-serif' },
    { name: 'Trebuchet MS', fontFamily: 'Trebuchet MS, sans-serif' },
    { name: 'Verdana', fontFamily: 'Verdana, sans-serif' },
  ];

  // Schließe Dropdown wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setShowFontDropdown(false);
      }
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target as Node)) {
        setShowSizeDropdown(false);
      }
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setShowColorDropdown(false);
      }
      if (alignDropdownRef.current && !alignDropdownRef.current.contains(event.target as Node)) {
        setShowAlignDropdown(false);
      }
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(event.target as Node)) {
        setShowLinkModal(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showFontDropdown || showSizeDropdown || showColorDropdown || showAlignDropdown || showLinkModal || showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFontDropdown, showSizeDropdown, showColorDropdown, showAlignDropdown, showLinkModal, showEmojiPicker]);

  // Signaturen laden (Webmail vom Hetzner-Server, Gmail direkt von Gmail API)
  useEffect(() => {
    const loadSignatures = async () => {
      // Gmail-Signaturen laden
      if (emailProvider === 'gmail' && companyId) {
        try {
          const response = await fetch(`/api/company/${companyId}/gmail-signatures`);
          const data = await response.json();
          
          if (data.success && data.signatures?.length > 0) {
            setSignatures(data.signatures);
            // Setze Standard-Signatur für neue E-Mails
            if (!replyTo && !forwardEmail) {
              const defaultSig = data.signatures.find((s: EmailSignature) => s.id === data.defaultSignatureNewEmail);
              if (defaultSig?.content) {
                setActiveSignatureId(defaultSig.id);
                // Signatur zum Body hinzufügen wenn leer
                if (!email.body) {
                  setEmail(prev => ({ ...prev, body: `<br><br>${defaultSig.content}` }));
                }
              }
            } else {
              // Standard-Signatur für Antworten
              const replySig = data.signatures.find((s: EmailSignature) => s.id === data.defaultSignatureReply);
              if (replySig) {
                setActiveSignatureId(replySig.id);
              }
            }
          }
        } catch (error) {
          // Gmail-Signaturen konnten nicht geladen werden
        }
        return;
      }
      
      // Webmail-Signaturen vom Hetzner-Server laden
      const webmailCreds = getWebmailCookie();
      if (!webmailCreds?.email) return;
      
      try {
        const settings = await getSettings(webmailCreds.email);
        if (settings?.signatures) {
          setSignatures(settings.signatures);
          // Setze Standard-Signatur für neue E-Mails
          if (!replyTo && !forwardEmail) {
            const defaultSig = settings.signatures.find(s => s.id === settings.defaultSignatureNewEmail);
            if (defaultSig?.content) {
              setActiveSignatureId(defaultSig.id);
              // Signatur zum Body hinzufügen wenn leer
              if (!email.body) {
                setEmail(prev => ({ ...prev, body: `<br><br>${defaultSig.content}` }));
              }
            }
          } else {
            // Standard-Signatur für Antworten
            const replySig = settings.signatures.find(s => s.id === settings.defaultSignatureReply);
            if (replySig) {
              setActiveSignatureId(replySig.id);
            }
          }
        }
      } catch (error) {
        // Signaturen konnten nicht geladen werden
      }
    };
    
    if (isOpen) {
      loadSignatures();
    }
  }, [isOpen, replyTo, forwardEmail, emailProvider, companyId]);

  // Update email state when replyTo or forwardEmail changes
  useEffect(() => {
    if (isOpen && replyTo) {
      //  TEMPORÄRER FIX: Parse String-Format für alte Emails
      let replyToEmail = '';
      
      if (typeof replyTo.from === 'object' && replyTo.from?.email) {
        // Neues Format: { email: string, name?: string }
        replyToEmail = replyTo.from.email;
      } else if (typeof replyTo.from === 'string') {
        // Altes Format: "Name <email@example.com>" oder "email@example.com"
        const match = replyTo.from.match(/^.*?<(.+?)>$/);
        if (match) {
          replyToEmail = match[1].trim();
        } else {
          // Nur Email ohne <> Klammern
          const emailMatch = replyTo.from.match(/^([^\s@]+@[^\s@]+)$/);
          if (emailMatch) {
            replyToEmail = emailMatch[1].trim();
          }
        }
      }
      
      if (!replyToEmail) {
        toast.error('FEHLER: Konnte E-Mail-Adresse nicht extrahieren!');
      }

      setEmail({
        to: replyToEmail,
        cc: '',
        bcc: '',
        subject: `Re: ${replyTo.subject}`,
        body: '',
        priority: 'normal',
      });
    } else if (isOpen && forwardEmail) {
      setEmail({
        to: '',
        cc: '',
        bcc: '',
        subject: `Fwd: ${forwardEmail.subject}`,
        body: forwardEmail.body || '',
        priority: 'normal',
      });
    } else if (isOpen && initialTo) {
      // Neue E-Mail mit vorausgefülltem Empfänger
      setEmail({
        to: initialTo,
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        priority: 'normal',
      });
    } else if (isOpen && !replyTo && !forwardEmail) {
      // New email
      setEmail({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        priority: 'normal',
      });
    }
  }, [isOpen, replyTo, forwardEmail, initialTo]);

  // Kontakte laden (Gmail von Google API, Webmail von Hetzner)
  useEffect(() => {
    const loadContacts = async () => {
      if (!isOpen) return;
      
      // Warte bis emailProvider gesetzt ist
      if (emailProvider === null || emailProvider === undefined) {
        return;
      }
      
      // Gmail-Kontakte laden
      if (emailProvider === 'gmail' && companyId) {
        try {
          const response = await fetch(`/api/company/${companyId}/gmail-contacts?limit=500`);
          const data = await response.json();
          
          if (data.success && data.contacts) {
            setContacts(data.contacts);
          }
        } catch {
          // Gmail-Kontakte konnten nicht geladen werden
        }
        return;
      }
      
      // Webmail-Kontakte vom Hetzner-Server laden - NUR wenn Webmail aktiv ist
      if (emailProvider === 'webmail') {
        const credentials = getWebmailCookie();
        if (!credentials) return;
        
        try {
          const response = await fetch('/api/webmail/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              limit: 500,
            }),
          });

          const data = await response.json();
          
          if (data.success && data.contacts) {
            const contactList = data.contacts.map((c: {
              uid: string;
              displayName?: string;
              firstName?: string;
              lastName?: string;
              emails?: { value: string; label: string }[];
              email?: string;
              name?: string;
            }) => {
              const primaryEmail = c.emails?.[0]?.value || c.email || '';
              const displayName = c.displayName || c.name || 
                (c.firstName && c.lastName ? `${c.firstName} ${c.lastName}`.trim() : '') ||
                c.firstName || c.lastName || primaryEmail.split('@')[0] || 'Unbekannt';
              
              return {
                id: c.uid || primaryEmail,
                name: displayName,
                email: primaryEmail,
              };
            }).filter((c: { email: string }) => c.email); // Nur Kontakte mit E-Mail
            
            setContacts(contactList);
          }
        } catch {
          // Kontakte konnten nicht geladen werden - kein kritischer Fehler
        }
      }
    };
    
    loadContacts();
  }, [isOpen, emailProvider, companyId]); // Provider und CompanyId für dynamisches Laden

  // Gefilterte Kontakte für Autovervollständigung
  const filteredContacts = contacts.filter(contact => {
    if (!toSearchTerm) return false;
    const searchLower = toSearchTerm.toLowerCase();
    const isAlreadySelected = toRecipients.some(r => r.email === contact.email);
    return !isAlreadySelected && (
      contact.name.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower)
    );
  });

  // Kontakt zur Empfängerliste hinzufügen
  const addRecipient = (contact: { id: string; name: string; email: string }) => {
    setToRecipients(prev => [...prev, contact]);
    setToSearchTerm('');
    setShowToSuggestions(false);
    // Email-State aktualisieren
    const newEmails = [...toRecipients, contact].map(r => r.email).join(', ');
    setEmail(prev => ({ ...prev, to: newEmails }));
    toInputRef.current?.focus();
  };

  // Kontakt aus Empfängerliste entfernen
  const removeRecipient = (email: string) => {
    const newRecipients = toRecipients.filter(r => r.email !== email);
    setToRecipients(newRecipients);
    const newEmails = newRecipients.map(r => r.email).join(', ');
    setEmail(prev => ({ ...prev, to: newEmails }));
  };

  // Eingabe bei Enter als E-Mail hinzufügen
  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && toSearchTerm.trim()) {
      e.preventDefault();
      // Prüfe ob es eine gültige E-Mail ist oder wähle den ersten Vorschlag
      if (filteredContacts.length > 0) {
        addRecipient(filteredContacts[0]);
      } else if (toSearchTerm.includes('@')) {
        // Manuelle E-Mail-Eingabe
        const newContact = {
          id: `manual-${Date.now()}`,
          name: toSearchTerm,
          email: toSearchTerm,
        };
        addRecipient(newContact);
      }
    } else if (e.key === 'Backspace' && !toSearchTerm && toRecipients.length > 0) {
      // Letzten Empfänger entfernen wenn Input leer
      removeRecipient(toRecipients[toRecipients.length - 1].email);
    }
  };

  // Hilfsfunktion für Initialen
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Hilfsfunktion für Avatar-Farbe
  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-teal-600', 'bg-blue-600', 'bg-purple-600', 'bg-orange-600',
      'bg-green-600', 'bg-pink-600', 'bg-indigo-600', 'bg-yellow-600',
    ];
    const hash = email.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Kontakt zu MongoDB hinzufügen
  const addToContacts = async (recipient: { name: string; email: string }) => {
    const credentials = getWebmailCookie();
    if (!credentials) {
      alert('Bitte melden Sie sich zuerst im Webmail an.');
      return;
    }

    try {
      // Name in Vor- und Nachname aufteilen
      const nameParts = recipient.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await fetch('/api/webmail/contacts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          contact: {
            firstName,
            lastName,
            displayName: recipient.name,
            emails: [{ value: recipient.email, label: 'Privat' }],
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`${recipient.name} wurde zu Ihren Kontakten hinzugefügt.`);
      } else {
        alert(data.error || 'Fehler beim Hinzufügen des Kontakts.');
      }
    } catch {
      alert('Fehler beim Hinzufügen des Kontakts.');
    }
  };

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!email.to?.trim()) {
      toast.error('Bitte geben Sie mindestens einen Empfänger ein.');
      return;
    }

    if (!email.subject?.trim()) {
      toast.error('Bitte geben Sie einen Betreff ein.');
      return;
    }

    if (!email.body?.trim()) {
      toast.error('Bitte geben Sie eine Nachricht ein.');
      return;
    }

    setIsSending(true);
    try {
      await onSend({
        ...email,
        attachments,
      });
      // NICHT onClose() rufen - das macht der Parent (WebmailClient) basierend auf Erfolg/Fehler
      // Reset form nach erfolgreichem Senden
      setEmail({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        priority: 'normal',
      });
      setAttachments([]);
    } catch (error) {
      // Fehler wird vom Parent behandelt (WebmailClient zeigt Toast)
      // Hier nur loggen für Debugging
      if (error instanceof Error && error.message) {
        toast.error(`Fehler beim Senden: ${error.message}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsDraft(true);
    try {
      await onSaveDraft({
        ...email,
        attachments,
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Entwurfs:', error);
    } finally {
      setIsDraft(false);
    }
  };

  // Check if email has content worth saving as draft
  const hasContent = () => {
    const plainBody = email.body?.replace(/<[^>]*>/g, '').trim();
    return !!(email.to?.trim() || email.subject?.trim() || plainBody || attachments.length > 0);
  };

  // Handle close - auto-save draft if has content
  const handleCloseWithDraftCheck = async () => {
    if (hasContent()) {
      // Auto-save as draft without asking
      await handleSaveDraft();
    }
    resetAndClose();
  };

  // Reset form and close
  const resetAndClose = () => {
    setEmail({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '',
      priority: 'normal',
    });
    setAttachments([]);
    setFirestoreAttachments([]);
    onClose();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Prüfe Dateigröße - max 25MB pro Datei
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      } else {
        validFiles.push(file);
      }
    }
    
    // Zeige Warnung für zu große Dateien
    if (oversizedFiles.length > 0) {
      toast.error(
        `Datei${oversizedFiles.length > 1 ? 'en' : ''} zu groß (max. 25 MB)`,
        {
          description: oversizedFiles.join(', '),
          duration: 5000,
        }
      );
    }
    
    // Nur gültige Dateien hinzufügen
    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }
    
    // Füge Dateinamen zum Loading-Set hinzu
    const fileNames = validFiles.map(f => f.name);
    setLoadingAttachmentNames(prev => new Set([...prev, ...fileNames]));
    setAttachments(prev => [...prev, ...validFiles]);
    
    // Loading-Animation nach 1.5 Sekunden beenden
    setTimeout(() => {
      setLoadingAttachmentNames(prev => {
        const newSet = new Set(prev);
        fileNames.forEach(name => newSet.delete(name));
        return newSet;
      });
    }, 1500);
    
    // Input zurücksetzen für erneute Auswahl derselben Datei
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeFirestoreAttachment = (id: string) => {
    setFirestoreAttachments(prev => prev.filter(doc => doc.id !== id));
  };

  const _formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load documents from Firestore based on type
  const loadDocuments = async (type: 'invoice' | 'quote' | 'customer-doc') => {
    if (!companyId) return;

    setIsLoadingDocs(true);
    setDocumentPickerType(type);

    try {
      let docs: FirestoreDocument[] = [];

      if (type === 'invoice') {
        const invoicesRef = collection(db, 'companies', companyId, 'invoices');
        const q = query(invoicesRef, orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);

        docs = snapshot.docs.map(doc => ({
          id: doc.id,
          number: doc.data().invoiceNumber || doc.data().number,
          invoiceNumber: doc.data().invoiceNumber,
          createdAt: doc.data().createdAt,
          pdfUrl: doc.data().pdfUrl,
          type: 'invoice' as const,
          eInvoiceData: doc.data().eInvoiceData, // E-Invoice data for ZUGFeRD generation
        }));
      } else if (type === 'quote') {
        const quotesRef = collection(db, 'companies', companyId, 'quotes');
        const q = query(quotesRef, orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);

        docs = snapshot.docs.map(doc => ({
          id: doc.id,
          number: doc.data().quoteNumber || doc.data().number,
          quoteNumber: doc.data().quoteNumber,
          createdAt: doc.data().createdAt,
          pdfUrl: doc.data().pdfUrl,
          type: 'quote' as const,
        }));
      } else if (type === 'customer-doc') {
        // Load all customers and their documents
        const customersRef = collection(db, 'companies', companyId, 'customers');
        const customersSnapshot = await getDocs(customersRef);

        const allDocs: FirestoreDocument[] = [];

        for (const customerDoc of customersSnapshot.docs) {
          const docsRef = collection(
            db,
            'companies',
            companyId,
            'customers',
            customerDoc.id,
            'documents'
          );
          const docsSnapshot = await getDocs(docsRef);

          const customerDocs = docsSnapshot.docs
            .map(doc => ({
              id: doc.id,
              fileName: doc.data().fileName || doc.data().name,
              name: doc.data().name,
              createdAt: doc.data().createdAt,
              fileUrl: doc.data().fileUrl || doc.data().url,
              type: 'document' as const,
            }))
            .filter(doc => doc.fileUrl);

          allDocs.push(...customerDocs);
        }

        // Sort by date
        docs = allDocs
          .sort((a, b) => {
            const getDate = (createdAt: { toDate?: () => Date } | Date | undefined): Date => {
              if (!createdAt) return new Date(0);
              if (createdAt instanceof Date) return createdAt;
              if (typeof createdAt === 'object' && 'toDate' in createdAt && createdAt.toDate) return createdAt.toDate();
              return new Date(0);
            };
            const dateA = getDate(a.createdAt);
            const dateB = getDate(b.createdAt);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 50);
      }

      setAvailableDocuments(docs);
      setShowDocumentPicker(true);
    } catch {
      alert('Fehler beim Laden der Dokumente');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  /**
   * Generiert PDF für ein Firestore-Dokument und fügt es als Anhang hinzu
   * Nutzt Session Cache für bereits generierte PDFs
   */
  const addFirestoreDocument = async (doc: FirestoreDocument) => {
    // Check if already added
    if (firestoreAttachments.some(d => d.id === doc.id)) {
      toast.info('Dokument bereits hinzugefügt');
      return;
    }

    // Für Kundendokumente: Direkter Download (haben bereits fileUrl)
    if (doc.type === 'document' && doc.fileUrl) {
      setFirestoreAttachments(prev => [...prev, doc]);
      toast.success('Dokument hinzugefügt');
      return;
    }

    // Für Invoices/Quotes: PDF generieren
    if (!companyId) {
      toast.error('Firmen-ID fehlt');
      return;
    }

    try {
      setGeneratingPDF(doc.id);

      // Check Cache first
      const cacheKey = `${doc.type}-${doc.id}`;
      let pdfFile = pdfCacheRef.current.get(cacheKey);

      if (!pdfFile) {
        // Generate PDF
        toast.loading(`PDF wird generiert: ${doc.number || doc.fileName}...`, { id: doc.id });

        if (doc.type === 'invoice') {
          pdfFile = await PDFGenerationService.generatePDFFromInvoice(companyId, doc.id);
        } else if (doc.type === 'quote') {
          pdfFile = await PDFGenerationService.generatePDFFromQuote(companyId, doc.id);
        } else {
          throw new Error('Ungültiger Dokumenttyp');
        }

        // Store in cache
        pdfCacheRef.current.set(cacheKey, pdfFile);
        toast.success('PDF erfolgreich generiert', { id: doc.id });
      } else {
        toast.success('PDF aus Cache geladen', { id: doc.id });
      }

      // Add to regular attachments (as File)
      setAttachments(prev => [...prev, pdfFile]);

      // 🔥 CRITICAL: Für Invoices auch E-Rechnung (XML) als Anhang hinzufügen
      if (doc.type === 'invoice' && doc.eInvoiceData) {
        try {
          toast.loading('E-Rechnung (XML) wird generiert...', { id: `einvoice-${doc.id}` });
          
          // Dynamischer Import des E-Invoice-Service
          const { EInvoiceService } = await import('@/services/eInvoiceService');
          
          // Lade Invoice-Daten aus Firestore
          const { doc: firestoreDoc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/firebase/clients');
          const invoiceRef = firestoreDoc(db, 'companies', companyId, 'invoices', doc.id);
          const invoiceSnap = await getDoc(invoiceRef);
          
          if (invoiceSnap.exists()) {
            const invoiceData = { id: invoiceSnap.id, ...invoiceSnap.data() };
            
            // Lade Company-Daten
            const companyRef = firestoreDoc(db, 'companies', companyId);
            const companySnap = await getDoc(companyRef);
            
            if (companySnap.exists()) {
              const companyData = companySnap.data();
              
              // Baue vollständige Firmenadresse für E-Rechnung
              const companyAddressLine = [
                companyData.companyStreet || '',
                companyData.companyHouseNumber || ''
              ].filter(Boolean).join(' ');
              
              const companyCityLine = [
                companyData.companyPostalCode || '',
                companyData.companyCity || ''
              ].filter(Boolean).join(' ');
              
              const companyAddress = [
                companyAddressLine,
                companyCityLine
              ].filter(Boolean).join('\n');
              
              // Generiere UUID (Browser-kompatibel)
              const _generateUUID = () => {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                  const r = Math.random() * 16 | 0;
                  const v = c === 'x' ? r : (r & 0x3 | 0x8);
                  return v.toString(16);
                });
              };
              
              // Generiere ZUGFeRD-XML (nicht PDF!)
              const zugferdXml = await EInvoiceService.generateZUGFeRDXML(
                invoiceData,
                {
                  conformanceLevel: 'EXTENDED',
                  guideline: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
                  specificationId: 'urn:cen.eu:en16931:2017'
                },
                {
                  ...companyData,
                  companyAddress: companyAddress,
                  companyVatId: companyData.vatId || '',
                  companyEmail: companyData.contactEmail || companyData.email || '',
                  taxNumber: companyData.taxNumber || '',
                  legalForm: companyData.legalForm || '',
                  registrationNumber: companyData.companyRegister || companyData.registrationNumber || '',
                  iban: companyData.bankDetails?.iban || companyData.iban || '',
                  bic: companyData.bankDetails?.bic || companyData.bic || '',
                  accountHolder: companyData.bankDetails?.accountHolder || companyData.accountHolder || companyData.companyName
                }
              );
              
              // Konvertiere XML-String zu File
              const xmlBlob = new Blob([zugferdXml], { type: 'application/xml' });
              const xmlFile = new File(
                [xmlBlob],
                `${doc.number || doc.invoiceNumber}_XRechnung.xml`,
                { type: 'application/xml' }
              );
              
              // Füge E-Rechnung (XML) als zweiten Anhang hinzu
              setAttachments(prev => [...prev, xmlFile]);
              toast.success('E-Rechnung (XML) hinzugefügt', { id: `einvoice-${doc.id}` });
            }
          }
        } catch (eInvoiceError) {
          console.error('Fehler bei E-Rechnungs-Generierung:', eInvoiceError);
          toast.warning('E-Rechnung konnte nicht generiert werden (normales PDF wurde angehängt)', {
            id: `einvoice-${doc.id}`
          });
        }
      }

      // Also add to firestoreAttachments for display
      setFirestoreAttachments(prev => [...prev, { ...doc, pdfGenerated: true }]);
    } catch (error) {
      console.error('Fehler bei PDF-Generierung:', error);
      toast.error(
        `PDF-Generierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: doc.id }
      );
    } finally {
      setGeneratingPDF(null);
    }
  };

  const getDocumentTitle = (type: 'invoice' | 'quote' | 'customer-doc') => {
    switch (type) {
      case 'invoice':
        return 'Rechnungen';
      case 'quote':
        return 'Angebote';
      case 'customer-doc':
        return 'Kundendokumente';
      default:
        return 'Dokumente';
    }
  };

  const _getOriginalMessage = () => {
    if (replyTo) {
      const bodyText = htmlToPlainText(replyTo.body || replyTo.htmlBody || '');
      const senderInfo = getSenderInfo(replyTo.from);
      const dateInfo = formatTimestamp(replyTo.timestamp);

      return `\n\n--- Ursprüngliche Nachricht ---\nVon: ${senderInfo}\nDatum: ${dateInfo}\nBetreff: ${replyTo.subject || '(Kein Betreff)'}\n\n${bodyText}`;
    }
    if (forwardEmail) {
      const bodyText = htmlToPlainText(forwardEmail.body || forwardEmail.htmlBody || '');
      const senderInfo = getSenderInfo(forwardEmail.from);
      const dateInfo = formatTimestamp(forwardEmail.timestamp);

      return `\n\n--- Weitergeleitete Nachricht ---\nVon: ${senderInfo}\nAn: ${forwardEmail.to?.map((t: { email?: string; name?: string } | string) => (typeof t === 'string' ? t : t.email)).join(', ') || 'Unbekannt'}\nDatum: ${dateInfo}\nBetreff: ${forwardEmail.subject || '(Kein Betreff)'}\n\n${bodyText}`;
    }
    return '';
  };

  // Rich Text Formatierung mit execCommand
  const applyFormat = (command: string, value?: string) => {
    // Fokus zuerst setzen
    editorRef.current?.focus();
    
    // Versuche gespeicherte Selektion wiederherzustellen
    if (savedSelectionRef.current) {
      restoreSelection();
    }
    
    // Führe den Befehl aus
    document.execCommand(command, false, value);
    
    // Update body state
    if (editorRef.current) {
      setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
    }
    
    // Selektion nach Formatierung neu speichern
    saveSelection();
  };

  // Schriftart auf markierten Text anwenden oder für neuen Text setzen
  const applyFontToSelection = (fontFamily: string) => {
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;
    
    if (hasSelection) {
      // Text ist markiert - nur diesen formatieren
      restoreSelection();
    }
    
    editorRef.current?.focus();
    
    if (hasSelection) {
      // Markierten Text formatieren
      document.execCommand('fontName', false, fontFamily);
    } else {
      // Kein Text markiert - Span mit Schriftart einfügen für neuen Text
      const span = document.createElement('span');
      span.style.fontFamily = fontFamily;
      span.innerHTML = '\u200B'; // Zero-width space als Platzhalter
      
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);
        
        // Cursor in den Span setzen
        range.setStart(span, 1);
        range.setEnd(span, 1);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    
    if (editorRef.current) {
      setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
    }
    saveSelection();
  };

  // Legacy insertFormatting für Kompatibilität
  const _insertFormatting = (prefix: string, _suffix: string = '') => {
    // Für Listen etc.
    if (prefix === '\n1. ') {
      applyFormat('insertOrderedList');
    } else if (prefix === '\n- ') {
      applyFormat('insertUnorderedList');
    }
  };

  if (!isOpen) return null;

  // Calculate position based on windowIndex - stack windows from right to left
  // Each open window is 580px wide with 8px gap, minimized is 288px (w-72)
  const calculateRightPosition = () => {
    // Base position for desktop
    const baseRight = 80; // md:right-20 = 80px
    // Calculate offset based on previous windows
    // For simplicity, assume all windows have same width for positioning
    const windowWidth = isMinimized ? 288 : 580;
    const gap = 8;
    return baseRight + (windowIndex * (windowWidth + gap));
  };

  const rightPosition = calculateRightPosition();

  return (
    <div 
      className={cn(
        "fixed z-50 transition-all duration-200",
        isMaximized ? "inset-0" : "bottom-0",
      )}
      style={isMaximized ? undefined : { right: `${rightPosition}px` }}
    >
      {/* Gmail-style Compose Window */}
      <div
        className={cn(
          'bg-white shadow-2xl border border-gray-300 transition-all duration-200 flex flex-col',
          isMaximized 
            ? 'w-full h-full rounded-none' 
            : isMinimized 
              ? 'w-[280px] rounded-t-lg' 
              : 'w-[580px] h-[550px] rounded-t-lg',
          className
        )}
      >
        {/* Header - Gmail dunkelgrau */}
        <div 
          className={cn(
            "flex items-center justify-between px-3 py-2 bg-teal-700 cursor-pointer select-none",
            isMaximized ? "rounded-none" : "rounded-t-lg"
          )}
          onClick={() => isMinimized && toggleMinimize()}
        >
          <span className="text-[13px] font-normal text-white truncate">
            {replyTo ? 'Antworten' : forwardEmail ? 'Weiterleiten' : 'Neue Nachricht'}
          </span>
          <div className="flex items-center gap-0.5">
            {/* Minimieren - Fenster nach unten */}
            <button
              onClick={(e) => { e.stopPropagation(); if (isMaximized) setIsMaximized(false); toggleMinimize(); }}
              className="w-7 h-7 flex items-center justify-center text-teal-100 hover:text-white rounded hover:bg-teal-600"
              title="Minimieren"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            {/* Maximieren/Verkleinern */}
            <button
              onClick={(e) => { e.stopPropagation(); if (isMinimized) toggleMinimize(); toggleMaximize(); }}
              className="w-7 h-7 flex items-center justify-center text-teal-100 hover:text-white rounded hover:bg-teal-600"
              title={isMaximized ? "Verkleinern" : "Maximieren"}
            >
              {isMaximized ? (
                <Shrink className="h-4 w-4" />
              ) : (
                <Expand className="h-4 w-4" />
              )}
            </button>
            {/* Schließen */}
            <button 
              onClick={(e) => { e.stopPropagation(); handleCloseWithDraftCheck(); }}
              className="w-7 h-7 flex items-center justify-center text-teal-100 hover:text-white rounded hover:bg-teal-600"
              title="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Empfänger-Bereich - Gmail style */}
            <div className="border-b border-gray-200">
              {/* An - mit Autovervollständigung */}
              <div className="relative flex items-start px-3 py-1.5 border-b border-gray-100 min-h-[36px]">
                <span className="text-[13px] text-gray-500 w-12 flex-shrink-0 pt-1">An</span>
                <div className="flex-1 flex flex-wrap items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1 min-h-[32px] focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
                  {/* Ausgewählte Empfänger als Badges mit HoverCard */}
                  {toRecipients.map(recipient => (
                    <HoverCard key={recipient.email} openDelay={300} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <div
                          className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-0.5 text-[12px] group cursor-pointer"
                        >
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium', getAvatarColor(recipient.email))}>
                            {getInitials(recipient.name)}
                          </div>
                          <span className="max-w-[150px] truncate">{recipient.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecipient(recipient.email);
                            }}
                            className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 p-0" side="bottom" align="start">
                        <div className="p-4">
                          {/* Header mit Avatar und Name */}
                          <div className="flex items-start gap-4">
                            <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-medium', getAvatarColor(recipient.email))}>
                              {getInitials(recipient.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-medium truncate">{recipient.name}</h4>
                                <button 
                                  onClick={() => addToContacts(recipient)}
                                  className="text-gray-400 hover:text-teal-600 transition-colors"
                                  title="Zu Kontakten hinzufügen"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-sm text-gray-500 truncate">{recipient.email}</p>
                            </div>
                          </div>
                          
                          {/* Aktionsbuttons */}
                          <div className="flex items-center gap-2 mt-4">
                            <Button
                              size="sm"
                              className="flex-1 bg-teal-100 text-teal-700 hover:bg-teal-200 border-0"
                              onClick={() => {
                                // E-Mail ist bereits als Empfänger hinzugefügt
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              E-Mail senden
                            </Button>
                            <Button size="icon" variant="outline" className="h-9 w-9">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-9 w-9">
                              <Video className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-9 w-9">
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Detaillierte Ansicht Link */}
                          <a
                            href={`/contacts?email=${encodeURIComponent(recipient.email)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800 mt-3"
                          >
                            Detaillierte Ansicht anzeigen
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                  {/* Eingabefeld */}
                  <input
                    ref={toInputRef}
                    type="text"
                    value={toSearchTerm}
                    onChange={e => {
                      setToSearchTerm(e.target.value);
                      setShowToSuggestions(true);
                    }}
                    onFocus={() => setShowToSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                    onKeyDown={handleToKeyDown}
                    className="flex-1 min-w-[100px] text-[13px] outline-none bg-transparent border-none focus:ring-0"
                    placeholder={toRecipients.length === 0 ? 'Empfänger eingeben...' : ''}
                  />
                </div>
                <div className="flex gap-1 text-[13px] text-gray-500 flex-shrink-0 pt-1 ml-2">
                  {!showCc && (
                    <button onClick={() => setShowCc(true)} className="hover:text-gray-700 hover:underline">
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button onClick={() => setShowBcc(true)} className="hover:text-gray-700 hover:underline">
                      Bcc
                    </button>
                  )}
                </div>
                
                {/* Autovervollständigungs-Dropdown */}
                {showToSuggestions && filteredContacts.length > 0 && (
                  <div className="absolute left-12 top-full mt-1 w-[calc(100%-60px)] bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[300px] overflow-y-auto">
                    {filteredContacts.map(contact => (
                      <button
                        key={contact.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addRecipient(contact)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 text-left"
                      >
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-medium', getAvatarColor(contact.email))}>
                          {getInitials(contact.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{contact.name}</div>
                          <div className="text-[12px] text-gray-500 truncate">{contact.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cc */}
              {showCc && (
                <div className="flex items-center px-3 py-1 border-b border-gray-100">
                  <span className="text-[13px] text-gray-500 w-12">Cc</span>
                  <input
                    type="text"
                    value={email.cc ?? ''}
                    onChange={e => setEmail(prev => ({ ...prev, cc: e.target.value }))}
                    className="flex-1 text-[13px] outline-none bg-transparent"
                  />
                  <button onClick={() => { setShowCc(false); setEmail(prev => ({ ...prev, cc: '' })); }} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Bcc */}
              {showBcc && (
                <div className="flex items-center px-3 py-1 border-b border-gray-100">
                  <span className="text-[13px] text-gray-500 w-12">Bcc</span>
                  <input
                    type="text"
                    value={email.bcc ?? ''}
                    onChange={e => setEmail(prev => ({ ...prev, bcc: e.target.value }))}
                    className="flex-1 text-[13px] outline-none bg-transparent"
                  />
                  <button onClick={() => { setShowBcc(false); setEmail(prev => ({ ...prev, bcc: '' })); }} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Betreff */}
              <div className="flex items-center px-3 py-1">
                <input
                  type="text"
                  value={email.subject ?? ''}
                  onChange={e => setEmail(prev => ({ ...prev, subject: e.target.value }))}
                  className="flex-1 text-[13px] outline-none bg-transparent"
                  placeholder="Betreff"
                />
              </div>
            </div>

            {/* Nachrichtenbereich - Gmail style großer Bereich mit Rich Text */}
            <div className="flex-1 overflow-auto">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setEmail(prev => ({ ...prev, body: (e.target as HTMLDivElement).innerHTML }))}
                onMouseUp={() => {
                  // Speichere Selektion bei jeder Mausauswahl
                  saveSelection();
                }}
                onKeyUp={() => {
                  // Speichere Selektion bei Tastaturnavigation (z.B. Shift+Pfeiltasten)
                  saveSelection();
                }}
                className="w-full h-full p-3 text-[13px] outline-none focus:outline-none [&_ul]:list-disc [&_ul]:pl-8 [&_ol]:list-decimal [&_ol]:pl-8 [&_li]:my-1"
                style={{ 
                  minHeight: '280px',
                  fontFamily: 'Arial, Helvetica, sans-serif'
                }}
              />
              
              {/* Original Message bei Reply/Forward */}
              {(replyTo || forwardEmail) && (
                <div className="px-3 pb-3">
                  <div className="text-[11px] text-gray-500 mb-2">
                    {replyTo && `Am ${formatTimestamp(replyTo.timestamp)} schrieb ${getSenderInfo(replyTo.from)}:`}
                    {forwardEmail && '--- Weitergeleitete Nachricht ---'}
                  </div>
                  <div className="pl-3 border-l-2 border-gray-300 text-[13px] text-gray-600">
                    <div dangerouslySetInnerHTML={{ __html: replyTo?.htmlBody || replyTo?.body || forwardEmail?.htmlBody || forwardEmail?.body || '' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Anhänge */}
            {(attachments.length > 0 || firestoreAttachments.length > 0) && (
              <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => {
                    const isLoading = loadingAttachmentNames.has(file.name);
                    return (
                      <div 
                        key={`file-${file.name}-${index}`} 
                        className={cn(
                          "relative flex items-center gap-1 border rounded px-2 py-1 text-[11px] overflow-hidden transition-all duration-300",
                          isLoading ? "bg-teal-50 border-teal-300" : "bg-white border-gray-200"
                        )}
                      >
                        {/* Ladebalken-Animation */}
                        {isLoading && (
                          <div className="absolute inset-0 overflow-hidden">
                            <div 
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-200 via-teal-400 to-teal-200"
                              style={{
                                width: '200%',
                                animation: 'shimmer 1.5s infinite linear',
                              }}
                            />
                          </div>
                        )}
                        <Paperclip className={cn("h-3 w-3 relative z-10", isLoading ? "text-teal-600" : "text-gray-400")} />
                        <span className={cn("max-w-[120px] truncate relative z-10", isLoading && "text-teal-700 font-medium")}>{file.name}</span>
                        {!isLoading && (
                          <button onClick={() => removeAttachment(index)} className="text-gray-400 hover:text-red-500 relative z-10">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        {isLoading && (
                          <div className="h-3 w-3 relative z-10">
                            <div className="animate-spin h-3 w-3 border-2 border-teal-600 border-t-transparent rounded-full" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {firestoreAttachments.map(doc => (
                    <div key={`doc-${doc.id}`} className="flex items-center gap-1 bg-white border rounded px-2 py-1 text-[11px]">
                      {doc.type === 'invoice' ? <Receipt className="h-3 w-3 text-teal-600" /> : <FileText className="h-3 w-3 text-teal-600" />}
                      <span className="max-w-[120px] truncate">
                        {doc.type === 'invoice' ? `Rechnung ${doc.number}` : doc.type === 'quote' ? `Angebot ${doc.number}` : doc.fileName}
                      </span>
                      <button onClick={() => removeFirestoreAttachment(doc.id)} className="text-gray-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Picker Modal */}
            <Dialog open={showDocumentPicker} onOpenChange={setShowDocumentPicker}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {documentPickerType && getDocumentTitle(documentPickerType)} auswählen
                  </DialogTitle>
                  <DialogDescription>
                    Wählen Sie Dokumente aus, die Sie als Anhang hinzufügen möchten.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                  {isLoadingDocs ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
                    </div>
                  ) : availableDocuments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>Keine Dokumente gefunden</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-2">
                      {availableDocuments.map(doc => {
                        const isSelected = firestoreAttachments.some(d => d.id === doc.id);
                        const isGenerating = generatingPDF === doc.id;
                        return (
                          <button
                            key={doc.id}
                            onClick={() => addFirestoreDocument(doc)}
                            disabled={isSelected || isGenerating}
                            className={cn(
                              'w-full text-left p-3 rounded-lg border transition-all',
                              isSelected ? 'bg-teal-50 border-teal-300' : isGenerating ? 'bg-teal-50 border-teal-300' : 'bg-white hover:bg-gray-50 border-gray-200'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-teal-600 border-t-transparent rounded-full" /> : (
                                  doc.type === 'invoice' ? <Receipt className="h-5 w-5 text-teal-600" /> : doc.type === 'quote' ? <FileText className="h-5 w-5 text-teal-600" /> : <FileIcon className="h-5 w-5 text-purple-600" />
                                )}
                                <div>
                                  <div className="font-medium">{doc.type === 'invoice' ? `Rechnung ${doc.number}` : doc.type === 'quote' ? `Angebot ${doc.number}` : doc.fileName}</div>
                                  <div className="text-sm text-gray-500">{isGenerating ? 'PDF wird generiert...' : (doc.createdAt && 'toDate' in doc.createdAt && doc.createdAt.toDate) ? doc.createdAt.toDate().toLocaleDateString('de-DE') : (doc.createdAt instanceof Date ? doc.createdAt.toLocaleDateString('de-DE') : '')}</div>
                                </div>
                              </div>
                              {isSelected && <Badge className="bg-teal-600">Hinzugefügt</Badge>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-4 border-t mt-4">
                  <Button variant="outline" onClick={() => setShowDocumentPicker(false)}>Fertig</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Formatierungsleiste - Gmail style exakt */}
            {showFormattingToolbar && (
            <div className="mx-3 my-1 px-2 py-1 border border-teal-200 rounded-lg flex items-center justify-center bg-teal-50">
              {/* Rückgängig */}
              <button onClick={() => applyFormat('undo')} className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" title="Rückgängig machen (Cmd+Z)">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
              </button>
              {/* Wiederholen */}
              <button onClick={() => applyFormat('redo')} className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" title="Wiederholen (Cmd+Y)">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
              </button>
              <div className="w-px h-4 bg-teal-300 mx-1.5" />
              {/* Schriftart - mit Dropdown */}
              <div className="relative" ref={fontDropdownRef}>
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault(); // Verhindert Fokusverlust
                    saveSelection();
                    setShowFontDropdown(!showFontDropdown);
                  }}
                  className="h-6 px-1.5 flex items-center gap-0.5 rounded hover:bg-teal-100 text-teal-700 text-[11px]"
                  title="Schriftart"
                >
                  <span>{selectedFont}</span>
                  <svg className="h-3 w-3 text-teal-500" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                </button>
                {showFontDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
                    {fontOptions.map((font) => (
                      <button
                        key={font.name}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedFont(font.name);
                          applyFontToSelection(font.fontFamily);
                          setShowFontDropdown(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-[13px]"
                        style={{ fontFamily: font.fontFamily }}
                      >
                        {selectedFont === font.name && (
                          <svg className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        )}
                        {selectedFont !== font.name && <span className="w-4" />}
                        <span>{font.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-px h-4 bg-teal-300 mx-1.5" />
              {/* Schriftgröße - mit Dropdown */}
              <div className="relative" ref={sizeDropdownRef}>
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                    setShowSizeDropdown(!showSizeDropdown);
                  }}
                  className="h-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600"
                  title="Schriftgröße"
                >
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/></svg>
                  <svg className="h-2.5 w-2.5 text-teal-500" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                </button>
                {showSizeDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-50">
                    {fontSizeOptions.map((option) => (
                      <button
                        key={option.name}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedSize(option.name);
                          restoreSelection();
                          editorRef.current?.focus();
                          document.execCommand('fontSize', false, option.size);
                          if (editorRef.current) {
                            setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                          }
                          saveSelection();
                          setShowSizeDropdown(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2"
                        style={{ fontSize: option.css }}
                      >
                        {selectedSize === option.name && (
                          <svg className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        )}
                        {selectedSize !== option.name && <span className="w-4" />}
                        <span>{option.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-px h-4 bg-teal-300 mx-1.5" />
              {/* Fett */}
              <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => applyFormat('bold')} className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" title="Fett (Cmd+B)">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
              </button>
              {/* Kursiv */}
              <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => applyFormat('italic')} className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" title="Kursiv (Cmd+I)">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
              </button>
              {/* Unterstrichen */}
              <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => applyFormat('underline')} className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" title="Unterstrichen (Cmd+U)">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
              </button>
              {/* Schriftfarbe - mit Dropdown */}
              <div className="relative" ref={colorDropdownRef}>
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                    setShowColorDropdown(!showColorDropdown);
                  }}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600"
                  title="Schriftfarbe"
                >
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z"/>
                    <path fill={selectedTextColor} d="M5 20h14v3H5z"/>
                  </svg>
                  <svg className="h-2.5 w-2.5 text-teal-500 -ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                </button>
              </div>
              {/* Color Picker Dropdown - außerhalb des relativen Containers für bessere Positionierung */}
              {showColorDropdown && (
                <div 
                  ref={colorDropdownRef}
                  className="fixed bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-[9999]"
                  style={{
                    bottom: '120px',
                    right: '100px',
                  }}
                >
                  {/* Zwei Spalten: Hintergrundfarbe | Schriftfarbe */}
                  <div className="flex gap-4">
                    {/* Hintergrundfarbe */}
                    <div>
                      <div className="text-[13px] text-gray-700 mb-2">Hintergrundfarbe</div>
                      <div className="space-y-0.5">
                        {colorPalette.map((row, rowIndex) => (
                          <div key={`bg-${rowIndex}`} className="flex gap-0.5">
                            {row.map((color) => (
                              <button
                                key={`bg-${color}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  restoreSelection();
                                  editorRef.current?.focus();
                                  document.execCommand('hiliteColor', false, color);
                                  if (editorRef.current) {
                                    setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                                  }
                                  saveSelection();
                                  setShowColorDropdown(false);
                                }}
                                className="w-[18px] h-[18px] rounded-sm border border-gray-200 hover:scale-125 transition-transform"
                                style={{ backgroundColor: color }}
                                title={color}
                              >
                                {color === '#ffffff' && (
                                  <svg className="w-full h-full text-gray-400" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1">
                                    <path d="M2 16L16 2" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Schriftfarbe */}
                    <div>
                      <div className="text-[13px] text-gray-700 mb-2">Schriftfarbe</div>
                      <div className="space-y-0.5">
                        {colorPalette.map((row, rowIndex) => (
                          <div key={`text-${rowIndex}`} className="flex gap-0.5">
                            {row.map((color) => (
                              <button
                                key={`text-${color}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  restoreSelection();
                                  editorRef.current?.focus();
                                  setSelectedTextColor(color);
                                  document.execCommand('foreColor', false, color);
                                  if (editorRef.current) {
                                    setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                                  }
                                  saveSelection();
                                  setShowColorDropdown(false);
                                }}
                                className="w-[18px] h-[18px] rounded-sm border border-gray-200 hover:scale-125 transition-transform"
                                style={{ backgroundColor: color }}
                                title={color}
                              >
                                {color === '#ffffff' && (
                                  <svg className="w-full h-full text-gray-400" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1">
                                    <path d="M2 16L16 2" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="w-px h-4 bg-teal-300 mx-1.5" />
              {/* Ausrichtung - mit Dropdown */}
              <div className="relative" ref={alignDropdownRef}>
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                    setShowAlignDropdown(!showAlignDropdown);
                  }}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600"
                  title="Ausrichtung"
                >
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>
                  <svg className="h-2.5 w-2.5 text-teal-500 -ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                </button>
                {showAlignDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[9999]">
                    {/* Linksbündig */}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        restoreSelection();
                        editorRef.current?.focus();
                        document.execCommand('justifyLeft', false);
                        if (editorRef.current) {
                          setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                        }
                        saveSelection();
                        setShowAlignDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 hover:bg-gray-100 flex items-center justify-center"
                      title="Linksbündig"
                    >
                      <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>
                    </button>
                    {/* Zentriert */}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        restoreSelection();
                        editorRef.current?.focus();
                        document.execCommand('justifyCenter', false);
                        if (editorRef.current) {
                          setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                        }
                        saveSelection();
                        setShowAlignDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 hover:bg-gray-100 flex items-center justify-center"
                      title="Zentriert"
                    >
                      <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>
                    </button>
                    {/* Rechtsbündig */}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        restoreSelection();
                        editorRef.current?.focus();
                        document.execCommand('justifyRight', false);
                        if (editorRef.current) {
                          setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                        }
                        saveSelection();
                        setShowAlignDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 hover:bg-gray-100 flex items-center justify-center"
                      title="Rechtsbündig"
                    >
                      <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>
                    </button>
                  </div>
                )}
              </div>
              {/* Nummerierte Liste */}
              <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => applyFormat('insertOrderedList')} className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" title="Nummerierte Liste (Cmd+Shift+7)">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
              </button>
              {/* Aufzählung */}
              <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => applyFormat('insertUnorderedList')} className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" title="Liste mit Aufzählungszeichen (Cmd+Shift+8)">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
              </button>
              {/* Einzug verringern */}
              <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => applyFormat('outdent')} className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" title="Einzug verringern (Cmd+[)">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h10v-2H11v2zm-8-5l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg>
              </button>
              {/* Einzug vergrößern */}
              <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => applyFormat('indent')} className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" title="Einzug vergrößern (Cmd+])">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg>
              </button>
              <div className="w-px h-4 bg-teal-300 mx-1.5" />
              {/* Weitere Formatierungsoptionen - Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSelection();
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-teal-100 text-teal-600" 
                    title="Weitere Formatierungsoptionen"
                  >
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" sideOffset={8} className="flex flex-col p-2 gap-1 bg-white rounded-lg shadow-lg border min-w-0 w-auto">
                  {/* Durchgestrichen */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editorRef.current?.focus();
                      if (savedSelectionRef.current) {
                        const selection = window.getSelection();
                        if (selection) {
                          selection.removeAllRanges();
                          selection.addRange(savedSelectionRef.current);
                        }
                      }
                      setTimeout(() => {
                        document.execCommand('strikeThrough', false);
                        if (editorRef.current) {
                          setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                        }
                        saveSelection();
                      }, 10);
                    }}
                    className="h-8 w-8 flex items-center justify-center cursor-pointer rounded hover:bg-teal-100"
                    title="Durchgestrichen"
                  >
                    <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>
                    </svg>
                  </button>
                  {/* Zitieren (Blockquote) */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editorRef.current?.focus();
                      if (savedSelectionRef.current) {
                        const selection = window.getSelection();
                        if (selection) {
                          selection.removeAllRanges();
                          selection.addRange(savedSelectionRef.current);
                        }
                      }
                      setTimeout(() => {
                        document.execCommand('formatBlock', false, 'blockquote');
                        if (editorRef.current) {
                          const blockquotes = editorRef.current.querySelectorAll('blockquote');
                          blockquotes.forEach((bq) => {
                            (bq as HTMLElement).style.borderLeft = '3px solid #0d9488';
                            (bq as HTMLElement).style.paddingLeft = '12px';
                            (bq as HTMLElement).style.marginLeft = '0';
                            (bq as HTMLElement).style.color = '#666';
                          });
                          setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                        }
                        saveSelection();
                      }, 10);
                    }}
                    className="h-8 w-8 flex items-center justify-center cursor-pointer rounded hover:bg-teal-100"
                    title="Zitieren"
                  >
                    <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                    </svg>
                  </button>
                  {/* Formatierung entfernen */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editorRef.current?.focus();
                      if (savedSelectionRef.current) {
                        const selection = window.getSelection();
                        if (selection) {
                          selection.removeAllRanges();
                          selection.addRange(savedSelectionRef.current);
                        }
                      }
                      setTimeout(() => {
                        document.execCommand('removeFormat', false);
                        if (editorRef.current) {
                          setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                        }
                        saveSelection();
                      }, 10);
                    }}
                    className="h-8 w-8 flex items-center justify-center cursor-pointer rounded hover:bg-teal-100"
                    title="Formatierung entfernen"
                  >
                    <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.55 5.27 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"/>
                    </svg>
                  </button>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            )}

            {/* Senden-Leiste - Gmail style ganz unten */}
            <div className="px-3 py-2 border-t border-gray-200 flex items-center gap-1">
              {/* Senden Button mit Dropdown */}
              <div className="flex">
                <button
                  onClick={handleSend}
                  disabled={isSending || !email.to?.trim()}
                  className="h-9 px-5 bg-teal-600 hover:bg-teal-700 text-white text-[14px] font-medium rounded-l-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSending ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    'Senden'
                  )}
                </button>
                <button className="h-9 px-2 bg-teal-600 hover:bg-teal-700 text-white rounded-r-full border-l border-teal-400">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Formatierungs-Toggle */}
              <button 
                onClick={() => setShowFormattingToolbar(!showFormattingToolbar)}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-full ml-1",
                  showFormattingToolbar 
                    ? "bg-teal-100 text-teal-700" 
                    : "hover:bg-gray-100 text-gray-600"
                )}
                title="Formatierungsoptionen ein-/ausblenden"
              >
                <span className="text-[14px] font-serif">Aa</span>
              </button>

              {/* Aktions-Icons */}
              <button onClick={handleFileSelect} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Dateien anhängen">
                <Paperclip className="h-[18px] w-[18px]" />
              </button>
              <button 
                onClick={() => {
                  saveSelection();
                  // Prüfe ob Text selektiert ist
                  const selection = window.getSelection();
                  if (selection && selection.toString()) {
                    setLinkText(selection.toString());
                  } else {
                    setLinkText('');
                  }
                  setLinkUrl('');
                  setShowLinkModal(true);
                }}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-full text-gray-600",
                  showLinkModal ? "bg-teal-100 text-teal-700" : "hover:bg-gray-100"
                )}
                title="Link einfügen"
              >
                <Link className="h-[18px] w-[18px]" />
              </button>
              
              {/* Link-Popover - Gmail Style */}
              {showLinkModal && (
                <div ref={linkPopoverRef} className="absolute bottom-10 left-16 bg-white rounded shadow-md p-2 z-50 border border-gray-200">
                  {/* Text-Eingabe */}
                  <div className="flex items-center border border-teal-500 rounded px-2 py-1 mb-1.5" style={{ width: '190px' }}>
                    <span className="text-gray-400 mr-1.5 text-xs">=</span>
                    <input
                      type="text"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      placeholder="Text"
                      className="flex-1 outline-none text-xs bg-transparent text-gray-700 placeholder-gray-400"
                      autoFocus
                    />
                  </div>
                  {/* URL-Eingabe mit Anwenden-Button */}
                  <div className="flex items-center">
                    <div className="flex items-center border border-gray-300 rounded px-2 py-1" style={{ width: '190px' }}>
                      <svg className="h-3 w-3 text-gray-400 mr-1.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="Link eingeben oder einfügen"
                        className="flex-1 outline-none text-xs bg-transparent text-gray-700 placeholder-gray-400 min-w-0"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (linkUrl) {
                              restoreSelection();
                              editorRef.current?.focus();
                              if (linkText && !savedSelectionRef.current?.toString()) {
                                document.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank" style="color: #0d9488; text-decoration: underline;">${linkText}</a>`);
                              } else {
                                document.execCommand('createLink', false, linkUrl);
                                const selection = window.getSelection();
                                if (selection && selection.anchorNode) {
                                  const link = selection.anchorNode.parentElement;
                                  if (link?.tagName === 'A') {
                                    (link as HTMLAnchorElement).target = '_blank';
                                    (link as HTMLAnchorElement).style.color = '#0d9488';
                                    (link as HTMLAnchorElement).style.textDecoration = 'underline';
                                  }
                                }
                              }
                              if (editorRef.current) {
                                setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                              }
                              setShowLinkModal(false);
                              setLinkUrl('');
                              setLinkText('');
                            }
                          } else if (e.key === 'Escape') {
                            setShowLinkModal(false);
                          }
                        }}
                      />
                    </div>
                    <span
                      onClick={() => {
                        if (linkUrl) {
                          restoreSelection();
                          editorRef.current?.focus();
                          if (linkText && !savedSelectionRef.current?.toString()) {
                            document.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank" style="color: #0d9488; text-decoration: underline;">${linkText}</a>`);
                          } else {
                            document.execCommand('createLink', false, linkUrl);
                            const selection = window.getSelection();
                            if (selection && selection.anchorNode) {
                              const link = selection.anchorNode.parentElement;
                              if (link?.tagName === 'A') {
                                (link as HTMLAnchorElement).target = '_blank';
                                (link as HTMLAnchorElement).style.color = '#0d9488';
                                (link as HTMLAnchorElement).style.textDecoration = 'underline';
                              }
                            }
                          }
                          if (editorRef.current) {
                            setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                          }
                          setShowLinkModal(false);
                          setLinkUrl('');
                          setLinkText('');
                        }
                      }}
                      className="ml-2 text-xs cursor-pointer whitespace-nowrap text-teal-600 hover:text-teal-700"
                    >
                      Anwenden
                    </span>
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => {
                  saveSelection();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100",
                  showEmojiPicker ? "bg-teal-100 text-teal-600" : "text-gray-600"
                )}
                title="Emoji einfügen"
              >
                <Smile className="h-[18px] w-[18px]" />
              </button>
              
              {/* Emoji-Picker Popover */}
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-10 left-24 bg-white rounded-lg shadow-lg p-2 z-50 border border-gray-200" style={{ width: '280px' }}>
                  <div className="grid grid-cols-8 gap-1">
                    {['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
                      '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎',
                      '🤔', '🤗', '🤩', '🥳', '😏', '😌', '😔', '😢',
                      '😭', '😤', '😠', '🤯', '😱', '🙄', '😴', '🤮',
                      '👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👋',
                      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔',
                      '✅', '❌', '⭐', '🔥', '💯', '🎉', '🎊', '🎁',
                      '📧', '📞', '💼', '📅', '⏰', '📌', '✏️', '📎'
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          restoreSelection();
                          editorRef.current?.focus();
                          document.execCommand('insertText', false, emoji);
                          if (editorRef.current) {
                            setEmail(prev => ({ ...prev, body: editorRef.current?.innerHTML || '' }));
                          }
                          setShowEmojiPicker(false);
                        }}
                        className="h-7 w-7 flex items-center justify-center text-lg hover:bg-gray-100 rounded cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Drive Button - Provider-abhängig */}
              <button 
                onClick={() => emailProvider === 'gmail' ? setShowGoogleDrivePicker(true) : setShowDrivePicker(true)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" 
                title={emailProvider === 'gmail' ? 'Google Drive' : 'Taskilo Drive'}
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l4.29 7.5h6.57L5.43 11 8.86 5.25 7.71 3.5zm1.14 2l6.57 11.5H8.86l-3.43 6h6.57l6.86-12L12 3.5H7.71l1.14 2z"/></svg>
              </button>
              {/* Foto Button - Nur Taskilo Photos */}
              {emailProvider === 'webmail' && (
                <button 
                  onClick={() => setShowTaskiloPhotosPicker(true)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" 
                  title="Taskilo Fotos"
                >
                  <ImageIcon className="h-[18px] w-[18px]" />
                </button>
              )}
              <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Vertraulich">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </button>
              
              {/* Signatur-Dropdown (Gmail-Style) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={cn(
                      "h-8 w-8 flex items-center justify-center rounded-full text-gray-600",
                      activeSignatureId ? "bg-teal-100 text-teal-700" : "hover:bg-gray-100"
                    )} 
                    title="Signatur einfügen"
                  >
                    <PenLine className="h-[18px] w-[18px]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {/* Signaturen verwalten - Link zu den Einstellungen */}
                  <DropdownMenuItem 
                    className="text-[13px] text-gray-600"
                    onClick={() => {
                      if (emailProvider === 'gmail') {
                        // Gmail-Signaturen werden direkt in Gmail verwaltet
                        window.open('https://mail.google.com/mail/u/0/#settings/general', '_blank');
                      } else {
                        // Webmail-Signaturen in Taskilo verwalten
                        window.open('/webmail?settings=general', '_blank');
                      }
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Signaturen verwalten
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Keine Signatur Option */}
                  <DropdownMenuItem 
                    className="text-[13px]"
                    onClick={() => {
                      // Entferne aktuelle Signatur aus Body
                      if (activeSignatureId) {
                        const currentSig = signatures.find(s => s.id === activeSignatureId);
                        if (currentSig?.content && editorRef.current) {
                          const bodyHtml = editorRef.current.innerHTML;
                          // Versuche die Signatur zu entfernen
                          const sigPattern = new RegExp(`(<br><br>)?${escapeRegExp(currentSig.content)}`, 'gi');
                          const newBody = bodyHtml.replace(sigPattern, '');
                          editorRef.current.innerHTML = newBody;
                          setEmail(prev => ({ ...prev, body: newBody }));
                        }
                      }
                      setActiveSignatureId(null);
                    }}
                  >
                    {!activeSignatureId && <Check className="h-4 w-4 mr-2 text-teal-600" />}
                    {activeSignatureId && <span className="w-4 mr-2" />}
                    Keine Signatur
                  </DropdownMenuItem>
                  
                  {/* Liste der Signaturen */}
                  {signatures.map(sig => (
                    <DropdownMenuItem 
                      key={sig.id}
                      className="text-[13px]"
                      onClick={() => {
                        // Entferne alte Signatur falls vorhanden
                        if (activeSignatureId && editorRef.current) {
                          const oldSig = signatures.find(s => s.id === activeSignatureId);
                          if (oldSig?.content) {
                            const bodyHtml = editorRef.current.innerHTML;
                            const sigPattern = new RegExp(`(<br><br>)?${escapeRegExp(oldSig.content)}`, 'gi');
                            editorRef.current.innerHTML = bodyHtml.replace(sigPattern, '');
                          }
                        }
                        
                        // Füge neue Signatur hinzu
                        if (editorRef.current && sig.content) {
                          const currentHtml = editorRef.current.innerHTML;
                          const newHtml = currentHtml + `<br><br>${sig.content}`;
                          editorRef.current.innerHTML = newHtml;
                          setEmail(prev => ({ ...prev, body: newHtml }));
                        }
                        setActiveSignatureId(sig.id);
                      }}
                    >
                      {activeSignatureId === sig.id && <Check className="h-4 w-4 mr-2 text-teal-600" />}
                      {activeSignatureId !== sig.id && <span className="w-4 mr-2" />}
                      {sig.name}
                    </DropdownMenuItem>
                  ))}
                  
                  {signatures.length === 0 && (
                    <div className="px-3 py-2 text-[12px] text-gray-400">
                      Keine Signaturen vorhanden
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mehr-Optionen */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Weitere Optionen">
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-[13px]" onClick={handleSaveDraft}>
                    <Save className="h-4 w-4 mr-2" />
                    Entwurf speichern
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-[13px]">
                    <Clock className="h-4 w-4 mr-2" />
                    Senden planen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-[13px]" onClick={() => loadDocuments('invoice')} disabled={!companyId}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Rechnung anhängen
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-[13px]" onClick={() => loadDocuments('quote')} disabled={!companyId}>
                    <FileText className="h-4 w-4 mr-2" />
                    Angebot anhängen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex-1" />

              {/* Papierkorb ganz rechts */}
              <button 
                onClick={resetAndClose}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500" 
                title="Entwurf verwerfen"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>

              <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
            </div>
          </div>
        )}
      </div>

      {/* Drive Picker Modal - Taskilo Drive (nur wenn Webmail verbunden) */}
      {emailProvider === 'webmail' && (
        <DrivePickerModal
          isOpen={showDrivePicker}
          onClose={() => setShowDrivePicker(false)}
          onSelect={async (driveFiles) => {
            // Lade die Dateien vom Drive herunter und füge sie als Attachments hinzu
            const credentials = getWebmailCookie();
            if (!credentials) {
              toast.error('Nicht angemeldet');
              return;
            }
            
            for (const driveFile of driveFiles) {
              try {
                const response = await fetch(`/api/webmail/drive/files/${driveFile.id}`, {
                  headers: { 'x-user-id': credentials.email },
                });
                
                if (response.ok) {
                  const blob = await response.blob();
                  const file = new File([blob], driveFile.name, { type: driveFile.mimeType || 'application/octet-stream' });
                  setAttachments(prev => [...prev, file]);
                  toast.success(`${driveFile.name} hinzugefügt`);
                } else {
                  const errorData = await response.json().catch(() => ({}));
                  throw new Error(errorData.error || 'Download fehlgeschlagen');
                }
              } catch {
                toast.error(`Fehler beim Laden von ${driveFile.name}`);
              }
            }
          }}
          userId={getWebmailCookie()?.email}
          multiple={true}
        />
      )}

      {/* Google Drive Picker - Nur wenn Gmail verbunden */}
      {emailProvider === 'gmail' && companyId && (
        <GoogleDrivePicker
          isOpen={showGoogleDrivePicker}
          onClose={() => setShowGoogleDrivePicker(false)}
          onSelect={async (files: GoogleDriveFile[]) => {
            // Lade Google Drive Dateien herunter und konvertiere zu File-Objekten
            for (const driveFile of files) {
              try {
                // Hole Access Token
                const authResponse = await fetch(`/api/company/${companyId}/gmail-auth-status`);
                const authData = await authResponse.json();
                
                if (!authData.accessToken) {
                  toast.error('Gmail-Authentifizierung fehlgeschlagen');
                  continue;
                }
                
                // Lade Datei von Google Drive
                const fileResponse = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`,
                  {
                    headers: {
                      Authorization: `Bearer ${authData.accessToken}`,
                    },
                  }
                );
                
                if (!fileResponse.ok) {
                  throw new Error('Download fehlgeschlagen');
                }
                
                const blob = await fileResponse.blob();
                const file = new File([blob], driveFile.name, {
                  type: driveFile.mimeType || 'application/octet-stream',
                });
                
                setAttachments(prev => [...prev, file]);
                toast.success(`${driveFile.name} hinzugefügt`);
              } catch (error) {
                toast.error(`Fehler beim Laden von ${driveFile.name}`);
              }
            }
            setShowGoogleDrivePicker(false);
          }}
          companyId={companyId}
        />
      )}



      {/* Taskilo Photos Picker - Nur wenn Webmail verbunden */}
      {emailProvider === 'webmail' && userId && (
        <PhotosPickerModal
          isOpen={showTaskiloPhotosPicker}
          onClose={() => setShowTaskiloPhotosPicker(false)}
          onSelect={(photos) => {
            // Füge Taskilo Photos als Attachments hinzu
            photos.forEach(photo => {
              // Erstelle ein pseudo-File-Objekt für die Anzeige
              const pseudoFile = {
                id: photo.id,
                name: photo.originalFilename || photo.filename,
                size: photo.size,
                type: photo.mimeType,
                thumbnailLink: photo.thumbnailPath,
              } as unknown as File;
              setAttachments(prev => [...prev, pseudoFile]);
              toast.success(`Foto ${photo.filename} hinzugefügt`);
            });
            setShowTaskiloPhotosPicker(false);
          }}
          userId={userId}
        />
      )}
    </div>
  );
}
