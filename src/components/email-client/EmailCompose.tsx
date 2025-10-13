'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Send,
  Paperclip,
  X,
  Bold,
  Italic,
  Underline,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image,
  Smile,
  Calendar,
  Clock,
  Minimize2,
  Maximize2,
  Save,
  FileText,
  Receipt,
  File,
  Folder,
  ChevronDown,
  Upload,
} from 'lucide-react';
import type { EmailCompose as EmailComposeType, EmailMessage } from './types';
import { cn } from '@/lib/utils';
import { db } from '@/firebase/clients';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { PDFGenerationService } from '@/services/pdfGenerationService';
import { toast } from 'sonner';

interface EmailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: EmailComposeType) => Promise<void>;
  onSaveDraft: (email: EmailComposeType) => Promise<void>;
  replyTo?: EmailMessage;
  forwardEmail?: EmailMessage;
  className?: string;
  companyId?: string;
}

interface FirestoreDocument {
  id: string;
  number?: string;
  invoiceNumber?: string;
  quoteNumber?: string;
  fileName?: string;
  name?: string;
  createdAt?: any;
  pdfUrl?: string;
  fileUrl?: string;
  type: 'invoice' | 'quote' | 'document';
  pdfGenerated?: boolean; // Flag für bereits generierte PDFs
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

// Helper to safely extract sender info
const getSenderInfo = (from: any): string => {
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
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Unbekanntes Datum';

  try {
    let date: Date;

    // Firestore Timestamp
    if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
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
  } catch (error) {
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
  className,
  companyId,
}: EmailComposeProps) {
  const [email, setEmail] = useState<EmailComposeType>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    priority: 'normal',
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [firestoreAttachments, setFirestoreAttachments] = useState<FirestoreDocument[]>([]);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [documentPickerType, setDocumentPickerType] = useState<
    'invoice' | 'quote' | 'customer-doc' | null
  >(null);
  const [availableDocuments, setAvailableDocuments] = useState<FirestoreDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null); // ID des Dokuments, für das PDF generiert wird
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pdfCacheRef = useRef<Map<string, File>>(new Map()); // Session Cache für generierte PDFs

