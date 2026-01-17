/**
 * DATEV Export Service
 * Implementiert das DATEV-ASCII-Format (EXTF) für Buchungsexport
 * 
 * DATEV-Format Spezifikation: https://developer.datev.de/datev/platform/de/dtvf
 * 
 * Unterstützte Formate:
 * - EXTF (Extended Transfer Format) - Buchungsstapel
 * - DTVF (DATEV Transfer Format) - Stammdaten
 */

import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DatevSettings {
  beraternummer: string;
  mandantennummer: string;
  wirtschaftsjahresbeginn: string; // Format: DD.MM.YYYY
  kontenrahmen: 'SKR03' | 'SKR04';
  sachkontenlänge: 4 | 5 | 6 | 7 | 8;
  personenkontenlänge: 5 | 6 | 7 | 8 | 9;
  festschreibung: boolean;
  exportType: 'both' | 'bookings-only' | 'documents-only';
  withUnpaidDocuments: boolean;
  lastExportDate?: Date;
  datevConnectedAt?: Date;
}

export interface DatevBuchungssatz {
  // Pflichtfelder
  umsatz: number;            // Feld 1: Umsatz (Soll/Haben unterschied durch Vorzeichen)
  sollHabenKennzeichen: 'S' | 'H'; // Feld 2: Soll/Haben-Kennzeichen
  wkzUmsatz: string;         // Feld 3: WKZ Umsatz (EUR)
  kurs?: number;             // Feld 4: Kurs (bei Fremdwährung)
  basisUmsatz?: number;      // Feld 5: Basis-Umsatz
  wkzBasisUmsatz?: string;   // Feld 6: WKZ Basis-Umsatz
  konto: string;             // Feld 7: Konto (Sachkonto oder Personenkonto)
  gegenkonto: string;        // Feld 8: Gegenkonto
  buSchlüssel?: string;      // Feld 9: BU-Schlüssel (Steuerschlüssel)
  belegdatum: Date;          // Feld 10: Belegdatum
  belegfeld1: string;        // Feld 11: Belegfeld 1 (Rechnungsnummer)
  belegfeld2?: string;       // Feld 12: Belegfeld 2
  skonto?: number;           // Feld 13: Skonto
  buchungstext: string;      // Feld 14: Buchungstext (max. 60 Zeichen)
  postensperre?: boolean;    // Feld 15: Postensperre
  divAdresse?: string;       // Feld 16: Diverse Adresse
  geschäftspartnerbank?: number; // Feld 17-18
  sachverhalt?: string;      // Feld 19: Sachverhalt
  zinssperre?: boolean;      // Feld 20: Zinssperre
  belegLink?: string;        // Feld 21: Beleglink (GUID oder URL)
  beleginfo?: {              // Feld 22-113: Beleginfo
    art?: string;
    inhalt?: string;
  }[];
  kostenstelle1?: string;    // Feld 36: KOST1
  kostenstelle2?: string;    // Feld 37: KOST2
  kostenMenge?: number;      // Feld 38: KOST-Menge
  ustId?: string;            // Feld 39: EU-Land + USt-IdNr.
  euSteuersatz?: number;     // Feld 40: EU-Steuersatz
  abwVersteuerungsart?: string; // Feld 41: Abw. Versteuerungsart
  lAnRechnung?: string;      // Feld 42: L+L-Sachverhalt
  funktion?: number;         // Feld 43: Funktionsergänzung
  additionalInfo?: string;   // Feld 44-116: Zusatzinfos
}

export interface DatevExportResult {
  success: boolean;
  csvContent?: string;
  filename?: string;
  recordCount?: number;
  errors?: string[];
  warnings?: string[];
}

export interface Invoice {
  id?: string;
  invoiceNumber?: string;
  number?: string;
  rechnungsnummer?: string;
  date?: Date | Timestamp | { _seconds: number };
  dueDate?: Date | Timestamp | { _seconds: number };
  customerName?: string;
  kunde?: string;
  customer?: string;
  netAmount?: number;
  nettobetrag?: number;
  taxAmount?: number;
  mwstBetrag?: number;
  totalAmount?: number;
  bruttoBetrag?: number;
  gesamt?: number;
  taxRate?: number;
  mwstSatz?: number;
  status?: string;
  isPaid?: boolean;
  description?: string;
  beschreibung?: string;
  items?: Array<{
    description?: string;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
  }>;
  attachmentUrl?: string;
  pdfUrl?: string;
  belegbildUrl?: string;
}

