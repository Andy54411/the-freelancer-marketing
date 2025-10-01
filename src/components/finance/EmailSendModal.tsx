'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Send, FileText, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceData } from '@/types/invoiceTypes';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: InvoiceData | any;
  documentType: 'invoice' | 'quote' | 'delivery' | 'order' | 'reminder';
  companyId: string;
  selectedTemplate: string; // Template from SendDocumentModal
  pageMode?: 'single' | 'multi'; // ✅ Page mode for PDF generation
  getRenderedHtml: () => Promise<string | null>; // ✅ Get rendered HTML from SendDocumentModal
  isTemplateReady: boolean; // ✅ Check if template is rendered and ready
  onSend?: (emailData: EmailSendData) => Promise<void>;
}

interface EmailSendData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  message: string;
  signature?: string;
  sendCopy: boolean;
  attachments: string[];
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
}: EmailSendModalProps) {
  const [sending, setSending] = useState(false);

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

  // UI states
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);

  // Document type labels
  const documentLabels = {
    invoice: 'Rechnung',
    quote: 'Angebot',
    reminder: 'Erinnerung',
  };

  const documentLabel = documentLabels[documentType];
  const documentNumber = document.invoiceNumber || document.number || 'Unbekannt';

  // Initialize default values
  useEffect(() => {
    if (isOpen && document) {
      // Set default recipient from customer data
      if (document.customerEmail) {
        setRecipients([{ email: document.customerEmail, name: document.customerName }]);
      }

      // Set default subject
      setSubject(`${documentLabel} ${documentNumber}`);

      // Set default message
      setMessage(`Sehr geehrte Damen und Herren,

vielen Dank für Ihren Auftrag. Ihre ${documentLabel.toLowerCase()} befindet sich im Anhang.

Mit freundlichen Grüßen`);
    }
  }, [isOpen, document, documentType, documentLabel, documentNumber]);

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

  // ✅ Generate PDF using the rendered HTML from SendDocumentModal
  const generatePdfBase64 = async (): Promise<string | null> => {
    try {
      console.log('EmailSendModal - Generating PDF with template:', selectedTemplate);
      console.log('EmailSendModal - Template ready status:', isTemplateReady);

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

      console.log('Template ready! HTML content length:', htmlContent.length);

      console.log('EmailSendModal - Got HTML content, sending to API');

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

      console.log('🤖 SMART API SELECTION:', {
        itemsCount,
        shouldUseSingle,
        pageMode,
        smartApiEndpoint,
        finalApiEndpoint,
      });

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

      console.log(
        'EmailSendModal - PDF generated successfully, base64 length:',
        result.pdfBase64.length
      );
      return result.pdfBase64;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error; // Re-throw instead of returning null for better error handling
    }
  };

  // Handle send
  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error('Bitte geben Sie mindestens einen Empfänger ein');
      return;
    }

    if (!subject.trim()) {
      toast.error('Bitte geben Sie einen Betreff ein');
      return;
    }

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-6 border-b">
          <DialogTitle className="text-xl font-semibold">E-Mail versenden</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Recipients */}
          <div className="space-y-4">
            {/* To Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Empfänger <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2 text-sm">
                  {!showCC && (
                    <button
                      type="button"
                      onClick={() => setShowCC(true)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      CC
                    </button>
                  )}
                  {!showBCC && (
                    <button
                      type="button"
                      onClick={() => setShowBCC(true)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      BCC
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 p-3 border rounded-md min-h-[50px] focus-within:ring-2 focus-within:ring-blue-500">
                {recipients.map((recipient, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    {recipient.email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(index, 'to')}
                      className="ml-1 hover:text-red-600"
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
                  className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0"
                />
              </div>
            </div>

            {/* CC Field */}
            {showCC && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">CC</Label>
                <div className="flex flex-wrap items-center gap-2 p-3 border rounded-md min-h-[50px] focus-within:ring-2 focus-within:ring-blue-500">
                  {ccRecipients.map((recipient, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      {recipient.email}
                      <button
                        type="button"
                        onClick={() => removeRecipient(index, 'cc')}
                        className="ml-1 hover:text-red-600"
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
                    className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0"
                  />
                </div>
              </div>
            )}

            {/* BCC Field */}
            {showBCC && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">BCC</Label>
                <div className="flex flex-wrap items-center gap-2 p-3 border rounded-md min-h-[50px] focus-within:ring-2 focus-within:ring-blue-500">
                  {bccRecipients.map((recipient, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      {recipient.email}
                      <button
                        type="button"
                        onClick={() => removeRecipient(index, 'bcc')}
                        className="ml-1 hover:text-red-600"
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
                    className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Betreff <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Betreff eingeben"
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Nachricht
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Nachricht eingeben"
              rows={8}
              className="min-h-[200px]"
            />
          </div>

          {/* Template wird aus SendDocumentModal übernommen - keine Auswahl nötig */}

          {/* Signature */}
          <div className="space-y-2">
            <Label htmlFor="signature" className="text-sm font-medium">
              Signatur
            </Label>
            <Textarea
              id="signature"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="Signatur eingeben"
              rows={4}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Anhang</Label>
            <div className="p-4 border rounded-md bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{documentNumber}.pdf</span>
              </div>
              <button
                type="button"
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Anhang hinzufügen
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-copy"
              checked={sendCopy}
              onCheckedChange={checked => setSendCopy(checked === true)}
            />
            <Label htmlFor="send-copy" className="text-sm">
              Kopie an mich selbst
            </Label>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={sending}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || recipients.length === 0 || !subject.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              E-Mail versenden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EmailSendModal;
