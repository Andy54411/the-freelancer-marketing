'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName?: string;
  customerData?: any;
  grossAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
}

interface Customer {
  id: string;
  displayName: string;
  statistics: {
    totalInvoices: number;
    totalRevenue: number;
  };
}

interface FinanceOverviewProps {
  invoices: Invoice[];
  customers: Customer[];
}

export default function FinanceOverview({ invoices, customers }: FinanceOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Rechnungen</CardTitle>
          <CardDescription>Die neuesten Rechnungen im Überblick</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(invoices)
              ? invoices.slice(0, 5).map(invoice => (
                  <div key={invoice.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.customerName || invoice.customerData?.displayName || 'Unbekannt'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(invoice.grossAmount)}</div>
                      <Badge
                        variant={
                          invoice.status === 'PAID'
                            ? 'default'
                            : invoice.status === 'OVERDUE'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {invoice.status === 'PAID'
                          ? 'Bezahlt'
                          : invoice.status === 'OVERDUE'
                            ? 'Überfällig'
                            : invoice.status === 'SENT'
                              ? 'Gesendet'
                              : 'Entwurf'}
                      </Badge>
                    </div>
                  </div>
                ))
              : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Kunden</CardTitle>
          <CardDescription>Ihre wertvollsten Kunden</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(customers)
              ? customers
                  .sort((a, b) => b.statistics.totalRevenue - a.statistics.totalRevenue)
                  .slice(0, 5)
                  .map(customer => (
                    <div key={customer.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{customer.displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.statistics.totalInvoices} Rechnungen
                        </div>
                      </div>
                      <div className="font-medium">
                        {formatCurrency(customer.statistics.totalRevenue)}
                      </div>
                    </div>
                  ))
              : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
