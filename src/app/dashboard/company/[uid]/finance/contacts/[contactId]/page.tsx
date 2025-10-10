'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
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
import { Customer } from '@/components/finance/AddCustomerModal';
import { InvoiceData } from '@/types/invoiceTypes';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { updateCustomerStats } from '@/utils/customerStatsUtils';
import { Button } from '@/components/ui/button';
import { CustomerInfoCard } from '@/components/finance/customer-detail/CustomerInfoCard';
import { CustomerInvoiceCard } from '@/components/finance/customer-detail/CustomerInvoiceCard';
import { CustomerContactCard } from '@/components/finance/customer-detail/CustomerContactCard';
import { CustomerHistoryTab } from '@/components/finance/customer-detail/CustomerHistoryTab';
import { CustomerDocumentsTab } from '@/components/finance/customer-detail/CustomerDocumentsTab';
import CustomerOrdersTab from '@/components/finance/customer-detail/CustomerOrdersTab';

// Add style tag to hide scrollbar
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `;
  if (!document.head.querySelector('style[data-scrollbar-hide]')) {
    style.setAttribute('data-scrollbar-hide', 'true');
    document.head.appendChild(style);
  }
}

interface ContactDetailPageProps {
  params: Promise<{
    uid: string;
    contactId: string;
  }>;
}

export default function ContactDetailPage({ params }: ContactDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [syncingStats, setSyncingStats] = useState(false);
  const [calculatedStats, setCalculatedStats] = useState<{
    totalAmount: number;
    totalInvoices: number;
    totalMeetings: number;
  }>({ totalAmount: 0, totalInvoices: 0, totalMeetings: 0 });

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
    if (!customer) return;

    try {
      setSyncingStats(true);

      // Für Supplier: Statistiken aus expenses berechnen
      if (customer.isSupplier) {
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

        // Supplier-Dokument direkt aktualisieren
        const supplierRef = doc(db, 'companies', customer.companyId, 'customers', customer.id);
        await updateDoc(supplierRef, {
          totalAmount,
          totalInvoices,
          lastStatsUpdate: new Date(),
          updatedAt: serverTimestamp(),
        });

        setCalculatedStats({ totalAmount, totalInvoices, totalMeetings: 0 });
      } else {
        // Für normale Kunden: Direkt in Subcollection aktualisieren
        const customerRef = doc(db, 'companies', customer.companyId, 'customers', customer.id);
        await updateDoc(customerRef, {
          totalAmount: calculatedStats.totalAmount,
          totalInvoices: calculatedStats.totalInvoices,
          lastStatsUpdate: new Date(),
          updatedAt: serverTimestamp(),
        });
      }

      // Lokalen Customer State mit neuen DB-Werten aktualisieren
      setCustomer(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          totalAmount: calculatedStats.totalAmount,
          totalInvoices: calculatedStats.totalInvoices,
          lastStatsUpdate: new Date(),
        };
      });

      // Nach dem Sync: Kundendaten aus der DB neu laden
      await reloadCustomerData();

      toast.success('Statistiken erfolgreich synchronisiert');
    } catch (error) {
      toast.error('Fehler beim Synchronisieren der Statistiken');
    } finally {
      setSyncingStats(false);
    }
  };

  // Rechnungshistorie, Ausgaben und Calendar Events laden
  const loadInvoiceHistory = async (currentCustomer: Customer) => {
    if (!currentCustomer) return;

    try {
      setInvoicesLoading(true);
      const loadedInvoices: InvoiceData[] = [];
      const loadedCalendarEvents: any[] = [];

      // 1. Für KUNDEN: Rechnungen laden - für LIEFERANTEN: Ausgaben laden
      const invoicesQuery = query(
        collection(db, `companies/${currentCustomer.companyId}/invoices`),
        where('customerNumber', '==', currentCustomer.customerNumber)
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);

      // GoBD-konform: NUR festgeschriebene Rechnungen anzeigen, aber KEINE abgebrochenen
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
        const dateA =
          a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const dateB =
          b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA; // Neueste zuerst
      });

      // 2. ZUSÄTZLICH für Supplier: Ausgaben laden und als "Rechnungen" anzeigen
      if (currentCustomer.isSupplier) {
        const expensesQuery = query(
          collection(db, `companies/${currentCustomer.companyId}/expenses`),
          where('supplierId', '==', currentCustomer.id)
        );

        try {
          const expensesSnapshot = await getDocs(expensesQuery);

          // Expenses als "Rechnungen" formatieren
          expensesSnapshot.forEach(doc => {
            const data = doc.data();
            loadedInvoices.push({
              id: doc.id,
              invoiceNumber: data.invoiceNumber || `EXP-${doc.id.slice(-6)}`,
              customerName: currentCustomer.name,
              total: data.amount || 0,
              status: 'paid' as any, // Expenses sind immer "bezahlt"
              createdAt: data.createdAt?.toDate?.() || new Date(),
              dueDate: data.date || new Date().toISOString().split('T')[0],
              companyId: currentCustomer.companyId,
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
          collection(db, `companies/${currentCustomer.companyId}/calendar_events`),
          where('customerId', '==', currentCustomer.id),
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
      setInvoicesLoading(false);
    }
  };

  // Reload customer data from database
  const reloadCustomerData = async () => {
    if (!customer?.id) return;

    try {
      const customerDocRef = doc(db, 'companies', customer.companyId, 'customers', customer.id);
      const customerDocSnapshot = await getDoc(customerDocRef);

      if (customerDocSnapshot.exists()) {
        const freshData = customerDocSnapshot.data();

        setCustomer(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            contactPersons: freshData.contactPersons || [],
            name: freshData.name || prev.name,
            email: freshData.email || prev.email,
            phone: freshData.phone || prev.phone,
            street: freshData.street || prev.street,
            postalCode: freshData.postalCode || prev.postalCode,
            city: freshData.city || prev.city,
            vatId: freshData.vatId || prev.vatId,
            taxNumber: freshData.taxNumber || prev.taxNumber,
            totalAmount: freshData.totalAmount || prev.totalAmount,
            totalInvoices: freshData.totalInvoices || prev.totalInvoices,
          };
        });
      }
    } catch (error) {
      console.error('Error reloading customer:', error);
    }
  };

  const handleEditContact = () => {
    window.dispatchEvent(new CustomEvent('openEditModal', { detail: customer }));
  };

  // Initial load
  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true);

        const customerDoc = await getDoc(
          doc(db, 'companies', resolvedParams.uid, 'customers', resolvedParams.contactId)
        );

        if (customerDoc.exists()) {
          const data = customerDoc.data();
          const customerData: Customer = {
            id: customerDoc.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            street: data.street || '',
            postalCode: data.postalCode || '',
            city: data.city || '',
            country: data.country || 'Deutschland',
            vatId: data.vatId || '',
            taxNumber: data.taxNumber || '',
            customerNumber: data.customerNumber || '',
            companyId: resolvedParams.uid,
            isSupplier: data.isSupplier || false,
            createdAt: data.createdAt,
            totalAmount: data.totalAmount || 0,
            totalInvoices: data.totalInvoices || 0,
            contactPersons: data.contactPersons || [],
          };

          setCustomer(customerData);

          // Load invoice history
          await loadInvoiceHistory(customerData);

          // Automatische Synchronisation der Statistiken
          setTimeout(async () => {
            if (calculatedStats.totalAmount > 0) {
              if (
                customerData.totalAmount !== calculatedStats.totalAmount ||
                customerData.totalInvoices !== calculatedStats.totalInvoices
              ) {
                await handleSyncStats();
              }
            }
          }, 1000);
        } else {
          toast.error('Kontakt nicht gefunden');
          router.push(`/dashboard/company/${resolvedParams.uid}/finance/contacts`);
        }
      } catch (error) {
        console.error('Error loading customer:', error);
        toast.error('Fehler beim Laden des Kontakts');
        router.push(`/dashboard/company/${resolvedParams.uid}/finance/contacts`);
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [resolvedParams.uid, resolvedParams.contactId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-[1400px]">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push(`/dashboard/company/${resolvedParams.uid}/finance/contacts`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Zurück zu Kontakte
      </Button>

      {/* Customer Detail Content (without Dialog wrapper) */}
      <CustomerDetailPageContent
        customer={customer}
        invoices={invoices}
        loading={invoicesLoading}
        calculatedStats={calculatedStats}
        calendarEvents={calendarEvents}
        onEditContact={handleEditContact}
        companyId={resolvedParams.uid}
      />
    </div>
  );
}

// Page Content Component (Modal content without Dialog wrapper)
function CustomerDetailPageContent({
  customer,
  invoices = [],
  calendarEvents = [],
  loading = false,
  calculatedStats = { totalAmount: 0, totalInvoices: 0, totalMeetings: 0 },
  onEditContact,
  companyId,
}: {
  customer: Customer;
  invoices: InvoiceData[];
  calendarEvents: any[];
  loading: boolean;
  calculatedStats: {
    totalAmount: number;
    totalInvoices: number;
    totalMeetings: number;
  };
  onEditContact: () => void;
  companyId: string;
}) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'invoices' | 'contacts' | 'history' | 'documents' | 'orders' | 'credits'
  >('overview');
  const [documentsCount, setDocumentsCount] = useState(0);

  const tabs = [
    {
      id: 'overview' as const,
      label: 'Übersicht',
      icon: '🏢',
      count: null,
    },
    {
      id: 'invoices' as const,
      label: 'Rechnungen',
      icon: '🧾',
      count: invoices.length,
    },
    {
      id: 'contacts' as const,
      label: 'Kontakte',
      icon: '👥',
      count: customer.contactPersons?.length || 0,
    },
    {
      id: 'history' as const,
      label: 'Verlauf',
      icon: '📜',
      count: null,
    },
    {
      id: 'documents' as const,
      label: 'Dokumente',
      icon: '📁',
      count: documentsCount,
    },
    {
      id: 'orders' as const,
      label: 'Aufträge',
      icon: '📋',
      count: 0,
    },
    {
      id: 'credits' as const,
      label: 'Gutschriften',
      icon: '💳',
      count: 0,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#14ad9f]/10 rounded-lg">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#14ad9f]"
            >
              <path
                d="M9.75027 5.52371L10.7168 4.55722C13.1264 2.14759 17.0332 2.14759 19.4428 4.55722C21.8524 6.96684 21.8524 10.8736 19.4428 13.2832L18.4742 14.2519M5.52886 9.74513L4.55722 10.7168C2.14759 13.1264 2.1476 17.0332 4.55722 19.4428C6.96684 21.8524 10.8736 21.8524 13.2832 19.4428L14.2478 18.4782M9.5 14.5L14.5 9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              ></path>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-600">
              Kunde {customer.customerNumber} - Detailansicht und Verwaltung
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-0 overflow-x-auto px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#14ad9f] text-[#14ad9f] bg-[#14ad9f]/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.count !== null && (
                <span
                  className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div
        className="p-6 overflow-auto hide-scrollbar"
        style={
          {
            maxHeight: 'calc(100vh - 280px)',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          } as React.CSSProperties
        }
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Linke Spalte: Kundeninformationen (2/3 der Breite) */}
            <div className="lg:col-span-2">
              <CustomerInfoCard customer={customer} calculatedStats={calculatedStats} />
            </div>

            {/* Rechte Spalte: Schnellaktionen (1/3 der Breite) */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Schnellaktionen</h3>
                <div className="space-y-2">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded border hover:shadow-sm transition-all"
                    onClick={() => setActiveTab('invoices')}
                  >
                    📄 Neue Rechnung erstellen
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded border hover:shadow-sm transition-all"
                    onClick={() => setActiveTab('contacts')}
                  >
                    👥 Kontakt hinzufügen
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded border hover:shadow-sm transition-all">
                    📧 E-Mail senden
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded border hover:shadow-sm transition-all">
                    📞 Anruf protokollieren
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && <CustomerInvoiceCard customer={customer} />}

        {activeTab === 'contacts' && (
          <CustomerContactCard customer={customer} onEditContact={onEditContact} />
        )}

        {activeTab === 'history' && <CustomerHistoryTab customer={customer} />}

        {activeTab === 'documents' && (
          <CustomerDocumentsTab
            customer={customer}
            companyId={companyId}
            onDocumentsCountChange={setDocumentsCount}
          />
        )}

        {activeTab === 'orders' && <CustomerOrdersTab customer={customer} companyId={companyId} />}

        {activeTab === 'credits' && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-6xl mb-4 block">💳</span>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Gutschriften (0)</h3>
            <p className="text-sm mb-4">
              Hier werden alle Gutschriften für diesen Kunden angezeigt
            </p>
            <button className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors">
              Neue Gutschrift erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
