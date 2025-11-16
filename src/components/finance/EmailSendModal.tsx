'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  X, 
  Send, 
  FileText, 
  Plus, 
  Loader2, 
  AlertTriangle, 
  Mail, 
  User, 
  MessageSquare,
  Paperclip,
  Eye,
  ChevronDown,
  Upload,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceData } from '@/types/invoiceTypes';
import { GoBDService } from '@/services/gobdService';
import { useAuth } from '@/contexts/AuthContext';
import { useGoBDActionWarning } from '@/components/finance/gobd';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: InvoiceData | any;
  documentType:
    | 'invoice'
    | 'quote'
    | 'delivery'
    | 'order'
    | 'reminder'
    | 'credit-note'
    | 'cancellation'
    | 'contract'
    | 'receipt';
  companyId: string;
  selectedTemplate: string; // Template from SendDocumentModal
  pageMode?: 'single' | 'multi'; // ✅ Page mode for PDF generation
  getRenderedHtml: () => Promise<string | null>; // ✅ Get rendered HTML from SendDocumentModal
  isTemplateReady: boolean; // ✅ Check if template is rendered and ready
  onSend?: (emailData: EmailSendData) => Promise<void>;
  companyData?: {
    name: string;
    email: string;
    signature?: string;
  };
  defaultRecipients?: string[];
  // GoBD-Funktionalität
  enableGoBDLocking?: boolean; // Automatische Festschreibung aktivieren
  onDocumentLocked?: (documentId: string) => void; // Callback nach Festschreibung
}

interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string;
}

interface EmailSendData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  message: string;
  signature?: string;
  sendCopy: boolean;
  attachments: EmailAttachment[];
  priority?: 'normal' | 'high' | 'low';
  scheduledSend?: Date;
  trackOpening?: boolean;
}

