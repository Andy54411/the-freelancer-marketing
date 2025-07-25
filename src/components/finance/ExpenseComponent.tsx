'use client';

import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  netAmount: number;
  taxAmount: number;
  taxRate: number;
  category: string;
  subcategory?: string;
  date: string;
  vendor?: string;
  receiptNumber?: string;
  paymentMethod: string;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PAID';
  isRecurring: boolean;
  tags: string[];
  attachments: { id: string; filename: string; url: string }[];
  project?: { id: string; name: string };
}

interface ExpenseComponentProps {
  expenses: Expense[];
}

export default function ExpenseComponent({ expenses }: ExpenseComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const expenseColumns: ColumnDef<Expense>[] = [
    {
      accessorKey: 'title',
      header: 'Titel',
    },
    {
      accessorKey: 'category',
      header: 'Kategorie',
    },
    {
      accessorKey: 'vendor',
      header: 'Lieferant',
    },
    {
      accessorKey: 'amount',
      header: 'Bruttobetrag',
      cell: ({ row }) => formatCurrency(row.getValue('amount')),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig = {
          DRAFT: { label: 'Entwurf', variant: 'secondary' as const },
          APPROVED: { label: 'Genehmigt', variant: 'default' as const },
          REJECTED: { label: 'Abgelehnt', variant: 'destructive' as const },
          PAID: { label: 'Bezahlt', variant: 'default' as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: 'date',
      header: 'Datum',
      cell: ({ row }) => {
        const date = new Date(row.getValue('date'));
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
        <CardTitle>Ausgaben</CardTitle>
        <CardDescription>Verwalten Sie Ihre Geschäftsausgaben</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={expenseColumns} data={expenses} />
      </CardContent>
    </Card>
  );
}
