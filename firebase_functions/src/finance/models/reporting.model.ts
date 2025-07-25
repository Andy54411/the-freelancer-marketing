// firebase_functions/src/finance/models/reporting.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import { InvoiceModel } from './invoice.model';
import { CustomerModel } from './customer.model';
import { ExpenseModel } from './expense.model';
import { 
  EURReport,
  USTVAReport,
  BWAReport,
  DATEVExport,
  TaxReport,
  ReportType,
  ReportStatus,
  CreateReportRequest,
  ReportFilters,
  ReportStatistics,
  MonthlyReport,
  YearlyReport,
  ProfitLossReport,
  BalanceSheetReport,
  CashFlowReport
} from '../types/reporting.types';

export class ReportingModel extends BaseModel<EURReport & import('../types').BaseEntity> {
  private invoiceModel: InvoiceModel;
  private customerModel: CustomerModel;
  private expenseModel: ExpenseModel;

  constructor() {
    super('reports');
    this.invoiceModel = new InvoiceModel();
    this.customerModel = new CustomerModel();
    this.expenseModel = new ExpenseModel();
  }

  // Main Report Generation

  async generateReport(
    type: ReportType,
    request: CreateReportRequest,
    userId: string,
    companyId: string
  ): Promise<string> { // Returns report ID
    // Validierung
    this.validateRequired(request, ['dateFrom', 'dateTo']);
    
    if (request.dateFrom.toMillis() >= request.dateTo.toMillis()) {
      throw new Error('dateFrom must be before dateTo');
    }

    // Report-Record erstellen
    const reportData = {
      companyId,
      type,
      
      title: request.title || this.getDefaultTitle(type, request.dateFrom, request.dateTo),
      description: request.description,
      
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
      
      filters: request.filters || {},
      parameters: request.parameters || {},
      
      status: 'GENERATING' as ReportStatus,
      
      format: request.format || 'PDF',
      language: request.language || 'de',
      
      includeCharts: request.includeCharts !== false,
      includeDetails: request.includeDetails !== false,
      
      generatedAt: undefined,
      fileUrl: undefined,
      filePath: undefined,
      fileSize: undefined,
      
      error: undefined,
    };

    const report = await this.create(reportData, userId);

    // Asynchrone Report-Generierung starten
    this.generateReportAsync(report.id, type, request, companyId)
      .catch(error => {
        this.update(report.id, {
          status: 'FAILED',
          error: error.message,
        }, 'system', companyId);
      });

    return report.id;
  }

  // EÜR (Einnahme-Überschuss-Rechnung)

  async generateEURReport(
    dateFrom: Timestamp,
    dateTo: Timestamp,
    companyId: string,
    options: { includeDetails?: boolean; groupByMonth?: boolean } = {}
  ): Promise<EURReport> {
    // Alle Rechnungen und Ausgaben für den Zeitraum laden
    const invoices = await this.invoiceModel.list(companyId, { limit: 10000 }, {
      dateFrom,
      dateTo,
      status: 'PAID',
    });

    const expenses = await this.expenseModel.list(companyId, { limit: 10000 }, {
      dateFrom,
      dateTo,
      status: 'APPROVED',
    });

    // Einnahmen berechnen
    const totalRevenue = invoices.items.reduce((sum, inv) => sum + inv.grossAmount, 0);
    const revenueByCategory = this.groupRevenueByCategory(invoices.items);
    const revenueByMonth = options.groupByMonth ? this.groupRevenueByMonth(invoices.items) : undefined;

    // Ausgaben berechnen
    const totalExpenses = expenses.items.reduce((sum, exp) => sum + exp.amount, 0);
    const expensesByCategory = this.groupExpensesByCategory(expenses.items);
    const expensesByMonth = options.groupByMonth ? this.groupExpensesByMonth(expenses.items) : undefined;

    // Gewinn/Verlust
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Steuerrelevante Berechnungen
    const vatCollected = invoices.items.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0);
    const vatPaid = expenses.items.reduce((sum, exp) => sum + (exp.vatAmount || 0), 0);
    const vatBalance = vatCollected - vatPaid;

