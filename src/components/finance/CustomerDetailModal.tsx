'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
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
  Loader2,
} from 'lucide-react';
import { Customer, ContactPerson } from './AddCustomerModal';
import { ContactPersonsSection } from './ContactPersonsSection';
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

      // Für Supplier: Statistiken aus expenses berechnen
      if (customer.isSupplier) {
        console.log('🔍 Syncing supplier stats for:', customer.id);

        // Expenses für diesen Supplier laden
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('supplierId', '==', customer.id),
          where('companyId', '==', customer.companyId)
        );

        const expensesSnapshot = await getDocs(expensesQuery);
        let totalAmount = 0;
        let totalInvoices = 0;

        expensesSnapshot.forEach(doc => {
          const data = doc.data();
          totalAmount += data.amount || 0;
          totalInvoices += 1;
        });

        console.log('🔍 Calculated supplier stats:', { totalAmount, totalInvoices });

        // Supplier-Dokument direkt aktualisieren
        const supplierRef = doc(db, 'customers', customer.id);
        await updateDoc(supplierRef, {
          totalAmount,
          totalInvoices,
          lastStatsUpdate: new Date(),
          updatedAt: serverTimestamp(),
        });

        setCalculatedStats({ totalAmount, totalInvoices });
      } else {
        // Für normale Kunden: bestehende Logik
        await updateCustomerStats(customer.id, calculatedStats);
      }

      toast.success('Statistiken erfolgreich synchronisiert');
      onCustomerUpdated?.();
    } catch (error) {
      toast.error('Fehler beim Synchronisieren der Statistiken');
    } finally {
      setSyncingStats(false);
    }
  };

  // Rechnungshistorie und Ausgaben laden
  const loadInvoiceHistory = async () => {
    if (!customer) return;

    try {
      setLoading(true);
      const loadedInvoices: InvoiceData[] = [];

      console.log('🔍 Loading data for customer:', {
        customerName: customer.name,
        isSupplier: customer.isSupplier,
        companyId: customer.companyId,
      });

      // 1. IMMER Rechnungen laden (für alle Kunden/Supplier)
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('companyId', '==', customer.companyId),
        where('customerName', '==', customer.name),
        orderBy('createdAt', 'desc')
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);
      console.log(`🔍 Found ${invoicesSnapshot.size} invoices`);

      invoicesSnapshot.forEach(doc => {
        const data = doc.data();
        loadedInvoices.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as InvoiceData);
      });

      // 2. ZUSÄTZLICH für Supplier: Ausgaben laden und als "Rechnungen" anzeigen
      if (customer.isSupplier) {
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('supplierId', '==', customer.id),
          where('companyId', '==', customer.companyId),
          orderBy('createdAt', 'desc')
        );

        const expensesSnapshot = await getDocs(expensesQuery);
        console.log(`🔍 Found ${expensesSnapshot.size} expenses for supplier`);

        // Expenses als "Rechnungen" formatieren
        expensesSnapshot.forEach(doc => {
          const data = doc.data();
          loadedInvoices.push({
            id: doc.id,
            invoiceNumber: data.invoiceNumber || `EXP-${doc.id.slice(-6)}`,
            customerName: customer.name,
            total: data.amount || 0,
            status: 'paid' as any, // Expenses sind immer "bezahlt"
            createdAt: data.createdAt?.toDate?.() || new Date(),
            dueDate: data.date || new Date().toISOString().split('T')[0],
            companyId: customer.companyId,
            // Markiere als Ausgabe für UI-Unterscheidung
            isExpense: true,
            description: data.description || data.title || 'Ausgabe',
          } as any);
        });
      }

      console.log(`🔍 Total loaded items: ${loadedInvoices.length}`);
      setInvoices(loadedInvoices);
      calculateCustomerStats(loadedInvoices);
    } catch (error) {
      console.error('❌ Error loading invoice history:', error);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-none !w-[95vw] max-h-[90vh] overflow-y-auto"
        style={{ width: '95vw', maxWidth: 'none' }}
      >
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Linke Spalte: Kundeninformationen (2/3 der Breite) */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* Rechnungshistorie in der linken Spalte */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {customer.isSupplier ? 'Rechnungen & Ausgaben' : 'Rechnungshistorie'}
                </CardTitle>
                <CardDescription>
                  {customer.isSupplier
                    ? `Alle Rechnungen und Ausgaben für ${customer.name}`
                    : `Alle Rechnungen für ${customer.name}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#14ad9f]" />
                    <p className="text-sm text-gray-500 mt-2">Lade Rechnungen...</p>
                  </div>
                ) : invoices.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {invoices.map(invoice => (
                      <div
                        key={invoice.id}
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{invoice.invoiceNumber}</span>
                            <Badge
                              variant={
                                invoice.status === 'paid'
                                  ? 'default'
                                  : invoice.status === 'draft' || invoice.status === 'finalized'
                                    ? 'secondary'
                                    : invoice.status === 'overdue'
                                      ? 'destructive'
                                      : 'outline'
                              }
                              className={
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                  : ''
                              }
                            >
                              {InvoiceStatusHelper.getStatusLabel(invoice.status)}
                            </Badge>
                            {(invoice as any).isExpense && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Ausgabe
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold text-[#14ad9f]">
                            {formatCurrency(invoice.total)}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          <div>
                            Erstellt:{' '}
                            {formatDate(
                              invoice.createdAt instanceof Date
                                ? invoice.createdAt.toISOString()
                                : invoice.createdAt
                            )}
                          </div>
                          {invoice.dueDate && <div>Fällig: {formatDate(invoice.dueDate)}</div>}
                          {(invoice as any).description && (
                            <div>Beschreibung: {(invoice as any).description}</div>
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

          {/* Rechte Spalte: Ansprechpartner (1/3 der Breite) */}
          <div className="space-y-6">
            <ContactPersonsSection
              contactPersons={customer.contactPersons}
              onEdit={() => {
                // Trigger EditCustomerModal öffnen
                window.dispatchEvent(new CustomEvent('openEditModal', { detail: customer }));
              }}
              onAdd={() => {
                // Trigger EditCustomerModal öffnen
                window.dispatchEvent(new CustomEvent('openEditModal', { detail: customer }));
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
