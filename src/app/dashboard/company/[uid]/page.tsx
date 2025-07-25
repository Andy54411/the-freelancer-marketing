'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { callHttpsFunction } from '@/lib/httpsFunctions';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { calculateCompanyMetrics, type CompanyMetrics } from '@/lib/companyMetrics';
import { OrderSummaryDrawer } from '@/components/OrderSummaryDrawer';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import {
  FiGrid,
  FiCalendar,
  FiDollarSign,
  FiMessageSquare,
  FiUser,
  FiSettings,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SectionCards } from '@/components/section-cards';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import CompanyCalendar from '@/components/CompanyCalendar';
import FinanceComponent from '@/components/FinanceComponent';
import CompanyReviewManagement from '@/components/CompanyReviewManagement';
import SettingsPage from '@/components/SettingsPage';

// Typ für die Auftragsdaten, die von der API kommen
type OrderData = {
  id: string;
  selectedSubcategory: string;
  customerName: string;
  status: string;
  orderDate?: { _seconds: number; _nanoseconds: number } | string;
  totalAmountPaidByBuyer: number;
  uid: string;
  orderedBy: string;
};

const isNonEmptyString = (val: unknown): val is string =>
  typeof val === 'string' && val.trim() !== '';

export default function CompanyDashboard({ params }: { params: Promise<{ uid: string }> }) {
  const searchParams = useSearchParams();

  // Spaltendefinitionen für die DataTable
  const columns: ColumnDef<OrderData>[] = [
    {
      id: 'Dienstleistung',
      accessorKey: 'selectedSubcategory',
      header: () => <div className="text-center">Dienstleistung</div>,
      cell: ({ row }) => {
        const order = row.original;
        // Link zur spezifischen Auftrags-Chat-Seite
        return (
          <div className="text-center">
            <Link
              href={`/dashboard/company/${order.uid}/inbox/chat/${order.id}`}
              className="font-medium text-[#14ad9f] hover:underline"
            >
              {order.selectedSubcategory}
            </Link>
          </div>
        );
      },
    },
    {
      id: 'Kunde',
      accessorKey: 'customerName',
      header: () => <div className="text-center">Kunde</div>,
      cell: ({ row }) => <div className="text-center">{row.original.customerName}</div>,
    },
    {
      id: 'Status',
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => {
        const status = row.original.status;
        if (!status)
          return (
            <div className="text-center">
              <Badge variant="secondary">Unbekannt</Badge>
            </div>
          );
        return (
          <div className="text-center">
            <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>
          </div>
        );
      },
    },
    {
      id: 'Datum',
      accessorKey: 'orderDate', // Use the consistent date field
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Datum
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const date = row.original.orderDate; // Use the consistent date field
        if (!date) return <div className="text-center">-</div>;
        const formattedDate = new Date(
          typeof date === 'string' ? date : date._seconds * 1000
        ).toLocaleDateString('de-DE');
        return <div className="text-center font-medium">{formattedDate}</div>;
      },
    },
    {
      id: 'Umsatz',
      accessorKey: 'totalAmountPaidByBuyer',
      header: () => <div className="text-center">Umsatz</div>,
      cell: ({ row }) => {
        const amount = row.original.totalAmountPaidByBuyer / 100;
        const formatted = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(amount);
        return <div className="text-center font-mono">{formatted}</div>;
      },
    },
  ];

  const {
    isChecking,
    isAuthorized,
    uid,
    view, // view-State wieder aus dem Hook holen
    setView, // setView-Funktion wieder aus dem Hook holen
    missingFields,
    userData,
  } = useCompanyDashboard(); // Hook-Aufruf. isChecking und isAuthorized werden jetzt vom Layout behandelt.

  // Get the company name from the already fetched user data to pass to the drawer.
  const companyName = userData?.companyName || userData?.step2?.companyName || 'Ihre Firma';

  // Sidebar State
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sidebar Navigation Items
  const navigationItems = [
    { id: 'dashboard', label: 'Übersicht', icon: FiGrid },
    { id: 'calendar', label: 'Kalender', icon: FiCalendar },
    { id: 'finance', label: 'Finanzen', icon: FiDollarSign },
    { id: 'reviews', label: 'Bewertungen', icon: FiMessageSquare },
    { id: 'profile', label: 'Profil', icon: FiUser },
    { id: 'settings', label: 'Einstellungen', icon: FiSettings },
  ];

  // NEU: State für Auftragsdaten
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  // NEU: State für automatische Metriken
  const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  // NEU: State für die Sidebar
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // NEU: Handler, um einen Auftrag auszuwählen und die Sidebar zu öffnen
  const handleRowClick = (order: OrderData) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  // NEU: Handler, um die Sidebar zu schließen und die Auswahl aufzuheben
  const handleDrawerChange = (isOpen: boolean) => {
    setIsDrawerOpen(isOpen);
    if (!isOpen) {
      setSelectedOrder(null);
    }
  };

  // NEU: Effekt zum Laden der Auftragsdaten
  useEffect(() => {
    if (uid) {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          // Verwende die neue HTTP-Funktion
          const result = await callHttpsFunction('getProviderOrders', { providerId: uid }, 'GET');
          setOrders(result.orders || []);
        } catch (error) {
          console.error('Fehler beim Laden der Aufträge für die Tabelle:', error);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [uid]);

  // NEU: Effekt zum Berechnen der Company Metriken
  useEffect(() => {
    if (uid) {
      const fetchMetrics = async () => {
        setLoadingMetrics(true);
        try {
          const metrics = await calculateCompanyMetrics(uid);
          setCompanyMetrics(metrics);
        } catch (error) {
          console.error('Fehler beim Berechnen der Company Metriken:', error);
        } finally {
          setLoadingMetrics(false);
        }
      };
      fetchMetrics();
    }
  }, [uid]);
  // Effekt, um die Ansicht basierend auf dem URL-Parameter zu synchronisieren
  useEffect(() => {
    const viewFromUrl = searchParams?.get('view');
    if (viewFromUrl === 'settings' && view !== 'settings') {
      setView('settings');
    } else if (!viewFromUrl && view !== 'dashboard') {
      // Wenn kein view-Parameter vorhanden ist, zur Dashboard-Ansicht wechseln
      setView('dashboard');
    }
  }, [searchParams, view, setView]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navigationItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      activeView === item.id
                        ? 'bg-[#14ad9f] text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex h-full flex-col bg-white border-r border-gray-200">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">{companyName}</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeView === item.id
                      ? 'bg-[#14ad9f] text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden mr-3"
                  onClick={() => setSidebarOpen(true)}
                >
                  <FiMenu className="h-5 w-5" />
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">
                  {navigationItems.find(item => item.id === activeView)?.label || 'Übersicht'}
                </h1>
              </div>
              <p className="text-lg text-gray-600 mt-1 ml-0 md:ml-0">{companyName}</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              <SectionCards />
              {uid && <ChartAreaInteractive companyUid={uid} />}
              <DataTable
                columns={columns}
                data={orders}
                isLoading={loadingOrders}
                onRowClick={handleRowClick}
              />
              <div className="text-center">
                <Link
                  href={`/dashboard/company/${uid}/orders/overview`}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129a8f]"
                >
                  Alle Aufträge anzeigen
                </Link>
              </div>
            </div>
          )}

          {activeView === 'calendar' && uid && (
            <CompanyCalendar companyUid={uid} selectedOrderId={selectedOrder?.id} />
          )}

          {activeView === 'finance' && uid && <FinanceComponent companyUid={uid} />}

          {activeView === 'reviews' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Bewertungen verwalten</h2>
                <p className="text-gray-600 mt-2">
                  Antworten Sie auf Kundenbewertungen und verwalten Sie Ihr Feedback
                </p>
              </div>
              {uid && userData?.companyName && (
                <CompanyReviewManagement
                  companyId={uid}
                  companyName={userData.companyName || userData.step2?.companyName || 'Ihre Firma'}
                />
              )}
            </div>
          )}

          {activeView === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Firmenprofil</h2>
                <p className="text-gray-600 mt-2">Verwalten Sie Ihr Unternehmensprofil</p>
              </div>
              <div className="text-center py-12">
                <FiUser className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Profilverwaltung</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Kommt bald - Profilverwaltung wird hier verfügbar sein
                </p>
              </div>
            </div>
          )}

          {activeView === 'settings' && (
            <SettingsPage userData={userData} onDataSaved={() => setActiveView('dashboard')} />
          )}
        </main>
      </div>

      {/* Order Summary Drawer */}
      <OrderSummaryDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onOpenChange={handleDrawerChange}
        providerName={companyName}
      />
    </div>
  );
}
