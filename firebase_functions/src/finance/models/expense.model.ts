// firebase_functions/src/finance/models/expense.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import {
    ExpenseData,
    ExpenseStatus,
    ExpenseCategory,
    CreateExpenseRequest,
    UpdateExpenseRequest,
    ExpenseSearchFilters,
    ExpenseListResponse,
    ExpenseApproval,
    ExpenseStatistics
} from '../types/expense.types';

export class ExpenseModel extends BaseModel<ExpenseData> {
    constructor() {
        super('expenses');
    }

    // Erweiterte Ausgaben-Erstellung
    async createExpense(
        data: CreateExpenseRequest,
        userId: string,
        companyId: string
    ): Promise<ExpenseData> {
        // Validierung
        this.validateRequired(data, ['category', 'amount', 'description', 'paymentMethod']);

        if (data.amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        // Ausgaben-Nummer generieren
        const expenseNumber = await this.generateExpenseNumber(companyId);

        // Steuerliche Informationen verarbeiten
        const taxInfo = this.processTaxInfo(data);

        // Freigabe-Workflow prüfen
        const requiresApproval = this.checkApprovalRequired(data.amount, companyId);

        const expenseData: Omit<ExpenseData, keyof import('../types').BaseEntity> & { companyId: string } = {
            companyId,
            expenseNumber,

            // Status & Kategorie
            status: requiresApproval ? 'PENDING' as ExpenseStatus : 'APPROVED' as ExpenseStatus,
            category: data.category,

            // Betragsangaben
            amount: data.amount,
            currency: data.currency || 'EUR',
            exchangeRate: data.currency && data.currency !== 'EUR' ? undefined : 1,

            // Steuerliche Informationen
            taxInfo,

            // Datum & Beschreibung
            expenseDate: data.expenseDate || Timestamp.now(),
            description: data.description,
            vendor: data.vendor,

            // Zahlungsinformationen
            paymentMethod: data.paymentMethod,
            paymentDate: data.paymentDate,
            paymentReference: undefined,

            // Belege
            receipts: [], // Werden separat hochgeladen
            hasReceipt: false,

            // Freigabe-Workflow
            requiresApproval,
            approvalThreshold: this.getApprovalThreshold(companyId),

            // Zuordnung
            assignedUserId: userId, // Standardmäßig der Ersteller
            projectId: data.projectId,
            customerId: data.customerId,

            // Erstattung
            reimbursable: data.reimbursable || false,

            // Zusätzliche Informationen
            notes: data.notes,
            tags: data.tags || [],

            // GoBD-Compliance
            gobd: {
                archived: false,
                immutable: false,
            },
        };

        return await this.create(expenseData, userId);
    }

    // Ausgabe aktualisieren
    async updateExpense(
        id: string,
        updates: UpdateExpenseRequest,
        userId: string,
        companyId: string
    ): Promise<ExpenseData> {
        const existing = await this.getById(id, companyId);
        if (!existing) {
            throw new Error('Expense not found');
        }

        // Berechtigung prüfen
        if (existing.assignedUserId !== userId && !this.hasApprovalPermission(userId, companyId)) {
            throw new Error('Not authorized to update this expense');
        }

        // Status-spezifische Validierungen
        if (existing.status === 'PAID' || existing.gobd.immutable) {
            throw new Error('Paid expenses cannot be updated');
        }

        const updateData: any = {
            category: updates.category,
            amount: updates.amount,
            description: updates.description,
            vendor: updates.vendor,
            expenseDate: updates.expenseDate,
            paymentMethod: updates.paymentMethod,
            paymentDate: updates.paymentDate,
            projectId: updates.projectId,
            customerId: updates.customerId,
            reimbursable: updates.reimbursable,
            notes: updates.notes,
            tags: updates.tags,
        };

        // Steuerliche Informationen aktualisieren
        if (updates.taxRate !== undefined || updates.isDeductible !== undefined) {
            const taxInfo = this.processTaxInfo({
                amount: updates.amount || existing.amount,
                taxRate: updates.taxRate || existing.taxInfo.taxRate,
                isDeductible: updates.isDeductible !== undefined ? updates.isDeductible : existing.taxInfo.isDeductible,
            });
            updateData.taxInfo = taxInfo;
        }

        // Status-Updates (nur für Freigeber)
        if (updates.status && this.hasApprovalPermission(userId, companyId)) {
            updateData.status = updates.status;

            if (updates.status === 'APPROVED') {
                updateData.approval = {
                    approvedBy: userId,
                    approvedAt: Timestamp.now(),
                    approvalNote: updates.approvalNote,
                };
            } else if (updates.status === 'REJECTED') {
                updateData.approval = {
                    approvedBy: userId,
                    approvedAt: Timestamp.now(),
                    rejectionReason: updates.rejectionReason,
                    approvalNote: updates.approvalNote,
                };
            }
        }

        return await this.update(id, updateData, userId, companyId);
    }

    // Ausgabe genehmigen/ablehnen
    async processApproval(
        id: string,
        action: 'APPROVE' | 'REJECT',
        userId: string,
        companyId: string,
        reason?: string,
        note?: string
    ): Promise<ExpenseData> {
        const existing = await this.getById(id, companyId);
        if (!existing) {
            throw new Error('Expense not found');
        }

        if (!this.hasApprovalPermission(userId, companyId)) {
            throw new Error('Not authorized to approve expenses');
        }

        if (existing.status !== 'PENDING') {
            throw new Error('Only pending expenses can be approved or rejected');
        }

        const approval: ExpenseApproval = {
            approvedBy: userId,
            approvedAt: Timestamp.now(),
        };

        const updateData: any = {
            approval,
        };

        if (action === 'APPROVE') {
            updateData.status = 'APPROVED';
            approval.approvalNote = note;
        } else {
            updateData.status = 'REJECTED';
            approval.rejectionReason = reason || 'No reason provided';
            approval.approvalNote = note;
        }

        return await this.update(id, updateData, userId, companyId);
    }

    // Erweiterte Suche
    async searchExpenses(
        companyId: string,
        filters: ExpenseSearchFilters,
        pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
    ): Promise<ExpenseListResponse> {
        const result = await this.list(companyId, pagination, {
            status: filters.status,
            category: filters.category,
            assignedUserId: filters.assignedUserId,
            projectId: filters.projectId,
            customerId: filters.customerId,
            reimbursable: filters.reimbursable,
            requiresApproval: filters.requiresApproval,
        });

        // Zusätzliche Filterung im Memory
        let filteredItems = result.items;

        // Datumsbereich-Filter
        if (filters.dateFrom || filters.dateTo) {
            filteredItems = filteredItems.filter(expense => {
                const expenseDate = expense.expenseDate;
                if (filters.dateFrom && expenseDate.toMillis() < filters.dateFrom.toMillis()) {
                    return false;
                }
                if (filters.dateTo && expenseDate.toMillis() > filters.dateTo.toMillis()) {
                    return false;
                }
                return true;
            });
        }

        // Betragsspanne-Filter
        if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
            filteredItems = filteredItems.filter(expense => {
                if (filters.amountMin !== undefined && expense.amount < filters.amountMin) {
                    return false;
                }
                if (filters.amountMax !== undefined && expense.amount > filters.amountMax) {
                    return false;
                }
                return true;
            });
        }

        // Beleg-Filter
        if (filters.hasReceipt !== undefined) {
            filteredItems = filteredItems.filter(expense =>
                expense.hasReceipt === filters.hasReceipt
            );
        }

        // Text-Suche
        if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(expense =>
                expense.description.toLowerCase().includes(searchTerm) ||
                (expense.vendor && expense.vendor.toLowerCase().includes(searchTerm))
            );
        }

