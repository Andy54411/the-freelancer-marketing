'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2 } from 'lucide-react';
import { Customer } from '../AddCustomerModal';
import { InvoiceData, InvoiceStatusHelper } from '@/types/invoiceTypes';

interface CustomerInvoiceCardProps {
  customer: Customer;
  invoices: InvoiceData[];
  loading: boolean;
}

export function CustomerInvoiceCard({ customer, invoices, loading }: CustomerInvoiceCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {customer.isSupplier ? 'Rechnungen & Ausgaben' : 'Rechnungshistorie'}
        </CardTitle>
        <CardDescription>
          {customer.isSupplier
            ? `Alle Rechnungen und Ausgaben für ${customer.name}`
            : `Alle Rechnungen für ${customer.name}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#14ad9f]" />
            <p className="text-sm text-gray-500 mt-2">Lade Rechnungen...</p>
          </div>
        ) : invoices.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {invoices.map(invoice => (
              <div
                key={invoice.id}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{invoice.invoiceNumber}</span>
                    <Badge
                      variant={
                        invoice.status === 'paid'
                          ? 'default'
                          : invoice.status === 'draft' || invoice.status === 'finalized'
                            ? 'secondary'
                            : invoice.status === 'overdue'
                              ? 'destructive'
                              : 'outline'
                      }
                      className={
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                          : ''
                      }
                    >
                      {InvoiceStatusHelper.getStatusLabel(invoice.status)}
                    </Badge>
                    {(invoice as any).isExpense && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Ausgabe
                      </Badge>
                    )}
                  </div>
                  <span className="font-semibold text-[#14ad9f]">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <div>
                    Erstellt:{' '}
                    {formatDate(
                      invoice.createdAt instanceof Date
                        ? invoice.createdAt.toISOString()
                        : invoice.createdAt
                    )}
                  </div>
                  {invoice.dueDate && <div>Fällig: {formatDate(invoice.dueDate)}</div>}
                  {(invoice as any).description && (
                    <div>Beschreibung: {(invoice as any).description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Noch keine Rechnungen vorhanden</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}