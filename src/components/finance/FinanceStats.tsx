'use client';

import React from 'react';
import { DollarSign, TrendingUp, FileText, Users, CreditCard, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  yearToDateRevenue: number;
  averageInvoiceValue: number;
  customerCount: number;
  activeCustomerCount: number;
  bankBalance: number;
  vatBalance: number;
  cashflow: {
    incoming: number;
    outgoing: number;
    net: number;
  };
}

interface FinanceStatsProps {
  stats: FinanceStats | null;
}

export default function FinanceStatsComponent({ stats }: FinanceStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats ? formatCurrency(stats.totalRevenue) : '€0,00'}
          </div>
          <p className="text-xs text-muted-foreground">
            YTD: {stats ? formatCurrency(stats.yearToDateRevenue || 0) : '€0,00'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ausgaben</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats ? formatCurrency(stats.totalExpenses) : '€0,00'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nettogewinn</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats ? formatCurrency(stats.netProfit) : '€0,00'}
          </div>
          <p className="text-xs text-muted-foreground">
            Marge: {stats ? `${stats.profitMargin?.toFixed(1) || 0}%` : '0%'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Offene Rechnungen</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats ? stats.outstandingInvoices : 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats ? formatCurrency(stats.outstandingAmount) : '€0,00'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Kunden</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats ? stats.customerCount : 0}</div>
          <p className="text-xs text-muted-foreground">
            Aktiv: {stats ? stats.activeCustomerCount : 0}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bank-Saldo</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats ? formatCurrency(stats.bankBalance || 0) : '€0,00'}
          </div>
          <p className="text-xs text-muted-foreground">
            Cashflow: {stats?.cashflow ? formatCurrency(stats.cashflow.net) : '€0,00'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
