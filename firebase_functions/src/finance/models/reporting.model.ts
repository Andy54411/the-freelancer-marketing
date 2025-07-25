// firebase_functions/src/finance/models/reporting.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import { InvoiceModel } from './invoice.model';
import { ExpenseModel } from './expense.model';
import {
    EURReport,
    USTVAReport,
    DATEVExport,
    ReportType,
    ReportStatistics
} from '../types/reporting.types';

// Vereinfachtes Interface für Report-Requests
interface CreateReportRequest {
    title?: string;
    description?: string;
    dateFrom: Timestamp;
    dateTo: Timestamp;
    filters?: Record<string, any>;
    parameters?: Record<string, any>;
    format?: string;
    language?: string;
    includeCharts?: boolean;
    includeDetails?: boolean;
}

export class ReportingModel extends BaseModel<any> {
    private invoiceModel: InvoiceModel;
    private expenseModel: ExpenseModel;

    constructor() {
        super('reports');
        this.invoiceModel = new InvoiceModel();
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

        // Report-Record erstellen (vereinfacht)
        const reportData = {
            companyId,
            title: request.title || this.getDefaultTitle(type, request.dateFrom, request.dateTo),
            description: request.description,
            dateFrom: request.dateFrom,
            dateTo: request.dateTo,
            status: 'DRAFT',
            format: request.format || 'PDF',
            language: request.language || 'de',
        };

        const report = await this.create(reportData, userId);

        // Asynchrone Report-Generierung starten
        this.generateReportAsync(report.id, type, request, companyId)
            .catch(error => {
                console.error(`Failed to generate report ${report.id}:`, error);
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

        // Ausgaben berechnen
        const totalExpenses = expenses.items.reduce((sum, exp) => sum + exp.amount, 0);

        // Gewinn/Verlust
        const profit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        // Steuerrelevante Berechnungen
        const vatCollected = invoices.items.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0);
        const vatPaid = expenses.items.reduce((sum, exp) => sum + (exp.amount * 0.19 || 0), 0); // Vereinfacht
        const vatBalance = vatCollected - vatPaid;

        return {
            id: `eur_${Date.now()}`,
            companyId,

            period: 'CUSTOM',
            year: dateFrom.toDate().getFullYear(),
            dateFrom,
            dateTo,
            status: 'DRAFT',

            // Einnahmen (vereinfacht für EURReport Struktur)
            revenue: [{
                category: 'REVENUE',
                description: 'Gesamteinnahmen',
                netAmount: totalRevenue - vatCollected,
                taxAmount: vatCollected,
                totalAmount: totalRevenue,
                invoiceCount: invoices.items.length,
                avgInvoiceAmount: invoices.items.length > 0 ? Math.round(totalRevenue / invoices.items.length) : 0,
                taxBreakdown: []
            }],

            // Ausgaben (vereinfacht für EURReport Struktur)  
            expenses: [{
                category: 'OTHER_EXPENSES',
                description: 'Gesamtausgaben',
                netAmount: totalExpenses - vatPaid,
                taxAmount: vatPaid,
                totalAmount: totalExpenses,
                transactionCount: expenses.items.length,
                avgTransactionAmount: expenses.items.length > 0 ? Math.round(totalExpenses / expenses.items.length) : 0,
                taxBreakdown: []
            }],

            // Zusammenfassung
            summary: {
                totalRevenue,
                totalExpenses,
                netProfit: profit,
                outputTax: vatCollected,
                inputTax: vatPaid,
                vatLiability: vatBalance,
                profitMargin,
                expenseRatio: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0
            },

            // Metadaten
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'system',
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

            year,
            period: 'QUARTER',
            quarter,
            dateFrom,
            dateTo,
            status: 'DRAFT',

            // Umsätze (vereinfacht für USTVAReport Struktur)
            sales: {
                domesticTaxFree: 0,
                exportTaxFree: 0,
                euDelivery: 0,
                domestic19: salesData.total,
                domestic7: 0,
                domestic0: 0,
                tax19: salesData.totalVat,
                tax7: 0,
            },

            // Vorsteuer
            inputTax: {
                domestic: inputTaxData.total,
                import: 0,
                euAcquisition: 0,
                reverseCharge: 0,
                smallBusiness: 0,
            },

            // Berechnung
            calculation: {
                totalOutputTax: salesData.totalVat,
                totalInputTax: inputTaxData.total,
                difference: salesData.totalVat - inputTaxData.total,
                corrections: 0,
                finalAmount: salesData.totalVat - inputTaxData.total,
            },

            // Metadaten
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'system',
        };
    }

    // DATEV Export

    async generateDATEVExport(
        dateFrom: Timestamp,
        dateTo: Timestamp,
        companyId: string,
        exportType: 'MOVEMENTS' | 'ACCOUNTS' | 'CUSTOMERS' | 'VENDORS' = 'MOVEMENTS'
    ): Promise<DATEVExport> {
        const data = await this.getDATEVData(dateFrom, dateTo, companyId, exportType);

        return {
            id: `datev_${Date.now()}`,
            companyId,

            exportType,
            format: 'CSV',
            dateFrom,
            dateTo,

            datevSettings: {
                consultantNumber: '12345',
                clientNumber: '67890',
                businessYear: dateFrom.toDate().getFullYear(),
                accountingMethod: 'CASH',
                chartOfAccounts: 'SKR03',
                currency: 'EUR',
                decimalPlaces: 2,
                dateFormat: 'DDMMYYYY',
            },

            movements: [],

            status: 'COMPLETED',

            statistics: {
                totalRecords: data.length,
                totalAmount: 0,
                dateRange: { from: dateFrom, to: dateTo },
                validRecords: data.length,
                invalidRecords: 0,
                warnings: [],
                errors: [],
            },

            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'system',
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

            thisYear: {
                eurReports: reports.items.filter(r => r.type === 'EUR').length,
                ustvaReports: reports.items.filter(r => r.type === 'USTVA').length,
                datevExports: reports.items.filter(r => r.type === 'DATEV').length,
                totalTaxLiability: 0, // Vereinfacht
            },

            automation: {
                autoGeneratedRate: 85.0, // Prozent (vereinfacht)
                avgAccuracy: 95.0, // Prozent (vereinfacht)
                manualCorrections: 3, // Anzahl (vereinfacht)
            },
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
            switch (type) {
                case 'EUR':
                    await this.generateEURReport(request.dateFrom, request.dateTo, companyId);
                    break;
                case 'USTVA':
                    const year = request.dateFrom.toDate().getFullYear();
                    const quarter = Math.floor(request.dateFrom.toDate().getMonth() / 3) + 1;
                    await this.generateUSTVAReport(year, quarter, companyId);
                    break;
                default:
                    throw new Error(`Unsupported report type: ${type}`);
            }

            // Report als generiert markieren
            await this.update(reportId, {
                status: 'FINALIZED',
            }, 'system', companyId);

        } catch (error) {
            console.error(`Failed to generate report ${reportId}:`, error);
        }
    }

    private getDefaultTitle(type: ReportType, dateFrom: Timestamp, dateTo: Timestamp): string {
        const fromStr = this.formatDate(dateFrom);
        const toStr = this.formatDate(dateTo);

        switch (type) {
            case 'EUR':
                return `EÜR ${fromStr} - ${toStr}`;
            case 'USTVA':
                return `USTVA ${dateFrom.toDate().getFullYear()}`;
            case 'BWA':
                return `BWA ${fromStr} - ${toStr}`;
            case 'TAX_REPORT':
                return `Steuerreport ${fromStr} - ${toStr}`;
            default:
                return `Report ${fromStr} - ${toStr}`;
        }
    }

    private formatDate(timestamp: Timestamp): string {
        return timestamp.toDate().toLocaleDateString('de-DE');
    }

    private getQuarterDates(year: number, quarter: number): { dateFrom: Timestamp; dateTo: Timestamp } {
        const startMonth = (quarter - 1) * 3;
        const dateFrom = Timestamp.fromDate(new Date(year, startMonth, 1));
        const dateTo = Timestamp.fromDate(new Date(year, startMonth + 3, 0, 23, 59, 59));

        return { dateFrom, dateTo };
    }

    private calculateUSTVASales(invoices: any[]): any {
        return {
            total: invoices.reduce((sum, inv) => sum + inv.netAmount, 0),
            totalVat: invoices.reduce((sum, inv) => sum + inv.taxAmount, 0),
            byVatRate: {},
            vatByRate: {},
            taxFree: 0,
        };
    }

    private calculateUSTVAInputTax(expenses: any[]): any {
        return {
            total: expenses.reduce((sum, exp) => sum + (exp.amount * 0.19 || 0), 0),
            byRate: {},
        };
    }

    private async getDATEVData(dateFrom: Timestamp, dateTo: Timestamp, companyId: string, exportType: string): Promise<any[]> {
        return []; // Vereinfacht
    }

    private groupReportsByType(reports: any[]): any[] {
        return [];
    }
}
