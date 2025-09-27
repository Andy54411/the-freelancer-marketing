'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';
import { InvoiceData } from '@/types/invoiceTypes';

interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData;
  companyId: string;
}

export function EmailDialog({ isOpen, onClose, invoice, companyId }: EmailDialogProps) {
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && invoice) {
      // Vorbefüllen mit Kundendaten
      setEmailTo(invoice.customerEmail || '');
      setEmailSubject(`Rechnung ${invoice.number || invoice.invoiceNumber || 'RE-XXXX'}`);
      setEmailBody(
        `Sehr geehrte Damen und Herren,\n\n` +
          `anbei erhalten Sie unsere Rechnung ${invoice.number || invoice.invoiceNumber || 'RE-XXXX'}.\n\n` +
          `Rechnungsbetrag: ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(invoice.total)}\n` +
          `Fällig bis: ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}\n\n` +
          `Bei Fragen stehen wir Ihnen gerne zur Verfügung.\n\n` +
          `Mit freundlichen Grüßen\n` +
          `${invoice.companyName || 'Ihr Unternehmen'}`
      );
    }
  }, [isOpen, invoice]);

  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) {
      alert('Bitte füllen Sie alle Felder aus.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          companyId: companyId,
          recipientEmail: emailTo,
          recipientName: invoice.customerName || 'Kunde',
          subject: emailSubject,
          message: emailBody,
          senderName: invoice.companyName || 'Ihr Unternehmen',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          `✅ E-Mail erfolgreich versendet!\n\nPDF-Anhang: ${result.pdfAttached ? '✅ Inklusive' : '❌ Nicht verfügbar'}\nDateiname: ${result.attachmentFilename || 'N/A'}`
        );
        onClose();
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
    } catch (error: any) {
      console.error('Fehler beim E-Mail-Versand:', error);
      alert(`❌ Fehler beim Versand der E-Mail:\n${error.message}`);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Rechnung per E-Mail versenden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailTo">Empfänger</Label>
            <Input
              id="emailTo"
              type="email"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              placeholder="kunde@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailSubject">Betreff</Label>
            <Input
              id="emailSubject"
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              placeholder="Rechnung RE-XXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailBody">Nachricht</Label>
            <Textarea
              id="emailBody"
              rows={8}
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              placeholder="Ihre Nachricht..."
            />
          </div>

          <div className="text-sm text-gray-600 bg-green-50 border border-green-200 p-3 rounded">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-600" />
              <strong className="text-green-800">PDF-Anhang:</strong>
              <span>Rechnung wird automatisch als PDF angehängt</span>
            </div>
            <div className="mt-1 text-xs text-green-700">
              Dateiname: Rechnung_{invoice.number || invoice.invoiceNumber || 'RE-XXXX'}.pdf
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSendEmail}
              disabled={sending}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  E-Mail senden
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
