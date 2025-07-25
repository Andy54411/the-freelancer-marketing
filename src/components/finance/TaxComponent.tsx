'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TaxRecord {
  id: string;
  type: 'USTVA' | 'EÜR' | 'GEWERBESTEUER' | 'KORPERSCHAFTSTEUER';
  period: string;
  year: number;
  quarter?: number;
  month?: number;
  amount: number;
  taxAmount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'PAID' | 'OVERDUE';
  dueDate: string;
  submissionDate?: string;
  paymentDate?: string;
  filingMethod: 'PAPER' | 'ELSTER' | 'API';
}

interface TaxComponentProps {
  taxes: TaxRecord[];
}

export default function TaxComponent({ taxes }: TaxComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Steuern</CardTitle>
        <CardDescription>Verwalten Sie Ihre Steuerpflichten und Anmeldungen</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.isArray(taxes)
            ? taxes.map(tax => (
                <div
                  key={tax.id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{tax.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {tax.period} ({tax.year}){tax.quarter && ` • Q${tax.quarter}`}
                      {tax.month && ` • Monat ${tax.month}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Fällig bis{' '}
                      {(() => {
                        const date = new Date(tax.dueDate);
                        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className="font-medium">{formatCurrency(tax.amount)}</div>
                    <Badge
                      variant={
                        tax.status === 'PAID'
                          ? 'default'
                          : tax.status === 'OVERDUE'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {tax.status === 'PAID'
                        ? 'Bezahlt'
                        : tax.status === 'SUBMITTED'
                          ? 'Eingereicht'
                          : tax.status === 'OVERDUE'
                            ? 'Überfällig'
                            : 'Entwurf'}
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
