// firebase_functions/src/finance/models/banking.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import {
    BankAccount,
    BankTransaction,
    SEPADirectDebit,
    CreateBankAccountRequest,
    UpdateBankAccountRequest,
    CreateSEPADirectDebitRequest,
    BankTransactionSearchFilters,
    BankingStatistics
} from '../types/banking.types';

export class BankingModel extends BaseModel<BankAccount & import('../types').BaseEntity> {
    constructor() {
        super('bankAccounts');
    }

    // Bank Account Management

    async createBankAccount(
        data: CreateBankAccountRequest,
        userId: string,
        companyId: string
    ): Promise<BankAccount> {
        // Validierung
        this.validateRequired(data, ['bankName', 'iban', 'bic', 'accountHolder', 'accountType']);

        // IBAN validieren (vereinfacht)
        if (!this.validateIBAN(data.iban)) {
            throw new Error('Invalid IBAN format');
        }

        // Wenn Default-Account, andere auf false setzen
        if (data.isDefault) {
            await this.unsetDefaultAccount(companyId);
        }

        const accountData: Omit<BankAccount, keyof import('../types').BaseEntity> & { companyId: string } = {
            companyId,

            bankName: data.bankName,
            iban: data.iban.replace(/\s/g, ''), // Leerzeichen entfernen
            bic: data.bic,
            accountHolder: data.accountHolder,
            accountNumber: this.extractAccountNumber(data.iban),
            bankCode: this.extractBankCode(data.iban),

            accountType: data.accountType,
            currency: data.currency || 'EUR',

            isActive: true,
            isDefault: data.isDefault || false,

            autoSync: data.autoSync || false,
            syncProvider: data.syncProvider,
        };

        return await this.create(accountData, userId);
    }

    async updateBankAccount(
        id: string,
        updates: UpdateBankAccountRequest,
        userId: string,
        companyId: string
    ): Promise<BankAccount> {
        const existing = await this.getById(id, companyId);
        if (!existing) {
            throw new Error('Bank account not found');
        }

        // Wenn Default-Account gesetzt wird, andere auf false setzen
        if (updates.isDefault) {
            await this.unsetDefaultAccount(companyId, id);
        }

        const updateData: any = {
            bankName: updates.bankName,
            accountHolder: updates.accountHolder,
            accountType: updates.accountType,
            isActive: updates.isActive,
            isDefault: updates.isDefault,
            autoSync: updates.autoSync,
        };

        return await this.update(id, updateData, userId, companyId);
    }

    async getDefaultAccount(companyId: string): Promise<BankAccount | null> {
        const result = await this.list(companyId, { limit: 1 }, { isDefault: true, isActive: true });
        return result.items[0] || null;
    }

    // Bank Transaction Management

    async importTransactions(
        accountId: string,
        transactions: Omit<BankTransaction, 'id' | 'companyId' | 'bankAccountId' | 'importedAt'>[],
        companyId: string
    ): Promise<BankTransaction[]> {
        const account = await this.getById(accountId, companyId);
        if (!account) {
            throw new Error('Bank account not found');
        }

        const importedTransactions: BankTransaction[] = [];

        for (const txData of transactions) {
            // Duplikat-Check basierend auf transactionId
            const existing = await this.findTransactionByBankId(
                accountId,
                txData.transactionId,
                companyId
            );

            if (existing) {
                continue; // Skip duplicate
            }

            const transaction: Omit<BankTransaction, 'id'> = {
                companyId,
                bankAccountId: accountId,
                ...txData,

                // Automatische Kategorisierung
                category: await this.categorizeTransaction(txData),
                isRecurring: await this.detectRecurringTransaction(txData, companyId),

                // Auto-Matching
                autoMatched: false,
                status: 'IMPORTED',

                importedAt: Timestamp.now(),
            };

            const created = await this.createBankTransaction(transaction);

            // Auto-Matching versuchen
            await this.attemptAutoMatch(created.id, companyId);

            importedTransactions.push(created);
        }

        // Last sync time aktualisieren
        await this.update(accountId, { lastSyncAt: Timestamp.now() }, 'system', companyId);

        return importedTransactions;
    }

    async searchTransactions(
        companyId: string,
        filters: BankTransactionSearchFilters,
        pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
    ): Promise<{ transactions: BankTransaction[]; total: number; page: number; limit: number; hasNext: boolean }> {
        // Hier würde die Implementierung folgen
        // Vereinfacht für jetzt
        return {
            transactions: [],
            total: 0,
            page: pagination.page || 1,
            limit: pagination.limit || 20,
            hasNext: false
        };
    }

    // SEPA Direct Debit