export interface Expense {
  id?: string;
  receiptNumber?: string;
  belegnummer?: string;
  number?: string;
  date?: Date | Timestamp | { _seconds: number };
  vendor?: string;
  lieferant?: string;
  supplier?: string;
  netAmount?: number;
  nettobetrag?: number;
  taxAmount?: number;
  mwstBetrag?: number;
  totalAmount?: number;
  bruttoBetrag?: number;
  gesamt?: number;
  taxRate?: number;
  mwstSatz?: number;
  category?: string;
  kategorie?: string;
  description?: string;
  beschreibung?: string;
  status?: string;
  isPaid?: boolean;
  attachmentUrl?: string;
  belegbildUrl?: string;
  receiptUrl?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const datevSettingsSchema = z.object({
  beraternummer: z.string().min(1).max(7).regex(/^\d+$/, 'Nur Ziffern erlaubt'),
  mandantennummer: z.string().min(1).max(5).regex(/^\d+$/, 'Nur Ziffern erlaubt'),
  wirtschaftsjahresbeginn: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Format: DD.MM.YYYY'),
  kontenrahmen: z.enum(['SKR03', 'SKR04']).default('SKR03'),
  sachkontenlänge: z.number().min(4).max(8).default(4),
  personenkontenlänge: z.number().min(5).max(9).default(5),
  festschreibung: z.boolean().default(false),
  exportType: z.enum(['both', 'bookings-only', 'documents-only']).default('both'),
  withUnpaidDocuments: z.boolean().default(false),
});

// ============================================================================
// DATEV BU-SCHLÜSSEL (Steuerschlüssel)
// ============================================================================

const DATEV_BU_SCHLÜSSEL: Record<number, string> = {
  0: '',      // Ohne Steuer
  7: '8',     // 7% Vorsteuer/USt
  19: '9',    // 19% Vorsteuer/USt
  5: '7',     // 5% (Corona-Zeitraum)
  16: '8',    // 16% (Corona-Zeitraum)
  10.7: '36', // Innergemeinschaftlicher Erwerb 7%
  190: '94',  // Innergemeinschaftliche Lieferung steuerfrei
};

// ============================================================================
// SKR03 KONTENRAHMEN - Wichtige Konten
// ============================================================================

const SKR03_KONTEN = {
  // Erlöskonten (4000-4999)
  erlöse19: '4400',      // Erlöse 19%
  erlöse7: '4300',       // Erlöse 7%
  erlöseSteuerfrei: '4200', // Steuerfreie Erlöse
  erlöseExport: '4125',  // Steuerfreie Exporte
  sonstigeErlöse: '4830', // Sonstige Erlöse
  
  // Aufwandskonten (5000-7999)
  wareneinkauf19: '5400',   // Wareneinkauf 19%
  wareneinkauf7: '5300',    // Wareneinkauf 7%
  fremdleistungen: '3100',  // Fremdleistungen
  büromaterial: '6815',     // Bürobedarf
  telefon: '6805',          // Telefon
  porto: '6800',            // Porto
  reisekosten: '6650',      // Reisekosten
  kfz: '6520',              // Kfz-Kosten
  versicherungen: '6430',   // Versicherungen
  miete: '6310',            // Raumkosten, Miete
  beratungskosten: '6825',  // Rechts- und Beratungskosten
  werbung: '6600',          // Werbekosten
  abschreibungen: '6220',   // AfA
  zinsenBank: '6855',       // Zinsaufwendungen Bank
  sonstigeAufwendungen: '6300', // Sonstige betriebliche Aufwendungen
  
  // Personenkonten
  debitorenStart: '10000',  // Debitorenkonten (Kunden)
  kreditorenStart: '70000', // Kreditorenkonten (Lieferanten)
  
  // Steuerkonten
  vorsteuer19: '1576',      // Vorsteuer 19%
  vorsteuer7: '1571',       // Vorsteuer 7%
  umsatzsteuer19: '1776',   // Umsatzsteuer 19%
  umsatzsteuer7: '1771',    // Umsatzsteuer 7%
  
  // Bank/Kasse
  bank: '1200',             // Bank
  kasse: '1000',            // Kasse
};

// ============================================================================
// DATEV EXPORT SERVICE
// ============================================================================

export class DatevExportService {
  
