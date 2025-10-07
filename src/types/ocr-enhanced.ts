// Types für erweiterte deutsche OCR-Extraktion
export interface GoBDReceiptData {
  // Basis-Identifikation
  id?: string;
  belegnummer: string;           // Eindeutige Belegnummer
  belegdatum: string;            // Ausstellungsdatum (DD.MM.YYYY)
  eingangsdatum: string;         // Eingangsdatum im Unternehmen
  
  // Lieferantenstammdaten
  lieferant: {
    name: string;
    adresse: string;
    plz?: string;
    ort?: string;
    land?: string;
    ustIdNr?: string;            // EU-USt-IdNr (z.B. DE123456789)
    steuernummer?: string;       // Deutsche Steuernummer
    handelsregisternummer?: string;
    firmenform?: string;         // GmbH, UG, AG, etc.
    telefon?: string;
    email?: string;
    website?: string;
  };
  
  // Steuerliche Berechnung (GoBD-konform)
  steuerberechnung: {
    nettobetrag: number;
    ustSatz: number;             // 19%, 7%, 0%
    ustBetrag: number;
    bruttobetrag: number;
    kleinunternehmer: boolean;   // §19 UStG - keine USt-Ausweisung
    innergemeinschaftlich: boolean; // EU-Lieferung
    drittland: boolean;          // Drittland-Import
    reverseCharge: boolean;      // Umkehrung der Steuerschuldnerschaft
  };
  
  // Rechnungsdetails
  rechnungsdetails: {
    rechnungsart: 'EINGANGSRECHNUNG' | 'GUTSCHRIFT' | 'KLEINBETRAGSRECHNUNG' | 'PROFORMA';
    leistungszeitraum?: {
      von: string;               // DD.MM.YYYY
      bis: string;               // DD.MM.YYYY
    };
    zahlungsbedingungen: {
      zahlungsziel: number;      // Tage
      skonto?: {
        prozent: number;
        frist: number;           // Tage
      };
      mahnwesen: boolean;
    };
    waehrung: string;            // EUR, USD, etc.
    wechselkurs?: number;        // Bei Fremdwährung
  };
  
  // Rechnungspositionen (detaillierte Aufschlüsselung)
  positionen: Array<{
    position: number;
    artikelnummer?: string;
    beschreibung: string;
    menge: number;
    einheit: string;             // Stk, kg, h, etc.
    einzelpreis: number;
    rabatt?: number;             // Prozent
    gesamtpreis: number;
    ustSatz: number;
    ustBetrag: number;
  }>;
  
  // DATEV-Integration
  datev: {
    kontoNummer: string;         // Aufwandskonto (SKR03/SKR04)
    gegenkonto: string;          // Kreditorenkonto
    kostenstelle?: string;       // Kostenstellennummer (001, 100, etc.)
    kostentraeger?: string;      // Kostenträger
    belegkreis: string;          // ER (Eingangsrechnung)
    buchungstext: string;        // Beschreibung für Buchung
    belegfeld1?: string;         // Zusatzfeld 1
    belegfeld2?: string;         // Zusatzfeld 2
  };
  
  // Banking-Integration
  bankdaten?: {
    iban: string;
    bic: string;
    kontoinhaber: string;
    verwendungszweck?: string;
    bankName?: string;
  };
  
  // Metadaten
  verarbeitung: {
    ocrConfidence: number;       // 0-100%
    manuelleKorrektur: boolean;  // Wurde manuell korrigiert
    validierungsstatus: 'PENDING' | 'VALIDATED' | 'REJECTED';
    validierungsfehler?: string[];
    bearbeitetVon?: string;      // User-ID
    bearbeitetAm?: string;       // ISO Timestamp
    freigabestatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    exportiert?: {
      datev: boolean;
      zeitpunkt?: string;
    };
  };
}

// Erweiterte OCR-Extraktion Response
export interface EnhancedOCRResponse {
  success: boolean;
  data?: GoBDReceiptData;
  ocr: {
    provider: string;            // AWS_TEXTRACT, GOOGLE_AI_STUDIO, HYBRID
    confidence: number;
    textLength: number;
    processingTime: number;
    enhanced: boolean;
    kostenEUR?: number;          // OCR-Verarbeitungskosten
  };
  validation: {
    goBDCompliant: boolean;
    issues: ValidationIssue[];
    suggestions: string[];
  };
  learning: {
    supplierRecognized: boolean;
    categoryConfidence: number;
    kostenstuleVorschlag?: string;
  };
  message: string;
  extractionMethod: string;
}

// Validierungsergebnisse
export interface ValidationIssue {
  field: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  suggestedValue?: any;
}