  // Update email state when replyTo or forwardEmail changes
  useEffect(() => {
    if (isOpen && replyTo) {
      setEmail({
        to: replyTo.from.email,
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
  }, [isOpen, replyTo, forwardEmail]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!email.to?.trim()) {
      alert('Bitte geben Sie mindestens einen Empfänger ein.');
      return;
    }

    if (!email.subject?.trim()) {
      alert('Bitte geben Sie einen Betreff ein.');
      return;
    }

    if (!email.body?.trim()) {
      alert('Bitte geben Sie eine Nachricht ein.');
      return;
    }

    setIsSending(true);
    try {
      await onSend({
        ...email,
        attachments,
      });
      onClose();
      // Reset form
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
      console.error('Fehler beim Senden der E-Mail:', error);
      alert('Fehler beim Senden der E-Mail. Bitte versuchen Sie es erneut.');
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

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeFirestoreAttachment = (id: string) => {
    setFirestoreAttachments(prev => prev.filter(doc => doc.id !== id));
  };

  const formatFileSize = (bytes: number) => {
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
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 50);
      }

      setAvailableDocuments(docs);
      setShowDocumentPicker(true);
    } catch (error) {
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

  const getOriginalMessage = () => {
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

      return `\n\n--- Weitergeleitete Nachricht ---\nVon: ${senderInfo}\nAn: ${forwardEmail.to?.map((t: any) => (typeof t === 'string' ? t : t.email)).join(', ') || 'Unbekannt'}\nDatum: ${dateInfo}\nBetreff: ${forwardEmail.subject || '(Kein Betreff)'}\n\n${bodyText}`;
    }
    return '';
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = email.body.substring(start, end);
    const newText =
      email.body.substring(0, start) + prefix + selectedText + suffix + email.body.substring(end);

    setEmail(prev => ({ ...prev, body: newText }));

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      <Card
        className={cn(
          'w-full max-w-4xl bg-white shadow-2xl border-0 transition-all duration-200 flex flex-col',
          isMinimized ? 'h-12' : 'h-[700px]',
          className
        )}
      >
        {/* Header */}
        <CardHeader className="pb-2 bg-teal-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {replyTo ? 'Antworten' : forwardEmail ? 'Weiterleiten' : 'Neue E-Mail'}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
            {/* Recipients */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="to" className="w-12 text-sm font-medium">
                  An:
                </Label>
                <Input
                  id="to"
                  type="email"
                  value={email.to ?? ''}
                  onChange={e => setEmail(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="empfaenger@beispiel.de"
                  className="flex-1"
                />
                <div className="flex gap-1">
                  {!showCc && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCc(true)}
                      className="text-xs"
                    >
                      CC
                    </Button>
                  )}
                  {!showBcc && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBcc(true)}
                      className="text-xs"
                    >
                      BCC
                    </Button>
                  )}
                </div>
              </div>

              {showCc && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="cc" className="w-12 text-sm font-medium">
                    CC:
                  </Label>
                  <Input
                    id="cc"
                    type="email"
                    value={email.cc ?? ''}
                    onChange={e => setEmail(prev => ({ ...prev, cc: e.target.value }))}
                    placeholder="kopie@beispiel.de"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCc(false);
                      setEmail(prev => ({ ...prev, cc: '' }));
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {showBcc && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="bcc" className="w-12 text-sm font-medium">
                    BCC:
                  </Label>
                  <Input
                    id="bcc"
                    type="email"
                    value={email.bcc ?? ''}
                    onChange={e => setEmail(prev => ({ ...prev, bcc: e.target.value }))}
                    placeholder="blindkopie@beispiel.de"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowBcc(false);
                      setEmail(prev => ({ ...prev, bcc: '' }));
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label htmlFor="subject" className="w-12 text-sm font-medium">
                  Betreff:
                </Label>
                <Input
                  id="subject"
                  value={email.subject ?? ''}
                  onChange={e => setEmail(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="E-Mail-Betreff"
                  className="flex-1"
                />
                <Select
                  value={email.priority ?? 'normal'}
                  onValueChange={(value: 'low' | 'normal' | 'high') =>
                    setEmail(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="p-2 border-b bg-gray-50">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('**', '**')}
                  title="Fett"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('*', '*')}
                  title="Kursiv"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('_', '_')}
                  title="Unterstrichen"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n')}
                  title="Linksbündig"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n    ')}
                  title="Zentriert"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n        ')}
                  title="Rechtsbündig"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n• ')}
                  title="Aufzählung"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('\n1. ')}
                  title="Nummerierte Liste"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    const url = prompt('Link URL eingeben:');
                    const text = prompt('Link Text eingeben:') || 'Link';
                    if (url) insertFormatting(`[${text}](${url})`);
                  }}
                  title="Link einfügen"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    const url = prompt('Bild URL eingeben:');
                    const alt = prompt('Alt Text eingeben:') || 'Bild';
                    if (url) insertFormatting(`![${alt}](${url})`);
                  }}
                  title="Bild einfügen"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => insertFormatting('😊')}
                  title="Emoji einfügen"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Message Body */}
            <div className="flex-1 overflow-auto flex flex-col">
              {/* New Message Area */}
              <div className="p-4 flex-1 min-h-[250px]">
                <Textarea
                  ref={textareaRef}
                  value={email.body ?? ''}
                  onChange={e => setEmail(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Ihre Nachricht..."
                  className="w-full h-full resize-none border-0 focus:ring-0 text-base"
                />
              </div>

              {/* Original Message - Gmail Style */}
              {(replyTo || forwardEmail) && (
                <div className="border-t border-gray-200 mx-4">
                  <div className="py-4">
                    <div className="text-sm text-gray-600 mb-3">
                      {replyTo && (
                        <>
                          <div className="font-medium mb-1">--- Ursprüngliche Nachricht ---</div>
                          <div>
                            <strong>Von:</strong> {getSenderInfo(replyTo.from)}
                          </div>
                          <div>
                            <strong>Datum:</strong> {formatTimestamp(replyTo.timestamp)}
                          </div>
                          <div>
                            <strong>Betreff:</strong> {replyTo.subject || '(Kein Betreff)'}
                          </div>
                        </>
                      )}
                      {forwardEmail && (
                        <>
                          <div className="font-medium mb-1">--- Weitergeleitete Nachricht ---</div>
                          <div>
                            <strong>Von:</strong> {getSenderInfo(forwardEmail.from)}
                          </div>
                          <div>
                            <strong>Datum:</strong> {formatTimestamp(forwardEmail.timestamp)}
                          </div>
                          <div>
                            <strong>Betreff:</strong> {forwardEmail.subject || '(Kein Betreff)'}
                          </div>
                        </>
                      )}
                    </div>

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
                              <File className="h-12 w-12 mx-auto mb-3 text-gray-400" />
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
                                      isSelected
                                        ? 'bg-teal-50 border-teal-300 cursor-not-allowed'
                                        : isGenerating
                                          ? 'bg-blue-50 border-blue-300 cursor-wait'
                                          : 'bg-white hover:bg-gray-50 border-gray-200 cursor-pointer'
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        {isGenerating ? (
                                          <div className="animate-spin h-5 w-5 border-2 border-teal-600 border-t-transparent rounded-full" />
                                        ) : (
                                          <>
                                            {doc.type === 'invoice' && (
                                              <Receipt className="h-5 w-5 text-teal-600" />
                                            )}
                                            {doc.type === 'quote' && (
                                              <FileText className="h-5 w-5 text-blue-600" />
                                            )}
                                            {doc.type === 'document' && (
                                              <File className="h-5 w-5 text-purple-600" />
                                            )}
                                          </>
                                        )}

                                        <div>
                                          <div className="font-medium">
                                            {doc.type === 'invoice' && `Rechnung ${doc.number}`}
                                            {doc.type === 'quote' && `Angebot ${doc.number}`}
                                            {doc.type === 'document' && doc.fileName}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {isGenerating
                                              ? 'PDF wird generiert...'
                                              : doc.createdAt?.toDate
                                                ? doc.createdAt.toDate().toLocaleDateString('de-DE')
                                                : 'Datum unbekannt'}
                                          </div>
                                        </div>
                                      </div>

                                      {isSelected && !isGenerating && (
                                        <Badge variant="default" className="bg-teal-600">
                                          ✓ Hinzugefügt
                                        </Badge>
                                      )}
                                      {isGenerating && (
                                        <Badge variant="default" className="bg-blue-600">
                                          Generiere...
                                        </Badge>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                          <Button variant="outline" onClick={() => setShowDocumentPicker(false)}>
                            Fertig
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Original Email Content - HTML rendered wie bei Gmail */}
                    <div className="mt-3 pl-4 border-l-2 border-gray-300">
                      <iframe
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta charset="utf-8">
                            <style>
                              body { 
                                margin: 0; 
                                padding: 0;
                                font-family: Arial, sans-serif;
                                font-size: 14px;
                                color: #000;
                              }
                              img { max-width: 100% !important; height: auto !important; }
                              table { max-width: 100% !important; }
                            </style>
                          </head>
                          <body>
                            ${replyTo?.htmlBody || replyTo?.body || forwardEmail?.htmlBody || forwardEmail?.body || ''}
                          </body>
                          </html>
                        `}
                        className="w-full border-0"
                        style={{ minHeight: '200px', maxHeight: '400px' }}
                        sandbox="allow-same-origin"
                        title="Original Email"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            {(attachments.length > 0 || firestoreAttachments.length > 0) && (
              <div className="px-4 pb-4">
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Anhänge ({attachments.length + firestoreAttachments.length})
                  </h4>
                  <div className="space-y-2">
                    {/* Local file attachments */}
                    {attachments.map((file, index) => (
                      <div
                        key={`file-${index}`}
                        className="flex items-center justify-between bg-white p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(file.size)}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Firestore document attachments */}
                    {firestoreAttachments.map(doc => (
                      <div
                        key={`doc-${doc.id}`}
                        className="flex items-center justify-between bg-white p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          {doc.type === 'invoice' && <Receipt className="h-4 w-4 text-teal-600" />}
                          {doc.type === 'quote' && <FileText className="h-4 w-4 text-blue-600" />}
                          {doc.type === 'document' && <File className="h-4 w-4 text-purple-600" />}
                          <span className="text-sm font-medium">
                            {doc.type === 'invoice' && `Rechnung ${doc.number}`}
                            {doc.type === 'quote' && `Angebot ${doc.number}`}
                            {doc.type === 'document' && doc.fileName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {doc.type === 'invoice'
                              ? 'Rechnung'
                              : doc.type === 'quote'
                                ? 'Angebot'
                                : 'Dokument'}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFirestoreAttachment(doc.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleSend}
                  disabled={isSending || !email.to?.trim()}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Senden
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isDraft}
                  className="flex items-center gap-2"
                >
                  {isDraft ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Entwurf speichern
                    </>
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Anhang
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuItem onClick={handleFileSelect}>
                      <Upload className="h-4 w-4 mr-2" />
                      <span>Vom Computer hochladen</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => loadDocuments('invoice')}
                      disabled={!companyId || isLoadingDocs}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      <span>Aus Rechnungen</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => loadDocuments('quote')}
                      disabled={!companyId || isLoadingDocs}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span>Aus Angeboten</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => loadDocuments('customer-doc')}
                      disabled={!companyId || isLoadingDocs}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      <span>Aus Kundendokumenten</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Später senden
                </Button>

                <Button variant="ghost" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Termin vorschlagen
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