  /**
   * Generiert DATEV-ASCII-Header (Zeile 1)
   */
  static generateHeader(settings: DatevSettings, recordCount: number): string {
    const now = new Date();
    const dateCreated = this.formatDateNumeric(now);
    const timeCreated = this.formatTime(now);
    
    // Wirtschaftsjahresbeginn parsen
    const [tag, monat, jahr] = settings.wirtschaftsjahresbeginn.split('.');
    const wjBeginn = `${jahr}${monat}${tag}`;
    
    // Header-Felder gemäß DATEV-Spezifikation
    const headerFields = [
      '"EXTF"',                                    // 1: Kennzeichen EXTF
      '700',                                       // 2: Versionsnummer
      '21',                                        // 3: Kategorienummer (21 = Buchungsstapel)
      '"Buchungsstapel"',                         // 4: Formatname
      '12',                                        // 5: Formatversion
      dateCreated,                                 // 6: Erstellungsdatum
      '',                                          // 7: Importiert (leer)
      '"DE"',                                      // 8: Herkunftskennzeichen
      '"Taskilo"',                                // 9: Exportiert von
      '""',                                        // 10: Importiert von
      settings.beraternummer,                      // 11: Beraternummer
      settings.mandantennummer,                    // 12: Mandantennummer
      wjBeginn,                                    // 13: WJ-Beginn
      settings.sachkontenlänge.toString(),         // 14: Sachkontenlänge
      this.formatDateForExport(new Date(parseInt(jahr), 0, 1)), // 15: Datum von
      this.formatDateForExport(new Date(parseInt(jahr), 11, 31)), // 16: Datum bis
      '""',                                        // 17: Bezeichnung
      '""',                                        // 18: Diktatkürzel
      settings.festschreibung ? '1' : '0',         // 19: Festschreibung
      '"EUR"',                                     // 20: WKZ
      '',                                          // 21-116: Reserviert
    ];
    
    return headerFields.join(';');
  }
  