// Lieferanten-Learning
export interface SupplierPattern {
  id: string;
  companyId: string;
  supplierName: string;
  patterns: {
    nameVariations: string[];    // Verschiedene Schreibweisen
    addressPatterns: string[];
    vatNumbers: string[];
    invoiceNumberFormats: string[];
  };
  defaultMapping: {
    datevAccount: string;
    costCenter?: string;
    category: string;
  };
  statistics: {
    totalInvoices: number;
    averageAmount: number;
    lastSeen: string;
    confidence: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Unternehmensspezifische OCR-Einstellungen
export interface CompanyOCRSettings {
  companyId: string;
  
  // Compliance-Einstellungen
  compliance: {
    goBDMode: boolean;              // Strikte GoBD-Compliance
    automaticValidation: boolean;   // Automatische Validierungen
    requireManualApproval: boolean; // Manuelle Freigabe erforderlich
    minimumConfidence: number;      // Mindest-OCR-Confidence (0-100)
  };
  
  // KI-Features
  intelligence: {
    supplierLearning: boolean;      // Lieferanten-Mustererkennung
    categoryPrediction: boolean;    // Automatische DATEV-Kategorien
    costCenterSuggestion: boolean;  // Kostenstellen-Vorschläge
    duplicateDetection: boolean;    // Duplikats-Erkennung
  };
  
  // Integration-Features  
  integration: {
    bankingSync: boolean;           // Banking-Abgleich aktiviert
    datevAutoExport: boolean;       // Automatischer DATEV-Export
    emailNotifications: boolean;    // E-Mail-Benachrichtigungen
    webhookUrl?: string;            // Webhook für externe Systeme
  };
  
  // Workflow-Regeln
  workflowRules: Array<{
    name: string;
    condition: {
      amountThreshold?: number;     // Ab welchem Betrag
      supplierWhitelist?: string[]; // Vertrauenswürdige Lieferanten
      categoryBlacklist?: string[]; // Risiko-Kategorien
    };
    action: 'AUTO_APPROVE' | 'REQUIRE_APPROVAL' | 'REJECT';
    assignTo?: string;              // User-ID für Freigabe
    notificationEmails?: string[];
  }>;
  
  // Standard-Werte
  defaults: {
    kostenstelle?: string;
    gegenkonto?: string;
    zahlungsziel: number;           // Standard-Zahlungsziel (Tage)
    waehrung: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

// Deutsche Validierungsregeln
export interface GermanyValidationRules {
  // USt-IdNr Validierung
  validateEUVATNumber(vatId: string): Promise<{
    valid: boolean;
    country: string;
    companyName?: string;
    address?: string;
  }>;
  
  // Deutsche Steuernummer
  validateGermanTaxNumber(taxNumber: string): {
    valid: boolean;
    format: string;
    bundesland?: string;
  };
  
  // IBAN-Validierung
  validateIBAN(iban: string): {
    valid: boolean;
    country: string;
    bankName?: string;
    bic?: string;
  };
  
  // Handelsregister-Abfrage
  checkBusinessRegistry(companyName: string, city?: string): Promise<{
    found: boolean;
    registrationNumber?: string;
    legalForm?: string;
    address?: string;
  }>;
  
  // Steuerberechnung prüfen
  validateTaxCalculation(netto: number, vatRate: number, gross: number): {
    valid: boolean;
    calculatedGross: number;
    difference: number;
  };
  
  // Rechnungsnummer-Format prüfen
  validateInvoiceNumber(invoiceNumber: string, supplierPatterns?: string[]): {
    valid: boolean;
    format: string;
    sequential: boolean;
  };
}

// DATEV-Export Datenstrukturen
export interface DATEVBookingEntry {
  // DATEV-Standardfelder
  umsatz: number;                  // Bruttobetrag
  sollHabenKennzeichen: 'S' | 'H'; // Soll/Haben
  wkzUmsatz: string;               // Währung
  kurs?: number;                   // Wechselkurs
  basisUmsatz?: number;            // Basiswährung
  wkzBasisUmsatz?: string;         // Basiswährung
  konto: string;                   // Kontonummer
  gegenkonto: string;              // Gegenkonto
  belegfeld1: string;              // Belegnummer
  belegfeld2?: string;             // Zusatzinfo
  datum: string;                   // Buchungsdatum (DDMM oder DDMMYY)
  kost1?: string;                  // Kostenstelle
  kost2?: string;                  // Kostenträger
  kostenQuantität?: number;
  buchungstext: string;            // Beschreibung
  
  // Erweiterte DATEV-Felder
  postensperre?: number;           // 0 = keine Sperre
  diverseAdressnummer?: string;
  geschäftspartnerbank?: string;
  sachverhalt?: string;
  zinssperre?: number;
  belegLink?: string;
  
  // Steuerfelder
  euSteuer?: string;               // EU-Steuersatz
  euSystematik?: string;
  
  // Metadaten
  herkunft: 'OCR_AUTO' | 'OCR_MANUAL' | 'MANUAL_ENTRY';
  confidence?: number;
}