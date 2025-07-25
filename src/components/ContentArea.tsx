'use client';

import React from 'react';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable } from '@/components/data-table';
import { SectionCards } from '@/components/section-cards';
import CompanyCalendar from '@/components/CompanyCalendar';
import FinanceComponent from '@/components/FinanceComponent';
import CompanyReviewManagement from '@/components/CompanyReviewManagement';
import SettingsPage from '@/components/SettingsPage';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Grid, Users, BarChart3, User } from 'lucide-react';
import Link from 'next/link';

// Types
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

interface ContentAreaProps {
  activeView: string;
  uid: string;
  orders: OrderData[];
  loadingOrders: boolean;
  userData: any;
  selectedOrder: OrderData | null;
  onRowClick: (order: OrderData) => void;
  onDataSaved: () => void;
}

export default function ContentArea({
  activeView,
  uid,
  orders,
  loadingOrders,
  userData,
  selectedOrder,
  onRowClick,
  onDataSaved,
}: ContentAreaProps) {
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

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Übersicht</h1>
              <p className="text-gray-600">Willkommen zurück! Hier ist Ihre Geschäftsübersicht.</p>
            </div>

            <SectionCards />

            {uid && <ChartAreaInteractive companyUid={uid} />}

            <div className="bg-white rounded-lg border shadow-sm">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Aktuelle Aufträge</h3>
                <p className="text-sm text-gray-500">Ihre neuesten Kundenaufträge</p>
              </div>
              <div className="p-6">
                <DataTable
                  columns={columns}
                  data={orders}
                  isLoading={loadingOrders}
                  onRowClick={onRowClick}
                />
              </div>
            </div>

            <div className="text-center">
              <Link
                href={`/dashboard/company/${uid}/orders/overview`}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129a8f] transition-colors"
              >
                Alle Aufträge anzeigen
              </Link>
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
              <p className="text-gray-600">Verwalten Sie Ihre Termine und Aufträge</p>
            </div>
            {uid && <CompanyCalendar companyUid={uid} selectedOrderId={selectedOrder?.id} />}
          </div>
        );

      case 'finance':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Finanzverwaltung</h1>
              <p className="text-gray-600">
                Übersicht über Ihre Finanzen, Rechnungen und Zahlungen
              </p>
            </div>
            {uid && <FinanceComponent companyUid={uid} />}
          </div>
        );

      case 'customers':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kundenverwaltung</h1>
              <p className="text-gray-600">Verwalten Sie Ihre Kundenbeziehungen</p>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-12">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Kundenverwaltung</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Kommt bald - Kundenverwaltung wird hier verfügbar sein
                </p>
              </div>
            </div>
          </div>
        );

      case 'reviews':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bewertungen verwalten</h1>
              <p className="text-gray-600">
                Antworten Sie auf Kundenbewertungen und verwalten Sie Ihr Feedback
              </p>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-6">
              {uid && userData?.companyName && (
                <CompanyReviewManagement
                  companyId={uid}
                  companyName={userData.companyName || userData.step2?.companyName || 'Ihre Firma'}
                />
              )}
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytik & Berichte</h1>
              <p className="text-gray-600">Detaillierte Einblicke in Ihr Geschäft</p>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-12">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Erweiterte Analytik</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Kommt bald - Detaillierte Berichte und Analytik werden hier verfügbar sein
                </p>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Firmenprofil</h1>
              <p className="text-gray-600">Verwalten Sie Ihr Unternehmensprofil</p>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-12">
              <div className="text-center">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Profilverwaltung</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Kommt bald - Profilverwaltung wird hier verfügbar sein
                </p>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
              <p className="text-gray-600">Konfigurieren Sie Ihr Konto und Ihre Präferenzen</p>
            </div>
            <SettingsPage userData={userData} onDataSaved={onDataSaved} />
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Willkommen zurück!</p>
            </div>
          </div>
        );
    }
  };

  return <div className="max-w-7xl mx-auto">{renderContent()}</div>;
}
