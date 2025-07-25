'use client';

import React from 'react';
import { Eye, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface Customer {
  id: string;
  customerNumber: string;
  type: 'INDIVIDUAL' | 'BUSINESS';
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  displayName: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;
  statistics: {
    totalInvoices: number;
    totalRevenue: number;
    averageOrderValue: number;
    outstandingAmount: number;
    paymentDelayAverage: number;
  };
  notes?: string;
  tags: string[];
}

interface CustomerComponentProps {
  customers: Customer[];
}

export default function CustomerComponent({ customers }: CustomerComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const customerColumns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'displayName',
      header: 'Name',
    },
    {
      accessorKey: 'customerNumber',
      header: 'Kundennummer',
    },
    {
      accessorKey: 'type',
      header: 'Typ',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return type === 'BUSINESS' ? 'Unternehmen' : 'Privatperson';
      },
    },
    {
      accessorKey: 'statistics',
      header: 'Rechnungen',
      cell: ({ row }) => {
        const stats = row.getValue('statistics') as Customer['statistics'];
        return stats.totalInvoices;
      },
    },
    {
      accessorKey: 'statistics',
      header: 'Gesamtumsatz',
      cell: ({ row }) => {
        const stats = row.getValue('statistics') as Customer['statistics'];
        return formatCurrency(stats.totalRevenue);
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig = {
          ACTIVE: { label: 'Aktiv', variant: 'default' as const },
          INACTIVE: { label: 'Inaktiv', variant: 'secondary' as const },
          BLOCKED: { label: 'Gesperrt', variant: 'destructive' as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Aktionen',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kunden</CardTitle>
        <CardDescription>Verwalten Sie Ihre Kundendaten</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={customerColumns} data={customers} />
      </CardContent>
    </Card>
  );
}
