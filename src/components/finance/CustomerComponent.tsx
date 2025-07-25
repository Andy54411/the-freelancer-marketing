'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  taxNumber?: string;
  totalInvoices: number;
  totalAmount: number;
}

interface CustomerComponentProps {
  customers: Customer[];
}

export function CustomerComponent({ customers }: CustomerComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Kunden</CardTitle>
            <CardDescription>Verwalten Sie Ihre Kundendaten</CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Kunde
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Keine Kunden vorhanden</div>
          ) : (
            <div className="space-y-3">
              {customers.map(customer => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                        <div className="text-sm text-muted-foreground">{customer.address}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(customer.totalAmount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.totalInvoices} Rechnungen
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
