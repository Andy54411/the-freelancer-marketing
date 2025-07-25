// firebase_functions/src/finance/models/payment.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import {
    PaymentData,
    PaymentStatus,
    PaymentPaymentMethod,
    CreatePaymentRequest,
    UpdatePaymentRequest,
    ProcessPaymentRequest,
    PaymentSearchFilters,
    PaymentListResponse,
    PaymentStatistics
} from '../types';

export class PaymentModel extends BaseModel<PaymentData> {
    constructor() {
        super('payments');
    }

    // Erweiterte Zahlungs-Erstellung
    async createPayment(
        data: CreatePaymentRequest,
        userId: string,
        companyId: string
    ): Promise<PaymentData> {
        // Validierung
        this.validateRequired(data, ['type', 'method', 'amount', 'description']);

        if (data.amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        // Zahlungs-Nummer generieren
        const paymentNumber = await this.generatePaymentNumber(companyId);

        // Gebühren berechnen (vereinfacht)
        const feeAmount = this.calculateFees(data.method, data.amount);
        const netAmount = data.amount - feeAmount;

        const paymentData: Omit<PaymentData, keyof import('../types').BaseEntity> & { companyId: string } = {
            companyId,
            paymentNumber,

            // Typ & Status
            type: data.type,
            status: 'PENDING' as PaymentStatus,
            method: data.method,

            // Betragsangaben
            amount: data.amount,
            currency: data.currency || 'EUR',
            exchangeRate: data.currency && data.currency !== 'EUR' ? undefined : 1,
            feeAmount,
            netAmount,

            // Datumsangaben
            paymentDate: data.paymentDate || Timestamp.now(),
            valueDate: undefined,
            dueDate: undefined,

            // Zahlungsdetails
            description: data.description,
            reference: data.reference,
            bankDetails: data.bankDetails,
            gatewayData: undefined,

            // Zuordnung
            invoiceId: data.invoiceId,
            expenseId: data.expenseId,
            customerId: data.customerId,
            vendorId: data.vendorId,

            // Abgleich
            reconciliation: {
                reconciled: false,
            },

            // Stornierung/Erstattung
            originalPaymentId: undefined,
            refundedAmount: undefined,
            refundReason: undefined,

            // Zusätzliche Informationen
            notes: data.notes,
            tags: data.tags || [],
            attachments: [],

            // Workflow
            approvedBy: undefined,
            approvedAt: undefined,
            processedBy: undefined,
            processedAt: undefined,
        };

        return await this.create(paymentData, userId);
    }

    // Zahlung aktualisieren
    async updatePayment(
        id: string,
        updates: UpdatePaymentRequest,
        userId: string,
        companyId: string
    ): Promise<PaymentData> {
        const existing = await this.getById(id, companyId);
        if (!existing) {
            throw new Error('Payment not found');
        }

        // Status-spezifische Validierungen
        if (existing.status === 'COMPLETED' || existing.status === 'REFUNDED') {
            throw new Error('Completed or refunded payments cannot be updated');
        }

        const updateData: any = {
            status: updates.status,
            paymentDate: updates.paymentDate,
            valueDate: updates.valueDate,
            description: updates.description,
            reference: updates.reference,
            notes: updates.notes,
            tags: updates.tags,
        };

        // Abgleichsinformationen
        if (updates.reconciled !== undefined) {
            updateData['reconciliation.reconciled'] = updates.reconciled;
            if (updates.reconciled) {
                updateData['reconciliation.reconciledAt'] = Timestamp.now();
                updateData['reconciliation.reconciledBy'] = userId;
            }
            updateData['reconciliation.bankStatementReference'] = updates.bankStatementReference;
            updateData['reconciliation.discrepancyAmount'] = updates.discrepancyAmount;
            updateData['reconciliation.discrepancyReason'] = updates.discrepancyReason;
        }

        return await this.update(id, updateData, userId, companyId);
    }

    // Zahlung verarbeiten (Freigabe, Ablehnung, etc.)
    async processPayment(
        request: ProcessPaymentRequest,
        userId: string,
        companyId: string
    ): Promise<PaymentData> {
        const existing = await this.getById(request.paymentId, companyId);
        if (!existing) {
            throw new Error('Payment not found');
        }

        const updateData: any = {
            processedBy: userId,
            processedAt: Timestamp.now(),
        };

        switch (request.action) {
            case 'APPROVE':
                if (existing.status !== 'PENDING') {
                    throw new Error('Only pending payments can be approved');
                }
                updateData.status = 'PROCESSING';
                updateData.approvedBy = userId;
                updateData.approvedAt = Timestamp.now();
                break;

            case 'REJECT':
                if (existing.status !== 'PENDING') {
                    throw new Error('Only pending payments can be rejected');
                }
                updateData.status = 'CANCELLED';
                updateData.notes = request.reason || 'Payment rejected';
                break;

            case 'PROCESS':
                if (existing.status !== 'PROCESSING') {
                    throw new Error('Only processing payments can be completed');
                }
                updateData.status = 'COMPLETED';
                break;

            case 'CANCEL':
                if (!['PENDING', 'PROCESSING'].includes(existing.status)) {
                    throw new Error('Only pending or processing payments can be cancelled');
                }
                updateData.status = 'CANCELLED';
                updateData.notes = request.reason || 'Payment cancelled';
                break;

            case 'REFUND':
                if (existing.status !== 'COMPLETED') {
                    throw new Error('Only completed payments can be refunded');
                }

                const refundAmount = request.refundAmount || existing.amount;
                if (refundAmount > existing.amount) {
                    throw new Error('Refund amount cannot exceed original payment amount');
                }

                // Neue Refund-Zahlung erstellen
                await this.createRefundPayment(
                    existing,
                    refundAmount,
                    request.reason,
                    userId,
                    companyId
                );

                // Original-Zahlung als erstattet markieren
                updateData.status = 'REFUNDED';
                updateData.refundedAmount = refundAmount;
                updateData.refundReason = request.reason;

                break;

            default:
                throw new Error(`Unknown payment action: ${request.action}`);
        }

        return await this.update(request.paymentId, updateData, userId, companyId);
    }

    // Erweiterte Suche
    async searchPayments(
        companyId: string,
        filters: PaymentSearchFilters,
        pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
    ): Promise<PaymentListResponse> {
        const result = await this.list(companyId, pagination, {
            type: filters.type,
            status: filters.status,
            method: filters.method,
            customerId: filters.customerId,
            vendorId: filters.vendorId,
            invoiceId: filters.invoiceId,
            expenseId: filters.expenseId,
        });

        // Zusätzliche Filterung im Memory
        let filteredItems = result.items;

        // Datumsbereich-Filter
        if (filters.dateFrom || filters.dateTo) {
            filteredItems = filteredItems.filter(payment => {
                const paymentDate = payment.paymentDate;
                if (filters.dateFrom && paymentDate.toMillis() < filters.dateFrom.toMillis()) {
                    return false;
                }
                if (filters.dateTo && paymentDate.toMillis() > filters.dateTo.toMillis()) {
                    return false;
                }
                return true;
            });
        }

        // Betragsspanne-Filter
        if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
            filteredItems = filteredItems.filter(payment => {
                if (filters.amountMin !== undefined && payment.amount < filters.amountMin) {
                    return false;
                }
                if (filters.amountMax !== undefined && payment.amount > filters.amountMax) {
                    return false;
                }
                return true;
            });
        }

        // Abgleichsstatus-Filter
        if (filters.reconciled !== undefined) {
            filteredItems = filteredItems.filter(payment =>
                payment.reconciliation.reconciled === filters.reconciled
            );
        }

        // Text-Suche
        if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(payment =>
                payment.description.toLowerCase().includes(searchTerm) ||
                (payment.reference && payment.reference.toLowerCase().includes(searchTerm))
            );
        }

