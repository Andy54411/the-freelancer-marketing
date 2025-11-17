'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Euro,
  BarChart3,
  Target,
  PieChart,
  Activity,
  Truck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  thisMonthRevenue: number;
  lastUpdate?: Date;
}

interface FinanceOverviewProps {
  stats: FinanceStats | null;
}

export function FinanceOverview({ stats }: FinanceOverviewProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  const getProfitabilityStatus = (netProfit: number) => {
    if (netProfit > 0) {
      return { status: 'positive', color: 'text-green-600', icon: TrendingUp };
    } else if (netProfit < 0) {
      return { status: 'negative', color: 'text-red-600', icon: TrendingDown };
    } else {
      return { status: 'neutral', color: 'text-gray-600', icon: Activity };
    }
  };

  const getOutstandingStatus = (count: number) => {
    if (count === 0) {
      return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
    } else if (count <= 5) {
      return { color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    } else {
      return { color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    }
  };

  if (!stats) {
    return (
      <div className="space-y-6">
        {/* Skeleton für Hauptkennzahlen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton für erweiterte Kennzahlen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const profitability = getProfitabilityStatus(stats.netProfit);
  const outstandingStatus = getOutstandingStatus(stats.outstandingInvoices);
  const ProfitIcon = profitability.icon;
  const OutstandingIcon = outstandingStatus.icon;

  // Berechne Profitabilität
  const profitMargin = stats.totalRevenue > 0 ? (stats.netProfit / stats.totalRevenue) * 100 : 0;
  const expenseRatio =
    stats.totalRevenue > 0 ? (stats.totalExpenses / stats.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Hauptkennzahlen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Gesamtumsatz */}
        <Card className="border-l-4 border-l-[#14ad9f] hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Gesamtumsatz</CardTitle>
            <div className="h-8 w-8 rounded-full bg-[#14ad9f]/10 flex items-center justify-center">
              <Euro className="h-4 w-4 text-[#14ad9f]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Alle bezahlten Rechnungen</p>
          </CardContent>
        </Card>

        {/* Ausgaben */}
        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ausgaben</CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.totalExpenses)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatPercentage(stats.totalExpenses, stats.totalRevenue)} vom Umsatz
            </p>
          </CardContent>
        </Card>

        {/* Nettogewinn */}
        <Card
          className={`border-l-4 ${stats.netProfit >= 0 ? 'border-l-green-500' : 'border-l-red-500'} hover:shadow-md transition-shadow`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Nettogewinn</CardTitle>
            <div
              className={`h-8 w-8 rounded-full ${stats.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'} flex items-center justify-center`}
            >
              <ProfitIcon
                className={`h-4 w-4 ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitability.color}`}>
              {formatCurrency(stats.netProfit)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{profitMargin.toFixed(1)}% Gewinnmarge</p>
          </CardContent>
        </Card>

        {/* Dieser Monat */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Dieser Monat</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.thisMonthRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatPercentage(stats.thisMonthRevenue, stats.totalRevenue)} vom Gesamtumsatz
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Erweiterte Informationen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Offene Rechnungen */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Offene Rechnungen
              </CardTitle>
              <CardDescription>Ausstehende Zahlungen im Überblick</CardDescription>
            </div>
            <OutstandingIcon className="h-6 w-6 text-gray-400" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.outstandingInvoices}</p>
                <p className="text-sm text-gray-500">Rechnungen</p>
              </div>
              <Badge className={outstandingStatus.color}>
                {stats.outstandingInvoices === 0
                  ? 'Alle bezahlt'
                  : stats.outstandingInvoices <= 5
                    ? 'Wenige offen'
                    : 'Viele offen'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Offener Betrag</span>
                <span className="font-semibold">{formatCurrency(stats.outstandingAmount)}</span>
              </div>
              <Progress
                value={
                  stats.totalRevenue > 0
                    ? (stats.outstandingAmount / (stats.totalRevenue + stats.outstandingAmount)) *
                      100
                    : 0
                }
                className="h-2"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(window.location.pathname + '/invoices')}
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              Rechnungen verwalten
            </Button>
          </CardContent>
        </Card>

        {/* Finanzielle Gesundheit */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Finanzielle Gesundheit
              </CardTitle>
              <CardDescription>Wichtige Kennzahlen auf einen Blick</CardDescription>
            </div>
            <BarChart3 className="h-6 w-6 text-gray-400" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Umsatz-Ausgaben-Verhältnis */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ausgabenquote</span>
                <span className="font-semibold">{expenseRatio.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(expenseRatio, 100)} className="h-2" />
              <p className="text-xs text-gray-500">
                {expenseRatio < 70
                  ? '✅ Gesunde Ausgabenquote'
                  : expenseRatio < 85
                    ? '⚠️ Moderate Ausgaben'
                    : '🚨 Hohe Ausgabenquote'}
              </p>
            </div>

            {/* Gewinnmarge */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Gewinnmarge</span>
                <span
                  className={`font-semibold ${profitMargin >= 20 ? 'text-green-600' : profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}
                >
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
              <Progress value={Math.max(0, Math.min(profitMargin, 100))} className="h-2" />
              <p className="text-xs text-gray-500">
                {profitMargin >= 20
                  ? '✅ Exzellente Profitabilität'
                  : profitMargin >= 10
                    ? '⚠️ Gute Profitabilität'
                    : '🚨 Niedrige Profitabilität'}
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(window.location.pathname + '/reports')}
                className="w-full"
              >
                <PieChart className="h-4 w-4 mr-2" />
                Detaillierte Berichte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schnellzugriff */}
      <Card className="bg-linear-to-r from-[#14ad9f]/5 to-blue-50 border-[#14ad9f]/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Schnellzugriff</CardTitle>
          <CardDescription>Häufig verwendete Finanzfunktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(window.location.pathname + '/invoices/create')}
              className="flex flex-col h-auto p-4 space-y-2"
            >
              <FileText className="h-6 w-6 text-[#14ad9f]" />
              <span className="text-xs">Neue Rechnung</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(window.location.pathname + '/customers')}
              className="flex flex-col h-auto p-4 space-y-2"
            >
              <Users className="h-6 w-6 text-[#14ad9f]" />
              <span className="text-xs">Kunden</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(window.location.pathname + '/suppliers')}
              className="flex flex-col h-auto p-4 space-y-2"
            >
              <Truck className="h-6 w-6 text-blue-600" />
              <span className="text-xs">Lieferanten</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(window.location.pathname + '/expenses')}
              className="flex flex-col h-auto p-4 space-y-2"
            >
              <Receipt className="h-6 w-6 text-[#14ad9f]" />
              <span className="text-xs">Ausgaben</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(window.location.pathname + '/cashbook')}
              className="flex flex-col h-auto p-4 space-y-2"
            >
              <Target className="h-6 w-6 text-[#14ad9f]" />
              <span className="text-xs">Kassenbuch</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Letztes Update */}
      {stats.lastUpdate && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Letzte Aktualisierung:{' '}
            {new Intl.DateTimeFormat('de-DE', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(stats.lastUpdate))}
          </p>
        </div>
      )}
    </div>
  );
}