    async createSEPADirectDebit(
        data: CreateSEPADirectDebitRequest,
        userId: string,
        companyId: string
    ): Promise<SEPADirectDebit> {
        // Validierung
        this.validateRequired(data, ['mandateId', 'customerId', 'amount', 'description', 'collectionDate']);

        if (data.amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        // Mandat validieren
        const mandate = await this.validateSEPAMandate(data.mandateId, companyId);
        if (!mandate) {
            throw new Error('Invalid or inactive SEPA mandate');
        }

        const sepaData: Omit<SEPADirectDebit, keyof import('../types').BaseEntity> & { companyId: string } = {
            companyId,

            mandateId: data.mandateId,
            creditorId: mandate.creditorId,
            customerId: data.customerId,

            amount: data.amount,
            currency: 'EUR',
            description: data.description,

            debtorName: mandate.debtorName,
            debtorIban: mandate.debtorIban,
            debtorBic: mandate.debtorBic,

            collectionDate: data.collectionDate,
            sequenceType: mandate.sequenceType,

            status: 'PENDING',

            invoiceId: data.invoiceId,
        };

        return await this.createSEPADebit(sepaData, userId);
    }

    async getBankingStatistics(
        companyId: string,
        filters: { dateFrom?: Timestamp; dateTo?: Timestamp } = {}
    ): Promise<BankingStatistics> {
        // Vereinfachte Implementierung
        const accounts = await this.list(companyId, { limit: 100 });

        return {
            totalAccounts: accounts.total,
            activeAccounts: accounts.items.filter(acc => acc.isActive).length,
            totalBalance: 0, // Würde aus aktuellen Kontoumsätzen berechnet

            transactions: {
                total: 0,
                matched: 0,
                unmatched: 0,
                thisMonth: 0,
            },

            sepa: {
                totalMandates: 0,
                activeMandates: 0,
                thisMonthCollections: 0,
                thisMonthAmount: 0,
            },

            automation: {
                autoMatchRate: 0,
                avgMatchConfidence: 0,
                unreviewedTransactions: 0,
            },
        };
    }

    // Private Helper Methods

    private async unsetDefaultAccount(companyId: string, exceptId?: string): Promise<void> {
        const accounts = await this.list(companyId, { limit: 100 }, { isDefault: true });

        for (const account of accounts.items) {
            if (account.id !== exceptId) {
                await this.update(account.id, { isDefault: false }, 'system', companyId);
            }
        }
    }

    private validateIBAN(iban: string): boolean {
        // Vereinfachte IBAN-Validierung
        const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/;
        return ibanRegex.test(iban.replace(/\s/g, ''));
    }

    private extractAccountNumber(iban: string): string {
        // Vereinfacht - extrahiert Kontonummer aus deutscher IBAN
        const cleanIban = iban.replace(/\s/g, '');
        if (cleanIban.startsWith('DE')) {
            return cleanIban.slice(12); // Kontonummer ab Position 12
        }
        return cleanIban.slice(8); // Fallback
    }

    private extractBankCode(iban: string): string {
        // Vereinfacht - extrahiert Bankleitzahl aus deutscher IBAN
        const cleanIban = iban.replace(/\s/g, '');
        if (cleanIban.startsWith('DE')) {
            return cleanIban.slice(4, 12); // BLZ Position 4-12
        }
        return '';
    }

    private async categorizeTransaction(txData: any): Promise<string | undefined> {
        // Automatische Kategorisierung basierend auf Verwendungszweck
        const reference = txData.reference?.toLowerCase() || '';

        if (reference.includes('gehalt') || reference.includes('lohn')) {
            return 'PERSONNEL';
        }
        if (reference.includes('miete') || reference.includes('rent')) {
            return 'RENT';
        }
        if (reference.includes('rechnung') || reference.includes('invoice')) {
            return 'REVENUE';
        }

        return undefined;
    }

    private async detectRecurringTransaction(txData: any, companyId: string): Promise<boolean> {
        // Vereinfacht - prüft auf wiederkehrende Zahlungen
        // Würde in Realität ähnliche Transaktionen analysieren
        return false;
    }

    private async findTransactionByBankId(
        accountId: string,
        transactionId: string,
        companyId: string
    ): Promise<BankTransaction | null> {
        // Vereinfachte Suche - würde echte Firestore-Query verwenden
        return null;
    }

    private async createBankTransaction(transaction: Omit<BankTransaction, 'id'>): Promise<BankTransaction> {
        // Vereinfacht - würde echte Erstellung implementieren
        return transaction as BankTransaction;
    }

    private async attemptAutoMatch(transactionId: string, companyId: string): Promise<void> {
        // Auto-Matching Logik würde hier implementiert
        // Vergleich mit offenen Rechnungen, Ausgaben, etc.
    }

    private async validateSEPAMandate(mandateId: string, companyId: string): Promise<any> {
        // Mandat-Validierung würde hier implementiert
        return {
            creditorId: 'DE98ZZZ09999999999',
            debtorName: 'Test Customer',
            debtorIban: 'DE89370400440532013000',
            debtorBic: 'COBADEFFXXX',
            sequenceType: 'RCUR' as const
        };
    }

    private async createSEPADebit(data: any, userId: string): Promise<SEPADirectDebit> {
        // Vereinfacht - würde echte SEPA-Erstellung implementieren
        return data as SEPADirectDebit;
    }
}
