'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: 'bank_transfer' | 'credit_card' | 'cash' | 'paypal';
  reference: string;
}

interface PaymentComponentProps {
  payments: Payment[];
}

export function PaymentComponent({ payments }: PaymentComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getMethodLabel = (method: string) => {
    const methods = {
      bank_transfer: 'Banküberweisung',
      credit_card: 'Kreditkarte',
      cash: 'Bargeld',
      paypal: 'PayPal',
    };
    return methods[method as keyof typeof methods] || method;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zahlungen</CardTitle>
        <CardDescription>Übersicht über eingegangene Zahlungen</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Keine Zahlungen vorhanden</div>
          ) : (
            <div className="space-y-3">
              {payments.map(payment => (
                <div
                  key={payment.id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">Zahlung für Rechnung #{payment.invoiceId}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString('de-DE')} •{' '}
                      {getMethodLabel(payment.method)}
                    </div>
                    {payment.reference && (
                      <div className="text-sm text-muted-foreground">
                        Referenz: {payment.reference}
                      </div>
                    )}
                  </div>
                  <div className="font-medium text-green-600">{formatCurrency(payment.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
