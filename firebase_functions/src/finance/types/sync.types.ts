// firebase_functions/src/finance/types/sync.types.ts

import { Timestamp } from 'firebase-admin/firestore';
import { InvoiceData } from './invoice.types';
import { CustomerData } from './customer.types';

export type SyncStatus =
    | 'PENDING'        // Wartet auf Synchronisation
    | 'IN_PROGRESS'    // Synchronisation läuft
    | 'COMPLETED'      // Erfolgreich synchronisiert
    | 'FAILED'         // Fehlgeschlagen
    | 'PARTIAL'        // Teilweise synchronisiert
    | 'CANCELLED';     // Abgebrochen

export type SyncDirection =
    | 'TASKILO_TO_FINANCE'    // Taskilo → Finance
    | 'FINANCE_TO_TASKILO'    // Finance → Taskilo
    | 'BIDIRECTIONAL';        // Beide Richtungen

export type SyncEntityType =
    | 'ORDER'          // Auftrag
    | 'CUSTOMER'       // Kunde
    | 'INVOICE'        // Rechnung
    | 'PAYMENT'        // Zahlung
    | 'TIME_TRACKING'; // Zeiterfassung

export type SyncTrigger =
    | 'MANUAL'         // Manuell ausgelöst
    | 'AUTOMATIC'      // Automatisch bei Events
    | 'SCHEDULED'      // Geplant/Cronjob
    | 'WEBHOOK';       // Webhook-basiert

export interface SyncErrorDetail {
    field?: string;            // Betroffenes Feld
    code: string;              // Fehlercode
    message: string;           // Fehlermeldung
    data?: Record<string, any>; // Zusätzliche Daten
}

export interface SyncConflictResolution {
    field: string;
    taskiloValue: any;
    financeValue: any;
    resolvedValue: any;
    resolvedBy: string;        // User-ID
    resolvedAt: Timestamp;
    resolution: 'USE_TASKILO' | 'USE_FINANCE' | 'CUSTOM';
}

export interface SyncMapping {
    taskiloId: string;         // ID im Taskilo-System
    financeId: string;         // ID im Finance-System
    entityType: SyncEntityType;
    lastSyncAt: Timestamp;
    syncVersion: number;       // Versionsnummer für Konflikterkennung

    // Mapping-Details
    fieldMappings?: {
        [taskiloField: string]: string; // finance field
    };

    // Transformation-Regeln
    transformations?: {
        field: string;
        rule: string;            // z.B. "multiply_by_100" für Cent-Umrechnung
        parameters?: Record<string, any>;
    }[];
}

export interface SyncJobData {
    // Basis-Informationen
    id: string;
    companyId: string;

    // Job-Details
    entityType: SyncEntityType;
    direction: SyncDirection;
    trigger: SyncTrigger;
    status: SyncStatus;

    // Zeitangaben
    scheduledAt?: Timestamp;   // Geplante Ausführung
    startedAt?: Timestamp;     // Tatsächlicher Start
    completedAt?: Timestamp;   // Abschluss

    // Daten
    taskiloEntityId?: string;  // ID der Quell-Entity
    financeEntityId?: string;  // ID der Ziel-Entity
    sourceData?: Record<string, any>; // Original-Daten
    transformedData?: Record<string, any>; // Transformierte Daten

    // Fortschritt
    totalItems: number;        // Gesamtanzahl zu synchronisierender Items
    processedItems: number;    // Verarbeitete Items
    successfulItems: number;   // Erfolgreich synchronisiert
    failedItems: number;       // Fehlgeschlagen

    // Mapping & Konflikte
    mappings: SyncMapping[];
    conflicts: SyncConflictResolution[];

    // Fehler & Logs
    errors: SyncErrorDetail[];
    warnings: string[];
    logs: string[];

    // Zusätzliche Optionen
    options: {
        forceOverwrite?: boolean;    // Überschreibung erzwingen
        skipConflicts?: boolean;     // Konflikte überspringen
        dryRun?: boolean;           // Testlauf ohne Änderungen
        backupBeforeSync?: boolean;  // Backup vor Sync
    };

    // Metadaten
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
    lastModifiedBy?: string;
}

// Spezielle Sync-Datenstrukturen für verschiedene Entity-Typen

export interface OrderToInvoiceSyncData {
    taskiloOrderId: string;
    companyId: string;

    // Auftrags-Daten aus Taskilo
    orderData: {
        id: string;
        customerId?: string;
        customerEmail?: string;
        customerName?: string;
        serviceDescription: string;
        hourlyRate?: number;       // in Cent
        estimatedHours?: number;
        actualHours?: number;
        totalAmount: number;       // in Cent
        status: string;
        createdAt: Timestamp;
        completedAt?: Timestamp;
    };

    // TimeTracking-Daten
    timeTrackingData?: {
        totalHours: number;
        dailyEntries: {
            date: string;
            hours: number;
            description?: string;
        }[];
    };

    // Generierte Rechnung
    generatedInvoice?: InvoiceData;

    // Kunde-Mapping
    customerMapping?: {
        taskiloCustomerId?: string;
        financeCustomerId?: string;
        customerCreated: boolean;
        customerData?: CustomerData;
    };

    // Transformations-Einstellungen
    transformations: {
        hoursToBillableHours: number;    // Faktor für abrechenbare Stunden
        addTax: boolean;                 // Steuer hinzufügen
        taxRate: number;                 // Steuersatz
        roundingRules: {
            hours: 'UP' | 'DOWN' | 'NEAREST';
            amount: 'UP' | 'DOWN' | 'NEAREST';
        };
    };
}

export interface CreateSyncJobRequest {
    entityType: SyncEntityType;
    direction: SyncDirection;
    trigger: SyncTrigger;

    // Optionale Einschränkungen
    taskiloEntityId?: string;
    financeEntityId?: string;

    // Optionen
    options?: {
        forceOverwrite?: boolean;
        skipConflicts?: boolean;
        dryRun?: boolean;
        backupBeforeSync?: boolean;
    };

    // Geplante Ausführung
    scheduledAt?: Timestamp;
}

export interface SyncJobSearchFilters {
    entityType?: SyncEntityType[];
    status?: SyncStatus[];
    direction?: SyncDirection[];
    trigger?: SyncTrigger[];
    dateFrom?: Timestamp;
    dateTo?: Timestamp;
    hasErrors?: boolean;
    hasConflicts?: boolean;
}

export interface SyncJobListResponse {
    jobs: SyncJobData[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
}

export interface SyncStatistics {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    averageProcessingTime: number; // in Sekunden

    byEntityType: {
        entityType: SyncEntityType;
        count: number;
        successRate: number;
    }[];

    recentErrors: SyncErrorDetail[];
    pendingConflicts: number;

    lastSuccessfulSync: {
        [entityType in SyncEntityType]?: Timestamp;
    };
}
