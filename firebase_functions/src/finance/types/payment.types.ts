// firebase_functions/src/finance/types/payment.types.ts

import { Timestamp } from 'firebase-admin/firestore';

export type PaymentStatus =
    | 'PENDING'        // Ausstehend
    | 'PROCESSING'     // In Bearbeitung
    | 'COMPLETED'      // Abgeschlossen
    | 'FAILED'         // Fehlgeschlagen
    | 'CANCELLED'      // Storniert
    | 'REFUNDED'       // Erstattet
    | 'DISPUTED';      // Streitig

export type PaymentType =
    | 'INCOMING'       // Zahlungseingang
    | 'OUTGOING';      // Zahlungsausgang

export type PaymentMethod =
    | 'BANK_TRANSFER'  // Überweisung
    | 'CREDIT_CARD'    // Kreditkarte
    | 'DEBIT_CARD'     // EC-Karte
    | 'DIRECT_DEBIT'   // Lastschrift
    | 'PAYPAL'         // PayPal
    | 'STRIPE'         // Stripe
    | 'CASH'           // Bar
    | 'CHECK'          // Scheck
    | 'SEPA'           // SEPA-Überweisung
    | 'OTHER';         // Sonstiges

export interface PaymentBankDetails {
    bankName?: string;
    iban?: string;
    bic?: string;
    accountHolder?: string;
    reference?: string;           // Verwendungszweck
}

export interface PaymentGatewayData {
    gateway: 'STRIPE' | 'PAYPAL' | 'OTHER';
    transactionId: string;
    gatewayPaymentId?: string;
    gatewayCustomerId?: string;
    gatewayStatus?: string;
    gatewayFee?: number;          // Gateway-Gebühr (in Cent)
    webhookData?: Record<string, any>;
}

export interface PaymentReconciliation {
    reconciled: boolean;          // Abgeglichen
    reconciledAt?: Timestamp;
    reconciledBy?: string;        // User-ID
    bankStatementReference?: string;
    discrepancyAmount?: number;   // Differenzbetrag (in Cent)
    discrepancyReason?: string;
}

export interface PaymentData {
    // Basis-Informationen
    id: string;
    companyId: string;
    paymentNumber: string;        // Eindeutige Zahlungs-Nummer

    // Typ & Status
    type: PaymentType;
    status: PaymentStatus;
    method: PaymentMethod;

    // Betragsangaben
    amount: number;               // Betrag (in Cent)
    currency: string;             // Währung
    exchangeRate?: number;        // Wechselkurs
    feeAmount?: number;           // Gebühren (in Cent)
    netAmount: number;            // Nettobetrag nach Gebühren

    // Datumsangaben
    paymentDate: Timestamp;       // Zahlungsdatum
    valueDate?: Timestamp;        // Valuta-Datum
    dueDate?: Timestamp;          // Fälligkeitsdatum

    // Zahlungsdetails
    description: string;          // Beschreibung
    reference?: string;           // Zahlungsreferenz
    bankDetails?: PaymentBankDetails;
    gatewayData?: PaymentGatewayData;

    // Zuordnung
    invoiceId?: string;           // Zugehörige Rechnung (bei INCOMING)
    expenseId?: string;           // Zugehörige Ausgabe (bei OUTGOING)
    customerId?: string;          // Kunde (bei INCOMING)
    vendorId?: string;            // Lieferant (bei OUTGOING)

    // Abgleich
    reconciliation: PaymentReconciliation;

    // Stornierung/Erstattung
    originalPaymentId?: string;   // Original-Zahlung (bei Stornierung)
    refundedAmount?: number;      // Erstatteter Betrag
    refundReason?: string;        // Erstattungsgrund

    // Zusätzliche Informationen
    notes?: string;               // Notizen
    tags?: string[];              // Tags
    attachments?: string[];       // Anhänge (Belege, etc.)

    // Workflow
    approvedBy?: string;          // Freigeber (User-ID)
    approvedAt?: Timestamp;       // Freigabe-Zeitpunkt
    processedBy?: string;         // Bearbeiter
    processedAt?: Timestamp;      // Bearbeitungszeit

    // Metadaten
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
    lastModifiedBy: string;
}

export interface CreatePaymentRequest {
    type: PaymentType;
    method: PaymentMethod;
    amount: number;
    currency?: string;
    paymentDate?: Timestamp;
    description: string;
    reference?: string;

    // Zuordnung
    invoiceId?: string;
    expenseId?: string;
    customerId?: string;
    vendorId?: string;

    // Zahlungsdetails
    bankDetails?: Omit<PaymentBankDetails, 'accountHolder'>;

    // Zusätzlich
    notes?: string;
    tags?: string[];
}

export interface UpdatePaymentRequest {
    status?: PaymentStatus;
    paymentDate?: Timestamp;
    valueDate?: Timestamp;
    description?: string;
    reference?: string;

    // Abgleich
    reconciled?: boolean;
    bankStatementReference?: string;
    discrepancyAmount?: number;
    discrepancyReason?: string;

    // Zusätzlich
    notes?: string;
    tags?: string[];
}

export interface ProcessPaymentRequest {
    paymentId: string;
    action: 'APPROVE' | 'REJECT' | 'PROCESS' | 'CANCEL' | 'REFUND';
    reason?: string;
    refundAmount?: number;        // Bei Teilerstattung
}

export interface PaymentSearchFilters {
    type?: PaymentType[];
    status?: PaymentStatus[];
    method?: PaymentMethod[];
    dateFrom?: Timestamp;
    dateTo?: Timestamp;
    amountMin?: number;
    amountMax?: number;
    customerId?: string;
    vendorId?: string;
    invoiceId?: string;
    expenseId?: string;
    reconciled?: boolean;
    searchTerm?: string;          // Suche in Beschreibung, Referenz
}

export interface PaymentListResponse {
    payments: PaymentData[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
}

export interface PaymentStatistics {
    totalPayments: number;
    totalIncoming: number;        // Zahlungseingänge (in Cent)
    totalOutgoing: number;        // Zahlungsausgänge (in Cent)
    netFlow: number;              // Netto-Cashflow

    byMethod: {
        method: PaymentMethod;
        count: number;
        amount: number;
    }[];

    byStatus: {
        status: PaymentStatus;
        count: number;
        amount: number;
    }[];

    pending: {
        count: number;
        amount: number;
    };

    overdue: {
        count: number;
        amount: number;
    };

    reconciliation: {
        reconciled: number;
        unreconciled: number;
        discrepancies: number;
        discrepancyAmount: number;
    };
}