        return {
            expenses: filteredItems,
            total: filteredItems.length,
            page: pagination.page || 1,
            limit: pagination.limit || 20,
            hasNext: false, // Vereinfacht
        };
    }

    // Beleg hinzufügen
    async addReceipt(
        id: string,
        receipt: {
            fileName: string;
            fileUrl: string;
            mimeType: string;
            fileSize: number;
        },
        userId: string,
        companyId: string
    ): Promise<ExpenseData> {
        const existing = await this.getById(id, companyId);
        if (!existing) {
            throw new Error('Expense not found');
        }

        const newReceipt = {
            id: this.generateReceiptId(),
            ...receipt,
            uploadedAt: Timestamp.now(),
        };

        const updatedReceipts = [...existing.receipts, newReceipt];

        return await this.update(id, {
            receipts: updatedReceipts,
            hasReceipt: true,
        } as any, userId, companyId);
    }

    // Statistiken generieren
    async getStatistics(
        companyId: string,
        filters: { dateFrom?: Timestamp; dateTo?: Timestamp } = {}
    ): Promise<ExpenseStatistics> {
        const allExpenses = await this.list(companyId, { limit: 1000 });

        let expenses = allExpenses.items;

        // Datumsfilter anwenden
        if (filters.dateFrom || filters.dateTo) {
            expenses = expenses.filter(expense => {
                const expenseDate = expense.expenseDate;
                if (filters.dateFrom && expenseDate.toMillis() < filters.dateFrom.toMillis()) {
                    return false;
                }
                if (filters.dateTo && expenseDate.toMillis() > filters.dateTo.toMillis()) {
                    return false;
                }
                return true;
            });
        }

        const totalExpenses = expenses.length;
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const averageAmount = totalExpenses > 0 ? Math.round(totalAmount / totalExpenses) : 0;

        // Kategorien-Statistik
        const categoryMap = new Map<string, { count: number; amount: number }>();
        expenses.forEach(expense => {
            const existing = categoryMap.get(expense.category) || { count: 0, amount: 0 };
            existing.count++;
            existing.amount += expense.amount;
            categoryMap.set(expense.category, existing);
        });

        const byCategory = Array.from(categoryMap.entries()).map(([category, stats]) => ({
            category: category as ExpenseCategory,
            count: stats.count,
            amount: stats.amount,
        }));

        // Status-Statistik
        const statusMap = new Map<string, { count: number; amount: number }>();
        expenses.forEach(expense => {
            const existing = statusMap.get(expense.status) || { count: 0, amount: 0 };
            existing.count++;
            existing.amount += expense.amount;
            statusMap.set(expense.status, existing);
        });

        const byStatus = Array.from(statusMap.entries()).map(([status, stats]) => ({
            status: status as ExpenseStatus,
            count: stats.count,
            amount: stats.amount,
        }));

        // Freigabe-Statistik
        const pendingExpenses = expenses.filter(e => e.status === 'PENDING');
        const pendingApproval = {
            count: pendingExpenses.length,
            amount: pendingExpenses.reduce((sum, e) => sum + e.amount, 0),
        };

        // Steuerlich absetzbare Ausgaben
        const deductibleExpenses = expenses.filter(e => e.taxInfo.isDeductible);
        const taxDeductible = {
            count: deductibleExpenses.length,
            netAmount: deductibleExpenses.reduce((sum, e) => sum + e.taxInfo.netAmount, 0),
            taxAmount: deductibleExpenses.reduce((sum, e) => sum + e.taxInfo.taxAmount, 0),
        };

        return {
            totalExpenses,
            totalAmount,
            averageAmount,
            byCategory,
            byStatus,
            pendingApproval,
            taxDeductible,
        };
    }

    // Private Hilfsmethoden

    private processTaxInfo(data: { amount: number; taxRate?: number; isDeductible?: boolean }): ExpenseData['taxInfo'] {
        const taxRate = data.taxRate || 19; // Standard MwSt.
        const isDeductible = data.isDeductible !== undefined ? data.isDeductible : true;

        const grossAmount = data.amount;
        const netAmount = Math.round(grossAmount / (1 + taxRate / 100));
        const taxAmount = grossAmount - netAmount;

        return {
            isDeductible,
            taxRate,
            netAmount,
            taxAmount,
        };
    }

    private checkApprovalRequired(amount: number, companyId: string): boolean {
        // Einfache Regel: Über 500€ benötigt Freigabe
        const threshold = this.getApprovalThreshold(companyId);
        return amount > threshold;
    }

    private getApprovalThreshold(companyId: string): number {
        // TODO: Aus Company-Einstellungen laden
        return 50000; // 500€ in Cent
    }

    private hasApprovalPermission(userId: string, companyId: string): boolean {
        // TODO: Aus User-Permissions laden
        // Für jetzt vereinfacht: Company-Owner kann genehmigen
        return userId === companyId;
    }

    private generateReceiptId(): string {
        return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async generateExpenseNumber(companyId: string): Promise<string> {
        const year = new Date().getFullYear();
        const companyShort = companyId.slice(-4).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);

        return `A${year}-${companyShort}-${timestamp}`;
    }
}