  /**
   * Generiert DATEV-ASCII-Spaltenüberschriften (Zeile 2)
   */
  static generateColumnHeaders(): string {
    const columns = [
      'Umsatz (ohne Soll/Haben-Kz)',
      'Soll/Haben-Kennzeichen',
      'WKZ Umsatz',
      'Kurs',
      'Basis-Umsatz',
      'WKZ Basis-Umsatz',
      'Konto',
      'Gegenkonto (ohne BU-Schlüssel)',
      'BU-Schlüssel',
      'Belegdatum',
      'Belegfeld 1',
      'Belegfeld 2',
      'Skonto',
      'Buchungstext',
      'Postensperre',
      'Diverse Adressnummer',
      'Geschäftspartnerbank',
      'Sachverhalt',
      'Zinssperre',
      'Beleglink',
      'Beleginfo - Art 1',
      'Beleginfo - Inhalt 1',
      'Beleginfo - Art 2',
      'Beleginfo - Inhalt 2',
      'Beleginfo - Art 3',
      'Beleginfo - Inhalt 3',
      'Beleginfo - Art 4',
      'Beleginfo - Inhalt 4',
      'Beleginfo - Art 5',
      'Beleginfo - Inhalt 5',
      'Beleginfo - Art 6',
      'Beleginfo - Inhalt 6',
      'Beleginfo - Art 7',
      'Beleginfo - Inhalt 7',
      'Beleginfo - Art 8',
      'Beleginfo - Inhalt 8',
      'KOST1 - Kostenstelle',
      'KOST2 - Kostenstelle',
      'Kost-Menge',
      'EU-Land u. UStID',
      'EU-Steuersatz',
      'Abw. Versteuerungsart',
      'Sachverhalt L+L',
      'Funktionsergänzung L+L',
      'BU 49 Hauptfunktionstyp',
      'BU 49 Hauptfunktionsnummer',
      'BU 49 Funktionsergänzung',
      'Zusatzinformation - Art 1',
      'Zusatzinformation - Inhalt 1',
      'Zusatzinformation - Art 2',
      'Zusatzinformation - Inhalt 2',
      'Zusatzinformation - Art 3',
      'Zusatzinformation - Inhalt 3',
      'Zusatzinformation - Art 4',
      'Zusatzinformation - Inhalt 4',
      'Zusatzinformation - Art 5',
      'Zusatzinformation - Inhalt 5',
      'Zusatzinformation - Art 6',
      'Zusatzinformation - Inhalt 6',
      'Zusatzinformation - Art 7',
      'Zusatzinformation - Inhalt 7',
      'Zusatzinformation - Art 8',
      'Zusatzinformation - Inhalt 8',
      'Zusatzinformation - Art 9',
      'Zusatzinformation - Inhalt 9',
      'Zusatzinformation - Art 10',
      'Zusatzinformation - Inhalt 10',
      'Zusatzinformation - Art 11',
      'Zusatzinformation - Inhalt 11',
      'Zusatzinformation - Art 12',
      'Zusatzinformation - Inhalt 12',
      'Zusatzinformation - Art 13',
      'Zusatzinformation - Inhalt 13',
      'Zusatzinformation - Art 14',
      'Zusatzinformation - Inhalt 14',
      'Zusatzinformation - Art 15',
      'Zusatzinformation - Inhalt 15',
      'Zusatzinformation - Art 16',
      'Zusatzinformation - Inhalt 16',
      'Zusatzinformation - Art 17',
      'Zusatzinformation - Inhalt 17',
      'Zusatzinformation - Art 18',
      'Zusatzinformation - Inhalt 18',
      'Zusatzinformation - Art 19',
      'Zusatzinformation - Inhalt 19',
      'Zusatzinformation - Art 20',
      'Zusatzinformation - Inhalt 20',
      'Stück',
      'Gewicht',
      'Zahlweise',
      'Forderungsart',
      'Veranlagungsjahr',
      'Zugeordnete Fälligkeit',
      'Skontotyp',
      'Auftragsnummer',
      'Buchungstyp',
      'USt-Schlüssel (Anzahlungen)',
      'EU-Land (Anzahlungen)',
      'Sachverhalt L+L (Anzahlungen)',
      'EU-Steuersatz (Anzahlungen)',
      'Erlöskonto (Anzahlungen)',
      'Herkunft-Kz',
      'Buchungs GUID',
      'KOST-Datum',
      'SEPA-Mandatsreferenz',
      'Skontosperre',
      'Gesellschaftername',
      'Beteiligtennummer',
      'Identifikationsnummer',
      'Zeichnernummer',
      'Postensperre bis',
      'Bezeichnung SoBil-Sachverhalt',
      'Kennzeichen SoBil-Buchung',
      'Festschreibung',
      'Leistungsdatum',
      'Datum Zuord. Steuerperiode',
    ];
    
    return columns.join(';');
  }
  
