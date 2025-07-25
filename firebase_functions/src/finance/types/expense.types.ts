// firebase_functions/src/finance/types/expense.types.ts

import { Timestamp } from 'firebase-admin/firestore';

export type ExpenseStatus =
    | 'DRAFT'          // Entwurf
    | 'PENDING'        // Wartet auf Freigabe
    | 'APPROVED'       // Freigegeben
    | 'REJECTED'       // Abgelehnt
    | 'PAID'           // Bezahlt
    | 'ARCHIVED';      // Archiviert

export type ExpenseCategory =
    | 'OFFICE_SUPPLIES'    // Büromaterial
    | 'TRAVEL'             // Reisekosten
    | 'MEALS'              // Bewirtung
    | 'TRANSPORT'          // Transport/Fahrtkosten
    | 'EQUIPMENT'          // Ausrüstung/Hardware
    | 'SOFTWARE'           // Software/Lizenzen
    | 'MARKETING'          // Marketing/Werbung
    | 'TRAINING'           // Fortbildung
    | 'UTILITIES'          // Nebenkosten
    | 'INSURANCE'          // Versicherungen
    | 'LEGAL'              // Rechts-/Beratungskosten
    | 'TAXES'              // Steuern/Abgaben
    | 'OTHER';             // Sonstiges

export type PaymentMethod =
    | 'CASH'               // Bar
    | 'CREDIT_CARD'        // Kreditkarte
    | 'DEBIT_CARD'         // EC-Karte
    | 'BANK_TRANSFER'      // Überweisung
    | 'DIRECT_DEBIT'       // Lastschrift
    | 'PAYPAL'             // PayPal
    | 'CHECK'              // Scheck
    | 'OTHER';             // Sonstiges

export interface ExpenseReceipt {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: Timestamp;

    // OCR-Daten (falls verfügbar)
    ocrData?: {
        vendor?: string;
        amount?: number;
        date?: string;
        currency?: string;
        confidence: number;
    };
}

export interface ExpenseTaxInfo {
    isDeductible: boolean;         // Steuerlich absetzbar
    taxRate: number;               // Steuersatz
    netAmount: number;             // Nettobetrag (in Cent)
    taxAmount: number;             // Steuerbetrag (in Cent)
    foreignCurrency?: {
        currency: string;
        amount: number;
        exchangeRate: number;
        exchangeDate: Timestamp;
    };
}

export interface ExpenseApproval {
    approvedBy: string;            // User-ID des Genehmigers
    approvedAt: Timestamp;
    rejectionReason?: string;
    approvalNote?: string;
}

export interface ExpenseData {
    // Basis-Informationen
    id: string;
    companyId: string;
    expenseNumber: string;         // Eindeutige Ausgaben-Nummer

    // Status & Kategorie
    status: ExpenseStatus;
    category: ExpenseCategory;

    // Betragsangaben
    amount: number;                // Bruttobetrag (in Cent)
    currency: string;              // Währung (EUR, USD, etc.)
    exchangeRate?: number;         // Wechselkurs (falls nicht EUR)

    // Steuerliche Informationen
    taxInfo: ExpenseTaxInfo;

    // Datum & Beschreibung
    expenseDate: Timestamp;        // Ausgabendatum
    description: string;           // Beschreibung der Ausgabe
    vendor?: string;               // Lieferant/Händler

    // Zahlungsinformationen
    paymentMethod: PaymentMethod;
    paymentDate?: Timestamp;       // Zahlungsdatum
    paymentReference?: string;     // Zahlungsreferenz

    // Belege
    receipts: ExpenseReceipt[];
    hasReceipt: boolean;           // Beleg vorhanden

    // Freigabe-Workflow
    approval?: ExpenseApproval;
    requiresApproval: boolean;
    approvalThreshold?: number;    // Freigabe-Schwellenwert

    // Zuordnung
    assignedUserId: string;        // Verursacher
    projectId?: string;            // Projekt-Zuordnung
    customerId?: string;           // Kunden-Zuordnung (wenn weiterberechenbar)

    // Erstattung
    reimbursable: boolean;         // Erstattungsfähig
    reimbursedAmount?: number;     // Erstatteter Betrag
    reimbursedAt?: Timestamp;      // Erstattungsdatum

    // Zusätzliche Informationen
    notes?: string;                // Notizen
    tags?: string[];               // Tags

    // GoBD-Compliance
    gobd: {
        archived: boolean;
        immutable: boolean;
        digitalSignature?: string;
        exportedAt?: Timestamp;
    };

    // Metadaten
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
    lastModifiedBy: string;
}

export interface CreateExpenseRequest {
    category: ExpenseCategory;
    amount: number;
    currency?: string;
    description: string;
    vendor?: string;
    expenseDate?: Timestamp;
    paymentMethod: PaymentMethod;
    paymentDate?: Timestamp;

    // Steuer
    taxRate?: number;
    isDeductible?: boolean;

    // Zuordnung
    projectId?: string;
    customerId?: string;

    // Erstattung
    reimbursable?: boolean;

    // Zusätzlich
    notes?: string;
    tags?: string[];

    // Belege (werden separat hochgeladen)
    receiptIds?: string[];
}

export interface UpdateExpenseRequest {
    category?: ExpenseCategory;
    amount?: number;
    description?: string;
    vendor?: string;
    expenseDate?: Timestamp;
    paymentMethod?: PaymentMethod;
    paymentDate?: Timestamp;

    // Steuer
    taxRate?: number;
    isDeductible?: boolean;

    // Zuordnung
    projectId?: string;
    customerId?: string;

    // Erstattung
    reimbursable?: boolean;

    // Status (nur für Freigeber)
    status?: ExpenseStatus;
    rejectionReason?: string;
    approvalNote?: string;

    // Zusätzlich
    notes?: string;
    tags?: string[];
}

export interface ExpenseSearchFilters {
    status?: ExpenseStatus[];
    category?: ExpenseCategory[];
    assignedUserId?: string;
    dateFrom?: Timestamp;
    dateTo?: Timestamp;
    amountMin?: number;
    amountMax?: number;
    hasReceipt?: boolean;
    requiresApproval?: boolean;
    reimbursable?: boolean;
    projectId?: string;
    customerId?: string;
    searchTerm?: string;          // Suche in Beschreibung, Vendor
}

export interface ExpenseListResponse {
    expenses: ExpenseData[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
}

export interface ExpenseStatistics {
    totalExpenses: number;        // Anzahl
    totalAmount: number;          // Gesamtbetrag (in Cent)
    averageAmount: number;        // Durchschnittsbetrag
    byCategory: {
        category: ExpenseCategory;
        count: number;
        amount: number;
    }[];
    byStatus: {
        status: ExpenseStatus;
        count: number;
        amount: number;
    }[];
    pendingApproval: {
        count: number;
        amount: number;
    };
    taxDeductible: {
        count: number;
        netAmount: number;
        taxAmount: number;
    };
}
