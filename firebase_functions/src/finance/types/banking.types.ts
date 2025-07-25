// firebase_functions/src/finance/types/banking.types.ts

import { Timestamp } from 'firebase-admin/firestore';

export interface BankAccount {
    id: string;
    companyId: string;

    // Bank-Details
    bankName: string;
    iban: string;
    bic: string;
    accountHolder: string;
    accountNumber?: string;
    bankCode?: string;

    // Account-Typ
    accountType: 'CHECKING' | 'SAVINGS' | 'BUSINESS' | 'OTHER';
    currency: string;

    // Status
    isActive: boolean;
    isDefault: boolean;

    // Integration
    autoSync: boolean;              // Automatische Umsatz-Synchronisation
    lastSyncAt?: Timestamp;
    syncProvider?: 'PSD2' | 'FIGO' | 'FINAPI' | 'MANUAL';

    // Metadaten
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

export interface BankTransaction {
    id: string;
    companyId: string;
    bankAccountId: string;

    // Transaction-Details
    transactionId: string;          // Bank-interne ID
    reference: string;              // Verwendungszweck
    amount: number;                 // Betrag in Cent
    currency: string;

    // Kontrahent
    counterpartyName?: string;
    counterpartyIban?: string;
    counterpartyBic?: string;

    // Datumsangaben
    bookingDate: Timestamp;         // Buchungsdatum
    valueDate: Timestamp;           // Valutadatum

    // Kategorisierung
    category?: string;
    subcategory?: string;
    isRecurring: boolean;

    // Zuordnung zu Finance-Modulen
    matchedInvoiceId?: string;
    matchedExpenseId?: string;
    matchedPaymentId?: string;

    // Automatische Erkennung
    autoMatched: boolean;
    matchConfidence?: number;       // 0-100%
    matchedAt?: Timestamp;

    // Status
    status: 'IMPORTED' | 'MATCHED' | 'REVIEWED' | 'IGNORED';
    reviewedBy?: string;
    reviewedAt?: Timestamp;

    // Metadaten
    importedAt: Timestamp;
    rawData?: Record<string, any>;  // Original Bank-Daten
}

export interface SEPADirectDebit {
    id: string;
    companyId: string;

    // SEPA-Details
    mandateId: string;              // Mandatsreferenz
    creditorId: string;             // Gläubiger-ID
    customerId: string;             // Kunden-ID

    // Zahlung
    amount: number;                 // Betrag in Cent
    currency: string;
    description: string;            // Verwendungszweck

    // Debtor (Zahlungspflichtiger)
    debtorName: string;
    debtorIban: string;
    debtorBic?: string;

    // Zeitplanung
    collectionDate: Timestamp;      // Einzugsdatum
    sequenceType: 'FRST' | 'RCUR' | 'OOFF' | 'FNAL';

    // Status
    status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'RETURNED';

    // Verknüpfung
    invoiceId?: string;
    paymentId?: string;

    // Batch-Info
    batchId?: string;
    batchSubmittedAt?: Timestamp;

    // Fehlerbehandlung
    errorCode?: string;
    errorMessage?: string;
    returnReason?: string;

    // Metadaten
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

export interface SEPABatch {
    id: string;
    companyId: string;

    // Batch-Details
    batchReference: string;
    messageId: string;
    collectionDate: Timestamp;

    // Zusammenfassung
    totalAmount: number;            // Gesamtbetrag in Cent
    transactionCount: number;
    currency: string;

    // Status
    status: 'CREATED' | 'VALIDATED' | 'SUBMITTED' | 'PROCESSED' | 'REJECTED';

    // Bank-Details
    creditorAccount: {
        iban: string;
        bic: string;
        name: string;
    };

    // Validation
    validationErrors?: string[];

    // Submission
    submittedAt?: Timestamp;
    submittedBy?: string;
    bankReference?: string;

    // Processing
    processedAt?: Timestamp;
    acceptedCount?: number;
    rejectedCount?: number;

    // Metadaten
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

// Request/Response Types

export interface CreateBankAccountRequest {
    bankName: string;
    iban: string;
    bic: string;
    accountHolder: string;
    accountType: 'CHECKING' | 'SAVINGS' | 'BUSINESS' | 'OTHER';
    currency?: string;
    isDefault?: boolean;
    autoSync?: boolean;
    syncProvider?: 'PSD2' | 'FIGO' | 'FINAPI' | 'MANUAL';
}

export interface UpdateBankAccountRequest {
    bankName?: string;
    accountHolder?: string;
    accountType?: 'CHECKING' | 'SAVINGS' | 'BUSINESS' | 'OTHER';
    isActive?: boolean;
    isDefault?: boolean;
    autoSync?: boolean;
}

export interface BankSyncRequest {
    accountId: string;
    dateFrom?: Timestamp;
    dateTo?: Timestamp;
    forceSync?: boolean;
}

export interface CreateSEPAMandateRequest {
    customerId: string;
    mandateId: string;
    creditorId: string;
    debtorName: string;
    debtorIban: string;
    debtorBic?: string;
    sequenceType: 'FRST' | 'RCUR' | 'OOFF' | 'FNAL';
}

export interface CreateSEPADirectDebitRequest {
    mandateId: string;
    customerId: string;
    amount: number;
    description: string;
    collectionDate: Timestamp;
    invoiceId?: string;
}

export interface BankTransactionSearchFilters {
    bankAccountId?: string;
    dateFrom?: Timestamp;
    dateTo?: Timestamp;
    amountMin?: number;
    amountMax?: number;
    status?: ('IMPORTED' | 'MATCHED' | 'REVIEWED' | 'IGNORED')[];
    category?: string;
    searchTerm?: string;
    unmatched?: boolean;
}

export interface BankingStatistics {
    totalAccounts: number;
    activeAccounts: number;
    totalBalance: number;

    transactions: {
        total: number;
        matched: number;
        unmatched: number;
        thisMonth: number;
    };

    sepa: {
        totalMandates: number;
        activeMandates: number;
        thisMonthCollections: number;
        thisMonthAmount: number;
    };

    automation: {
        autoMatchRate: number;        // Prozentsatz
        avgMatchConfidence: number;
        unreviewedTransactions: number;
    };
}