export function EmailSendModal({
  isOpen,
  onClose,
  document,
  documentType,
  companyId,
  selectedTemplate,
  pageMode = 'single',
  getRenderedHtml,
  isTemplateReady,
  onSend,
  companyData,
  defaultRecipients = [],
  enableGoBDLocking = true,
  onDocumentLocked,
}: EmailSendModalProps) {
  const [sending, setSending] = useState(false);
  const initializedRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { showWarning, WarningComponent } = useGoBDActionWarning();

  // Email form fields
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [ccRecipients, setCcRecipients] = useState<EmailRecipient[]>([]);
  const [bccRecipients, setBccRecipients] = useState<EmailRecipient[]>([]);
  const [currentRecipient, setCurrentRecipient] = useState('');
  const [currentCC, setCurrentCC] = useState('');
  const [currentBCC, setCurrentBCC] = useState('');

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [sendCopy, setSendCopy] = useState(false);

  // Attachments
  const [additionalAttachments, setAdditionalAttachments] = useState<EmailAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // UI states
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);

  // Memoized document values to prevent infinite loops
  const documentLabels = useMemo(() => ({
    invoice: 'Rechnung',
    quote: 'Angebot',
    reminder: 'Erinnerung',
    delivery: 'Lieferschein',
    order: 'Auftrag',
    'credit-note': 'Gutschrift',
    cancellation: 'Storno',
    contract: 'Vertrag',
    receipt: 'Quittung',
  }), []);

  const documentLabel = useMemo(() => 
    documentLabels[documentType as keyof typeof documentLabels] || 'Dokument',
    [documentLabels, documentType]
  );
  
  const documentNumber = useMemo(() => 
    document?.invoiceNumber || document?.number || document?.id || 'Unbekannt',
    [document?.invoiceNumber, document?.number, document?.id]
  );

  // Initialize default values - Optimized to prevent infinite loops
  useEffect(() => {
    if (isOpen && document) {
      // Calculate values inside useEffect to avoid dependency issues
      const currentDocumentNumber = document.invoiceNumber || document.number || document.id || 'Unbekannt';
      const currentDocumentLabel = documentLabels[documentType as keyof typeof documentLabels] || 'Dokument';
      
      // Prevent multiple initializations for the same document
      const documentKey = `${document.id}-${documentType}`;
      if (initializedRef.current === documentKey) {
        return;
      }
      initializedRef.current = documentKey;
      
      // Reset all fields first
      setRecipients([]);
      setCcRecipients([]);
      setBccRecipients([]);
      setCurrentRecipient('');
      setCurrentCC('');
      setCurrentBCC('');
      setShowCC(false);
      setShowBCC(false);
      setAdditionalAttachments([]);
      setUploadingFile(false);

      // Set default recipients from multiple sources
      const recipientsList: EmailRecipient[] = [];
      
      // Add customer email if available
      if (document.customerEmail) {
        recipientsList.push({ 
          email: document.customerEmail, 
          name: document.customerName || document.customer?.name 
        });
      }
      
      // Add default recipients if provided
      defaultRecipients.forEach(email => {
        if (email && !recipientsList.find(r => r.email === email)) {
          recipientsList.push({ email });
        }
      });
      
      setRecipients(recipientsList);

      // Set dynamic subject based on document type
      const subjectTemplates = {
        invoice: `Rechnung ${currentDocumentNumber} von ${companyData?.name || 'Taskilo'}`,
        quote: `Angebot ${currentDocumentNumber} von ${companyData?.name || 'Taskilo'}`,
        reminder: `Zahlungserinnerung - Rechnung ${currentDocumentNumber}`,
        delivery: `Lieferschein ${currentDocumentNumber}`,
        order: `Auftragsbestätigung ${currentDocumentNumber}`,
        'credit-note': `Gutschrift ${currentDocumentNumber}`,
        cancellation: `Storno - Rechnung ${currentDocumentNumber}`,
        contract: `Vertrag ${currentDocumentNumber}`,
        receipt: `Quittung ${currentDocumentNumber}`,
      };
      
      setSubject(subjectTemplates[documentType as keyof typeof subjectTemplates] || `${currentDocumentLabel} ${currentDocumentNumber}`);

      // Set dynamic message based on document type
      const messageTemplates = {
        invoice: `Sehr geehrte Damen und Herren,\n\nhiermit erhalten Sie unsere Rechnung ${currentDocumentNumber}.\n\nWir bitten um Begleichung innerhalb der angegebenen Zahlungsfrist.\n\nVielen Dank für Ihr Vertrauen.\n\nMit freundlichen Grüßen`,
        quote: `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie unser Angebot ${currentDocumentNumber}.\n\nWir freuen uns auf Ihre Rückmeldung und stehen für Rückfragen gerne zur Verfügung.\n\nMit freundlichen Grüßen`,
        reminder: `Sehr geehrte Damen und Herren,\n\nwir möchten Sie freundlich an die Begleichung der Rechnung ${currentDocumentNumber} erinnern.\n\nSollten Sie diese bereits beglichen haben, betrachten Sie diese Nachricht als gegenstandslos.\n\nMit freundlichen Grüßen`,
        delivery: `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie den Lieferschein ${currentDocumentNumber} zu Ihrer Bestellung.\n\nMit freundlichen Grüßen`,
      };
      
      const defaultMessage = messageTemplates[documentType as keyof typeof messageTemplates] || 
        `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie das gewünschte Dokument.\n\nMit freundlichen Grüßen`;
      
      setMessage(defaultMessage);
      
      // Set company signature if available
      if (companyData?.signature) {
        setSignature(companyData.signature);
      }
    } else if (!isOpen) {
      // Reset initialization tracking when modal closes
      initializedRef.current = null;
    }
  }, [isOpen, document?.id, documentType, companyData?.name, companyData?.signature, defaultRecipients]);

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Add recipient handlers
  const addRecipient = (email: string, type: 'to' | 'cc' | 'bcc' = 'to') => {
    if (!email.trim() || !isValidEmail(email.trim())) return;

    const newRecipient = { email: email.trim() };

    switch (type) {
      case 'to':
        if (!recipients.find(r => r.email === email.trim())) {
          setRecipients([...recipients, newRecipient]);
        }
        setCurrentRecipient('');
        break;
      case 'cc':
        if (!ccRecipients.find(r => r.email === email.trim())) {
          setCcRecipients([...ccRecipients, newRecipient]);
        }
        setCurrentCC('');
        break;
      case 'bcc':
        if (!bccRecipients.find(r => r.email === email.trim())) {
          setBccRecipients([...bccRecipients, newRecipient]);
        }
        setCurrentBCC('');
        break;
    }
  };

  // Remove recipient handlers
  const removeRecipient = (index: number, type: 'to' | 'cc' | 'bcc') => {
    switch (type) {
      case 'to':
        setRecipients(recipients.filter((_, i) => i !== index));
        break;
      case 'cc':
        setCcRecipients(ccRecipients.filter((_, i) => i !== index));
        break;
      case 'bcc':
        setBccRecipients(bccRecipients.filter((_, i) => i !== index));
        break;
    }
  };

  // Handle key press for recipient input
  const handleRecipientKeyPress = (e: React.KeyboardEvent, type: 'to' | 'cc' | 'bcc') => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = type === 'to' ? currentRecipient : type === 'cc' ? currentCC : currentBCC;
      addRecipient(value, type);
    }
  };

  // Handle blur for recipient input
  const handleRecipientBlur = (type: 'to' | 'cc' | 'bcc') => {
    const value = type === 'to' ? currentRecipient : type === 'cc' ? currentCC : currentBCC;
    if (value.trim()) {
      addRecipient(value, type);
    }
  };

  // File upload handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    
    try {
      const newAttachments: EmailAttachment[] = [];
      
      for (const file of Array.from(files)) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Datei "${file.name}" ist zu groß (max. 10MB)`);
          continue;
        }
        
        // Check file type
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          toast.error(`Dateityp "${file.type}" wird nicht unterstützt`);
          continue;
        }
        
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1]; // Remove data:mime;base64, prefix
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        const attachment: EmailAttachment = {
          id: `attachment-${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          base64
        };
        
        newAttachments.push(attachment);
      }
      
      setAdditionalAttachments(prev => [...prev, ...newAttachments]);
      
      if (newAttachments.length > 0) {
        toast.success(`${newAttachments.length} Datei(en) hinzugefügt`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Fehler beim Hochladen der Datei(en)');
    } finally {
      setUploadingFile(false);
      // Reset input
      event.target.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (attachmentId: string) => {
    setAdditionalAttachments(prev => prev.filter(att => att.id !== attachmentId));
    toast.success('Anhang entfernt');
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon by type
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    return '📎';
  };

  // ✅ Generate PDF using the rendered HTML from SendDocumentModal
  const generatePdfBase64 = async (): Promise<string | null> => {
    try {
      // ✅ Prüfung ob Template bereit ist
      if (!isTemplateReady) {
        console.error('Template not ready - cannot generate PDF');
        throw new Error(
          'Template is not ready yet. Please wait for the document preview to load completely.'
        );
      }

      // ✅ Get HTML Content direkt
      const htmlContent = await getRenderedHtml();

      if (!htmlContent || htmlContent.trim().length === 0) {
        console.error('No HTML content received from template');
        throw new Error(
          'Template could not be rendered. Please make sure the document preview is visible and try again.'
        );
      }

      // 🤖 SMART API SELECTION: Auto-detect based on items count
      const itemsCount = document?.items?.length || 0;
      const shouldUseSingle = itemsCount < 3; // 1-2 items = single, 3+ items = multi
      const smartApiEndpoint = shouldUseSingle
        ? '/api/generate-pdf-single'
        : '/api/generate-pdf-multi';

      // Use smart detection OR manual pageMode (if user explicitly set it)
      const finalApiEndpoint =
        pageMode === 'single'
          ? '/api/generate-pdf-single'
          : pageMode === 'multi'
            ? '/api/generate-pdf-multi'
            : smartApiEndpoint;

      const response = await fetch(finalApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: htmlContent,
          template: selectedTemplate,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF API failed:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`PDF generation failed (${response.status}): ${errorText}`);
        }
        throw new Error(errorData.error || 'PDF generation failed');
      }

      const result = await response.json();

      if (!result.pdfBase64 || result.pdfBase64.trim().length === 0) {
        console.error('PDF API returned empty base64');
        throw new Error('PDF generation returned empty result');
      }

      return result.pdfBase64;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error; // Re-throw instead of returning null for better error handling
    }
  };

  // Handle send with GoBD confirmation
  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error('Bitte geben Sie mindestens einen Empfänger ein');
      return;
    }

    if (!subject.trim()) {
      toast.error('Bitte geben Sie einen Betreff ein');
      return;
    }

    // GoBD-Bestätigung nur für Rechnungen (nicht für Angebote, Lieferscheine etc.)
    if (enableGoBDLocking && documentType === 'invoice') {
      showWarning({
        actionType: 'email',
        documentType: 'Rechnung',
        documentNumber: document.documentNumber,
        companyId: companyId || 'unknown',
        documentId: document.id,
        isAlreadyLocked: document.gobdStatus?.isLocked || false,
        onConfirm: performSend
      });
      return;
    }

    // Direkter Versand wenn keine GoBD-Bestätigung nötig
    await performSend();
  };

  // Eigentliche Send-Funktion (aus der ursprünglichen handleSend extrahiert)
  const performSend = async () => {

    setSending(true);

    try {
      toast.message('PDF wird erstellt...');

      // Generate PDF - will throw error if it fails
      const pdfBase64 = await generatePdfBase64();

      toast.message('E-Mail wird versendet...');

      // Get company slug for email sender
      const companySlug = (document.companyName || 'taskilo')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');

      // Send email via API
      const response = await fetch('/api/email/send-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipients.map(r => r.email),
          cc: ccRecipients.length > 0 ? ccRecipients.map(r => r.email) : undefined,
          bcc: bccRecipients.length > 0 ? bccRecipients.map(r => r.email) : undefined,
          subject: subject.trim(),
          message: message.trim(),
          signature: signature.trim() || undefined,
          sendCopy,
          attachments: [
            {
              filename: `${documentNumber}.pdf`,
              contentBase64: pdfBase64,
            },
            // Add additional attachments
            ...additionalAttachments.map(att => ({
              filename: att.name,
              contentBase64: att.base64,
            })),
          ],

          companySlug,
          documentType,
          meta: {
            companyId,
            documentId: document.id,
            source: 'email-send-modal',
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('E-Mail wurde erfolgreich versendet');
        
        // 🔒 GoBD-Festschreibung nach erfolgreichem Versand (nur für Rechnungen)
        if (enableGoBDLocking && user && documentType === 'invoice') {
          try {
            const lockSuccess = await GoBDService.autoLockOnSend(
              companyId || 'unknown',
              document.id,
              user.uid,
              user.firstName + ' ' + user.lastName || 'Unknown User'
            );
            
            if (lockSuccess) {
              onDocumentLocked?.(document.id);
            }
          } catch (error) {
            console.error('GoBD auto-lock failed:', error);
            // Nicht kritisch - E-Mail wurde bereits versendet
            toast.warning('E-Mail versendet, aber automatische Festschreibung fehlgeschlagen');
          }
        }
        
        onClose();
      } else {
        throw new Error(result.error || 'E-Mail konnte nicht versendet werden');
      }
    } catch (error) {
      console.error('Email send error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Versenden der E-Mail');
    } finally {
      setSending(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] p-0 gap-0 flex flex-col [&>button]:hidden">
        {/* Header mit Taskilo Branding - Fixed */}
        <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] text-white p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-white">
                  E-Mail versenden
                </DialogTitle>
                <p className="text-white/80 text-sm mt-1">
                  {documentLabel} {documentNumber} per E-Mail verschicken
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="h-9 w-9 p-0 text-white hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(95vh - 200px)' }}>
          <div className="p-6 space-y-6 min-h-full">
            {/* Status Alert bei nicht bereitem Template */}
            {!isTemplateReady && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Das Dokument wird noch geladen. Bitte warten Sie, bis die Vorschau vollständig angezeigt wird.
                </AlertDescription>
              </Alert>
            )}

            {/* Recipients Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#14ad9f]" />
                    <CardTitle className="text-base">Empfänger</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    {!showCC && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCC(true)}
                        className="text-[#14ad9f] hover:text-[#129488] h-7 px-2"
                      >
                        + CC
                      </Button>
                    )}
                    {!showBCC && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBCC(true)}
                        className="text-[#14ad9f] hover:text-[#129488] h-7 px-2"
                      >
                        + BCC
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* To Field */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    An <span className="text-red-500">*</span>
                  </Label>

                  <div className="flex flex-wrap items-center gap-2 p-3 border rounded-lg min-h-[50px] focus-within:ring-2 focus-within:ring-[#14ad9f] bg-gray-50/50">
                    {recipients.map((recipient, index) => (
                      <Badge
                        key={index}
                        className="flex items-center gap-1 px-3 py-1 bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/20 hover:bg-[#14ad9f]/20"
                      >
                        <Mail className="h-3 w-3" />
                        <span className="font-medium">{recipient.name || recipient.email}</span>
                        {recipient.name && (
                          <span className="text-xs opacity-70">({recipient.email})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeRecipient(index, 'to')}
                          className="ml-1 hover:text-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      value={currentRecipient}
                      onChange={e => setCurrentRecipient(e.target.value)}
                      onKeyDown={e => handleRecipientKeyPress(e, 'to')}
                      onBlur={() => handleRecipientBlur('to')}
                      placeholder="empfaenger@beispiel.de"
                      className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
                    />
                  </div>
                </div>

                {/* CC Field */}
                {showCC && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">CC</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCC(false);
                          setCcRecipients([]);
                          setCurrentCC('');
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 p-3 border rounded-lg min-h-[50px] focus-within:ring-2 focus-within:ring-[#14ad9f] bg-gray-50/50">
                      {ccRecipients.map((recipient, index) => (
                        <Badge
                          key={index}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 border-blue-200"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="font-medium">{recipient.name || recipient.email}</span>
                          {recipient.name && (
                            <span className="text-xs opacity-70">({recipient.email})</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeRecipient(index, 'cc')}
                            className="ml-1 hover:text-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <Input
                        value={currentCC}
                        onChange={e => setCurrentCC(e.target.value)}
                        onKeyDown={e => handleRecipientKeyPress(e, 'cc')}
                        onBlur={() => handleRecipientBlur('cc')}
                        placeholder="cc@beispiel.de"
                        className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* BCC Field */}
                {showBCC && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">BCC</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowBCC(false);
                          setBccRecipients([]);
                          setCurrentBCC('');
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 p-3 border rounded-lg min-h-[50px] focus-within:ring-2 focus-within:ring-[#14ad9f] bg-gray-50/50">
                      {bccRecipients.map((recipient, index) => (
                        <Badge
                          key={index}
                          className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 border-purple-200"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="font-medium">{recipient.name || recipient.email}</span>
                          {recipient.name && (
                            <span className="text-xs opacity-70">({recipient.email})</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeRecipient(index, 'bcc')}
                            className="ml-1 hover:text-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <Input
                        value={currentBCC}
                        onChange={e => setCurrentBCC(e.target.value)}
                        onKeyDown={e => handleRecipientKeyPress(e, 'bcc')}
                        onBlur={() => handleRecipientBlur('bcc')}
                        placeholder="bcc@beispiel.de"
                        className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subject Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#14ad9f]" />
                  <CardTitle className="text-base">Betreff</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Input
                  id="subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Betreff eingeben"
                  required
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
                {!subject.trim() && (
                  <p className="text-xs text-red-500 mt-1">Betreff ist erforderlich</p>
                )}
              </CardContent>
            </Card>

            {/* Message Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#14ad9f]" />
                  <CardTitle className="text-base">Nachricht</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Nachricht eingeben..."
                  rows={8}
                  className="min-h-[200px] resize-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>{message.length} Zeichen</span>
                  <span>Tipp: Verwenden Sie eine professionelle Anrede</span>
                </div>
              </CardContent>
            </Card>

            {/* Signature Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#14ad9f]" />
                  <CardTitle className="text-base">Signatur</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="signature"
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  placeholder="Signatur eingeben (optional)..."
                  rows={4}
                  className="resize-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </CardContent>
            </Card>

            {/* Attachments Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-[#14ad9f]" />
                    <CardTitle className="text-base">Anhänge</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {1 + additionalAttachments.length} Datei(en)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Main document attachment */}
                  <div className="flex items-center justify-between p-3 bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#14ad9f]/10 rounded">
                        <FileText className="h-4 w-4 text-[#14ad9f]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{documentNumber}.pdf</p>
                        <p className="text-xs text-gray-500">{documentLabel}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Hauptdokument
                    </Badge>
                  </div>
                  
                  {/* Additional attachments */}
                  {additionalAttachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-gray-100 rounded text-lg">
                          {getFileIcon(attachment.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" title={attachment.name}>
                            {attachment.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        title="Anhang entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* File upload */}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.txt,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f]/5"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Lade hoch...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Weitere Anhänge hinzufügen
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      PDF, Bilder, Word, Excel • Max. 10MB pro Datei
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer mit verbessertem Design - Fixed */}
        <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 shrink-0">
          <div className="p-6">
            {/* Options */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-copy"
                    checked={sendCopy}
                    onCheckedChange={checked => setSendCopy(checked === true)}
                    className="data-[state=checked]:bg-[#14ad9f] data-[state=checked]:border-[#14ad9f]"
                  />
                  <Label htmlFor="send-copy" className="text-sm font-medium">
                    Kopie an mich selbst
                  </Label>
                </div>
              </div>
              
              {/* Email stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {recipients.length + ccRecipients.length + bccRecipients.length} Empfänger
                </span>
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {1 + additionalAttachments.length} Anhang{1 + additionalAttachments.length !== 1 ? 'e' : ''}
                </span>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={handleCancel} 
                disabled={sending}
                className="px-6"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || recipients.length === 0 || !subject.trim() || !isTemplateReady}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white px-8 shadow-lg"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird versendet...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    E-Mail versenden
                  </>
                )}
              </Button>
            </div>
            
            {/* Help text */}
            {(!isTemplateReady || recipients.length === 0 || !subject.trim()) && (
              <div className="mt-3 text-xs text-gray-500">
                {!isTemplateReady && '• Warten Sie, bis das Dokument vollständig geladen ist'}
                {recipients.length === 0 && '• Fügen Sie mindestens einen Empfänger hinzu'}
                {!subject.trim() && '• Geben Sie einen Betreff ein'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* GoBD Confirmation Modal */}
      {WarningComponent}
    </Dialog>
  );
}

export default EmailSendModal;
