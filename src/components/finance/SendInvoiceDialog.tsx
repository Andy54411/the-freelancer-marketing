'use client';

import React, { useState } from 'react';
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
import { Send, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceData } from '@/types/invoiceTypes';

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
