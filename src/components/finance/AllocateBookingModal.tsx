'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  dueDate: string;
  amount: number;
  openAmount: number;
  status: 'open' | 'overdue' | 'paid' | 'partial';
  interval?: string;
}

interface AllocateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  selectedEntryIds: string[];
  onSuccess?: () => void;
}

export function AllocateBookingModal({
  isOpen,
  onClose,
  companyId,
  selectedEntryIds,
  onSuccess,
}: AllocateBookingModalProps) {
  const [documentType, setDocumentType] = useState<'invoice' | 'voucher'>('invoice');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, companyId, documentType]);

  const loadDocuments = async () => {
    try {
      setLoading(true);

      if (documentType === 'invoice') {
        // Load invoices from Firestore
        const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');

        const invoicesRef = collection(db, 'companies', companyId, 'invoices');
        const q = query(invoicesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const loadedInvoices: Invoice[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            invoiceNumber: data.invoiceNumber || 'N/A',
            customerName: data.customerName || 'Unbekannt',
            date: data.date || new Date().toISOString().split('T')[0],
            dueDate: data.dueDate || '',
            amount: data.totalAmount || 0,
            openAmount: data.openAmount || data.totalAmount || 0,
            status: data.status || 'open',
            interval: data.interval,
          };
        });

        setInvoices(loadedInvoices);
      } else {
        // Load vouchers - similar logic
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Fehler beim Laden der Dokumente');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId) ? prev.filter(id => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  const handleAllocate = async () => {
    if (selectedInvoices.length === 0) {
      toast.error('Bitte wählen Sie mindestens ein Dokument aus');
      return;
    }

    try {
      setIsSubmitting(true);

      // Update cashbook entries with linked documents
      const { collection, doc, updateDoc, arrayUnion } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const cashbookRef = collection(db, 'companies', companyId, 'cashbook');

      for (const entryId of selectedEntryIds) {
        const entryRef = doc(cashbookRef, entryId);

        const linkedDocs = selectedInvoices.map(invoiceId => {
          const invoice = invoices.find(inv => inv.id === invoiceId);
          return {
            id: invoiceId,
            type: documentType,
            number: invoice?.invoiceNumber || '',
          };
        });

        await updateDoc(entryRef, {
          linkedDocuments: linkedDocs,
          status: 'linked',
        });
      }

      toast.success('Buchungen erfolgreich zugeordnet');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error allocating bookings:', error);
      toast.error('Fehler beim Zuordnen der Buchungen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'Offen', variant: 'default' as const },
      overdue: { label: 'Überfällig', variant: 'destructive' as const },
      paid: { label: 'Bezahlt', variant: 'secondary' as const },
      partial: { label: 'Teilzahlung', variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl bg-white shadow-xl z-50 flex flex-col animate-in zoom-in-95 duration-300 rounded-lg max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-lg">
          <h1 className="text-xl font-semibold">Rechnung / Beleg der Kasse zuordnen</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
          <div className="space-y-6">
            {/* Document Type Selection */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Zuordnung zu:</span>
              <Select
                value={documentType}
                onValueChange={(value: 'invoice' | 'voucher') => {
                  setDocumentType(value);
                  setSelectedInvoices([]);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Rechnung</SelectItem>
                  <SelectItem value="voucher">Beleg</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <hr className="border-gray-200" />

            {/* Documents Table */}
            <div className="border rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-pulse text-gray-500">Lade Dokumente...</div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <FileText className="h-12 w-12 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Keine Dokumente gefunden</p>
                  <p className="text-sm">
                    {documentType === 'invoice'
                      ? 'Erstellen Sie zuerst eine Rechnung'
                      : 'Erstellen Sie zuerst einen Beleg'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedInvoices.length === invoices.length}
                          onCheckedChange={checked => {
                            setSelectedInvoices(checked ? invoices.map(inv => inv.id) : []);
                          }}
                        />
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fälligkeit</TableHead>
                      <TableHead>
                        {documentType === 'invoice' ? 'Rechnungsnr.' : 'Belegnr.'}
                      </TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Datum</TableHead>
                      {documentType === 'invoice' && <TableHead>Rechnungsintervall</TableHead>}
                      <TableHead className="text-right">Offen (brutto)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(invoice => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleToggleInvoice(invoice.id)}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedInvoices.includes(invoice.id)}
                            onCheckedChange={() => handleToggleInvoice(invoice.id)}
                          />
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          {invoice.dueDate
                            ? new Date(invoice.dueDate).toLocaleDateString('de-DE')
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{new Date(invoice.date).toLocaleDateString('de-DE')}</TableCell>
                        {documentType === 'invoice' && (
                          <TableCell>{invoice.interval || '-'}</TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          {invoice.openAmount.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Selected Info */}
            {selectedInvoices.length > 0 && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <p className="text-sm text-teal-800">
                  <strong>{selectedInvoices.length}</strong> Dokument(e) ausgewählt •{' '}
                  <strong>{selectedEntryIds.length}</strong> Kassenbuch-Eintrag/-Einträge werden
                  zugeordnet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t px-6 py-4 flex items-center justify-end gap-2 bg-gray-50 rounded-b-lg">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button
            onClick={handleAllocate}
            disabled={isSubmitting || selectedInvoices.length === 0}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSubmitting ? 'Wird zugeordnet...' : 'Zuordnen'}
          </Button>
        </footer>
      </div>
    </>
  );
}
