'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceData } from '@/types/invoiceTypes';
import { TextTemplateService } from '@/services/TextTemplateService';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SendInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData;
  companyName: string;
}

export function SendInvoiceDialog({
  isOpen,
  onClose,
  invoice,
  companyName,
}: SendInvoiceDialogProps) {
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(`Rechnung ${invoice.invoiceNumber || invoice.number}`);
  const [message, setMessage] = useState(`Sehr geehrte Damen und Herren,

anbei erhalten Sie Ihre Rechnung ${invoice.invoiceNumber || invoice.number} vom ${new Date(invoice.date).toLocaleDateString('de-DE')}.

Die Rechnung ist bis zum ${new Date(invoice.dueDate).toLocaleDateString('de-DE')} zu begleichen.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
${companyName}`);

  // Textvorlagen State
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [selectedSubjectTemplate, setSelectedSubjectTemplate] = useState<string>('');
  const [selectedBodyTemplate, setSelectedBodyTemplate] = useState<string>('');

  // Textvorlagen laden
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await TextTemplateService.getTextTemplatesByType(
          invoice.companyId || '',
          'INVOICE'
        );
        setEmailTemplates(templates);

        // Standard-Templates automatisch auswählen
        const subjectTemplate = templates.find(t => t.textType === 'SUBJECT' && t.isDefault);
        const bodyTemplate = templates.find(t => t.textType === 'BODY' && t.isDefault);

        if (subjectTemplate) {
          setSelectedSubjectTemplate(subjectTemplate.id);
          setSubject(replacePlaceholders(subjectTemplate.text, invoice, companyName));
        }
        if (bodyTemplate) {
          setSelectedBodyTemplate(bodyTemplate.id);
          setMessage(replacePlaceholders(bodyTemplate.text, invoice, companyName));
        }
      } catch (error) {
        console.error('Fehler beim Laden der E-Mail-Templates:', error);
      }
    };

    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, invoice, companyName]);

  // Platzhalter für E-Mail-Inhalte ersetzen
  const replacePlaceholders = (text: string, invoice: InvoiceData, companyName: string): string => {
    if (!text) return '';

    const placeholders = {
      '[%KUNDENNAME%]': invoice.customerName || '',
      '[%KUNDENFIRMA%]': invoice.customerName || '',
      '[%RECHNUNGSNUMMER%]': invoice.invoiceNumber || invoice.number || '',
      '[%RECHNUNGSDATUM%]': formatDate(invoice.date),
      '[%FAELLIGKEITSDATUM%]': formatDate(invoice.dueDate),
      '[%GESAMTBETRAG%]': formatCurrency(invoice.total || 0),
      '[%NETTOBETRAG%]': formatCurrency(invoice.total || 0), // Falls subtotal nicht verfügbar
      '[%MEHRWERTSTEUERBETRAG%]': formatCurrency(0), // Vereinfacht, da subtotal nicht verfügbar
      '[%FIRMENNAME%]': companyName || '',
      '[%HEUTE%]': formatDate(new Date().toISOString()),
    };

    let result = text;
    Object.entries(placeholders).forEach(([placeholder, value]) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        value
      );
    });

    return result;
  };

  // Template-Auswahl Handler
  const handleSubjectTemplateChange = (templateId: string) => {
    setSelectedSubjectTemplate(templateId);
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSubject(replacePlaceholders(template.text, invoice, companyName));
    }
  };

  const handleBodyTemplateChange = (templateId: string) => {
    setSelectedBodyTemplate(templateId);
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setMessage(replacePlaceholders(template.text, invoice, companyName));
    }
  };

  // Funktion zur Konvertierung des Firmennamens in E-Mail-Format (gleiche Logik wie Backend)
  const createEmailFromCompanyName = (companyName: string): string => {
    return (
      companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') // Ersetze alle Nicht-Buchstaben/Zahlen mit -
        .replace(/-+/g, '-') // Mehrfache - zu einem -
        .replace(/^-|-$/g, '') // Entferne - am Anfang/Ende
        .substring(0, 30) || // Maximal 30 Zeichen
      'noreply'
    ); // Fallback falls leer
  };

  // Personalisierte Sender-E-Mail berechnen
  const personalizedEmailPrefix = createEmailFromCompanyName(companyName);
  const personalizedSenderEmail = `${personalizedEmailPrefix}@taskilo.de`;

  const handleSendEmail = async () => {
    setSending(true);

    try {
      const response = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          recipientEmail: invoice.customerEmail,
          recipientName: invoice.customerName,
          subject,
          message,
          senderName: companyName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Senden der E-Mail');
      }

      toast.success('📧 Rechnung erfolgreich per E-Mail versendet!', {
        description: `Gesendet an ${invoice.customerEmail}`,
      });

      onClose();
    } catch (error) {
      toast.error('Fehler beim Versenden der Rechnung', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#14ad9f]" />
            Rechnung per E-Mail senden
          </DialogTitle>
          <DialogDescription>
            Senden Sie die Rechnung {invoice.invoiceNumber || invoice.number} an den Kunden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Empfänger */}
          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-sm font-medium">
              Empfänger
            </Label>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              <div className="font-medium">{invoice.customerName}</div>
              <div>{invoice.customerEmail}</div>
            </div>
          </div>

          {/* Absender */}
          <div className="space-y-2">
            <Label htmlFor="sender" className="text-sm font-medium">
              Absender
            </Label>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              <div className="font-medium">{companyName}</div>
              <div className="text-[#14ad9f]">{personalizedSenderEmail}</div>
            </div>
          </div>

          {/* Betreff */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Betreff
            </Label>
            {/* Subject Template Auswahl */}
            <div className="mb-2">
              <Select value={selectedSubjectTemplate} onValueChange={handleSubjectTemplateChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Betreff-Vorlage auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates
                    .filter(template => template.textType === 'SUBJECT')
                    .map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.isStandard && ' (Standard)'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              id="subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Betreff der E-Mail"
            />
          </div>

          {/* Nachricht */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Nachricht
            </Label>
            {/* Body Template Auswahl */}
            <div className="mb-2">
              <Select value={selectedBodyTemplate} onValueChange={handleBodyTemplateChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Nachrichten-Vorlage auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates
                    .filter(template => template.textType === 'BODY')
                    .map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.isStandard && ' (Standard)'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              id="message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ihre Nachricht an den Kunden"
              rows={10}
              className="resize-none"
            />
          </div>

          {/* Anhang Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-700 font-medium">
                PDF-Anhang: Rechnung_{invoice.invoiceNumber || invoice.number}.pdf
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={sending || !subject.trim() || !message.trim()}
            className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                E-Mail senden
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
