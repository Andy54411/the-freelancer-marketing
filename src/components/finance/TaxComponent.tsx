'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calculator,
  PieChart,
  Download,
  Receipt,
  TrendingUp,
  BarChart3,
  FileBarChart,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { TaxService, TaxReport } from '@/services/taxService';
import { toast } from 'sonner';

interface TaxData {
  quarter: string;
  revenue: number;
  expenses: number;
  taxableIncome: number;
  vatOwed: number;
  incomeTaxOwed: number;
}

interface QuickReport {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  type: 'ustVA' | 'euer' | 'guv' | 'bwa' | 'datev' | 'annual';
  period: string;
  status: 'ready' | 'generating' | 'completed';
  color: string;
}

interface TaxComponentProps {
  taxData: TaxData[];
  companyId: string;
}

export function TaxComponent({ taxData, companyId }: TaxComponentProps) {
  const [generatingReports, setGeneratingReports] = useState<string[]>([]);
  const [recentReports, setRecentReports] = useState<TaxReport[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentMonth = new Date().getMonth() + 1;
  const totalVatOwed = taxData.reduce((sum, data) => sum + data.vatOwed, 0);
  const totalIncomeTaxOwed = taxData.reduce((sum, data) => sum + data.incomeTaxOwed, 0);

  // Schnell-Berichte Konfiguration
  const quickReports: QuickReport[] = [
    {
      id: 'ustva-current',
      title: 'UStVA generieren',
      description: `Q${currentQuarter} ${currentYear} Umsatzsteuer-Voranmeldung`,
      icon: Receipt,
      type: 'ustVA',
      period: `Q${currentQuarter} ${currentYear}`,
      status: 'ready',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'euer-current',
      title: 'EÜR erstellen',
      description: `${currentYear} Einnahmen-Überschuss-Rechnung`,
      icon: Calculator,
      type: 'euer',
      period: `${currentYear}`,
      status: 'ready',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 'bwa-current',
      title: 'BWA ausgeben',
      description: `${new Date().toLocaleString('de-DE', { month: 'long', year: 'numeric' })} Betriebswirtschaftliche Auswertung`,
      icon: BarChart3,
      type: 'bwa',
      period: `${currentMonth}/${currentYear}`,
      status: 'ready',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      id: 'guv-current',
      title: 'GuV erstellen',
      description: `${currentYear} Gewinn- und Verlustrechnung`,
      icon: TrendingUp,
      type: 'guv',
      period: `${currentYear}`,
      status: 'ready',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      id: 'annual-current',
      title: 'Jahresabschluss',
      description: `${currentYear - 1} Vollständiger Jahresabschluss`,
      icon: FileBarChart,
      type: 'annual',
      period: `${currentYear - 1}`,
      status: 'ready',
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      id: 'datev-export',
      title: 'DATEV Export',
      description: 'Buchhaltungsdaten für DATEV exportieren',
      icon: Database,
      type: 'datev',
      period: 'Aktuell',
      status: 'ready',
      color: 'bg-gray-500 hover:bg-gray-600',
    },
  ];

  const generateReport = async (reportConfig: QuickReport) => {
    setGeneratingReports(prev => [...prev, reportConfig.id]);

    try {
      let _reportId = '';

      switch (reportConfig.type) {
        case 'ustVA':
          const ustVAData = await TaxService.calculateUStVA(companyId, currentYear, currentQuarter);
          _reportId = await TaxService.createTaxReport({
            companyId,
            type: 'ustVA',
            year: currentYear,
            quarter: currentQuarter,
            periodStart: new Date(currentYear, (currentQuarter - 1) * 3, 1),
            periodEnd: new Date(currentYear, currentQuarter * 3, 0),
            status: 'calculated',
            taxData: { ustVA: ustVAData },
            generatedBy: 'system',
            notes: `Automatisch generiert am ${new Date().toLocaleString('de-DE')}`,
          });
          break;

        case 'euer':
          const euerData = await TaxService.calculateEUeR(companyId, currentYear);
          _reportId = await TaxService.createTaxReport({
            companyId,
            type: 'euer',
            year: currentYear,
            periodStart: new Date(currentYear, 0, 1),
            periodEnd: new Date(currentYear, 11, 31),
            status: 'calculated',
            taxData: { euer: euerData },
            generatedBy: 'system',
            notes: `EÜR für ${currentYear} - automatisch generiert`,
          });
          break;

        case 'bwa':
          const bwaData = await TaxService.calculateBWA(companyId, currentYear, currentMonth);
          _reportId = await TaxService.createTaxReport({
            companyId,
            type: 'bwa',
            year: currentYear,
            month: currentMonth,
            periodStart: new Date(currentYear, currentMonth - 1, 1),
            periodEnd: new Date(currentYear, currentMonth, 0),
            status: 'calculated',
            taxData: { bwa: bwaData },
            generatedBy: 'system',
            notes: `BWA für ${new Date().toLocaleString('de-DE', { month: 'long', year: 'numeric' })}`,
          });
          break;

        case 'guv':
          const guvData = await TaxService.calculateGuV(companyId, currentYear);
          _reportId = await TaxService.createTaxReport({
            companyId,
            type: 'guv',
            year: currentYear,
            periodStart: new Date(currentYear, 0, 1),
            periodEnd: new Date(currentYear, 11, 31),
            status: 'calculated',
            taxData: { guv: guvData },
            generatedBy: 'system',
            notes: `GuV für ${currentYear} - Bilanzierung`,
          });
          break;

        case 'annual':
          // Kombinierter Jahresabschluss
          const annualEuer = await TaxService.calculateEUeR(companyId, currentYear - 1);
          const annualGuv = await TaxService.calculateGuV(companyId, currentYear - 1);
          _reportId = await TaxService.createTaxReport({
            companyId,
            type: 'euer',
            year: currentYear - 1,
            periodStart: new Date(currentYear - 1, 0, 1),
            periodEnd: new Date(currentYear - 1, 11, 31),
            status: 'calculated',
            taxData: { euer: annualEuer, guv: annualGuv },
            generatedBy: 'system',
            notes: `Jahresabschluss ${currentYear - 1} - EÜR & GuV kombiniert`,
          });
          break;

        case 'datev':
          // DATEV Export Simulation
          _reportId = 'datev-export-' + Date.now();
          setTimeout(() => {
            // Simulierte DATEV-Datei Download
            const blob = new Blob(['DATEV Export Data...'], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DATEV_Export_${currentYear}_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 1000);
          break;
      }

      toast.success(`${reportConfig.title} wurde erfolgreich generiert.`);

      // Aktualisiere die Liste der letzten Berichte
      if (reportConfig.type !== 'datev') {
        const newReports = await TaxService.getTaxReportsByCompany(companyId);
        setRecentReports(newReports.slice(0, 5));
      }
    } catch {
      toast.error(`${reportConfig.title} konnte nicht generiert werden.`);
    } finally {
      setGeneratingReports(prev => prev.filter(id => id !== reportConfig.id));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'draft':
      case 'calculated':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
      case 'calculated':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Lade bestehende Berichte beim Mount
  React.useEffect(() => {
    const loadRecentReports = async () => {
      try {
        const reports = await TaxService.getTaxReportsByCompany(companyId);
        setRecentReports(reports.slice(0, 5));
      } catch {}
    };

    if (companyId) {
      loadRecentReports();
    }
  }, [companyId]);

  return (
    <div className="space-y-6">
      {/* Schnell-Berichte Sektion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#14ad9f]" />
            Schnell-Berichte
          </CardTitle>
          <CardDescription>Häufig benötigte Berichte direkt generieren</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickReports.map(report => {
              const Icon = report.icon;
              const isGenerating = generatingReports.includes(report.id);

              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${report.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {report.period}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {report.description}
                    </p>

                    <Button
                      onClick={() => generateReport(report)}
                      disabled={isGenerating}
                      size="sm"
                      className={`w-full ${report.color} text-white border-0`}
                    >
                      {isGenerating ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Generiere...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Generieren
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Letzte Berichte */}
      {recentReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#14ad9f]" />
              Letzte Berichte
            </CardTitle>
            <CardDescription>Ihre zuletzt erstellten Steuerberichte</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.map(report => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(report.status)}
                    <div>
                      <div className="font-medium text-sm">
                        {report.type.toUpperCase()} {report.year}
                        {report.quarter && ` Q${report.quarter}`}
                        {report.month &&
                          ` - ${new Date(report.year, report.month - 1).toLocaleString('de-DE', { month: 'long' })}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Erstellt: {report.createdAt.toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${getStatusColor(report.status)}`}>
                      {report.status === 'draft' && 'Entwurf'}
                      {report.status === 'calculated' && 'Berechnet'}
                      {report.status === 'submitted' && 'Übermittelt'}
                      {report.status === 'accepted' && 'Akzeptiert'}
                      {report.status === 'rejected' && 'Abgelehnt'}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
