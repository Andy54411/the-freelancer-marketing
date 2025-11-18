// firebase_functions/src/finance/models/invoice.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import {
    InvoiceData,
    InvoiceStatus,
    InvoiceType,
    CreateInvoiceRequest,
    UpdateInvoiceRequest,
    InvoiceSearchFilters,
    InvoiceListResponse,
    InvoiceLineItem,
    InvoiceTaxSummary
} from '../types/invoice.types';

export class InvoiceModel extends BaseModel<InvoiceData> {
    constructor() {
        super('invoices');
    }

    // Erweiterte Erstellung mit automatischen Berechnungen
    async createInvoice(
        data: CreateInvoiceRequest,
        userId: string,
        companyId: string
    ): Promise<InvoiceData> {
        // Validierung
        this.validateRequired(data, ['customerId', 'lineItems']);

        if (!data.lineItems || data.lineItems.length === 0) {
            throw new Error('Invoice must have at least one line item');
        }

        // Rechnungsnummer generieren
        const invoiceNumber = await this.generateInvoiceNumber(companyId);

        // Line Items mit IDs und Berechnungen
        const processedLineItems = this.processLineItems(data.lineItems);

        // Gesamtbeträge berechnen
        const amounts = this.calculateTotals(processedLineItems);

        // Zahlungskonditionen setzen
        const paymentTerms = {
            dueDays: data.paymentTerms?.dueDays || 30,
            dueDate: this.calculateDueDate(data.invoiceDate || Timestamp.now(), data.paymentTerms?.dueDays || 30),
            discountDays: data.paymentTerms?.discountDays,
            discountRate: data.paymentTerms?.discountRate,
            paymentMethods: data.paymentTerms?.paymentMethods || ['BANK_TRANSFER'],
        };

        const invoiceData: Omit<InvoiceData, keyof import('../types').BaseEntity> & { companyId: string } = {
            companyId,
            invoiceNumber,
            status: 'DRAFT' as InvoiceStatus,
            type: data.type || 'STANDARD' as InvoiceType,

            // Datumsangaben
            invoiceDate: data.invoiceDate || Timestamp.now(),
            deliveryDate: data.deliveryDate,
            serviceDate: data.serviceDate,

            // Kunde (wird separat validiert)
            customerId: data.customerId,
            customerData: {} as any, // Wird in Service-Layer gefüllt

            // Positionen und Beträge
            lineItems: processedLineItems,
            netAmount: amounts.netAmount,
            taxAmount: amounts.taxAmount,
            grossAmount: amounts.grossAmount,
            taxSummary: amounts.taxSummary,

            // Zahlungskonditionen
            paymentTerms,

            // Texte
            introduction: data.introduction,
            conclusion: data.conclusion,
            notes: data.notes,

            // GoBD-Compliance
            gobd: {
                archived: false,
                immutable: false,
            },
        };

        return await this.create(invoiceData, userId);
    }

    // Rechnung aktualisieren mit Validierungen
    async updateInvoice(
        id: string,
        updates: UpdateInvoiceRequest,
        userId: string,
        companyId: string
    ): Promise<InvoiceData> {
        const existing = await this.getById(id, companyId);
        if (!existing) {
            throw new Error('Invoice not found');
        }

        // Prüfen ob Rechnung noch änderbar ist
        if (existing.gobd.immutable) {
            throw new Error('Cannot update immutable invoice');
        }

        if (['SENT', 'PAID', 'CANCELLED'].includes(existing.status)) {
            throw new Error('Cannot update invoice in current status');
        }

        const updateData: any = {
            introduction: updates.introduction,
            conclusion: updates.conclusion,
            notes: updates.notes,
            status: updates.status,
        };

        // Line Items aktualisiert?
        if (updates.lineItems) {
            const processedLineItems = this.processLineItems(updates.lineItems);
            const amounts = this.calculateTotals(processedLineItems);

            updateData.lineItems = processedLineItems;
            updateData.netAmount = amounts.netAmount;
            updateData.taxAmount = amounts.taxAmount;
            updateData.grossAmount = amounts.grossAmount;
            updateData.taxSummary = amounts.taxSummary;
        }

        // Zahlungskonditionen aktualisiert?
        if (updates.paymentTerms) {
            updateData['paymentTerms.dueDays'] = updates.paymentTerms.dueDays;
            updateData['paymentTerms.discountDays'] = updates.paymentTerms.discountDays;
            updateData['paymentTerms.discountRate'] = updates.paymentTerms.discountRate;
            updateData['paymentTerms.paymentMethods'] = updates.paymentTerms.paymentMethods;

            if (updates.paymentTerms.dueDays) {
                updateData['paymentTerms.dueDate'] = this.calculateDueDate(
                    existing.invoiceDate,
                    updates.paymentTerms.dueDays
                );
            }
        }

        return await this.update(id, updateData, userId, companyId);
    }