        return {
            payments: filteredItems,
            total: filteredItems.length,
            page: pagination.page || 1,
            limit: pagination.limit || 20,
            hasNext: false, // Vereinfacht
        };
    }

    // Statistiken generieren
    async getStatistics(
        companyId: string,
        filters: { dateFrom?: Timestamp; dateTo?: Timestamp } = {}
    ): Promise<PaymentStatistics> {
        const allPayments = await this.list(companyId, { limit: 1000 });

        let payments = allPayments.items;

        // Datumsfilter anwenden
        if (filters.dateFrom || filters.dateTo) {
            payments = payments.filter(payment => {
                const paymentDate = payment.paymentDate;
                if (filters.dateFrom && paymentDate.toMillis() < filters.dateFrom.toMillis()) {
                    return false;
                }
                if (filters.dateTo && paymentDate.toMillis() > filters.dateTo.toMillis()) {
                    return false;
                }
                return true;
            });
        }

        const totalPayments = payments.length;
        const incomingPayments = payments.filter(p => p.type === 'INCOMING');
        const outgoingPayments = payments.filter(p => p.type === 'OUTGOING');

        const totalIncoming = incomingPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalOutgoing = outgoingPayments.reduce((sum, p) => sum + p.amount, 0);
        const netFlow = totalIncoming - totalOutgoing;

        // Zahlungsmethoden-Statistik
        const methodMap = new Map<string, { count: number; amount: number }>();
        payments.forEach(payment => {
            const existing = methodMap.get(payment.method) || { count: 0, amount: 0 };
            existing.count++;
            existing.amount += payment.amount;
            methodMap.set(payment.method, existing);
        });

        const byMethod = Array.from(methodMap.entries()).map(([method, stats]) => ({
            method: method as PaymentPaymentMethod,
            count: stats.count,
            amount: stats.amount,
        }));

        // Status-Statistik
        const statusMap = new Map<string, { count: number; amount: number }>();
        payments.forEach(payment => {
            const existing = statusMap.get(payment.status) || { count: 0, amount: 0 };
            existing.count++;
            existing.amount += payment.amount;
            statusMap.set(payment.status, existing);
        });

        const byStatus = Array.from(statusMap.entries()).map(([status, stats]) => ({
            status: status as PaymentStatus,
            count: stats.count,
            amount: stats.amount,
        }));

        // Ausstehende Zahlungen
        const pendingPayments = payments.filter(p => p.status === 'PENDING');
        const pending = {
            count: pendingPayments.length,
            amount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        };

        // Überfällige Zahlungen (vereinfacht)
        const overduePayments = payments.filter(p =>
            p.dueDate && p.dueDate.toMillis() < Date.now() && p.status !== 'COMPLETED'
        );
        const overdue = {
            count: overduePayments.length,
            amount: overduePayments.reduce((sum, p) => sum + p.amount, 0),
        };

        // Abgleichsstatistik
        const reconciledPayments = payments.filter(p => p.reconciliation.reconciled);
        const unreconciledPayments = payments.filter(p => !p.reconciliation.reconciled);
        const discrepancyPayments = payments.filter(p =>
            p.reconciliation.discrepancyAmount && p.reconciliation.discrepancyAmount !== 0
        );

        const reconciliation = {
            reconciled: reconciledPayments.length,
            unreconciled: unreconciledPayments.length,
            discrepancies: discrepancyPayments.length,
            discrepancyAmount: discrepancyPayments.reduce((sum, p) =>
                sum + (p.reconciliation.discrepancyAmount || 0), 0
            ),
        };

        return {
            totalPayments,
            totalIncoming,
            totalOutgoing,
            netFlow,
            byMethod,
            byStatus,
            pending,
            overdue,
            reconciliation,
        };
    }

    // Private Hilfsmethoden

    private calculateFees(method: PaymentPaymentMethod, amount: number): number {
        // Vereinfachte Gebührenberechnung
        switch (method) {
            case 'CREDIT_CARD':
                return Math.round(amount * 0.029); // 2.9%
            case 'PAYPAL':
                return Math.round(amount * 0.035); // 3.5%
            case 'STRIPE':
                return Math.round(amount * 0.029 + 30); // 2.9% + 30 Cent
            default:
                return 0;
        }
    }

    private async createRefundPayment(
        originalPayment: PaymentData,
        refundAmount: number,
        reason: string | undefined,
        userId: string,
        companyId: string
    ): Promise<PaymentData> {
        const refundData: CreatePaymentRequest = {
            type: originalPayment.type === 'INCOMING' ? 'OUTGOING' : 'INCOMING',
            method: originalPayment.method,
            amount: refundAmount,
            currency: originalPayment.currency,
            description: `Refund for payment ${originalPayment.paymentNumber}`,
            reference: `REFUND-${originalPayment.paymentNumber}`,
            invoiceId: originalPayment.invoiceId,
            expenseId: originalPayment.expenseId,
            customerId: originalPayment.customerId,
            vendorId: originalPayment.vendorId,
            notes: reason,
        };

        const refundPayment = await this.createPayment(refundData, userId, companyId);

        // Refund-Referenz hinzufügen
        await this.update(refundPayment.id, {
            originalPaymentId: originalPayment.id,
        } as any, userId, companyId);

        return refundPayment;
    }

    private async generatePaymentNumber(companyId: string): Promise<string> {
        const year = new Date().getFullYear();
        const companyShort = companyId.slice(-4).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);

        return `P${year}-${companyShort}-${timestamp}`;
    }
}
