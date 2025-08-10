'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Printer,
  Mail,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { FinanceService } from '@/services/financeService';

interface ReportComponentProps {
  companyId: string;
}

interface ReportData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  vatTotal: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
}

export function ReportComponent({ companyId }: ReportComponentProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current-year');
  const [activeTab, setActiveTab] = useState('overview');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [companyId, selectedPeriod]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const stats = await FinanceService.getFinanceStats(companyId);

      // Mock Daten für Berichte - hier würde eine echte API-Abfrage stehen
      setReportData({
        totalRevenue: stats.totalRevenue,
        totalExpenses: stats.totalExpenses,
        netProfit: stats.netProfit,
        vatTotal: stats.totalRevenue * 0.19,
        monthlyData: [
          { month: 'Jan', revenue: 15000, expenses: 8000, profit: 7000 },
          { month: 'Feb', revenue: 18000, expenses: 9000, profit: 9000 },
          { month: 'Mär', revenue: 22000, expenses: 11000, profit: 11000 },
          { month: 'Apr', revenue: 19000, expenses: 9500, profit: 9500 },
          { month: 'Mai', revenue: 25000, expenses: 12000, profit: 13000 },
          { month: 'Jun', revenue: 28000, expenses: 14000, profit: 14000 },
        ],
      });
    } catch (error) {
      console.error('Fehler beim Laden der Berichtsdaten:', error);
      toast.error('Berichtsdaten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    try {
      setGenerating(true);
      // Hier würde die Berichtsgenerierung implementiert werden
      toast.success(`${reportType} wird generiert und heruntergeladen`);

      // Simulation eines Downloads
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Fehler beim Generieren des Berichts:', error);
      toast.error('Bericht konnte nicht generiert werden');
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Berichtsdaten...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auswertungen & Berichte</h2>
          <p className="text-gray-600 mt-1">
            Umfassende Finanzberichte und steuerliche Auswertungen
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Aktueller Monat</SelectItem>
              <SelectItem value="current-quarter">Aktuelles Quartal</SelectItem>
              <SelectItem value="current-year">Aktuelles Jahr</SelectItem>
              <SelectItem value="last-year">Vorjahr</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="bwa">BWA</TabsTrigger>
          <TabsTrigger value="eur">EÜR</TabsTrigger>
          <TabsTrigger value="tax">Steuern</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Umsatz</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData ? formatCurrency(reportData.totalRevenue) : '€0,00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ausgaben</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData ? formatCurrency(reportData.totalExpenses) : '€0,00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <PieChart className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gewinn</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData ? formatCurrency(reportData.netProfit) : '€0,00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">USt. Zahllast</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData ? formatCurrency(reportData.vatTotal) : '€0,00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Schnell-Berichte</CardTitle>
              <CardDescription>Häufig benötigte Berichte direkt generieren</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col"
                onClick={() => handleGenerateReport('UStVA')}
                disabled={generating}
              >
                <FileText className="h-6 w-6 mb-2" />
                UStVA generieren
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col"
                onClick={() => handleGenerateReport('EÜR')}
                disabled={generating}
              >
                <BarChart3 className="h-6 w-6 mb-2" />
                EÜR erstellen
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col"
                onClick={() => handleGenerateReport('BWA')}
                disabled={generating}
              >
                <PieChart className="h-6 w-6 mb-2" />
                BWA ausgeben
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col"
                onClick={() => handleGenerateReport('Gewinn- und Verlustrechnung')}
                disabled={generating}
              >
                <TrendingUp className="h-6 w-6 mb-2" />
                GuV erstellen
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col"
                onClick={() => handleGenerateReport('Jahresabschluss')}
                disabled={generating}
              >
                <Calendar className="h-6 w-6 mb-2" />
                Jahresabschluss
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col"
                onClick={() => handleGenerateReport('DATEV Export')}
                disabled={generating}
              >
                <Download className="h-6 w-6 mb-2" />
                DATEV Export
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bwa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Betriebswirtschaftliche Auswertung (BWA)</CardTitle>
              <CardDescription>
                Monatliche betriebswirtschaftliche Kennzahlen und Entwicklung
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* BWA Hauptkennzahlen */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Umsatz & Erlöse */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Umsätze & Erlöse</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nettoumsatz</span>
                      <span className="font-medium">
                        {reportData ? formatCurrency(reportData.totalRevenue) : '€0,00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Umsatzsteuer</span>
                      <span className="font-medium">
                        {reportData ? formatCurrency(reportData.vatTotal) : '€0,00'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Bruttoumsatz</span>
                      <span className="font-semibold">
                        {reportData
                          ? formatCurrency(reportData.totalRevenue + reportData.vatTotal)
                          : '€0,00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kosten & Aufwendungen */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">
                    Kosten & Aufwendungen
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Materialkosten</span>
                      <span className="font-medium">
                        {reportData ? formatCurrency(reportData.totalExpenses * 0.4) : '€0,00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Personalkosten</span>
                      <span className="font-medium">
                        {reportData ? formatCurrency(reportData.totalExpenses * 0.35) : '€0,00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sonstige Kosten</span>
                      <span className="font-medium">
                        {reportData ? formatCurrency(reportData.totalExpenses * 0.25) : '€0,00'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Gesamtkosten</span>
                      <span className="font-semibold">
                        {reportData ? formatCurrency(reportData.totalExpenses) : '€0,00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BWA Kennzahlen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h5 className="text-sm font-medium text-green-700 mb-1">Betriebsergebnis</h5>
                      <p className="text-2xl font-bold text-green-900">
                        {reportData ? formatCurrency(reportData.netProfit) : '€0,00'}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {reportData && reportData.totalRevenue > 0
                          ? `${((reportData.netProfit / reportData.totalRevenue) * 100).toFixed(1)}% vom Umsatz`
                          : '0% vom Umsatz'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h5 className="text-sm font-medium text-blue-700 mb-1">Kostenquote</h5>
                      <p className="text-2xl font-bold text-blue-900">
                        {reportData && reportData.totalRevenue > 0
                          ? `${((reportData.totalExpenses / reportData.totalRevenue) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Kosten/Umsatz-Verhältnis</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h5 className="text-sm font-medium text-purple-700 mb-1">Rentabilität</h5>
                      <p className="text-2xl font-bold text-purple-900">
                        {reportData && reportData.totalRevenue > 0
                          ? `${((reportData.netProfit / reportData.totalRevenue) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">Gewinnmarge</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monatsvergleich */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monatlicher Geschäftsverlauf</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Monat</th>
                          <th className="text-right py-2">Umsatz</th>
                          <th className="text-right py-2">Kosten</th>
                          <th className="text-right py-2">Gewinn</th>
                          <th className="text-right py-2">Marge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData?.monthlyData?.map((month, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-2 font-medium">{month.month}</td>
                            <td className="text-right py-2">{formatCurrency(month.revenue)}</td>
                            <td className="text-right py-2">{formatCurrency(month.expenses)}</td>
                            <td className="text-right py-2 font-medium">
                              {formatCurrency(month.profit)}
                            </td>
                            <td className="text-right py-2">
                              <Badge
                                variant={month.profit > 0 ? 'default' : 'destructive'}
                                className={month.profit > 0 ? 'bg-green-100 text-green-800' : ''}
                              >
                                {month.revenue > 0
                                  ? `${((month.profit / month.revenue) * 100).toFixed(1)}%`
                                  : '0%'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* BWA Export Optionen */}
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  onClick={() => handleGenerateReport('BWA Detail')}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generiere BWA...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      BWA als PDF herunterladen
                    </>
                  )}
                </Button>
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  BWA drucken
                </Button>
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  BWA per E-Mail
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eur" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Einnahmen-Überschuss-Rechnung (EÜR)</CardTitle>
              <CardDescription>
                Gewinnermittlung für Freiberufler und Kleingewerbetreibende
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">EÜR erstellen</h3>
                <p className="text-gray-600 mb-4">
                  Ihre Einnahmen-Überschuss-Rechnung wird automatisch aus den erfassten Daten
                  generiert.
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => handleGenerateReport('EÜR')}
                    className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generiere...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        EÜR herunterladen
                      </>
                    )}
                  </Button>
                  <Button variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Drucken
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Steuerliche Auswertungen</CardTitle>
              <CardDescription>
                UStVA, Steuervorauszahlungen und weitere steuerliche Berichte
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Umsatzsteuer</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleGenerateReport('UStVA aktuell')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    UStVA aktueller Monat
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleGenerateReport('UStVA Quartal')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    UStVA Quartal
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleGenerateReport('UStVA Jahr')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    UStVA Jahreserklärung
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Weitere Berichte</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleGenerateReport('Steuervorauszahlung')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Steuervorauszahlung
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleGenerateReport('Zusammenfassende Meldung')}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Zusammenfassende Meldung
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleGenerateReport('DATEV Export')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    DATEV Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
