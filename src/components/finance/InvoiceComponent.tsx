'use client';

import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerData?: any;
  amount?: number;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  type: 'STANDARD' | 'RECURRING' | 'CREDIT_NOTE' | 'ADVANCE_PAYMENT';
  invoiceDate: string;
  dueDate: string;
  deliveryDate?: string;
  serviceDate?: string;
  description?: string;
  introduction?: string;
  conclusion?: string;
  notes?: string;
}

interface InvoiceComponentProps {
  invoices: Invoice[];
}

export default function InvoiceComponent({ invoices }: InvoiceComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const invoiceColumns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'Rechnungsnummer',
    },
    {
      accessorKey: 'customerData',
      header: 'Kunde',
      cell: ({ row }) => {
        const invoice = row.original;
        return invoice.customerName || invoice.customerData?.displayName || 'Unbekannt';
      },
    },
    {
      accessorKey: 'grossAmount',
      header: 'Betrag',
      cell: ({ row }) => formatCurrency(row.getValue('grossAmount')),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig = {
          DRAFT: { label: 'Entwurf', variant: 'secondary' as const },
          SENT: { label: 'Gesendet', variant: 'default' as const },
          PAID: { label: 'Bezahlt', variant: 'default' as const },
          OVERDUE: { label: 'Überfällig', variant: 'destructive' as const },
          CANCELLED: { label: 'Storniert', variant: 'secondary' as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Fälligkeitsdatum',
      cell: ({ row }) => {
        const date = new Date(row.getValue('dueDate'));
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
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
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rechnungen</CardTitle>
        <CardDescription>Verwalten Sie Ihre Rechnungen</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={invoiceColumns} data={invoices} />
      </CardContent>
    </Card>
  );
}