  /**
   * Konvertiert eine Rechnung in DATEV-Buchungssätze
   */
  static invoiceToDatevBuchungen(invoice: Invoice, settings: DatevSettings): DatevBuchungssatz[] {
    const buchungen: DatevBuchungssatz[] = [];
    
    const netAmount = invoice.netAmount ?? invoice.nettobetrag ?? 0;
    const taxAmount = invoice.taxAmount ?? invoice.mwstBetrag ?? 0;
    const totalAmount = invoice.totalAmount ?? invoice.bruttoBetrag ?? invoice.gesamt ?? (netAmount + taxAmount);
    const taxRate = invoice.taxRate ?? invoice.mwstSatz ?? 19;
    const invoiceNumber = invoice.invoiceNumber ?? invoice.number ?? invoice.rechnungsnummer ?? '';
    const customerName = invoice.customerName ?? invoice.kunde ?? invoice.customer ?? 'Debitor';
    const description = invoice.description ?? invoice.beschreibung ?? `Rechnung ${invoiceNumber}`;
    const belegdatum = this.toDate(invoice.date);
    
    // Debitorenkonto basierend auf Kundenname generieren (vereinfacht)
    const debitorkonto = this.generatePersonenkonto(customerName, 'debitor', settings);
    
    // Erlöskonto basierend auf Steuersatz
    const erlöskonto = taxRate === 7 ? SKR03_KONTEN.erlöse7 : 
                       taxRate === 0 ? SKR03_KONTEN.erlöseSteuerfrei : 
                       SKR03_KONTEN.erlöse19;
    
    // BU-Schlüssel für Steuersatz
    const buSchlüssel = DATEV_BU_SCHLÜSSEL[taxRate] ?? '9';
    
    // Hauptbuchung: Debitor an Erlös
    buchungen.push({
      umsatz: Math.abs(totalAmount),
      sollHabenKennzeichen: 'S',
      wkzUmsatz: 'EUR',
      konto: debitorkonto,
      gegenkonto: erlöskonto,
      buSchlüssel: buSchlüssel,
      belegdatum: belegdatum,
      belegfeld1: invoiceNumber.substring(0, 12), // Max 12 Zeichen
      buchungstext: this.sanitizeText(description, 60),
      belegLink: invoice.attachmentUrl ?? invoice.pdfUrl ?? invoice.belegbildUrl,
    });
    
    return buchungen;
  }
  
  /**
   * Konvertiert eine Ausgabe in DATEV-Buchungssätze
   */
  static expenseToDatevBuchungen(expense: Expense, settings: DatevSettings): DatevBuchungssatz[] {
    const buchungen: DatevBuchungssatz[] = [];
    
    const netAmount = expense.netAmount ?? expense.nettobetrag ?? 0;
    const taxAmount = expense.taxAmount ?? expense.mwstBetrag ?? 0;
    const totalAmount = expense.totalAmount ?? expense.bruttoBetrag ?? expense.gesamt ?? (netAmount + taxAmount);
    const taxRate = expense.taxRate ?? expense.mwstSatz ?? 19;
    const receiptNumber = expense.receiptNumber ?? expense.belegnummer ?? expense.number ?? '';
    const vendorName = expense.vendor ?? expense.lieferant ?? expense.supplier ?? 'Kreditor';
    const category = expense.category ?? expense.kategorie ?? 'Sonstiges';
    const description = expense.description ?? expense.beschreibung ?? `Ausgabe ${receiptNumber}`;
    const belegdatum = this.toDate(expense.date);
    
    // Kreditorenkonto basierend auf Lieferantenname
    const kreditorkonto = this.generatePersonenkonto(vendorName, 'kreditor', settings);
    
    // Aufwandskonto basierend auf Kategorie
    const aufwandskonto = this.getAufwandskonto(category);
    
    // BU-Schlüssel für Vorsteuer
    const buSchlüssel = DATEV_BU_SCHLÜSSEL[taxRate] ?? '9';
    
    // Hauptbuchung: Aufwand an Kreditor
    buchungen.push({
      umsatz: Math.abs(totalAmount),
      sollHabenKennzeichen: 'S',
      wkzUmsatz: 'EUR',
      konto: aufwandskonto,
      gegenkonto: kreditorkonto,
      buSchlüssel: buSchlüssel,
      belegdatum: belegdatum,
      belegfeld1: receiptNumber.substring(0, 12),
      buchungstext: this.sanitizeText(`${vendorName}: ${description}`, 60),
      belegLink: expense.attachmentUrl ?? expense.belegbildUrl ?? expense.receiptUrl,
    });
    
    return buchungen;
  }
  