    // Erweiterte Suche
    async searchInvoices(
        companyId: string,
        filters: InvoiceSearchFilters,
        pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
    ): Promise<InvoiceListResponse> {
        const result = await this.list(companyId, pagination, {
            status: filters.status,
            customerId: filters.customerId,
            'syncData.sourceType': filters.sourceType,
        });

        // Zusätzliche Filterung im Memory (für komplexe Filter)
        let filteredItems = result.items;

        // Datumsfilter
        if (filters.dateFrom || filters.dateTo) {
            filteredItems = filteredItems.filter(invoice => {
                const invoiceDate = invoice.invoiceDate;
                if (filters.dateFrom && invoiceDate.toMillis() < filters.dateFrom.toMillis()) {
                    return false;
                }
                if (filters.dateTo && invoiceDate.toMillis() > filters.dateTo.toMillis()) {
                    return false;
                }
                return true;
            });
        }

        // Betragsfilter
        if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
            filteredItems = filteredItems.filter(invoice => {
                if (filters.amountMin !== undefined && invoice.grossAmount < filters.amountMin) {
                    return false;
                }
                if (filters.amountMax !== undefined && invoice.grossAmount > filters.amountMax) {
                    return false;
                }
                return true;
            });
        }

        // Rechnungsnummer-Suche
        if (filters.invoiceNumber) {
            filteredItems = filteredItems.filter(invoice =>
                invoice.invoiceNumber.toLowerCase().includes(filters.invoiceNumber!.toLowerCase())
            );
        }

        return {
            invoices: filteredItems,
            total: filteredItems.length,
            page: pagination.page || 1,
            limit: pagination.limit || 20,
            hasNext: false, // Vereinfacht, da wir hier Memory-Filterung machen
        };
    }

    // Status-Änderungen
    async updateStatus(
        id: string,
        newStatus: InvoiceStatus,
        userId: string,
        companyId: string
    ): Promise<InvoiceData> {
        const existing = await this.getById(id, companyId);
        if (!existing) {
            throw new Error('Invoice not found');
        }

        // Status-Validierung
        this.validateStatusTransition(existing.status, newStatus);

        const updateData: any = { status: newStatus };

        // Bei bestimmten Status-Änderungen zusätzliche Aktionen
        if (newStatus === 'SENT' && existing.status === 'DRAFT') {
            // Rechnung wird versendet - unveränderlich machen
            updateData['gobd.immutable'] = true;
        }

        return await this.update(id, updateData, userId, companyId);
    }

    // Hilfsmethoden
    private processLineItems(lineItems: Omit<InvoiceLineItem, 'id' | 'totalPrice' | 'taxAmount'>[]): InvoiceLineItem[] {
        return lineItems.map((item, index) => {
            const totalPrice = item.quantity * item.unitPrice;
            const taxAmount = Math.round(totalPrice * (item.taxRate / 100));

            return {
                ...item,
                id: `item_${index + 1}`,
                totalPrice,
                taxAmount,
            };
        });
    }

    private calculateTotals(lineItems: InvoiceLineItem[]): {
        netAmount: number;
        taxAmount: number;
        grossAmount: number;
        taxSummary: InvoiceTaxSummary[];
    } {
        let netAmount = 0;
        let taxAmount = 0;
        const taxGroups: { [rate: number]: { netAmount: number; taxAmount: number } } = {};

        lineItems.forEach(item => {
            netAmount += item.totalPrice;
            taxAmount += item.taxAmount;

            // Steuer-Gruppierung
            if (!taxGroups[item.taxRate]) {
                taxGroups[item.taxRate] = { netAmount: 0, taxAmount: 0 };
            }
            taxGroups[item.taxRate].netAmount += item.totalPrice;
            taxGroups[item.taxRate].taxAmount += item.taxAmount;
        });

        const taxSummary: InvoiceTaxSummary[] = Object.entries(taxGroups).map(([rate, amounts]) => ({
            taxRate: parseFloat(rate),
            netAmount: amounts.netAmount,
            taxAmount: amounts.taxAmount,
            grossAmount: amounts.netAmount + amounts.taxAmount,
        }));

        return {
            netAmount,
            taxAmount,
            grossAmount: netAmount + taxAmount,
            taxSummary,
        };
    }

    private calculateDueDate(invoiceDate: Timestamp, dueDays: number): Timestamp {
        const dueDate = new Date(invoiceDate.toDate());
        dueDate.setDate(dueDate.getDate() + dueDays);
        return Timestamp.fromDate(dueDate);
    }

    private async generateInvoiceNumber(companyId: string): Promise<string> {
        // Einfache sequenzielle Nummer - in Produktion sollte das robuster sein
        const currentYear = new Date().getFullYear();
        const companyShort = companyId.slice(-4).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);

        return `R${currentYear}-${companyShort}-${timestamp}`;
    }

    private validateStatusTransition(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): void {
        const allowedTransitions: { [key in InvoiceStatus]: InvoiceStatus[] } = {
            DRAFT: ['PENDING', 'CANCELLED'],
            PENDING: ['SENT', 'DRAFT', 'CANCELLED'],
            SENT: ['VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'],
            VIEWED: ['PAID', 'OVERDUE', 'CANCELLED'],
            PAID: ['REFUNDED'], // Nur Erstattung möglich
            OVERDUE: ['PAID', 'CANCELLED'],
            CANCELLED: [], // Keine Änderung möglich
            REFUNDED: [], // Keine Änderung möglich
        };

        if (!allowedTransitions[currentStatus].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }
}