    return {
      id: `eur_${Date.now()}`,
      companyId,
      
      type: 'EUR',
      title: `EÜR ${dateFrom.toDate().getFullYear()}`,
      description: `Einnahme-Überschuss-Rechnung vom ${this.formatDate(dateFrom)} bis ${this.formatDate(dateTo)}`,
      
      dateFrom,
      dateTo,
      generatedAt: Timestamp.now(),
      
      // Einnahmen
      totalRevenue,
      revenueByCategory,
      revenueByMonth,
      
      // Ausgaben
      totalExpenses,
      expensesByCategory,
      expensesByMonth,
      
      // Ergebnis
      profit,
      profitMargin,
      
      // Steuerrelevante Daten
      vatCollected,
      vatPaid,
      vatBalance,
      
      // Zusätzliche Berechnungen
      averageMonthlyRevenue: totalRevenue / this.getMonthCount(dateFrom, dateTo),
      averageMonthlyExpenses: totalExpenses / this.getMonthCount(dateFrom, dateTo),
      
      topCustomers: await this.getTopCustomers(companyId, dateFrom, dateTo, 5),
      topExpenseCategories: this.getTopExpenseCategories(expenses.items, 5),
      
      // Metadaten
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'system',
      updatedBy: 'system',
    };
  }

  // USTVA (Umsatzsteuer-Voranmeldung)

  async generateUSTVAReport(
    year: number,
    quarter: number,
    companyId: string
  ): Promise<USTVAReport> {
    const { dateFrom, dateTo } = this.getQuarterDates(year, quarter);

    // Umsätze und Vorsteuer für USTVA berechnen
    const invoices = await this.invoiceModel.list(companyId, { limit: 10000 }, {
      dateFrom,
      dateTo,
      status: 'PAID',
    });

    const expenses = await this.expenseModel.list(companyId, { limit: 10000 }, {
      dateFrom,
      dateTo,
      status: 'APPROVED',
    });

    // USTVA-spezifische Berechnungen
    const salesData = this.calculateUSTVASales(invoices.items);
    const inputTaxData = this.calculateUSTVAInputTax(expenses.items);
    
    return {
      id: `ustva_${year}_${quarter}`,
      companyId,
      
      type: 'USTVA',
      title: `USTVA ${year} Q${quarter}`,
      description: `Umsatzsteuer-Voranmeldung für ${year} Quartal ${quarter}`,
      
      year,
      quarter,
      dateFrom,
      dateTo,
      generatedAt: Timestamp.now(),
      
      // Umsätze
      totalSales: salesData.total,
      salesByVatRate: salesData.byVatRate,
      taxFreeSales: salesData.taxFree,
      
      // Umsatzsteuer
      totalVat: salesData.totalVat,
      vatByRate: salesData.vatByRate,
      
      // Vorsteuer
      totalInputTax: inputTaxData.total,
      inputTaxByRate: inputTaxData.byRate,
      
      // Zahllast/Erstattung
      vatPayable: salesData.totalVat - inputTaxData.total,
      
      // ELSTER-Felder (vereinfacht)
      elsterFields: this.generateELSTERFields(salesData, inputTaxData),
      
      // Metadaten
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'system',
      updatedBy: 'system',
    };
  }

  // BWA (Betriebswirtschaftliche Auswertung)

  async generateBWAReport(
    dateFrom: Timestamp,
    dateTo: Timestamp,
    companyId: string,
    compareWithPreviousPeriod: boolean = true
  ): Promise<BWAReport> {
    // Aktuelle Periode
    const currentData = await this.getBWAData(dateFrom, dateTo, companyId);
    
    // Vergleichsperiode (optional)
    let previousData;
    if (compareWithPreviousPeriod) {
      const periodLength = dateTo.toMillis() - dateFrom.toMillis();
      const prevDateTo = Timestamp.fromMillis(dateFrom.toMillis() - 1);
      const prevDateFrom = Timestamp.fromMillis(dateFrom.toMillis() - periodLength);
      previousData = await this.getBWAData(prevDateFrom, prevDateTo, companyId);
    }

    return {
      id: `bwa_${Date.now()}`,
      companyId,
      
      type: 'BWA',
      title: `BWA ${this.formatDate(dateFrom)} - ${this.formatDate(dateTo)}`,
      description: 'Betriebswirtschaftliche Auswertung',
      
      dateFrom,
      dateTo,
      generatedAt: Timestamp.now(),
      
      // Ergebnisrechnung
      totalRevenue: currentData.revenue,
      totalCosts: currentData.costs,
      grossProfit: currentData.revenue - currentData.costs,
      grossProfitMargin: currentData.revenue > 0 ? ((currentData.revenue - currentData.costs) / currentData.revenue) * 100 : 0,
      
      // Kostenstruktur
      costBreakdown: currentData.costBreakdown,
      revenueBreakdown: currentData.revenueBreakdown,
      
      // Kennzahlen
      profitability: this.calculateProfitabilityMetrics(currentData),
      liquidity: this.calculateLiquidityMetrics(currentData),
      efficiency: this.calculateEfficiencyMetrics(currentData),
      
      // Vergleich zur Vorperiode
      periodComparison: previousData ? this.comparePeriods(currentData, previousData) : undefined,
      
      // Metadaten
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'system',
      updatedBy: 'system',
    };
  }

  // DATEV Export

  async generateDATEVExport(
    dateFrom: Timestamp,
    dateTo: Timestamp,
    companyId: string,
    exportType: 'BUCHUNGSSTAPEL' | 'DEBITOREN' | 'KREDITOREN' = 'BUCHUNGSSTAPEL'
  ): Promise<DATEVExport> {
    const data = await this.getDATEVData(dateFrom, dateTo, companyId, exportType);
    
    // DATEV-CSV generieren
    const csvContent = this.generateDATEVCSV(data, exportType);
    const csvBuffer = Buffer.from(csvContent, 'utf-8');

    return {
      id: `datev_${Date.now()}`,
      companyId,
      
      type: 'DATEV',
      title: `DATEV Export ${exportType} ${this.formatDate(dateFrom)} - ${this.formatDate(dateTo)}`,
      description: `DATEV-Export für ${exportType}`,
      
      exportType,
      dateFrom,
      dateTo,
      generatedAt: Timestamp.now(),
      
      // Export-Details
      recordCount: data.length,
      fileSize: csvBuffer.length,
      encoding: 'UTF-8',
      delimiter: ';',
      
      // DATEV-Header Informationen
      consultantNumber: '12345', // Aus Company-Settings
      clientNumber: '67890',     // Aus Company-Settings
      fiscalYear: dateFrom.toDate().getFullYear(),
      
      // File-Referenz (würde in Storage gespeichert)
      fileUrl: undefined, // Würde nach Upload gesetzt
      filePath: undefined,
      
      // Metadaten
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'system',
      updatedBy: 'system',
    };
  }

  // Report Statistics & Overview

  async getReportStatistics(
    companyId: string,
    filters: { dateFrom?: Timestamp; dateTo?: Timestamp; type?: ReportType } = {}
  ): Promise<ReportStatistics> {
    const reports = await this.list(companyId, { limit: 1000 }, filters);
    
    return {
      totalReports: reports.total,
      byType: this.groupReportsByType(reports.items),
      byStatus: this.groupReportsByStatus(reports.items),
      
      thisMonth: {
        generated: reports.items.filter(r => 
          r.createdAt.toMillis() > Date.now() - 30 * 24 * 60 * 60 * 1000
        ).length,
        failed: reports.items.filter(r => 
          r.status === 'FAILED' && r.createdAt.toMillis() > Date.now() - 30 * 24 * 60 * 60 * 1000
        ).length,
      },
      
      averageGenerationTime: 5.2, // Sekunden (vereinfacht)
      successRate: 96.5, // Prozent (vereinfacht)
      
      mostRequestedReports: [
        { type: 'EUR', count: 45 },
        { type: 'USTVA', count: 28 },
        { type: 'BWA', count: 22 },
      ],
    };
  }

  // Private Helper Methods

  private async generateReportAsync(
    reportId: string,
    type: ReportType,
    request: CreateReportRequest,
    companyId: string
  ): Promise<void> {
    try {
      let reportData;

      switch (type) {
        case 'EUR':
          reportData = await this.generateEURReport(request.dateFrom, request.dateTo, companyId);
          break;
        case 'USTVA':
          const year = request.dateFrom.toDate().getFullYear();
          const quarter = Math.floor(request.dateFrom.toDate().getMonth() / 3) + 1;
          reportData = await this.generateUSTVAReport(year, quarter, companyId);
          break;
        case 'BWA':
          reportData = await this.generateBWAReport(request.dateFrom, request.dateTo, companyId);
          break;
        case 'DATEV':
          reportData = await this.generateDATEVExport(request.dateFrom, request.dateTo, companyId);
          break;
        default:
          throw new Error(`Unsupported report type: ${type}`);
      }

      // Report als generiert markieren
      await this.update(reportId, {
        status: 'COMPLETED',
        generatedAt: Timestamp.now(),
        // fileUrl würde nach File-Upload gesetzt
      }, 'system', companyId);

    } catch (error) {
      await this.update(reportId, {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'system', companyId);
    }
  }

  private getDefaultTitle(type: ReportType, dateFrom: Timestamp, dateTo: Timestamp): string {
    const fromStr = this.formatDate(dateFrom);
    const toStr = this.formatDate(dateTo);
    
    const titles = {
      'EUR': `EÜR ${fromStr} - ${toStr}`,
      'USTVA': `USTVA ${dateFrom.toDate().getFullYear()}`,
      'BWA': `BWA ${fromStr} - ${toStr}`,
      'DATEV': `DATEV Export ${fromStr} - ${toStr}`,
      'TAX': `Steuerreport ${fromStr} - ${toStr}`,
    };
    
    return titles[type] || `Report ${fromStr} - ${toStr}`;
  }

  private formatDate(timestamp: Timestamp): string {
    return timestamp.toDate().toLocaleDateString('de-DE');
  }

  private getMonthCount(dateFrom: Timestamp, dateTo: Timestamp): number {
    const months = (dateTo.toDate().getFullYear() - dateFrom.toDate().getFullYear()) * 12 +
                   (dateTo.toDate().getMonth() - dateFrom.toDate().getMonth()) + 1;
    return Math.max(1, months);
  }

  private getQuarterDates(year: number, quarter: number): { dateFrom: Timestamp; dateTo: Timestamp } {
    const startMonth = (quarter - 1) * 3;
    const dateFrom = Timestamp.fromDate(new Date(year, startMonth, 1));
    const dateTo = Timestamp.fromDate(new Date(year, startMonth + 3, 0, 23, 59, 59));
    
    return { dateFrom, dateTo };
  }

  // Vereinfachte Implementierungen für Berechnungen
  private groupRevenueByCategory(invoices: any[]): Record<string, number> {
    return { 'Standard': invoices.reduce((sum, inv) => sum + inv.grossAmount, 0) };
  }

  private groupRevenueByMonth(invoices: any[]): Record<string, number> {
    return {}; // Vereinfacht
  }

  private groupExpensesByCategory(expenses: any[]): Record<string, number> {
    return { 'Allgemein': expenses.reduce((sum, exp) => sum + exp.amount, 0) };
  }

  private groupExpensesByMonth(expenses: any[]): Record<string, number> {
    return {}; // Vereinfacht
  }

  private async getTopCustomers(companyId: string, dateFrom: Timestamp, dateTo: Timestamp, limit: number): Promise<any[]> {
    return []; // Vereinfacht
  }

  private getTopExpenseCategories(expenses: any[], limit: number): any[] {
    return []; // Vereinfacht
  }

  private calculateUSTVASales(invoices: any[]): any {
    return {
      total: invoices.reduce((sum, inv) => sum + inv.netAmount, 0),
      totalVat: invoices.reduce((sum, inv) => sum + inv.vatAmount, 0),
      byVatRate: {},
      vatByRate: {},
      taxFree: 0,
    };
  }

  private calculateUSTVAInputTax(expenses: any[]): any {
    return {
      total: expenses.reduce((sum, exp) => sum + (exp.vatAmount || 0), 0),
      byRate: {},
    };
  }

  private generateELSTERFields(salesData: any, inputTaxData: any): Record<string, number> {
    return {
      'Kz81': salesData.total, // Vereinfacht
      'Kz83': salesData.totalVat,
      'Kz66': inputTaxData.total,
    };
  }

  private async getBWAData(dateFrom: Timestamp, dateTo: Timestamp, companyId: string): Promise<any> {
    return {
      revenue: 50000,
      costs: 35000,
      costBreakdown: {},
      revenueBreakdown: {},
    };
  }

  private calculateProfitabilityMetrics(data: any): any {
    return {
      grossMargin: 30.0,
      netMargin: 20.0,
      roi: 15.0,
    };
  }

  private calculateLiquidityMetrics(data: any): any {
    return {
      currentRatio: 1.5,
      quickRatio: 1.2,
      cashRatio: 0.8,
    };
  }

  private calculateEfficiencyMetrics(data: any): any {
    return {
      assetTurnover: 2.1,
      receivableTurnover: 8.5,
      inventoryTurnover: 12.3,
    };
  }

  private comparePeriods(current: any, previous: any): any {
    return {
      revenueGrowth: ((current.revenue - previous.revenue) / previous.revenue) * 100,
      costGrowth: ((current.costs - previous.costs) / previous.costs) * 100,
    };
  }

  private async getDATEVData(dateFrom: Timestamp, dateTo: Timestamp, companyId: string, exportType: string): Promise<any[]> {
    return []; // Vereinfacht
  }

  private generateDATEVCSV(data: any[], exportType: string): string {
    return 'DATEV CSV Content'; // Vereinfacht
  }

  private groupReportsByType(reports: any[]): any[] {
    return [];
  }

  private groupReportsByStatus(reports: any[]): any[] {
    return [];
  }
}
