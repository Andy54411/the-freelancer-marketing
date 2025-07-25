'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calculator, PieChart } from 'lucide-react';

interface TaxData {
  quarter: string;
  revenue: number;
  expenses: number;
  taxableIncome: number;
  vatOwed: number;
  incomeTaxOwed: number;
}

interface TaxComponentProps {
  taxData: TaxData[];
}

export function TaxComponent({ taxData }: TaxComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const currentYear = new Date().getFullYear();
  const totalVatOwed = taxData.reduce((sum, data) => sum + data.vatOwed, 0);
  const totalIncomeTaxOwed = taxData.reduce((sum, data) => sum + data.incomeTaxOwed, 0);

  return (
    <div className="space-y-6">
      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Umsatzsteuer {currentYear}</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalVatOwed)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Einkommensteuer {currentYear}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncomeTaxOwed)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Steuerliche Belastung</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalVatOwed + totalIncomeTaxOwed)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly Tax Data */}
      <Card>
        <CardHeader>
          <CardTitle>Steuerliche Übersicht {currentYear}</CardTitle>
          <CardDescription>
            Quartalsweise Aufstellung Ihrer steuerlichen Verpflichtungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taxData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Steuerdaten vorhanden
              </div>
            ) : (
              <div className="space-y-3">
                {taxData.map((data, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{data.quarter}</div>
                        <div className="text-sm text-muted-foreground">
                          Umsatz: {formatCurrency(data.revenue)} | Ausgaben:{' '}
                          {formatCurrency(data.expenses)}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground">USt: </span>
                          <span className="font-medium">{formatCurrency(data.vatOwed)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">ESt: </span>
                          <span className="font-medium">{formatCurrency(data.incomeTaxOwed)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
