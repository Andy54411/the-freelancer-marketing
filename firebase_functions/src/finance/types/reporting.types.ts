// firebase_functions/src/finance/types/reporting.types.ts

import { Timestamp } from 'firebase-admin/firestore';

export type ReportType = 
  | 'EUR'               // Einnahmen-Überschuss-Rechnung
  | 'USTVA'             // Umsatzsteuervoranmeldung
  | 'BWA'               // Betriebswirtschaftliche Auswertung
  | 'PROFIT_LOSS'       // Gewinn- und Verlustrechnung
  | 'CASH_FLOW'         // Kapitalflussrechnung
  | 'BALANCE_SHEET'     // Bilanz
  | 'TAX_REPORT'        // Steuerbericht
  | 'CUSTOMER_REPORT'   // Kundenbericht
  | 'VENDOR_REPORT';    // Lieferantenbericht

export type ReportPeriod = 
  | 'MONTH'
  | 'QUARTER'
  | 'HALF_YEAR'
  | 'YEAR'
  | 'CUSTOM';

export type EURCategory = 
  | 'REVENUE'           // Betriebseinnahmen
  | 'MATERIAL_COSTS'    // Wareneinkauf/Materialkosten
  | 'PERSONNEL_COSTS'   // Personalkosten
  | 'RENT'              // Miete
  | 'MARKETING'         // Werbung/Marketing
  | 'TRAVEL'            // Reisekosten
  | 'OFFICE'            // Bürokosten
  | 'COMMUNICATION'     // Kommunikation
  | 'INSURANCE'         // Versicherungen
  | 'PROFESSIONAL'      // Beratung/Rechtsbeistand
  | 'FINANCE'           // Finanzierungskosten
  | 'DEPRECIATION'      // Abschreibungen
  | 'OTHER_EXPENSES'    // Sonstige Betriebsausgaben
  | 'INVESTMENT'        // Investitionen
  | 'PRIVATE'           // Private Entnahmen/Einlagen
  | 'TAX';              // Steuern

export interface EURReport {
  id: string;
  companyId: string;
  
  // Berichtszeitraum
  period: ReportPeriod;
  year: number;
  month?: number;        // 1-12 (nur bei MONTH/QUARTER)
  quarter?: number;      // 1-4 (nur bei QUARTER)
  dateFrom: Timestamp;
  dateTo: Timestamp;
  
  // Status
  status: 'DRAFT' | 'FINALIZED' | 'SUBMITTED' | 'CORRECTED';
  finalizedAt?: Timestamp;
  finalizedBy?: string;
  
  // Einnahmen
  revenue: {
    category: EURCategory;
    description: string;
    netAmount: number;     // in Cent
    taxAmount: number;     // in Cent
    totalAmount: number;   // in Cent
    
    // Details
    invoiceCount: number;
    avgInvoiceAmount: number;
    
    // Steueraufschlüsselung
    taxBreakdown: {
      rate: number;        // Steuersatz %
      netAmount: number;
      taxAmount: number;
    }[];
  }[];
  
  // Ausgaben
  expenses: {
    category: EURCategory;
    description: string;
    netAmount: number;     // in Cent
    taxAmount: number;     // in Cent (Vorsteuer)
    totalAmount: number;   // in Cent
    
    // Details
    transactionCount: number;
    avgTransactionAmount: number;
    
    // Steueraufschlüsselung
    taxBreakdown: {
      rate: number;        // Steuersatz %
      netAmount: number;
      taxAmount: number;   // Vorsteuer
    }[];
  }[];
  
  // Zusammenfassung
  summary: {
    totalRevenue: number;          // Gesamteinnahmen
    totalExpenses: number;         // Gesamtausgaben
    netProfit: number;             // Gewinn/Verlust
    
    // Umsatzsteuer
    outputTax: number;             // Umsatzsteuer (Zahllast)
    inputTax: number;              // Vorsteuer
    vatLiability: number;          // USt-Zahllast/Erstattung
    
    // Kennzahlen
    profitMargin: number;          // Gewinnmarge %
    revenueGrowth?: number;        // Umsatzwachstum % (vs. Vorperiode)
    expenseRatio: number;          // Ausgabenquote %
  };
  
