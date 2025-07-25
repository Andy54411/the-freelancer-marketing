'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CASH' | 'PAYPAL' | 'SEPA_DIRECT_DEBIT';
  reference?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  bankAccount?: string;
  transactionId?: string;
  fees?: number;
  notes?: string;
}

interface PaymentComponentProps {
  payments: Payment[];
}

export default function PaymentComponent({ payments }: PaymentComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zahlungen</CardTitle>
        <CardDescription>Übersicht über eingegangene Zahlungen</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.isArray(payments)
            ? payments.map(payment => (
                <div
                  key={payment.id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">Zahlung für Rechnung #{payment.invoiceId}</div>
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        const date = new Date(payment.date);
                        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
                      })()}{' '}
                      • {payment.method}
                    </div>
                    {payment.reference && (
                      <div className="text-sm text-muted-foreground">
                        Referenz: {payment.reference}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className="font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </div>
                    <Badge
                      variant={
                        payment.status === 'CONFIRMED'
                          ? 'default'
                          : payment.status === 'FAILED'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {payment.status === 'CONFIRMED'
                        ? 'Bestätigt'
                        : payment.status === 'FAILED'
                          ? 'Fehlgeschlagen'
                          : payment.status === 'PENDING'
                            ? 'Ausstehend'
                            : 'Storniert'}
                    </Badge>
                  </div>
                </div>
              ))
            : null}
        </div>
      </CardContent>
    </Card>
  );
}
