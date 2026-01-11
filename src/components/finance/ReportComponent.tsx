'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Users,
  Package,
  Clock,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/firebase/clients';
import { BusinessReportService, type BusinessReportData } from '@/services/businessReportService';
import { DatevAuswertungsService, type BWAData, type SuSaData, type EURData } from '@/services/datevAuswertungsService';

interface ReportComponentProps {
  companyId: string;
}

export function ReportComponent({ companyId }: ReportComponentProps) {
  const [businessReport, setBusinessReport] = useState<BusinessReportData | null>(null);
  const [bwaData, setBwaData] = useState<BWAData | null>(null);
  const [susaData, setSusaData] = useState<SuSaData | null>(null);
  const [eurData, setEurData] = useState<EURData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current-year');
  const [activeTab, setActiveTab] = useState('overview');
  const [generating, setGenerating] = useState(false);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (selectedPeriod) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'current-quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'current-year':
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return { startDate, endDate };
  }, [selectedPeriod]);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      const year = endDate.getFullYear();

      // Bestimme den Periodentyp
      let periodType: 'month' | 'quarter' | 'year' | 'custom' = 'year';
      if (selectedPeriod === 'current-month') periodType = 'month';
      else if (selectedPeriod === 'current-quarter') periodType = 'quarter';
      else if (selectedPeriod === 'current-year' || selectedPeriod === 'last-year') periodType = 'year';

      // Lade alle Daten parallel mit individueller Fehlerbehandlung
      const [report, bwa, susa, eur] = await Promise.all([
        BusinessReportService.getBusinessReport(companyId, { startDate, endDate, type: periodType }).catch(() => null),
        DatevAuswertungsService.generateBWA(companyId, year, endDate.getMonth() + 1).catch(() => null),
        DatevAuswertungsService.generateSuSa(companyId, year, endDate.getMonth() + 1).catch(() => null),
        DatevAuswertungsService.generateEUR(companyId, year).catch(() => null),
      ]);

      setBusinessReport(report);
      setBwaData(bwa);
      setSusaData(susa);
      setEurData(eur);
    } catch {
      toast.error('Berichtsdaten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [companyId, getDateRange, selectedPeriod]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // PDF-Download-Funktion
  const downloadReportPdf = async (reportType: 'bwa' | 'susa' | 'eur') => {
    try {
      setGenerating(true);
      const { startDate, endDate } = getDateRange();
      const year = endDate.getFullYear();
      const month = endDate.getMonth() + 1;

      // Auth-Token holen
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Nicht authentifiziert');
        return;
      }

      // API-Aufruf für PDF-Generierung
      const response = await fetch(
        `/api/company/${companyId}/reports/pdf?type=${reportType}&year=${year}&month=${month}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF-Generierung fehlgeschlagen');
      }

      // PDF herunterladen
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const reportNames: Record<string, string> = {
        bwa: 'BWA',
        susa: 'SuSa',
        eur: 'EUR',
      };
      link.download = `${reportNames[reportType]}_${year}_${month.toString().padStart(2, '0')}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${reportNames[reportType]} wurde heruntergeladen`);
    } catch (error) {
      console.error('PDF Download Fehler:', error);
      toast.error(error instanceof Error ? error.message : 'PDF konnte nicht erstellt werden');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    // Mapping von UI-Namen zu API-Typen
    const typeMapping: Record<string, 'bwa' | 'susa' | 'eur'> = {
      'BWA': 'bwa',
      'BWA Detail': 'bwa',
      'SuSa': 'susa',
      'EÜR': 'eur',
    };

    const apiType = typeMapping[reportType];
    if (apiType) {
      await downloadReportPdf(apiType);
    } else {
      // Für andere Report-Typen (UStVA, etc.) - noch nicht implementiert
      toast.info(`${reportType} Export wird bald verfügbar sein`);
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="bwa">BWA</TabsTrigger>
          <TabsTrigger value="susa">SuSa</TabsTrigger>
          <TabsTrigger value="eur">EÜR</TabsTrigger>
          <TabsTrigger value="modules">Module</TabsTrigger>
          <TabsTrigger value="tax">Steuern</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Finanz-KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Umsatz</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {businessReport ? formatCurrency(businessReport.finance.totalRevenue) : '0,00 €'}
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
                      {businessReport ? formatCurrency(businessReport.finance.totalExpenses) : '0,00 €'}
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
                      {businessReport ? formatCurrency(businessReport.finance.netProfit) : '0,00 €'}
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
                      {businessReport ? formatCurrency(businessReport.finance.vatBalance) : '0,00 €'}
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
                DATEV-konforme BWA basierend auf {bwaData?.kontenrahmen} | Stand: {bwaData?.monat}/{bwaData?.jahr}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* BWA Tabelle nach DATEV-Standard */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3">Zeile</th>
                      <th className="text-left py-2 px-3">Bezeichnung</th>
                      <th className="text-right py-2 px-3">Betrag</th>
                      <th className="text-right py-2 px-3">% v. GU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bwaData?.zeilen.map((zeile, index) => {
                      const isTotal = zeile.bezeichnung.includes('Summe') || 
                                      zeile.bezeichnung.includes('Ergebnis') ||
                                      zeile.bezeichnung.includes('Rohertrag') ||
                                      zeile.bezeichnung.includes('Jahresüberschuss');
                      return (
                        <tr 
                          key={index} 
                          className={`border-b ${isTotal ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
                        >
                          <td className="py-2 px-3 text-gray-500">{zeile.zeile}</td>
                          <td className="py-2 px-3">{zeile.bezeichnung}</td>
                          <td className={`py-2 px-3 text-right ${zeile.betrag < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(zeile.betrag)}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-500">
                            {zeile.prozentVomUmsatz.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* BWA Kennzahlen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h5 className="text-sm font-medium text-green-700 mb-1">Betriebsergebnis</h5>
                      <p className="text-2xl font-bold text-green-900">
                        {bwaData ? formatCurrency(bwaData.zusammenfassung.betriebsergebnis) : '0,00 €'}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {bwaData && bwaData.zusammenfassung.gesamtleistung > 0
                          ? `${((bwaData.zusammenfassung.betriebsergebnis / bwaData.zusammenfassung.gesamtleistung) * 100).toFixed(1)}% vom Umsatz`
                          : '0% vom Umsatz'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h5 className="text-sm font-medium text-blue-700 mb-1">Rohertrag</h5>
                      <p className="text-2xl font-bold text-blue-900">
                        {bwaData ? formatCurrency(bwaData.zusammenfassung.rohertrag) : '0,00 €'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {bwaData && bwaData.zusammenfassung.gesamtleistung > 0
                          ? `${((bwaData.zusammenfassung.rohertrag / bwaData.zusammenfassung.gesamtleistung) * 100).toFixed(1)}% Marge`
                          : '0% Marge'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h5 className="text-sm font-medium text-purple-700 mb-1">Jahresüberschuss</h5>
                      <p className="text-2xl font-bold text-purple-900">
                        {bwaData ? formatCurrency(bwaData.zusammenfassung.jahresueberschuss) : '0,00 €'}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">Nach Steuern</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monatlicher Verlauf aus businessReport */}
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
                        {businessReport?.monthlyData?.map((month, index) => (
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

        {/* SUSA Tab - Summen- und Saldenliste */}
        <TabsContent value="susa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summen- und Saldenliste (SuSa)</CardTitle>
              <CardDescription>
                DATEV-konforme Kontensalden | {susaData?.kontenrahmen} | Stand: {susaData?.monat}/{susaData?.jahr}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* SuSa Übersicht */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <h5 className="text-sm font-medium text-blue-700">Summe Soll</h5>
                    <p className="text-xl font-bold text-blue-900">
                      {susaData ? formatCurrency(susaData.summen.summeSoll) : '0,00 €'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <h5 className="text-sm font-medium text-green-700">Summe Haben</h5>
                    <p className="text-xl font-bold text-green-900">
                      {susaData ? formatCurrency(susaData.summen.summeHaben) : '0,00 €'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4 text-center">
                    <h5 className="text-sm font-medium text-purple-700">Saldo Soll</h5>
                    <p className="text-xl font-bold text-purple-900">
                      {susaData ? formatCurrency(susaData.summen.saldoSoll) : '0,00 €'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4 text-center">
                    <h5 className="text-sm font-medium text-orange-700">Saldo Haben</h5>
                    <p className="text-xl font-bold text-orange-900">
                      {susaData ? formatCurrency(susaData.summen.saldoHaben) : '0,00 €'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* SuSa Kontenliste */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3">Konto</th>
                      <th className="text-left py-2 px-3">Bezeichnung</th>
                      <th className="text-right py-2 px-3">EB Soll</th>
                      <th className="text-right py-2 px-3">EB Haben</th>
                      <th className="text-right py-2 px-3">Soll</th>
                      <th className="text-right py-2 px-3">Haben</th>
                      <th className="text-right py-2 px-3">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {susaData?.konten.slice(0, 30).map((konto, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono">{konto.kontonummer}</td>
                        <td className="py-2 px-3">{konto.bezeichnung}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(konto.ebSoll)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(konto.ebHaben)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(konto.soll)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(konto.haben)}</td>
                        <td className={`py-2 px-3 text-right font-medium ${konto.saldo < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(konto.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  onClick={() => handleGenerateReport('SuSa')}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                  disabled={generating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  SuSa als PDF herunterladen
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
                DATEV-konforme EÜR für {eurData?.jahr} | Anlage EÜR zum Finanzamt
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* EÜR Übersicht */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <h5 className="text-sm font-medium text-green-700">Betriebseinnahmen</h5>
                    <p className="text-xl font-bold text-green-900">
                      {eurData ? formatCurrency(eurData.zusammenfassung.betriebseinnahmen) : '0,00 €'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 text-center">
                    <h5 className="text-sm font-medium text-red-700">Betriebsausgaben</h5>
                    <p className="text-xl font-bold text-red-900">
                      {eurData ? formatCurrency(eurData.zusammenfassung.betriebsausgaben) : '0,00 €'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <h5 className="text-sm font-medium text-blue-700">Gewinn/Verlust</h5>
                    <p className={`text-xl font-bold ${eurData && eurData.zusammenfassung.gewinnVerlust >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                      {eurData ? formatCurrency(eurData.zusammenfassung.gewinnVerlust) : '0,00 €'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* EÜR Anlage Zeilen */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3">Zeile</th>
                      <th className="text-left py-2 px-3">Bezeichnung</th>
                      <th className="text-right py-2 px-3">Betrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eurData?.anlageZeilen.map((zeile, index) => {
                      const isTotal = zeile.zeile === 23 || zeile.zeile === 87 || zeile.zeile === 88;
                      return (
                        <tr 
                          key={index} 
                          className={`border-b ${isTotal ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
                        >
                          <td className="py-2 px-3 text-gray-500">{zeile.zeile}</td>
                          <td className="py-2 px-3">{zeile.bezeichnung}</td>
                          <td className={`py-2 px-3 text-right ${zeile.betrag < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(zeile.betrag)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module KPIs Tab */}
        <TabsContent value="modules" className="space-y-4">
          {!businessReport ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Keine Moduldaten verfügbar.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Daten werden angezeigt, sobald Mitarbeiter, Inventar oder Zeiteinträge erfasst wurden.
                </p>
              </CardContent>
            </Card>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* HR KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#14ad9f]" />
                  Personal (HR)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Mitarbeiter gesamt</p>
                    <p className="text-xl font-bold">{businessReport.hr.totalEmployees}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Aktive Mitarbeiter</p>
                    <p className="text-xl font-bold text-green-600">{businessReport.hr.activeEmployees}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vollzeit</p>
                    <p className="text-xl font-bold">{businessReport.hr.fullTimeEmployees}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Teilzeit</p>
                    <p className="text-xl font-bold">{businessReport.hr.partTimeEmployees}</p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brutto-Gehälter</span>
                    <span className="font-medium">{formatCurrency(businessReport.hr.totalGrossSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Arbeitgeberkosten</span>
                    <span className="font-medium">{formatCurrency(businessReport.hr.totalEmployerCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Krankheitstage</span>
                    <span className="font-medium">{businessReport.hr.sickDays} Tage</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#14ad9f]" />
                  Lagerbestand
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Artikel gesamt</p>
                    <p className="text-xl font-bold">{businessReport.inventory.totalItems}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lagerwert</p>
                    <p className="text-xl font-bold">{formatCurrency(businessReport.inventory.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Niedriger Bestand</p>
                    <p className="text-xl font-bold text-orange-500">{businessReport.inventory.lowStockItems}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nicht vorrätig</p>
                    <p className="text-xl font-bold text-red-500">{businessReport.inventory.outOfStockItems}</p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verkaufswert</span>
                    <span className="font-medium">{formatCurrency(businessReport.inventory.totalRetailValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Potenzielle Marge</span>
                    <span className="font-medium">{formatCurrency(businessReport.inventory.potentialProfit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TimeTracking KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#14ad9f]" />
                  Zeiterfassung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Stunden gesamt</p>
                    <p className="text-xl font-bold">{businessReport.timeTracking.totalHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Abrechenbar</p>
                    <p className="text-xl font-bold text-green-600">{businessReport.timeTracking.billableHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Abrechenbar %</p>
                    <p className="text-xl font-bold">{businessReport.timeTracking.billablePercentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stundensatz</p>
                    <p className="text-xl font-bold">{formatCurrency(businessReport.timeTracking.averageHourlyRate)}</p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Abrechenbarer Umsatz</span>
                    <span className="font-medium">{formatCurrency(businessReport.timeTracking.totalBillableAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aktive Projekte</span>
                    <span className="font-medium">{businessReport.timeTracking.activeProjects}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#14ad9f]" />
                  Aufträge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Aufträge gesamt</p>
                    <p className="text-xl font-bold">{businessReport.orders.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Abgeschlossen</p>
                    <p className="text-xl font-bold text-green-600">{businessReport.orders.completedOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">In Bearbeitung</p>
                    <p className="text-xl font-bold text-blue-500">{businessReport.orders.inProgressOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Storniert</p>
                    <p className="text-xl font-bold text-red-500">{businessReport.orders.cancelledOrders}</p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Umsatz aus Aufträgen</span>
                    <span className="font-medium">{formatCurrency(businessReport.orders.totalOrderValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Durchschnittswert</span>
                    <span className="font-medium">{formatCurrency(businessReport.orders.averageOrderValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Abschlussrate</span>
                    <span className="font-medium">{businessReport.orders.completionRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}
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