  // ELSTER-Daten (für elektronische Übermittlung)
  elsterData?: {
    steuernummer: string;
    ustIdNr?: string;
    elsterSteuernummer?: string;
    
    // EÜR-spezifische Felder (vereinfacht)
    kz35: number;    // Umsätze 19%
    kz36: number;    // Umsätze 7%
    kz37: number;    // Steuerfreie Umsätze
    kz65: number;    // Vorsteuer 19%
    kz66: number;    // Vorsteuer 7%
    kz83: number;    // Zahllast/Erstattung
  };
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface USTVAReport {
  id: string;
  companyId: string;
  
  // Voranmeldezeitraum
  year: number;
  period: 'MONTH' | 'QUARTER';
  month?: number;        // 1-12 (nur bei monatlicher Anmeldung)
  quarter?: number;      // 1-4 (nur bei vierteljährlicher Anmeldung)
  dateFrom: Timestamp;
  dateTo: Timestamp;
  
  // Status
  status: 'DRAFT' | 'SUBMITTED' | 'PAID' | 'CORRECTED';
  submittedAt?: Timestamp;
  paidAt?: Timestamp;
  
  // Umsätze
  sales: {
    // Steuerfreie Umsätze
    domesticTaxFree: number;       // Kz 41: Steuerfreie Umsätze Inland
    exportTaxFree: number;         // Kz 44: Steuerfreie Umsätze Export
    euDelivery: number;            // Kz 49: EU-Lieferungen
    
    // Steuerpflichtige Umsätze
    domestic19: number;            // Kz 35: Umsätze 19%
    domestic7: number;             // Kz 36: Umsätze 7%
    domestic0: number;             // Kz 37: Umsätze 0%
    
    // Umsatzsteuer
    tax19: number;                 // Kz 60: USt 19%
    tax7: number;                  // Kz 61: USt 7%
  };
  
  // Vorsteuer
  inputTax: {
    domestic: number;              // Kz 65: Vorsteuer Inland
    import: number;                // Kz 66: Einfuhrumsatzsteuer
    euAcquisition: number;         // Kz 67: EU-Erwerb
    
    // Sonderregelungen
    reverseCharge: number;         // Kz 69: Reverse-Charge
    smallBusiness: number;         // Kz 71: Kleinunternehmer
  };
  
  // Berechnung
  calculation: {
    totalOutputTax: number;        // Summe Umsatzsteuer
    totalInputTax: number;         // Summe Vorsteuer
    difference: number;            // Zahllast (+) / Erstattung (-)
    
    // Sonderposten
    corrections: number;           // Korrekturen Vorperioden
    finalAmount: number;           // Endgültiger Betrag
  };
  
  // ELSTER-Übermittlung
  elsterData?: {
    transferTicket?: string;
    confirmationCode?: string;
    submissionDate?: Timestamp;
    acceptanceDate?: Timestamp;
  };
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface DATEVExport {
  id: string;
  companyId: string;
  
  // Export-Details
  exportType: 'MOVEMENTS' | 'ACCOUNTS' | 'CUSTOMERS' | 'VENDORS';
  format: 'DATEV_ASCII' | 'DATEV_XML' | 'CSV';
  
  // Zeitraum
  dateFrom: Timestamp;
  dateTo: Timestamp;
  
  // DATEV-spezifische Einstellungen
  datevSettings: {
    consultantNumber: string;      // Beraternummer
    clientNumber: string;          // Mandantennummer
    businessYear: number;          // Wirtschaftsjahr
    accountingMethod: 'CASH' | 'ACCRUAL';  // Einnahmen-Überschuss / Bilanz
    
    // Buchungskreis
    chartOfAccounts: 'SKR03' | 'SKR04' | 'CUSTOM';
    
    // Währung
    currency: string;
    
    // Formatierung
    decimalPlaces: number;
    dateFormat: 'DDMMYY' | 'DDMMYYYY';
  };
  
  // Export-Daten
  movements: {
    accountNumber: string;         // Kontonummer
    contraAccount: string;         // Gegenkonto
    amount: number;                // Betrag in Cent
    bookingDate: Timestamp;        // Buchungsdatum
    reference: string;             // Buchungstext/Verwendungszweck
    
    // DATEV-Felder
    costCenter?: string;           // Kostenstelle
    costUnit?: string;             // Kostenträger
    vatCode?: string;              // USt-Kennzeichen
    
    // Zuordnung
    invoiceId?: string;
    expenseId?: string;
    paymentId?: string;
  }[];
  
  // Status
  status: 'GENERATING' | 'COMPLETED' | 'FAILED' | 'DOWNLOADED';
  
  // Datei-Info
  fileInfo?: {
    filename: string;
    size: number;                  // in Bytes
    downloadUrl: string;
    expiresAt: Timestamp;
  };
  
  // Statistiken
  statistics: {
    totalRecords: number;
    totalAmount: number;           // Gesamtbetrag in Cent
    dateRange: {
      from: Timestamp;
      to: Timestamp;
    };
    
    // Validierung
    validRecords: number;
    invalidRecords: number;
    warnings: string[];
    errors: string[];
  };
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  createdBy: string;
}

// Request/Response Types

export interface GenerateEURRequest {
  period: ReportPeriod;
  year: number;
  month?: number;
  quarter?: number;
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  
  // Optionen
  includeInProgressInvoices?: boolean;
  includePendingExpenses?: boolean;
  finalize?: boolean;
}

export interface GenerateUSTVARequest {
  year: number;
  period: 'MONTH' | 'QUARTER';
  month?: number;
  quarter?: number;
  
  // ELSTER-Daten
  steuernummer?: string;
  ustIdNr?: string;
  
  // Optionen
  autoSubmit?: boolean;
  testMode?: boolean;
}

export interface CreateDATEVExportRequest {
  exportType: 'MOVEMENTS' | 'ACCOUNTS' | 'CUSTOMERS' | 'VENDORS';
  format?: 'DATEV_ASCII' | 'DATEV_XML' | 'CSV';
  
  dateFrom: Timestamp;
  dateTo: Timestamp;
  
  // DATEV-Einstellungen
  consultantNumber: string;
  clientNumber: string;
  chartOfAccounts?: 'SKR03' | 'SKR04' | 'CUSTOM';
  
  // Filter
  filters?: {
    accountNumbers?: string[];
    includeInvoices?: boolean;
    includeExpenses?: boolean;
    includePayments?: boolean;
  };
}

export interface ReportSearchFilters {
  type?: ReportType[];
  period?: ReportPeriod[];
  year?: number;
  status?: ('DRAFT' | 'FINALIZED' | 'SUBMITTED' | 'CORRECTED')[];
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
}

export interface ReportStatistics {
  totalReports: number;
  
  byType: {
    type: ReportType;
    count: number;
    avgGenerationTime: number;    // in ms
  }[];
  
  thisYear: {
    eurReports: number;
    ustvaReports: number;
    datevExports: number;
    totalTaxLiability: number;    // in Cent
  };
  
  automation: {
    autoGeneratedRate: number;    // %
    avgAccuracy: number;          // %
    manualCorrections: number;
  };
}
