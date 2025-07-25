// firebase_functions/src/finance/types/recurring.types.ts

import { Timestamp } from 'firebase-admin/firestore';

export type RecurringFrequency =
    | 'WEEKLY'
    | 'BIWEEKLY'     // Alle 2 Wochen
    | 'MONTHLY'
    | 'QUARTERLY'    // Vierteljährlich
    | 'SEMIANNUALLY' // Halbjährlich
    | 'ANNUALLY';    // Jährlich

export type RecurringStatus =
    | 'ACTIVE'       // Aktiv
    | 'PAUSED'       // Pausiert
    | 'CANCELLED'    // Storniert
    | 'COMPLETED';   // Abgeschlossen

export interface RecurringInvoiceTemplate {
    id: string;
    companyId: string;

    // Template-Details
    templateName: string;
    description?: string;

    // Basis-Rechnungsdaten (wie CreateInvoiceRequest)
    customerId: string;
    lineItems: Omit<import('./invoice.types').InvoiceLineItem, 'id' | 'totalPrice' | 'taxAmount'>[];
    introduction?: string;
    conclusion?: string;
    notes?: string;
    paymentTerms?: Partial<import('./invoice.types').InvoicePaymentTerms>;

    // Wiederholungs-Konfiguration
    frequency: RecurringFrequency;
    interval: number;                // z.B. alle 2 Monate = frequency: MONTHLY, interval: 2

    // Zeitraum
    startDate: Timestamp;
    endDate?: Timestamp;             // Optional - unbegrenzt wenn nicht gesetzt
    maxOccurrences?: number;         // Alternative zu endDate

    // Status
    status: RecurringStatus;

    // Automatisierung
    autoSend: boolean;               // Automatisch versenden
    sendDaysBefore?: number;         // X Tage vor Fälligkeit versenden

    // Nächste Ausführung
    nextExecutionDate: Timestamp;
    lastExecutionDate?: Timestamp;

    // Statistiken
    totalGenerated: number;          // Anzahl generierter Rechnungen
    totalAmount: number;             // Gesamtumsatz in Cent

    // Metadaten
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

export interface RecurringExecution {
    id: string;
    companyId: string;
    templateId: string;

    // Ausführungs-Details
    executionDate: Timestamp;
    scheduledDate: Timestamp;        // Geplantes Datum

    // Generierte Rechnung
    invoiceId?: string;              // ID der generierten Rechnung
    invoiceNumber?: string;

    // Status
    status: 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

    // Fehlerbehandlung
    attempts: number;
    maxAttempts: number;
    lastAttemptAt?: Timestamp;
    errorMessage?: string;

    // Notification
    notificationSent: boolean;
    notificationSentAt?: Timestamp;

    // Metadaten
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface RecurringInvoiceSettings {
    companyId: string;

    // Standard-Einstellungen
    defaultFrequency: RecurringFrequency;
    defaultPaymentTerms: number;     // Tage
    defaultAutoSend: boolean;
    defaultSendDaysBefore: number;

    // E-Mail-Template
    emailTemplate: {
        subject: string;
        body: string;
        includeAttachment: boolean;
    };

    // Notification-Einstellungen
    notifications: {
        onGeneration: boolean;
        onFailure: boolean;
        onCompletion: boolean;
        recipients: string[];          // E-Mail-Adressen
    };

    // Retry-Logik
    retrySettings: {
        maxAttempts: number;
        retryIntervalHours: number;
    };

    // Metadaten
    updatedAt: Timestamp;
    updatedBy: string;
}

// Request/Response Types

export interface CreateRecurringInvoiceRequest {
    templateName: string;
    description?: string;
    customerId: string;
    lineItems: Omit<import('./invoice.types').InvoiceLineItem, 'id' | 'totalPrice' | 'taxAmount'>[];
    introduction?: string;
    conclusion?: string;
    notes?: string;
    paymentTerms?: Partial<import('./invoice.types').InvoicePaymentTerms>;

    // Wiederholung
    frequency: RecurringFrequency;
    interval?: number;
    startDate: Timestamp;
    endDate?: Timestamp;
    maxOccurrences?: number;

    // Automatisierung
    autoSend?: boolean;
    sendDaysBefore?: number;
}

export interface UpdateRecurringInvoiceRequest {
    templateName?: string;
    description?: string;
    lineItems?: Omit<import('./invoice.types').InvoiceLineItem, 'id' | 'totalPrice' | 'taxAmount'>[];
    introduction?: string;
    conclusion?: string;
    notes?: string;
    paymentTerms?: Partial<import('./invoice.types').InvoicePaymentTerms>;

    // Wiederholung
    frequency?: RecurringFrequency;
    interval?: number;
    endDate?: Timestamp;
    maxOccurrences?: number;

    // Status
    status?: RecurringStatus;

    // Automatisierung
    autoSend?: boolean;
    sendDaysBefore?: number;
}

export interface RecurringInvoiceSearchFilters {
    status?: RecurringStatus[];
    customerId?: string;
    frequency?: RecurringFrequency[];
    nextExecutionFrom?: Timestamp;
    nextExecutionTo?: Timestamp;
    searchTerm?: string;
}

export interface RecurringInvoiceListResponse {
    templates: RecurringInvoiceTemplate[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
}

export interface RecurringStatistics {
    totalTemplates: number;
    activeTemplates: number;
    pausedTemplates: number;

    thisMonth: {
        scheduled: number;
        generated: number;
        failed: number;
        totalAmount: number;
    };

    nextWeek: {
        scheduled: number;
        estimatedAmount: number;
    };

    byFrequency: {
        frequency: RecurringFrequency;
        count: number;
        totalAmount: number;
    }[];

    performance: {
        successRate: number;          // Prozentsatz
        avgGenerationTime: number;    // Millisekunden
        totalRevenue: number;         // Gesamtumsatz aus wiederkehrenden Rechnungen
    };
}

// Helper für Datum-Berechnungen
export interface DateCalculationResult {
    nextDate: Timestamp;
    isValid: boolean;
    daysDifference: number;
}
