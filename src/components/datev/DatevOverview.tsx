'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FiRefreshCw,
  FiTrendingUp,
  FiFileText,
  FiDollarSign,
  FiUsers,
  FiCalendar,
  FiBarChart,
  FiPieChart,
} from 'react-icons/fi';
import { DatevService, DatevOrganization } from '@/services/datevService';
import { DatevTokenManager } from '@/lib/datev-token-manager';
import { toast } from 'sonner';

interface DatevOverviewProps {
  companyId: string;
}

interface OverviewStats {
  totalRevenue: number;
  totalExpenses: number;
  openInvoices: number;
  paidInvoices: number;
  monthlyGrowth: number;
  accountBalance: number;
}

export function DatevOverview({ companyId }: DatevOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<DatevOrganization | null>(null);
  const [stats, setStats] = useState<OverviewStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    openInvoices: 0,
    paidInvoices: 0,
    monthlyGrowth: 0,
    accountBalance: 0,
  });

  useEffect(() => {
    loadOverviewData();
  }, [companyId]);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      const token = await DatevTokenManager.getUserToken();

      if (!token) {
        toast.error('Keine DATEV-Verbindung gefunden');
        return;
      }

      // Load organization - Organizations not needed for Taskilo

      // Load accounts and calculate stats
      const accounts = await DatevService.getAccounts();

      // Temporarily disable transactions until backend route exists
      // const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      //   .toISOString()
      //   .split('T')[0];
      // const dateTo = new Date().toISOString().split('T')[0];
      // const transactions = await DatevService.getTransactions(dateFrom, dateTo, org.id);

      // Calculate overview statistics (using placeholder data temporarily)
      const transactions: any[] = []; // Empty array until backend route exists
      const revenue = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const accountBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

      setStats({
        totalRevenue: revenue,
        totalExpenses: expenses,
        openInvoices: transactions.filter(t => t.status === 'draft').length,
        paidInvoices: transactions.filter(t => t.status === 'posted').length,
        monthlyGrowth: 12.5, // Mock data - in production calculate from historical data
        accountBalance,
      });
    } catch (error) {

      toast.error('Fehler beim Laden der Übersichtsdaten');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <FiRefreshCw className="animate-spin w-6 h-6 text-[#14ad9f]" />
              <span className="ml-2">Lade DATEV-Übersicht...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Keine DATEV-Verbindung</CardTitle>
          <CardDescription>Bitte richten Sie zuerst die DATEV-Integration ein.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-[#14ad9f] hover:bg-[#129488]">DATEV einrichten</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
            <FiTrendingUp className="h-4 w-4 text-[#14ad9f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+{stats.monthlyGrowth}% zum Vormonat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausgaben</CardTitle>
            <FiDollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Letzten 30 Tage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Rechnungen</CardTitle>
            <FiFileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openInvoices}</div>
            <p className="text-xs text-muted-foreground">{stats.paidInvoices} bezahlt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kontosaldo</CardTitle>
            <FiBarChart className="h-4 w-4 text-[#14ad9f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.accountBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Alle DATEV-Konten</p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiUsers className="text-[#14ad9f]" />
            Verbundene Organisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{organization.name}</h3>
              <p className="text-gray-600">
                {organization.address.street}, {organization.address.zipCode}{' '}
                {organization.address.city}
              </p>
              {organization.taxNumber && (
                <p className="text-sm text-gray-500 mt-1">Steuernummer: {organization.taxNumber}</p>
              )}
              {organization.vatId && (
                <p className="text-sm text-gray-500">USt-IdNr.: {organization.vatId}</p>
              )}
            </div>
            <div className="text-right">
              <Badge
                variant={organization.status === 'active' ? 'default' : 'secondary'}
                className={
                  organization.status === 'active' ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''
                }
              >
                {organization.status === 'active' ? 'Aktiv' : 'Inaktiv'}
              </Badge>
              <p className="text-sm text-gray-500 mt-1">
                Typ: {organization.type === 'client' ? 'Mandant' : 'Berater'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FiFileText className="text-[#14ad9f]" />
              Rechnungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-[#14ad9f] hover:bg-[#129488]"
              onClick={() => toast.info('Rechnungsexport wird vorbereitet...')}
            >
              Offene Rechnungen exportieren
            </Button>
            <Button
              variant="outline"
              className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
            >
              Rechnungshistorie anzeigen
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FiBarChart className="text-[#14ad9f]" />
              Buchungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full bg-[#14ad9f] hover:bg-[#129488]" onClick={loadOverviewData}>
              Buchungen synchronisieren
            </Button>
            <Button
              variant="outline"
              className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
            >
              Buchungsjournal öffnen
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FiPieChart className="text-[#14ad9f]" />
              Berichte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-[#14ad9f] hover:bg-[#129488]"
              onClick={() => toast.info('Bericht wird erstellt...')}
            >
              Monatsbericht erstellen
            </Button>
            <Button
              variant="outline"
              className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
            >
              Steuerberater-Export
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiCalendar className="text-[#14ad9f]" />
            Letzte Aktivitäten
          </CardTitle>
          <CardDescription>Aktuelle DATEV-Synchronisationen und Aktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Buchungen synchronisiert</p>
                  <p className="text-sm text-gray-500">Vor 5 Minuten</p>
                </div>
              </div>
              <Badge variant="outline" className="border-green-500 text-green-500">
                Erfolgreich
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Rechnung RG-2025-001 exportiert</p>
                  <p className="text-sm text-gray-500">Vor 1 Stunde</p>
                </div>
              </div>
              <Badge variant="outline" className="border-blue-500 text-blue-500">
                Übertragen
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#14ad9f] rounded-full"></div>
                <div>
                  <p className="font-medium">Kontendaten aktualisiert</p>
                  <p className="text-sm text-gray-500">Vor 3 Stunden</p>
                </div>
              </div>
              <Badge variant="outline" className="border-[#14ad9f] text-[#14ad9f]">
                Aktualisiert
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
