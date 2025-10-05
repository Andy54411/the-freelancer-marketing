'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Customer } from './AddCustomerModal';
import { InvoiceData } from '@/types/invoiceTypes';
import { toast } from 'sonner';
import { updateCustomerStats } from '@/utils/customerStatsUtils';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerDetailModal as CustomerDetailModalComponent } from './customer-detail/CustomerDetailModal';

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
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingStats, setSyncingStats] = useState(false);
  const [calculatedStats, setCalculatedStats] = useState<{
    totalAmount: number;
    totalInvoices: number;
    totalMeetings: number;
  }>({ totalAmount: 0, totalInvoices: 0, totalMeetings: 0 });

  // Lokaler State für Kundendaten, um Updates aus der DB zu reflektieren
  const [localCustomer, setLocalCustomer] = useState<Customer | null>(null);

  // Aktualisiere lokalen State wenn sich der customer prop ändert
  useEffect(() => {
    setLocalCustomer(customer);
  }, [customer]);

  // Berechne Statistiken basierend auf geladenen Rechnungen und Calendar Events
  const calculateCustomerStats = (invoiceList: InvoiceData[], eventList: any[] = []) => {
    // Alle Rechnungen außer draft/cancelled für Umsatzberechnung
    const validInvoices = invoiceList.filter(
      invoice => invoice.status !== 'draft' && invoice.status !== 'cancelled'
    );

    const totalAmount = validInvoices.reduce((sum, invoice) => {
      // Berücksichtige Storno-Rechnungen (negative Beträge)
      const amount = invoice.isStorno ? -invoice.total : invoice.total;
      return sum + amount;
    }, 0);

    // Zähle Calendar Events als Termine
    const totalMeetings = eventList.filter(event => 
      ['meeting', 'appointment', 'call'].includes(event.eventType)
    ).length;

    setCalculatedStats({
      totalAmount,
      totalInvoices: validInvoices.length,
      totalMeetings,
    });
  };

  // Synchronisiere Kundenstatistiken in der Datenbank
  const handleSyncStats = async () => {
    if (!customer || !localCustomer) return;

    try {
      setSyncingStats(true);

      // Für Supplier: Statistiken aus expenses berechnen
      if (localCustomer.isSupplier) {
        // Expenses für diesen Supplier laden
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('supplierId', '==', localCustomer.id),
          where('companyId', '==', localCustomer.companyId)
        );

        const expensesSnapshot = await getDocs(expensesQuery);
        let totalAmount = 0;
        let totalInvoices = 0;

        expensesSnapshot.forEach(doc => {
          const data = doc.data();
          totalAmount += data.amount || 0;
          totalInvoices += 1;
        });

        // Supplier-Dokument direkt aktualisieren
        const supplierRef = doc(db, 'companies', localCustomer.companyId, 'customers', localCustomer.id);
        await updateDoc(supplierRef, {
          totalAmount,
          totalInvoices,
          lastStatsUpdate: new Date(),
          updatedAt: serverTimestamp(),
        });

        setCalculatedStats({ totalAmount, totalInvoices, totalMeetings: 0 });
      } else {
        // Für normale Kunden: Direkt in Subcollection aktualisieren
        const customerRef = doc(db, 'companies', localCustomer.companyId, 'customers', localCustomer.id);
        await updateDoc(customerRef, {
          totalAmount: calculatedStats.totalAmount,
          totalInvoices: calculatedStats.totalInvoices,
          lastStatsUpdate: new Date(),
          updatedAt: serverTimestamp(),
        });
      }

      // Lokalen Customer State mit neuen DB-Werten aktualisieren
      setLocalCustomer(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          totalAmount: calculatedStats.totalAmount,
          totalInvoices: calculatedStats.totalInvoices,
          lastStatsUpdate: new Date(),
        };
      });

      // Nach dem Sync: Kundendaten aus der DB neu laden, damit auch Parent aktualisiert wird
      await reloadCustomerData();

      toast.success('Statistiken erfolgreich synchronisiert');
      onCustomerUpdated?.();
    } catch (error) {
      toast.error('Fehler beim Synchronisieren der Statistiken');
    } finally {
      setSyncingStats(false);
    }
  };

  // Rechnungshistorie, Ausgaben und Calendar Events laden
  const loadInvoiceHistory = async () => {
    if (!localCustomer) return;

    try {
      setLoading(true);
      const loadedInvoices: InvoiceData[] = [];
      const loadedCalendarEvents: any[] = [];

      // 1. Für KUNDEN: Rechnungen laden - für LIEFERANTEN: Ausgaben laden

      
      const invoicesQuery = query(
        collection(db, `companies/${localCustomer.companyId}/invoices`),
        where('customerNumber', '==', localCustomer.customerNumber)
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);

      // GoBD-konform: NUR festgeschriebene Rechnungen anzeigen, aber KEINE abgebrochenen
      // Eine Rechnung wird angezeigt wenn:
      // 1. Status ist NICHT 'draft' UND NICHT 'cancelled' (abgebrochen)
      // 2. UND (isLocked = true ODER status ist finalisiert)
      invoicesSnapshot.forEach(doc => {
        const data = doc.data();
        
        // IMMER ausschließen: draft und cancelled/abgebrochen
        if (data.status === 'draft' || data.status === 'cancelled') {
          return; // Skip diese Rechnung
        }
        
        // Filter: Nur festgeschriebene oder finalisierte Rechnungen (aber nie abgebrochene)
        const isLockedInvoice = data.isLocked === true;
        const isFinalizedInvoice = data.status !== 'draft';
        
        if (isLockedInvoice || isFinalizedInvoice) {
          loadedInvoices.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          } as InvoiceData);
        }
      });

      // Sortiere im Client nach createdAt (neueste zuerst)
      loadedInvoices.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA; // Neueste zuerst
      });

      // 2. ZUSÄTZLICH für Supplier: Ausgaben laden und als "Rechnungen" anzeigen
      if (localCustomer.isSupplier) {
        const expensesQuery = query(
          collection(db, `companies/${localCustomer.companyId}/expenses`),
          where('supplierId', '==', localCustomer.id)
        );

        try {
          const expensesSnapshot = await getDocs(expensesQuery);

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
        } catch (expenseError) {
          console.error('Fehler beim Laden der Ausgaben:', expenseError);
        }
      }

      // 3. Calendar Events für diesen Kunden laden
      try {
        const calendarQuery = query(
          collection(db, `companies/${localCustomer.companyId}/calendar_events`),
          where('customerId', '==', localCustomer.id),
          orderBy('createdAt', 'desc')
        );

        const calendarSnapshot = await getDocs(calendarQuery);
        calendarSnapshot.forEach(doc => {
          loadedCalendarEvents.push({
            id: doc.id,
            ...doc.data(),
          });
        });
      } catch (calendarError) {
        console.error('Fehler beim Laden der Calendar Events:', calendarError);
      }

      setInvoices(loadedInvoices);
      setCalendarEvents(loadedCalendarEvents);
      calculateCustomerStats(loadedInvoices, loadedCalendarEvents);
    } catch (error) {
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
      
      // Automatische Synchronisation der Statistiken beim Öffnen
      const autoSyncStats = async () => {
        if (localCustomer && calculatedStats.totalAmount > 0) {
          // Prüfe ob Sync nötig ist und führe ihn automatisch durch
          if (
            localCustomer.totalAmount !== calculatedStats.totalAmount ||
            localCustomer.totalInvoices !== calculatedStats.totalInvoices
          ) {
            await handleSyncStats();
          }
        }
      };
      
      // Warte kurz bis Rechnungen geladen sind, dann sync
      setTimeout(autoSyncStats, 1000);
    }
  }, [isOpen, localCustomer?.id]); // Nur ID als Dependency verwenden

  // Reload customer data from database
  const reloadCustomerData = async () => {
    if (!localCustomer?.id) return;

    try {
      const customerDocRef = doc(db, 'companies', localCustomer.companyId, 'customers', localCustomer.id);
      const customerDocSnapshot = await getDoc(customerDocRef);

      if (customerDocSnapshot.exists()) {
        const freshData = customerDocSnapshot.data();

        // Nur aktualisieren wenn sich contactPersons wirklich geändert haben
        const currentContactPersonsLength = localCustomer.contactPersons?.length || 0;
        const freshContactPersonsLength = freshData.contactPersons?.length || 0;

        if (currentContactPersonsLength !== freshContactPersonsLength) {
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
        }
      } else {
      }
    } catch (error) {}
  };

  const handleEditContact = () => {
    window.dispatchEvent(
      new CustomEvent('openEditModal', { detail: localCustomer })
    );
  };

  if (!localCustomer) return null;

  return (
    <CustomerDetailModalComponent
      customer={localCustomer}
      isOpen={isOpen}
      onClose={onClose}
      invoices={invoices}
      loading={loading}
      calculatedStats={calculatedStats}
      calendarEvents={calendarEvents}
      onEditContact={handleEditContact}
      companyId={localCustomer.companyId}
    />
  );
}
export default CustomerDetailModal;