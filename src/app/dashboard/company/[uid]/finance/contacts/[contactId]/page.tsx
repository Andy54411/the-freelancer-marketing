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
import {
  Loader2,
  ArrowLeft,
  MoreHorizontal,
  Building2,
  Receipt,
  Users,
  History,
  FolderOpen,
  ShoppingCart,
  Ticket,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CustomerInfoCard } from '@/components/finance/customer-detail/CustomerInfoCard';
import { CustomerInvoiceCard } from '@/components/finance/customer-detail/CustomerInvoiceCard';
import { CustomerContactCard } from '@/components/finance/customer-detail/CustomerContactCard';
import { CustomerHistoryTab } from '@/components/finance/customer-detail/CustomerHistoryTab';
import { CustomerDocumentsTab } from '@/components/finance/customer-detail/CustomerDocumentsTab';
import { CustomerWhatsAppTab } from '@/components/finance/customer-detail/CustomerWhatsAppTab';
import CustomerOrdersTab from '@/components/finance/customer-detail/CustomerOrdersTab';
import { EditContactPersonModal } from '@/components/finance/customer-detail/EditContactPersonModal';

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
  const [, setSyncingStats] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
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
    } catch {
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
        } catch (_expenseError) {
          console.error('Fehler beim Laden der Ausgaben:', _expenseError);
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
      } catch (_calendarError) {
        console.error('Fehler beim Laden der Calendar Events:', _calendarError);
      }

      setInvoices(loadedInvoices);
      setCalendarEvents(loadedCalendarEvents);
      calculateCustomerStats(loadedInvoices, loadedCalendarEvents);
    } catch {
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
    setCustomerToEdit(customer);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setCustomerToEdit(null);
  };

  const handleContactPersonsUpdate = async () => {
    await reloadCustomerData();
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
            address: data.address || `${data.street || ''}, ${data.postalCode || ''} ${data.city || ''}`.trim(),
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
            website: data.website,
            notes: data.notes,
            paymentTerms: data.paymentTerms,
            discount: data.discount,
            currency: data.currency,
            language: data.language,
            companySize: data.companySize,
            industry: data.industry,
            legalForm: data.legalForm,
            creditLimit: data.creditLimit,
            debitorNumber: data.debitorNumber,
            creditorNumber: data.creditorNumber,
            bankName: data.bankName,
            iban: data.iban,
            bic: data.bic,
            accountHolder: data.accountHolder,
            preferredPaymentMethod: data.preferredPaymentMethod,
            earlyPaymentDiscount: data.earlyPaymentDiscount,
            earlyPaymentDays: data.earlyPaymentDays,
            defaultInvoiceDueDate: data.defaultInvoiceDueDate,
            reminderFee: data.reminderFee,
            lateFee: data.lateFee,
            automaticReminders: data.automaticReminders,
            noReminders: data.noReminders,
            reminderLevel: data.reminderLevel,
            defaultTaxRate: data.defaultTaxRate,
            reverseCharge: data.reverseCharge,
            skontoProducts: data.skontoProducts || [],
            tags: data.tags || [],
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

      {/* Edit Contact Persons Modal */}
      {customerToEdit && (
        <EditContactPersonModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          customer={customerToEdit}
          onUpdate={handleContactPersonsUpdate}
        />
      )}
    </div>
  );
}

// Page Content Component (Modal content without Dialog wrapper)
function CustomerDetailPageContent({
  customer,
  invoices = [],
  calendarEvents: _calendarEvents = [],
  loading: _loading = false,
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
    'overview' | 'invoices' | 'contacts' | 'history' | 'documents' | 'orders' | 'credits' | 'whatsapp'
  >('overview');
  const [documentsCount, setDocumentsCount] = useState(0);
  const [showMoreTabs, setShowMoreTabs] = useState(false);

  const tabs = [
    {
      id: 'overview' as const,
      label: 'Übersicht',
      icon: Building2,
      count: null,
      primary: true,
    },
    {
      id: 'invoices' as const,
      label: 'Rechnungen',
      icon: Receipt,
      count: invoices.length,
      primary: true,
    },
    {
      id: 'contacts' as const,
      label: 'Kontakte',
      icon: Users,
      count: customer.contactPersons?.length || 0,
      primary: true,
    },
    {
      id: 'documents' as const,
      label: 'Dokumente',
      icon: FolderOpen,
      count: documentsCount,
      primary: true,
    },
    {
      id: 'orders' as const,
      label: 'Aufträge',
      icon: ShoppingCart,
      count: 0,
      primary: true,
    },
    {
      id: 'credits' as const,
      label: 'Gutschriften',
      icon: Ticket,
      count: 0,
      primary: true,
    },
    {
      id: 'whatsapp' as const,
      label: 'WhatsApp',
      icon: MessageSquare,
      count: null,
      primary: true,
    },
    {
      id: 'history' as const,
      label: 'Verlauf',
      icon: History,
      count: null,
      primary: false,
    },
  ];

  const primaryTabs = tabs.filter(tab => tab.primary);
  const secondaryTabs = tabs.filter(tab => !tab.primary);

  return (
    <div className="bg-white">
      {/* Compact Header */}
      <div className="border-b border-gray-200 px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">Kunde Nr. {customer.customerNumber}</p>
          </div>
        </div>
      </div>

      {/* Compact Tab Navigation */}
      <div className="border-b border-gray-200 px-8">
        <div className="max-w-[1600px] mx-auto">
          <nav className="flex items-center gap-1">
            {primaryTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#14ad9f] text-[#14ad9f]'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                        activeTab === tab.id
                          ? 'bg-[#14ad9f] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
            
            {/* More Button */}
            <div className="relative">
              <button
                onClick={() => setShowMoreTabs(!showMoreTabs)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  secondaryTabs.some(t => t.id === activeTab)
                    ? 'border-[#14ad9f] text-[#14ad9f]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showMoreTabs && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {secondaryTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowMoreTabs(false);
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'bg-[#14ad9f]/10 text-[#14ad9f] font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                        {tab.count !== null && tab.count > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {activeTab === 'overview' && <CustomerInfoCard customer={customer} calculatedStats={calculatedStats} />}
          {activeTab === 'invoices' && <CustomerInvoiceCard customer={customer} />}
          {activeTab === 'contacts' && <CustomerContactCard customer={customer} onEditContact={onEditContact} />}
          {activeTab === 'history' && <CustomerHistoryTab customer={customer} />}
          {activeTab === 'documents' && (
            <CustomerDocumentsTab customer={customer} companyId={companyId} onDocumentsCountChange={setDocumentsCount} />
          )}
          {activeTab === 'orders' && <CustomerOrdersTab customer={customer} companyId={companyId} />}
          {activeTab === 'whatsapp' && <CustomerWhatsAppTab customer={customer} companyId={companyId} />}
          {activeTab === 'credits' && (
            <div className="text-center py-20">
              <Ticket className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Gutschriften</h3>
              <p className="text-gray-500 mb-6 text-sm">Für diesen Kunden wurden noch keine Gutschriften erstellt</p>
              <button className="px-5 py-2 bg-[#14ad9f] text-white text-sm rounded-lg hover:bg-taskilo-hover transition-colors font-medium">
                Gutschrift erstellen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