  /**
   * Formatiert einen Buchungssatz als CSV-Zeile
   */
  static formatBuchungssatzAsCSV(buchung: DatevBuchungssatz): string {
    const fields: string[] = [];
    
    // Feld 1: Umsatz (Dezimalzahl mit Komma als Dezimaltrenner)
    fields.push(this.formatDecimal(buchung.umsatz));
    
    // Feld 2: Soll/Haben-Kennzeichen
    fields.push(`"${buchung.sollHabenKennzeichen}"`);
    
    // Feld 3: WKZ Umsatz
    fields.push(`"${buchung.wkzUmsatz}"`);
    
    // Feld 4-6: Kurs, Basis-Umsatz, WKZ Basis-Umsatz (leer für EUR)
    fields.push('', '', '');
    
    // Feld 7: Konto
    fields.push(buchung.konto);
    
    // Feld 8: Gegenkonto
    fields.push(buchung.gegenkonto);
    
    // Feld 9: BU-Schlüssel
    fields.push(buchung.buSchlüssel ?? '');
    
    // Feld 10: Belegdatum (TTMM)
    fields.push(this.formatBelegdatum(buchung.belegdatum));
    
    // Feld 11: Belegfeld 1
    fields.push(`"${buchung.belegfeld1}"`);
    
    // Feld 12: Belegfeld 2
    fields.push(buchung.belegfeld2 ? `"${buchung.belegfeld2}"` : '');
    
    // Feld 13: Skonto
    fields.push(buchung.skonto ? this.formatDecimal(buchung.skonto) : '');
    
    // Feld 14: Buchungstext
    fields.push(`"${buchung.buchungstext}"`);
    
    // Feld 15-19: Postensperre, Diverse Adresse, etc. (leer)
    fields.push('', '', '', '', '');
    
    // Feld 20: Beleglink (wenn vorhanden)
    fields.push(buchung.belegLink ? `"${buchung.belegLink}"` : '');
    
    // Feld 21-35: Beleginfo (leer)
    for (let i = 0; i < 15; i++) {
      fields.push('');
    }
    
    // Feld 36-38: Kostenstellen (leer)
    fields.push('', '', '');
    
    // Feld 39-44: EU-Steuer, etc. (leer)
    for (let i = 0; i < 6; i++) {
      fields.push('');
    }
    
    // Restliche Felder (45-116) leer
    for (let i = 0; i < 72; i++) {
      fields.push('');
    }
    
    return fields.join(';');
  }
  
  /**
   * Erstellt vollständigen DATEV-Export
   */
  static createExport(
    invoices: Invoice[],
    expenses: Expense[],
    settings: DatevSettings
  ): DatevExportResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const allBuchungen: DatevBuchungssatz[] = [];
    
    // Validiere Settings
    try {
      datevSettingsSchema.parse(settings);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        errors.push(...validationError.errors.map(e => e.message));
        return { success: false, errors };
      }
    }
    
    // Konvertiere Rechnungen
    for (const invoice of invoices) {
      try {
        const buchungen = this.invoiceToDatevBuchungen(invoice, settings);
        allBuchungen.push(...buchungen);
      } catch (err) {
        const invoiceId = invoice.invoiceNumber ?? invoice.id ?? 'Unbekannt';
        warnings.push(`Rechnung ${invoiceId}: Konvertierungsfehler - ${(err as Error).message}`);
      }
    }
    
    // Konvertiere Ausgaben
    for (const expense of expenses) {
      try {
        const buchungen = this.expenseToDatevBuchungen(expense, settings);
        allBuchungen.push(...buchungen);
      } catch (err) {
        const expenseId = expense.receiptNumber ?? expense.id ?? 'Unbekannt';
        warnings.push(`Ausgabe ${expenseId}: Konvertierungsfehler - ${(err as Error).message}`);
      }
    }
    
    if (allBuchungen.length === 0) {
      errors.push('Keine Buchungssätze zum Exportieren gefunden');
      return { success: false, errors, warnings };
    }
    
    // Sortiere nach Belegdatum
    allBuchungen.sort((a, b) => a.belegdatum.getTime() - b.belegdatum.getTime());
    
    // Erstelle CSV
    const lines: string[] = [];
    
    // Zeile 1: Header
    lines.push(this.generateHeader(settings, allBuchungen.length));
    
    // Zeile 2: Spaltenüberschriften
    lines.push(this.generateColumnHeaders());
    
    // Buchungszeilen
    for (const buchung of allBuchungen) {
      lines.push(this.formatBuchungssatzAsCSV(buchung));
    }
    
