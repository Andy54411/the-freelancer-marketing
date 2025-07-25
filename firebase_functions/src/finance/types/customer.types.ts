// firebase_functions/src/finance/types/customer.types.ts

import { Timestamp } from 'firebase-admin/firestore';

export type CustomerType =
    | 'INDIVIDUAL'     // Privatperson
    | 'BUSINESS'       // Unternehmen
    | 'FREELANCER'     // Freiberufler
    | 'GOVERNMENT';    // Behörde/Öffentlich

export type CustomerStatus =
    | 'ACTIVE'         // Aktiv
    | 'INACTIVE'       // Inaktiv
    | 'BLOCKED'        // Gesperrt
    | 'PROSPECT';      // Interessent

export interface CustomerAddress {
    type: 'BILLING' | 'SHIPPING' | 'CORRESPONDENCE';
    companyName?: string;
    firstName?: string;
    lastName?: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    isDefault: boolean;
}

export interface CustomerContact {
    type: 'EMAIL' | 'PHONE' | 'MOBILE' | 'FAX' | 'WEBSITE';
    value: string;
    isPrimary: boolean;
    label?: string;
}

export interface CustomerTaxInfo {
    vatNumber?: string;        // USt-IdNr.
    taxNumber?: string;        // Steuernummer
    isVatExempt: boolean;      // Umsatzsteuerbefreit
    defaultTaxRate: number;    // Standard-Steuersatz (19, 7, 0)
    taxCountry: string;        // Steuerland
}

export interface CustomerPaymentSettings {
    defaultPaymentTerms: {
        dueDays: number;         // Standard-Zahlungsziel
        discountDays?: number;   // Skonto-Tage
        discountRate?: number;   // Skonto-Prozentsatz
    };
    preferredPaymentMethods: string[];
    creditLimit?: number;      // Kreditlimit (in Cent)
    dunningLevel: number;      // Mahnstufe (0-3)
    lastDunningDate?: Timestamp;
}

export interface CustomerSyncData {
    taskiloCustomerId?: string;     // ID aus Taskilo-System
    externalIds: {                  // Externe System-IDs
        [system: string]: string;
    };
    lastSyncAt?: Timestamp;
    syncErrors?: string[];
}

export interface CustomerStatistics {
    totalInvoices: number;
    totalRevenue: number;          // Gesamtumsatz (in Cent)
    averageOrderValue: number;     // Durchschnittlicher Auftragswert
    lastOrderDate?: Timestamp;
    outstandingAmount: number;     // Offene Beträge
    paymentDelayAverage: number;   // Durchschnittliche Zahlungsverzögerung (Tage)
}

export interface CustomerData {
    // Basis-Informationen
    id: string;
    companyId: string;             // Zugehörige Firma
    customerNumber: string;        // Eindeutige Kundennummer

    // Typ & Status
    type: CustomerType;
    status: CustomerStatus;

    // Stammdaten
    displayName: string;           // Anzeigename
    companyName?: string;
    firstName?: string;
    lastName?: string;

    // Kontaktdaten
    addresses: CustomerAddress[];
    contacts: CustomerContact[];

    // Steuerliche Informationen
    taxInfo: CustomerTaxInfo;

    // Zahlungskonditionen
    paymentSettings: CustomerPaymentSettings;

    // Synchronisation
    syncData: CustomerSyncData;

    // Statistiken
    statistics: CustomerStatistics;

    // Zusätzliche Informationen
    notes?: string;                // Interne Notizen
    tags?: string[];               // Tags für Kategorisierung
    assignedUserId?: string;       // Zuständiger Benutzer

    // Metadaten
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
    lastModifiedBy: string;
}

export interface CreateCustomerRequest {
    type: CustomerType;
    displayName: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;

    // Mindestens eine Adresse
    billingAddress: Omit<CustomerAddress, 'type' | 'isDefault'>;
    shippingAddress?: Omit<CustomerAddress, 'type' | 'isDefault'>;

    // Kontakte
    email?: string;
    phone?: string;

    // Steuer-Info
    vatNumber?: string;
    taxNumber?: string;
    isVatExempt?: boolean;
    defaultTaxRate?: number;

    // Zahlungskonditionen
    paymentTermsDays?: number;
    preferredPaymentMethods?: string[];

    // Zusätzliche Daten
    notes?: string;
    tags?: string[];
    taskiloCustomerId?: string;    // Für Sync mit Taskilo
}

export interface UpdateCustomerRequest {
    displayName?: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    status?: CustomerStatus;

    // Steuer-Info
    vatNumber?: string;
    taxNumber?: string;
    isVatExempt?: boolean;
    defaultTaxRate?: number;

    // Zahlungskonditionen
    paymentTermsDays?: number;
    preferredPaymentMethods?: string[];
    creditLimit?: number;

    // Zusätzliche Daten
    notes?: string;
    tags?: string[];
}

export interface CustomerSearchFilters {
    status?: CustomerStatus[];
    type?: CustomerType[];
    searchTerm?: string;           // Suche in Name, Firma, Kundennummer
    tags?: string[];
    assignedUserId?: string;
    hasOutstandingInvoices?: boolean;
    createdFrom?: Timestamp;
    createdTo?: Timestamp;
}

export interface CustomerListResponse {
    customers: CustomerData[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
}
