'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  FileText,
  Star,
  Edit,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Customer } from './AddCustomerModal';
import { InvoiceData, InvoiceStatusHelper } from '@/types/invoiceTypes';
import { toast } from 'sonner';
import { updateCustomerStats } from '@/utils/customerStatsUtils';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated?: () => void;
}

export function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onCustomerUpdated,
}: CustomerDetailModalProps) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingStats, setSyncingStats] = useState(false);
  const [calculatedStats, setCalculatedStats] = useState<{
    totalAmount: number;
    totalInvoices: number;
  }>({ totalAmount: 0, totalInvoices: 0 });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Berechne Statistiken basierend auf geladenen Rechnungen
  const calculateCustomerStats = (invoiceList: InvoiceData[]) => {

    // Alle Rechnungen außer draft/cancelled für Umsatzberechnung
    const validInvoices = invoiceList.filter(
      invoice => invoice.status !== 'draft' && invoice.status !== 'cancelled'
    );

    const totalAmount = validInvoices.reduce((sum, invoice) => {
      // Berücksichtige Storno-Rechnungen (negative Beträge)
      const amount = invoice.isStorno ? -invoice.total : invoice.total;
      return sum + amount;
    }, 0);

    setCalculatedStats({
      totalAmount,
      totalInvoices: validInvoices.length,
    });
  };

  // Synchronisiere Kundenstatistiken in der Datenbank
  const handleSyncStats = async () => {
    if (!customer) return;

    try {
      setSyncingStats(true);
      await updateCustomerStats(customer.id, calculatedStats);
      toast.success('Kundenstatistiken erfolgreich synchronisiert');
      onCustomerUpdated?.();
    } catch (error) {

      toast.error('Fehler beim Synchronisieren der Statistiken');
    } finally {
      setSyncingStats(false);
    }
  };

  // Rechnungshistorie laden
  const loadInvoiceHistory = async () => {
    if (!customer) return;

    try {
      setLoading(true);
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('companyId', '==', customer.companyId),
        where('customerName', '==', customer.name),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(invoicesQuery);
      const loadedInvoices: InvoiceData[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        loadedInvoices.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as InvoiceData);
      });

      setInvoices(loadedInvoices);
      calculateCustomerStats(loadedInvoices);
    } catch (error) {

      toast.error('Fehler beim Laden der Rechnungshistorie');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      loadInvoiceHistory();
    }
  }, [isOpen, customer]);

  if (!customer) return null;

  const primaryContact = customer.contactPersons?.find(cp => cp.isPrimary);
  const otherContacts = customer.contactPersons?.filter(cp => !cp.isPrimary) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none max-h-[90vh] overflow-y-auto w-[98vw] mx-2">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#14ad9f]" />
                {customer.name}
              </DialogTitle>
              <DialogDescription>
                Kunde {customer.customerNumber} - Detailansicht und Rechnungshistorie
              </DialogDescription>
            </div>
            {(customer.totalAmount !== calculatedStats.totalAmount ||
              customer.totalInvoices !== calculatedStats.totalInvoices) && (
              <Button
                onClick={handleSyncStats}
                disabled={syncingStats}
                size="sm"
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {syncingStats ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Sync...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Stats sync
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Kundeninformationen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Unternehmensdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{customer.email}</span>
              </div>

              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{customer.phone}</span>
                </div>
              )}

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <span className="text-sm">{customer.address}</span>
              </div>

              {(customer.taxNumber || customer.vatId) && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    {customer.taxNumber && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Steuernummer:</span> {customer.taxNumber}
                      </div>
                    )}
                    {customer.vatId && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">USt-IdNr:</span> {customer.vatId}
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Gesamtumsatz:</span>
                  <div className="text-lg font-semibold text-[#14ad9f]">
                    {formatCurrency(calculatedStats.totalAmount)}
                  </div>
                  {customer.totalAmount !== calculatedStats.totalAmount && (
                    <div className="text-xs text-gray-500">
                      (DB: {formatCurrency(customer.totalAmount)})
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Rechnungen:</span>
                  <div className="text-lg font-semibold">{calculatedStats.totalInvoices}</div>
                  {customer.totalInvoices !== calculatedStats.totalInvoices && (
                    <div className="text-xs text-gray-500">(DB: {customer.totalInvoices})</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Kunde seit {formatDate(customer.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Ansprechpartner */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Ansprechpartner</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-3 w-3 mr-1" />
                  Hinzufügen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {customer.contactPersons && customer.contactPersons.length > 0 ? (
                <div className="space-y-4">
                  {/* Hauptansprechpartner */}
                  {primaryContact && (
                    <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-800">
                            {primaryContact.firstName} {primaryContact.lastName}
                          </span>
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-gray-500" />
                          <span>{primaryContact.email}</span>
                        </div>
                        {primaryContact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-500" />
                            <span>{primaryContact.phone}</span>
                          </div>
                        )}
                        {primaryContact.position && (
                          <div className="text-gray-600">
                            <span className="font-medium">Position:</span> {primaryContact.position}
                          </div>
                        )}
                        {primaryContact.department && (
                          <div className="text-gray-600">
                            <span className="font-medium">Abteilung:</span>{' '}
                            {primaryContact.department}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weitere Ansprechpartner */}
                  {otherContacts.map(contact => (
                    <div key={contact.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-gray-500" />
                          <span>{contact.email}</span>
                        </div>
                        {contact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-500" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.position && (
                          <div className="text-gray-600">
                            <span className="font-medium">Position:</span> {contact.position}
                          </div>
                        )}
                        {contact.department && (
                          <div className="text-gray-600">
                            <span className="font-medium">Abteilung:</span> {contact.department}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Keine Ansprechpartner hinterlegt</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rechnungshistorie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Rechnungshistorie
              </CardTitle>
              <CardDescription>Alle Rechnungen für {customer.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#14ad9f]"></div>
                </div>
              ) : invoices.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {invoices.map(invoice => (
                    <div key={invoice.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {invoice.invoiceNumber || invoice.number}
                          </span>
                          <Badge
                            variant={
                              InvoiceStatusHelper.getStatusColor(invoice.status) === 'green'
                                ? 'default'
                                : 'secondary'
                            }
                            className={
                              InvoiceStatusHelper.getStatusColor(invoice.status) === 'green'
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : InvoiceStatusHelper.getStatusColor(invoice.status) === 'red'
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : InvoiceStatusHelper.getStatusColor(invoice.status) === 'blue'
                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }
                          >
                            {InvoiceStatusHelper.getStatusLabel(invoice.status)}
                          </Badge>
                        </div>
                        <span className="font-semibold">{formatCurrency(invoice.total)}</span>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          <span className="font-medium">Datum:</span>{' '}
                          {formatDate(invoice.issueDate)}
                        </div>
                        {invoice.dueDate && (
                          <div>
                            <span className="font-medium">Fällig:</span>{' '}
                            {formatDate(invoice.dueDate)}
                          </div>
                        )}
                        {invoice.description && (
                          <div>
                            <span className="font-medium">Beschreibung:</span> {invoice.description}
                          </div>
                        )}
                        {invoice.isStorno && invoice.originalInvoiceId && (
                          <div className="text-red-600">
                            <span className="font-medium">Storno von:</span>{' '}
                            {invoice.originalInvoiceId}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Noch keine Rechnungen vorhanden</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