    // Dateiname generieren
    const now = new Date();
    const filename = `EXTF_${settings.beraternummer}_${settings.mandantennummer}_${this.formatDateForFilename(now)}.csv`;
    
    return {
      success: true,
      csvContent: lines.join('\r\n'), // Windows-Zeilenenden für DATEV
      filename,
      recordCount: allBuchungen.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  private static toDate(value: unknown): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'object' && 'toDate' in value) {
      return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'object' && '_seconds' in value) {
      return new Date((value as { _seconds: number })._seconds * 1000);
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    return new Date();
  }
  
  private static formatDecimal(value: number): string {
    // DATEV erwartet Komma als Dezimaltrenner
    return Math.abs(value).toFixed(2).replace('.', ',');
  }
  
  private static formatBelegdatum(date: Date): string {
    // Format: TTMM (ohne Jahr, wird aus Header übernommen)
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return day + month;
  }
  
  private static formatDateNumeric(date: Date): string {
    // Format: YYYYMMDD
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  private static formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}${minutes}${seconds}`;
  }
  
  private static formatDateForExport(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  private static formatDateForFilename(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }
  
  private static sanitizeText(text: string, maxLength: number): string {
    // Entferne problematische Zeichen und kürze
    return text
      .replace(/[";]/g, '') // Keine Anführungszeichen oder Semikolons
      .replace(/[\r\n]/g, ' ') // Keine Zeilenumbrüche
      .substring(0, maxLength)
      .trim();
  }
  
  private static generatePersonenkonto(name: string, type: 'debitor' | 'kreditor', settings: DatevSettings): string {
    // Einfache Hash-basierte Kontogenerierung
    // In Produktion sollte dies über eine Debitoren/Kreditoren-Stammdatenverwaltung erfolgen
    const startKonto = type === 'debitor' ? 10000 : 70000;
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const kontoNummer = startKonto + (hash % 9999);
    return kontoNummer.toString().padStart(settings.personenkontenlänge, '0');
  }
  
  private static getAufwandskonto(category: string): string {
    const categoryMapping: Record<string, string> = {
      'Material': SKR03_KONTEN.wareneinkauf19,
      'Wareneinkauf': SKR03_KONTEN.wareneinkauf19,
      'Fremdleistungen': SKR03_KONTEN.fremdleistungen,
      'Miete': SKR03_KONTEN.miete,
      'Nebenkosten': SKR03_KONTEN.miete,
      'Raumkosten': SKR03_KONTEN.miete,
      'Fahrzeug': SKR03_KONTEN.kfz,
      'Kfz': SKR03_KONTEN.kfz,
      'Auto': SKR03_KONTEN.kfz,
      'Reise': SKR03_KONTEN.reisekosten,
      'Reisekosten': SKR03_KONTEN.reisekosten,
      'Versicherung': SKR03_KONTEN.versicherungen,
      'Beratung': SKR03_KONTEN.beratungskosten,
      'Rechtsberatung': SKR03_KONTEN.beratungskosten,
      'Werbung': SKR03_KONTEN.werbung,
      'Marketing': SKR03_KONTEN.werbung,
      'Büromaterial': SKR03_KONTEN.büromaterial,
      'Büro': SKR03_KONTEN.büromaterial,
      'Telefon': SKR03_KONTEN.telefon,
      'Internet': SKR03_KONTEN.telefon,
      'Porto': SKR03_KONTEN.porto,
      'AfA': SKR03_KONTEN.abschreibungen,
      'Abschreibung': SKR03_KONTEN.abschreibungen,
      'Zinsen': SKR03_KONTEN.zinsenBank,
      'Bank': SKR03_KONTEN.zinsenBank,
      'Sonstiges': SKR03_KONTEN.sonstigeAufwendungen,
    };
    
    // Versuche exakte Übereinstimmung, sonst case-insensitive Suche
    if (categoryMapping[category]) {
      return categoryMapping[category];
    }
    
    const lowerCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(categoryMapping)) {
      if (lowerCategory.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return SKR03_KONTEN.sonstigeAufwendungen;
  }
}

export default DatevExportService;
