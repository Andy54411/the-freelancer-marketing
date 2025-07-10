'use client';

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { SectionCards } from "@/components/section-cards";
import Link from "next/link";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SettingsPage from "@/components/SettingsPage";
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/clients";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Grid as FiGrid, Calendar as FiCalendar } from "lucide-react";
import { OrderSummaryDrawer } from "@/components/OrderSummaryDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompanyCalendar from "@/components/CompanyCalendar";
import { Button } from "@/components/ui/button";

// Typ für die Auftragsdaten, die von der API kommen
type OrderData = {
  id: string;
  selectedSubcategory: string;
  customerName: string;
  status: string;
  orderDate?: { _seconds: number; _nanoseconds: number } | string; // Use the consistent date field from the backend
  totalAmountPaidByBuyer: number;
  uid: string; // Anbieter-UID
  orderedBy: string; // Kunden-UID, für Chat-Funktionalität benötigt
};

const isNonEmptyString = (val: unknown): val is string =>
  typeof val === "string" && val.trim() !== "";

export default function Page() {
  const searchParams = useSearchParams();

  // Spaltendefinitionen für die DataTable
  const columns: ColumnDef<OrderData>[] = [
    {
      id: "Dienstleistung",
      accessorKey: "selectedSubcategory",
      header: () => <div className="text-center">Dienstleistung</div>,
      cell: ({ row }) => {
        const order = row.original;
        // Link zur spezifischen Auftrags-Chat-Seite
        return (
          <div className="text-center">
            <Link href={`/dashboard/company/${order.uid}/inbox/chat/${order.id}`} className="font-medium text-[#14ad9f] hover:underline">
              {order.selectedSubcategory}
            </Link>
          </div>
        );
      },
    },
    {
      id: "Kunde",
      accessorKey: "customerName",
      header: () => <div className="text-center">Kunde</div>,
      cell: ({ row }) => <div className="text-center">{row.original.customerName}</div>,
    },
    {
      id: "Status",
      accessorKey: "status",
      header: () => <div className="text-center">Status</div>,
      cell: ({ row }) => {
        const status = row.original.status;
        if (!status) return <div className="text-center"><Badge variant="secondary">Unbekannt</Badge></div>;
        return <div className="text-center"><Badge variant="outline">{status.replace(/_/g, ' ')}</Badge></div>;
      },
    },
    {
      id: "Datum",
      accessorKey: "orderDate", // Use the consistent date field
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Datum
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
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
      id: "Umsatz",
      accessorKey: "totalAmountPaidByBuyer",
      header: () => <div className="text-center">Umsatz</div>,
      cell: ({ row }) => {
        const amount = row.original.totalAmountPaidByBuyer / 100;
        const formatted = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
        return <div className="text-center font-mono">{formatted}</div>;
      },
    },
  ];

  const {
    isChecking,
    isAuthorized,
    uid,
    view,      // view-State wieder aus dem Hook holen
    setView, // setView-Funktion wieder aus dem Hook holen
    missingFields,
    userData,
  } = useCompanyDashboard(); // Hook-Aufruf. isChecking und isAuthorized werden jetzt vom Layout behandelt.

  // Get the company name from the already fetched user data to pass to the drawer.
  const companyName = userData?.companyName || userData?.step2?.companyName || 'Ihre Firma';

  // NEU: State für Auftragsdaten
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
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
          // Add types for the callable function for type safety.
          const getProviderOrders = httpsCallable<{ providerId: string }, { orders: OrderData[] }>(functions, 'getProviderOrdersFixed');
          const result = await getProviderOrders({ providerId: uid });
          // The @ts-ignore is no longer needed as the backend now returns the correct data structure.
          setOrders(result.data.orders || []);
        } catch (error) {
          console.error("Fehler beim Laden der Aufträge für die Tabelle:", error);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [uid]);
  // Effekt, um die Ansicht basierend auf dem URL-Parameter zu synchronisieren
  useEffect(() => {
    const viewFromUrl = searchParams.get('view');
    if (viewFromUrl === 'settings' && view !== 'settings') {
      setView('settings');
    } else if (!viewFromUrl && view !== 'dashboard') {
      // Wenn kein view-Parameter vorhanden ist, zur Dashboard-Ansicht wechseln
      setView('dashboard');
    }
  }, [searchParams, view, setView]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 pb-4 md:gap-6 md:px-6 md:pb-6">
      {view === 'dashboard' ? (
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-fit">
            <TabsTrigger value="dashboard">
              <FiGrid className="mr-2 h-4 w-4" />
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <FiCalendar className="mr-2 h-4 w-4" />
              Kalender
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <div className="flex flex-col gap-4 md:gap-6">
              <SectionCards />
              {uid && <ChartAreaInteractive companyUid={uid} />}
              <DataTable columns={columns} data={orders} isLoading={loadingOrders} onRowClick={handleRowClick} />
              <div className="mt-8 text-center">
                <Link
                  href={`/dashboard/company/${uid}/orders/overview`}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129a8f]"
                >
                  Alle eingegangenen Aufträge anzeigen
                </Link>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            {uid && <CompanyCalendar companyUid={uid} selectedOrderId={selectedOrder?.id} />}
          </TabsContent>
        </Tabs>
      ) : (
        <SettingsPage userData={userData} onDataSaved={() => setView('dashboard')} />
      )}
      {/* NEU: Die Sidebar-Komponente, die außerhalb des Haupt-Renderings liegt */}
      <OrderSummaryDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onOpenChange={handleDrawerChange}
        providerName={companyName}
      />
    </div>
  );
}
