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
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { OrderSummaryDrawer } from '@/components/OrderSummaryDrawer';
import CompanyCalendar from '@/components/CompanyCalendar';
import { Button } from '@/components/ui/button';
import { calculateCompanyMetrics, type CompanyMetrics } from '@/lib/companyMetrics';
import CompanyReviewManagement from '@/components/CompanyReviewManagement';
import FinanceComponent from '@/components/FinanceComponent';
import { useCompanyOnboardingCheck } from '@/hooks/useCompanyOnboardingCheck';
import OnboardingBanner from '@/components/onboarding/OnboardingBanner';
import OutstandingInvoicesCard from '@/components/dashboard/OutstandingInvoicesCard';
import VatPreRegistrationCard from '@/components/dashboard/VatPreRegistrationCard';
import BankAccountCard from '@/components/dashboard/BankAccountCard';
import AccountingScoreCard from '@/components/dashboard/AccountingScoreCard';
import ProductsServicesCard from '@/components/dashboard/ProductsServicesCard';
import ActivityHistoryCard from '@/components/dashboard/ActivityHistoryCard';
import TopExpensesCard from '@/components/dashboard/TopExpensesCard';
import TopCustomersCard from '@/components/dashboard/TopCustomersCard';
import ContractAlertsCard from '@/components/dashboard/ContractAlertsCard';
import DraggableDashboardGrid, {
  DashboardComponent,
} from '@/components/dashboard/DraggableDashboardGrid';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';

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

  const {
    isChecking,
    isAuthorized,
    uid,
    view,
    setView,
    missingFields,
    userData,
    needsOnboarding,
    completionPercentage,
    currentStep,
  } = useCompanyDashboard();

  const { user: authUser, firebaseUser } = useAuth();

  // Ermittle ob User ein Mitarbeiter ist (nicht Firmeninhaber)
  // user_type 'mitarbeiter' UND companyId (aus Custom Claims)
  const isEmployee = authUser?.user_type === 'mitarbeiter' && authUser?.companyId === uid;

  const [financialData, setFinancialData] = useState({
    netRevenue: 0,
    totalExpenses: 0,
    grossProfitBeforeTax: 0,
    vatAmount: 0,
  });

  const handleFinancialDataChange = React.useCallback(
    (data: {
      netRevenue: number;
      totalExpenses: number;
      grossProfitBeforeTax: number;
      vatAmount: number;
    }) => {
      setFinancialData(data);
    },
    []
  );

  const companyName = userData?.companyName || userData?.step2?.companyName || 'Ihre Firma';

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Dashboard Configuration Hook
  // Dashboard Configuration Hook
  const {
    components: dashboardComponents,
    setComponents: setDashboardComponents,
    isLoading: isLoadingConfig,
  } = useDashboardConfig(uid || '');

  // Dashboard-Komponenten mit echten React-Komponenten verknüpfen - ALLE KOMPONENTEN
  const getDashboardComponentsWithContent = React.useCallback((): DashboardComponent[] => {
    if (!dashboardComponents) return [];

    return dashboardComponents.map(comp => ({
      ...comp,
      component: (() => {
        switch (comp.id) {
          case 'onboarding-banner':
            // Nur für Firmeninhaber anzeigen, nicht für Mitarbeiter
            return (
              uid && !isEmployee && (
                <OnboardingBanner
                  key="onboarding-banner"
                  companyUid={uid}
                  needsOnboarding={needsOnboarding}
                  completionPercentage={completionPercentage}
                  currentStep={currentStep}
                  isLoading={isChecking}
                />
              )
            );
          case 'section-cards':
            return <SectionCards key="section-cards" />;
          case 'chart-interactive':
            return (
              <div key="chart-interactive" className="bg-white rounded-lg border shadow-sm p-6">
                {uid && isAuthorized && !isChecking ? (
                  <ChartAreaInteractive
                    companyUid={uid}
                    onFinancialDataChangeAction={handleFinancialDataChange}
                  />
                ) : (
                  <div className="flex h-[350px] w-full items-center justify-center">
                    <div className="text-gray-500">Lade Diagramm...</div>
                  </div>
                )}
              </div>
            );
          case 'outstanding-invoices':
            return <OutstandingInvoicesCard key="outstanding-invoices" />;
          case 'vat-pre-registration':
            return <VatPreRegistrationCard key="vat-pre-registration" />;
          case 'top-expenses':
            return <TopExpensesCard key="top-expenses" />;
          case 'top-customers':
            return <TopCustomersCard key="top-customers" />;
          case 'bank-account':
            return uid ? <BankAccountCard key="bank-account" companyId={uid} /> : null;
          case 'accounting-score':
            return uid ? <AccountingScoreCard key="accounting-score" companyId={uid} /> : null;
          case 'products-services':
            return <ProductsServicesCard key="products-services" />;
          case 'activity-history':
            return <ActivityHistoryCard key="activity-history" />;
          case 'contract-alerts':
            return <ContractAlertsCard key="contract-alerts" />;
          case 'orders-table':
            return (
              <div key="orders-table" className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Aufträge Übersicht</h3>
                <DataTable
                  columns={columns}
                  data={orders || []}
                  isLoading={loadingOrders}
                  onRowClick={(order: OrderData) => {
                    setSelectedOrder(order);
                    setIsDrawerOpen(true);
                  }}
                />
              </div>
            );
          case 'view-all-orders':
            return (
              uid && (
                <div key="view-all-orders" className="text-center p-6">
                  <Link
                    href={`/dashboard/company/${uid}/orders/overview`}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129a8f]"
                  >
                    Alle Aufträge anzeigen
                  </Link>
                </div>
              )
            );
          default:
            return <div key={comp.id}>Unbekannte Komponente: {comp.id}</div>;
        }
      })(),
    }));
  }, [
    dashboardComponents,
    uid,
    needsOnboarding,
    completionPercentage,
    currentStep,
    isChecking,
    isAuthorized,
    isEmployee,
    handleFinancialDataChange,
    orders,
    loadingOrders,
  ]);

  const handleRowClick = (order: OrderData) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleDrawerChange = (isOpen: boolean) => {
    setIsDrawerOpen(isOpen);
    if (!isOpen) {
      setSelectedOrder(null);
    }
  };

  useEffect(() => {
    if (uid && isAuthorized) {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          const result = await callHttpsFunction('getProviderOrders', { providerId: uid }, 'GET');

          if (result.orders && result.orders.length > 0) {
            const transformedOrders = result.orders.map((order: any) => ({
              ...order,
              id: order.id || `order-${Date.now()}`,
              orderDate: order.orderDate?._seconds
                ? { _seconds: order.orderDate._seconds, _nanoseconds: order.orderDate._nanoseconds }
                : order.orderDate,
            }));

            setOrders(transformedOrders);
          } else {
            setOrders([]);
          }
        } catch (error) {
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    } else {
      setLoadingOrders(false);
    }
  }, [uid, isAuthorized, authUser?.uid]);

  useEffect(() => {
    if (uid) {
      const fetchMetrics = async () => {
        setLoadingMetrics(true);
        try {
          const metrics = await calculateCompanyMetrics(uid);
          setCompanyMetrics(metrics);
        } catch (error) {
        } finally {
          setLoadingMetrics(false);
        }
      };
      fetchMetrics();
    }
  }, [uid]);

  useEffect(() => {
    const viewFromUrl = searchParams?.get('view');
    if (viewFromUrl === 'settings' && view !== 'settings') {
      setView('settings');
    } else if (!viewFromUrl && view !== 'dashboard') {
      setView('dashboard');
    }
  }, [searchParams, view, setView]);

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Vollständig Draggable Dashboard - ALLE Komponenten */}
            {!isLoadingConfig ? (
              <DraggableDashboardGrid
                components={getDashboardComponentsWithContent()}
                onReorder={setDashboardComponents}
                className=""
              />
            ) : (
              <div className="space-y-6">
                {/* Loading Skeleton für alle Komponenten */}
                {Array.from({ length: 13 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg border shadow-sm p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'calendar':
        return (
          <>
            {uid && isAuthorized && !isChecking && (
              <CompanyCalendar companyUid={uid} selectedOrderId={selectedOrder?.id} />
            )}
          </>
        );

      case 'finance':
        return (
          <>{uid && isAuthorized && !isChecking && <FinanceComponent companyUid={uid || ''} />}</>
        );

      case 'banking':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Banking Übersicht</h2>
              <p className="text-gray-600 mt-2">
                Verwalten Sie Ihre Bankverbindungen und Transaktionen
              </p>
            </div>
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">Banking Dashboard</h3>
              <p className="mt-1 text-sm text-gray-500">
                Banking-Funktionen werden hier verfügbar sein
              </p>
            </div>
          </div>
        );

      case 'reviews':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Bewertungen verwalten</h2>
              <p className="text-gray-600 mt-2">
                Antworten Sie auf Kundenbewertungen und verwalten Sie Ihr Feedback
              </p>
            </div>
            {uid && isAuthorized && !isChecking && userData?.companyName && (
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

      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}
      <OrderSummaryDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onOpenChange={handleDrawerChange}
        providerName={companyName}
      />
    </>
  );
}
