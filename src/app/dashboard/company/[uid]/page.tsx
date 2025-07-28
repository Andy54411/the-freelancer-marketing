'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { SectionCards } from '@/components/section-cards';
import { callHttpsFunction } from '@/lib/httpsFunctions';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SettingsPage from '@/components/SettingsPage';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { OrderSummaryDrawer } from '@/components/OrderSummaryDrawer';
import CompanyCalendar from '@/components/CompanyCalendar';
import { Button } from '@/components/ui/button';
import { calculateCompanyMetrics, type CompanyMetrics } from '@/lib/companyMetrics';
import CompanyReviewManagement from '@/components/CompanyReviewManagement';
import FinanceComponent from '@/components/FinanceComponent';

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
      accessorKey: 'orderDate',
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
        const date = row.original.orderDate;
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

  const { isChecking, isAuthorized, uid, view, setView, missingFields, userData } =
    useCompanyDashboard();

  // NEU: Direkter Zugriff auf Auth-Context für Debugging
  const { user: authUser, firebaseUser } = useAuth();

  // Get the company name from the already fetched user data to pass to the drawer.
  const companyName = userData?.companyName || userData?.step2?.companyName || 'Ihre Firma';

  // State für Auftragsdaten
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Handler, um einen Auftrag auszuwählen und die Sidebar zu öffnen
  const handleRowClick = (order: OrderData) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  // Handler, um die Sidebar zu schließen und die Auswahl aufzuheben
  const handleDrawerChange = (isOpen: boolean) => {
    setIsDrawerOpen(isOpen);
    if (!isOpen) {
      setSelectedOrder(null);
    }
  };

  // Effekt zum Laden der Auftragsdaten
  useEffect(() => {
    // KRITISCHE DEBUG-INFORMATION
    console.log('🔍 AUTHORIZATION DEBUG:');
    console.log('🆔 URL UID:', uid);
    console.log('👤 AuthUser UID:', authUser?.uid);
    console.log('🔥 FirebaseUser UID:', firebaseUser?.uid);
    console.log('🔑 isAuthorized:', isAuthorized);
    console.log('⏳ isChecking:', isChecking);
    console.log('🎯 UID Match:', authUser?.uid === uid);

    if (uid && isAuthorized) {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          console.log('🔄 Fetching orders for provider:', uid);
          console.log('🔑 Current user authorized:', isAuthorized);
          console.log('🆔 Current user UID vs URL UID:', { uid });
          const result = await callHttpsFunction('getProviderOrders', { providerId: uid }, 'GET');
          console.log('📊 API Response:', result);
          console.log('📋 Orders array:', result.orders);
          console.log('📏 Orders length:', result.orders?.length || 0);

          if (result.orders && result.orders.length > 0) {
            console.log('📄 First order structure:', result.orders[0]);
            console.log('🆔 First order ID:', result.orders[0]?.id);
            console.log('💰 First order revenue:', result.orders[0]?.totalAmountPaidByBuyer);
          }

          setOrders(result.orders || []);
          console.log('✅ Orders state updated');
        } catch (error) {
          console.error('❌ Fehler beim Laden der Aufträge für die Tabelle:', error);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    } else {
      console.log('⚠️ Not fetching orders - uid:', uid, 'isAuthorized:', isAuthorized);
      console.log('📋 Auth Debug - authUser?.uid:', authUser?.uid, 'URL uid:', uid);
      setLoadingOrders(false);
    }
  }, [uid, isAuthorized, authUser?.uid]);

  // Effekt zum Berechnen der Company Metriken
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
      setView('dashboard');
    }
  }, [searchParams, view, setView]);

  // Render content based on current view
  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="flex flex-col gap-4 md:gap-6">
            <SectionCards />
            {uid && <ChartAreaInteractive companyUid={uid} />}
            <DataTable
              columns={columns}
              data={orders}
              isLoading={loadingOrders}
              onRowClick={handleRowClick}
            />
            {/* Debug Info */}
            <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
              <div className="font-bold mb-2">🐛 ERWEITERTE DEBUG INFORMATIONEN:</div>
              <div>📊 Orders count: {orders.length}</div>
              <div>⏳ Loading Orders: {loadingOrders ? 'Yes' : 'No'}</div>
              <div>🔄 IsChecking: {isChecking ? 'Yes' : 'No'}</div>
              <div>🆔 URL UID: {uid}</div>
              <div>👤 Auth User UID: {authUser?.uid}</div>
              <div>🔥 Firebase User UID: {firebaseUser?.uid}</div>
              <div>🔑 Is Authorized: {isAuthorized ? 'Yes' : 'No'}</div>
              <div>🎯 UID Match: {authUser?.uid === uid ? 'Yes' : 'No'}</div>
              <div>📧 User Email: {authUser?.email || firebaseUser?.email}</div>
              <div>✅ User Verified: {firebaseUser?.emailVerified ? 'Yes' : 'No'}</div>
              <div className="mt-2 p-2 bg-yellow-100 rounded">
                <div>🔍 WARUM KEINE DATEN?</div>
                {!uid && <div>❌ Keine UID vorhanden</div>}
                {!isAuthorized && <div>❌ Nicht autorisiert</div>}
                {uid && isAuthorized && orders.length === 0 && !loadingOrders && (
                  <div>❌ API Call erfolgreich aber leeres Array zurückgegeben</div>
                )}
                {uid && isAuthorized && loadingOrders && <div>⏳ Lädt noch...</div>}
              </div>
              {orders.length > 0 && (
                <div className="mt-2 p-2 bg-green-100 rounded">
                  📄 First order: {JSON.stringify(orders[0], null, 2)}
                </div>
              )}
            </div>
            <div className="mt-8 text-center">
              <Link
                href={`/dashboard/company/${uid}/orders/overview`}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129a8f]"
              >
                Alle Aufträge anzeigen
              </Link>
            </div>
          </div>
        );

      case 'calendar':
        return (
          <>{uid && <CompanyCalendar companyUid={uid} selectedOrderId={selectedOrder?.id} />}</>
        );

      case 'finance':
        return <>{uid && <FinanceComponent companyUid={uid} />}</>;

      case 'reviews':
        return (
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
        );

      case 'profile':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Firmenprofil</h2>
              <p className="text-gray-600 mt-2">Verwalten Sie Ihr Unternehmensprofil</p>
            </div>
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">Profilverwaltung</h3>
              <p className="mt-1 text-sm text-gray-500">
                Kommt bald - Profilverwaltung wird hier verfügbar sein
              </p>
            </div>
          </div>
        );

      case 'settings':
        return (
          <SettingsPage userData={userData} onDataSaved={() => console.log('Settings updated')} />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}

      {/* OrderSummaryDrawer außerhalb des Haupt-Renderings */}
      <OrderSummaryDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onOpenChange={handleDrawerChange}
        providerName={companyName}
      />
    </>
  );
}
