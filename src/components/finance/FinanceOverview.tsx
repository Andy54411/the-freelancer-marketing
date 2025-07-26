'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Receipt, FileText, Calendar, Users } from 'lucide-react';

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  thisMonthRevenue: number;
}

interface FinanceOverviewProps {
  stats: FinanceStats | null;
}

export function FinanceOverview({ stats }: FinanceOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="min-h-[120px] animate-pulse bg-gray-200 dark:bg-gray-800"></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card className="min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Umsatz</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold break-words">
            {formatCurrency(stats.totalRevenue)}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Ausgaben</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold break-words">
            {formatCurrency(stats.totalExpenses)}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Nettogewinn</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold break-words">
            {formatCurrency(stats.netProfit)}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Offene Rechnungen</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold">{stats.outstandingInvoices}</div>
        </CardContent>
      </Card>

      <Card className="min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Offener Betrag</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold break-words">
            {formatCurrency(stats.outstandingAmount)}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[120px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">Dieser Monat</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold break-words">
            {formatCurrency(stats.thisMonthRevenue)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
