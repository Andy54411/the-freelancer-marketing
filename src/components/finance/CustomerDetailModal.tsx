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

  // Lokaler State für Kundendaten, um Updates aus der DB zu reflektieren
  const [localCustomer, setLocalCustomer] = useState<Customer | null>(null);

  // Aktualisiere lokalen State wenn sich der customer prop ändert
  useEffect(() => {
    setLocalCustomer(customer);
  }, [customer]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('de-DE', {
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
    if (!localCustomer) return;

    try {
      setLoading(true);
      const loadedInvoices: InvoiceData[] = [];

      console.log('🔍 Loading data for customer:', {
        customerName: localCustomer.name,
        isSupplier: localCustomer.isSupplier,
        companyId: localCustomer.companyId,
      });

      // 1. IMMER Rechnungen laden (für alle Kunden/Supplier)
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('companyId', '==', localCustomer.companyId),
        where('customerName', '==', localCustomer.name),
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
      if (localCustomer.isSupplier) {
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('supplierId', '==', localCustomer.id),
          where('companyId', '==', localCustomer.companyId),
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
            customerName: localCustomer.name,
            total: data.amount || 0,
            status: 'paid' as any, // Expenses sind immer "bezahlt"
            createdAt: data.createdAt?.toDate?.() || new Date(),
            dueDate: data.date || new Date().toISOString().split('T')[0],
            companyId: localCustomer.companyId,
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
    if (isOpen && localCustomer?.id) {
      loadInvoiceHistory();
      // Reload customer data to ensure we have latest contactPersons
      reloadCustomerData();
    }
  }, [isOpen, localCustomer?.id]); // Nur ID als Dependency verwenden

  // Reload customer data from database
  const reloadCustomerData = async () => {
    if (!localCustomer?.id) return;

    try {
      console.log('🔄 Reloading customer data for:', localCustomer.name);
      const customerDocRef = doc(db, 'customers', localCustomer.id);
      const customerDocSnapshot = await getDocs(
        query(collection(db, 'customers'), where('__name__', '==', localCustomer.id))
      );

      if (!customerDocSnapshot.empty) {
        const freshData = customerDocSnapshot.docs[0].data();
        console.log('✅ Fresh customer data from DB:', {
          name: freshData.name,
          contactPersons: freshData.contactPersons,
          contactPersonsLength: freshData.contactPersons?.length || 0,
        });

        // Nur aktualisieren wenn sich contactPersons wirklich geändert haben
        const currentContactPersonsLength = localCustomer.contactPersons?.length || 0;
        const freshContactPersonsLength = freshData.contactPersons?.length || 0;

        if (currentContactPersonsLength !== freshContactPersonsLength) {
          console.log('🔄 Contact persons changed, updating local state');
          setLocalCustomer(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              contactPersons: freshData.contactPersons || [],
              // Weitere Felder könnten hier auch aktualisiert werden
              name: freshData.name || prev.name,
              email: freshData.email || prev.email,
              phone: freshData.phone || prev.phone,
              address: freshData.address || prev.address,
              vatId: freshData.vatId || prev.vatId,
            };
          });
        } else {
          console.log('📄 Contact persons unchanged, skipping update');
        }
      } else {
        console.log('❌ Customer document not found in DB');
      }
    } catch (error) {
      console.error('❌ Error reloading customer data:', error);
    }
  };

  if (!localCustomer) return null;

  const primaryContact = localCustomer.contactPersons?.find(cp => cp.isPrimary);
  const otherContacts = localCustomer.contactPersons?.filter(cp => !cp.isPrimary) || [];

  // Debug: Ansprechpartner-Daten loggen (reduziert)
  console.log(
    '💼 Customer:',
    localCustomer.name,
    'Contact persons:',
    localCustomer.contactPersons?.length || 0
  );

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
                {localCustomer.name}
              </DialogTitle>
              <DialogDescription>
                Kunde {localCustomer.customerNumber} - Detailansicht und Rechnungshistorie
              </DialogDescription>
            </div>
            {(localCustomer.totalAmount !== calculatedStats.totalAmount ||
              localCustomer.totalInvoices !== calculatedStats.totalInvoices) && (
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
                  <span>{localCustomer.email}</span>
                </div>

                {localCustomer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{localCustomer.phone}</span>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span className="text-sm">{localCustomer.address}</span>
                </div>

                {(localCustomer.taxNumber || localCustomer.vatId) && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      {localCustomer.taxNumber && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Steuernummer:</span>{' '}
                          {localCustomer.taxNumber}
                        </div>
                      )}
                      {localCustomer.vatId && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">USt-IdNr:</span> {localCustomer.vatId}
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
                    {localCustomer.totalAmount !== calculatedStats.totalAmount && (
                      <div className="text-xs text-gray-500">
                        (DB: {formatCurrency(localCustomer.totalAmount)})
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Rechnungen:</span>
                    <div className="text-lg font-semibold">{calculatedStats.totalInvoices}</div>
                    {localCustomer.totalInvoices !== calculatedStats.totalInvoices && (
                      <div className="text-xs text-gray-500">
                        (DB: {localCustomer.totalInvoices})
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Kunde seit {formatDate(localCustomer.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Rechnungshistorie in der linken Spalte */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {localCustomer.isSupplier ? 'Rechnungen & Ausgaben' : 'Rechnungshistorie'}
                </CardTitle>
                <CardDescription>
                  {localCustomer.isSupplier
                    ? `Alle Rechnungen und Ausgaben für ${localCustomer.name}`
                    : `Alle Rechnungen für ${localCustomer.name}`}
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
            {/* Ansprechpartner */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Ansprechpartner</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Öffne EditCustomerModal für Ansprechpartner-Verwaltung
                      window.dispatchEvent(
                        new CustomEvent('openEditModal', { detail: localCustomer })
                      );
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Hinzufügen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {localCustomer.contactPersons && localCustomer.contactPersons.length > 0 ? (
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
                              <span className="font-medium">Position:</span>{' '}
                              {primaryContact.position}
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('openEditModal', { detail: localCustomer })
                        );
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ersten Ansprechpartner hinzufügen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
