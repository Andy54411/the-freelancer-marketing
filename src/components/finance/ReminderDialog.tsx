/**
 * Komponente für Rechnungsmahnungen
 * Ermöglicht das Erstellen und Versenden von Mahnungen für überfällige Rechnungen
 */

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { addDoc, collection, serverTimestamp, updateDoc, doc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { WhatsAppNotificationService } from '@/services/whatsapp-notifications.service';

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  dueDate: string;
  daysPastDue: number;
}

interface ReminderDialogProps {
  invoice: OverdueInvoice;
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

export const ReminderDialog: React.FC<ReminderDialogProps> = ({
  invoice,
  isOpen,
  onClose,
  companyId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [reminderType, setReminderType] = useState<'first' | 'second' | 'final'>('first');
  const [customMessage, setCustomMessage] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const getReminderLevel = (daysPastDue: number) => {
    if (daysPastDue <= 14) return 'first';
    if (daysPastDue <= 30) return 'second';
    return 'final';
  };

  const getReminderTemplate = (type: 'first' | 'second' | 'final') => {
    const templates = {
      first: `Sehr geehrte Damen und Herren,

wir möchten Sie freundlich daran erinnern, dass die Rechnung ${invoice.invoiceNumber} über ${formatCurrency(invoice.total)} seit dem ${formatDate(invoice.dueDate)} fällig ist.

Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben als gegenstandslos.

Falls nicht, bitten wir Sie höflich, den ausstehenden Betrag zeitnah zu begleichen.

Mit freundlichen Grüßen`,

      second: `Sehr geehrte Damen und Herren,

trotz unserer ersten Mahnung ist die Rechnung ${invoice.invoiceNumber} über ${formatCurrency(invoice.total)} weiterhin unbezahlt.

Die Rechnung ist seit ${invoice.daysPastDue} Tagen überfällig. Wir bitten Sie dringend, den Betrag innerhalb der nächsten 7 Tage zu begleichen.

Bei weiterer Verzögerung müssen wir Mahngebühren in Höhe von 5,00 € berechnen.

Mit freundlichen Grüßen`,

      final: `Sehr geehrte Damen und Herren,

dies ist unsere letzte Mahnung für die Rechnung ${invoice.invoiceNumber} über ${formatCurrency(invoice.total)}.

Die Rechnung ist bereits ${invoice.daysPastDue} Tage überfällig. Sollte der Betrag nicht innerhalb von 5 Werktagen eingehen, werden wir rechtliche Schritte einleiten.

Zusätzlich berechnen wir Mahngebühren in Höhe von 15,00 €.

Mit freundlichen Grüßen`,
    };

    return templates[type];
  };

  const handleSendReminder = async () => {
    if (!customMessage.trim()) {
      toast.error('Bitte geben Sie eine Mahnnachricht ein');
      return;
    }

    setIsLoading(true);

    try {
      // Mahnung in der reminders Collection speichern
      const reminderData = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        amount: invoice.total,
        type: reminderType,
        message: customMessage,
        daysPastDue: invoice.daysPastDue,
        companyId,
        sentAt: serverTimestamp(),
        status: 'sent',
      };

      await addDoc(collection(db, 'reminders'), reminderData);

      // Invoice-Status auf 'overdue' setzen wenn noch nicht geschehen
      const invoiceRef = doc(db, 'invoices', invoice.id);
      await updateDoc(invoiceRef, {
        status: 'overdue',
        lastReminderSent: serverTimestamp(),
        reminderCount: invoice.daysPastDue <= 14 ? 1 : invoice.daysPastDue <= 30 ? 2 : 3,
      });

      // WhatsApp-Zahlungserinnerung senden
      try {
        // Kundentelefon aus Kunden-Dokument laden
        let customerPhone = '';
        let customerId = '';
        
        const customersRef = collection(db, 'companies', companyId, 'customers');
        const nameQuery = query(customersRef, where('name', '==', invoice.customerName));
        const customerSnap = await getDocs(nameQuery);
        
        if (!customerSnap.empty) {
          const customerData = customerSnap.docs[0].data();
          customerPhone = customerData.phone || '';
          customerId = customerSnap.docs[0].id;
        }
        
        if (customerPhone) {
          const companyDoc = await getDoc(doc(db, 'companies', companyId));
          const companyName = companyDoc.data()?.name || 'Taskilo';
          
          await WhatsAppNotificationService.sendInvoiceReminder(
            companyId,
            companyName,
            customerId,
            invoice.customerName,
            customerPhone,
            invoice.invoiceNumber,
            invoice.total,
            invoice.daysPastDue,
            invoice.id
          );
        }
      } catch {
        // WhatsApp-Fehler nicht kritisch
      }

      toast.success('Mahnung erfolgreich versendet!');
      onClose();
    } catch {
      toast.error('Fehler beim Versenden der Mahnung');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const suggestedType = getReminderLevel(invoice.daysPastDue);
    setReminderType(suggestedType);
    setCustomMessage(getReminderTemplate(suggestedType));
  }, [invoice, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Mahnung erstellen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie eine Mahnung für die überfällige Rechnung
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rechnungsinformationen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rechnungsdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Rechnungsnummer</Label>
                  <p className="text-sm">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Kunde</Label>
                  <p className="text-sm">{invoice.customerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Betrag</Label>
                  <p className="text-sm font-semibold">{formatCurrency(invoice.total)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fälligkeitsdatum</Label>
                  <p className="text-sm">{formatDate(invoice.dueDate)}</p>
                </div>
              </div>
              <div className="pt-2">
                <Badge variant={invoice.daysPastDue > 30 ? 'destructive' : 'secondary'}>
                  {invoice.daysPastDue} Tage überfällig
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Mahnungstyp */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Mahnungstyp</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={reminderType === 'first' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setReminderType('first');
                  setCustomMessage(getReminderTemplate('first'));
                }}
              >
                1. Mahnung
              </Button>
              <Button
                variant={reminderType === 'second' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setReminderType('second');
                  setCustomMessage(getReminderTemplate('second'));
                }}
              >
                2. Mahnung
              </Button>
              <Button
                variant={reminderType === 'final' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setReminderType('final');
                  setCustomMessage(getReminderTemplate('final'));
                }}
              >
                Letzte Mahnung
              </Button>
            </div>
          </div>

          {/* Mahnnachricht */}
          <div className="space-y-3">
            <Label htmlFor="message" className="text-sm font-medium">
              Mahnnachricht
            </Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              rows={12}
              className="min-h-[200px]"
              placeholder="Geben Sie Ihre Mahnnachricht ein..."
            />
          </div>

          {/* Aktionen */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
            <Button onClick={handleSendReminder} disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Wird versendet...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Mahnung versenden
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
