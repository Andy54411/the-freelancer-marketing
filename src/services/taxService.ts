/**
 * Tax Service - Steuermodul für UStVA, EÜR, GuV und BWA
 * Automatisierte Steuererklärungen und Finanzberichte nach deutschem Steuerrecht
 * 
 * WICHTIG: Dieser Service verwendet echte Daten aus Firestore!
 * Keine Mock-Daten mehr - vollständige Integration mit Company-Subcollections.
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

// ============================================================================
// INTERFACES
// ============================================================================

export interface TaxReport {
  id?: string;
  companyId: string;

  // Report-Details
  type: 'ustVA' | 'euer' | 'guv' | 'bwa';
  year: number;
  quarter?: number; // Für UStVA Quartalsberichte
  month?: number; // Für BWA

  // Zeitraum
  periodStart: Date;
  periodEnd: Date;

  // Status
  status: 'draft' | 'calculated' | 'submitted' | 'accepted' | 'rejected';

  // Berechnungen
  taxData: TaxCalculation;

  // ELSTER Integration
  elsterData?: {
    transferTicket?: string;
    submittedAt?: Date;
    acknowledged?: boolean;
    errors?: string[];
  };

  // Metadaten
  generatedBy: string;
  submittedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxCalculation {
  // Umsatzsteuer-Voranmeldung (UStVA)
  ustVA?: {
    // Umsätze
    umsatzSteuerpflichtig19: number; // Netto-Umsätze mit 19%
    umsatzSteuerpflichtig7: number; // Netto-Umsätze mit 7%
    umsatzSteuerpflichtig: number; // Summe steuerpflichtige Umsätze (Kz. 81)
    umsatzSteuerfrei: number; // Kz. 86
    innergemeinschaftlich: number; // Kz. 41

    // Berechnete USt
    umsatzsteuer19: number; // 19% USt
    umsatzsteuer7: number; // 7% USt

    // Vorsteuer
    vorsteuerAbziehbar: number; // Kz. 66
    vorsteuerInnergem: number; // Kz. 61
    vorsteuerImport: number; // Kz. 62

    // Berechnung
    umsatzsteuerSchuld: number; // Kz. 83 (USt19 + USt7)
    vorsteuerGuthaben: number; // Kz. 69

    // Zahllast/Erstattung
    zahllast: number; // Positiv = zu zahlen
    erstattung: number; // Negativ = Erstattung
  };

  // Einnahmen-Überschuss-Rechnung (EÜR)
  euer?: {
    // Betriebseinnahmen
    umsaetze: number;
    umsaetze19: number;
    umsaetze7: number;
    umsaetze0: number;
    sonstigeEinnahmen: number;
    privatentnahmen: number;
    vereinnahmteUst: number;

    // Betriebsausgaben
    wareneinkauf: number;
    personalkosten: number;
    raumkosten: number;
    fahrzeugkosten: number;
    werbekosten: number;
    reisekosten: number;
    kommunikation: number;
    bueroBedarf: number;
    versicherungen: number;
    beratungskosten: number;
    sonstigeAusgaben: number;

    // Abschreibungen
    abschreibungen: number;
    abschreibungenGwg: number;

    // Vorsteuer
    gezahlteVorsteuer: number;

    // Gewinn/Verlust
    summeEinnahmen: number;
    summeAusgaben: number;
    gewinn: number;
    verlust: number;
  };

  // Gewinn- und Verlustrechnung (GuV)
  guv?: {
    // Erträge
    umsatzerloese: number;
    bestandsveraenderungen: number;
    sonstigeErtraege: number;

    // Aufwendungen
    materialaufwand: number;
    personalaufwand: number;
    abschreibungen: number;
    sonstigeAufwendungen: number;

    // Finanzergebnis
    finanzertraege: number;
    finanzaufwendungen: number;

    // Steuern
    steuernVomEinkommen: number;
    sonstigeSteuern: number;

    // Ergebnis
    rohertrag: number;
    betriebsergebnis: number;
    ergebnisVorSteuern: number;
    jahresueberschuss: number;
    jahresfehlbetrag: number;
  };

  // Betriebswirtschaftliche Auswertung (BWA)
  bwa?: {
    // Umsätze
    gesamtleistung: number;
    bestandsveraenderung: number;    // BWA-Zeile 2: Veränderung Lagerbestand
    rohertrag: number;

    // Personalkosten (getrennt nach Löhne/Gehälter)
    loehne: number;                  // BWA-Zeile 20: Gewerbliche MA (Stundenlohn)
    gehaelter: number;               // BWA-Zeile 21: Angestellte (Monatsfixum)
    sozialversicherungAG: number;    // BWA-Zeile 22: AG-Anteile SV
    personalkosten: number;          // Summe: Löhne + Gehälter + SV
    
    // Sonstige Kosten
    materialkosten: number;
    raumkosten: number;
    fahrzeugkosten: number;
    werbekosten: number;
    abschreibungen: number;
    sonstigeKosten: number;

    // Kennzahlen
    deckungsbeitrag: number;
    betriebsergebnis: number;
    personalaufwandsquote: number;
    materialeinsatzquote: number;
    rohertragsquote: number;

    // Vorjahresvergleich
    vorjahresvergleich?: {
      umsatzEntwicklung: number;
      kostenentwicklung: number;
      gewinnentwicklung: number;
    };
  };
}

export interface TaxSettings {
  companyId: string;

  // Grunddaten
  steuernummer: string;
  finanzamt: string;
  steuerberater?: {
    name: string;
    email: string;
    telefon: string;
    datevNummer?: string;
  };

  // Umsatzsteuer
  umsatzsteuer: {
    kleinunternehmer: boolean;
    istBesteuerung: boolean; // true = Ist, false = Soll
    quartalsmeldung: boolean;
    dauerfristverlaengerung: boolean;
    sondervorauszahlung?: number;
  };

  // Gewerbesteuer
  gewerbesteuer?: {
    hebesatz: number; // z.B. 400 für 400%
    freibetrag: number; // 24.500€ für Personengesellschaften
  };

  // Voranmeldezeiträume
  anmeldezeitraum: 'monatlich' | 'vierteljaehrlich' | 'jaehrlich';

  // Automatisierung
  automation: {
    autoGenerate: boolean;
    autoSubmit: boolean;
    reminderDays: number;
  };

  // ELSTER Zertifikat
  elster: {
    configured: boolean;
    certificatePath?: string;
    testMode: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface TaxPeriod {
  year: number;
  quarter?: number;
  month?: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date; // Abgabefrist
}

export interface TaxValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  plausibilityChecks: {
    umsatzsteuerPlausibel: boolean;
    vorsteuerPlausibel: boolean;
    gewinnPlausibel: boolean;
  };
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

/**
 * Kategorisiert Ausgaben nach DATEV-Kontenrahmen
 */
function categorizeExpense(category: string): string {
  const mapping: Record<string, string> = {
    'OFFICE_SUPPLIES': 'bueroBedarf',
    'TRAVEL': 'reisekosten',
    'MEALS': 'reisekosten',
    'TRANSPORT': 'fahrzeugkosten',
    'EQUIPMENT': 'sonstigeAusgaben',
    'SOFTWARE': 'sonstigeAusgaben',
    'MARKETING': 'werbekosten',
    'TRAINING': 'sonstigeAusgaben',
    'UTILITIES': 'raumkosten',
    'INSURANCE': 'versicherungen',
    'LEGAL': 'beratungskosten',
    'TAXES': 'sonstigeAusgaben',
    'OTHER': 'sonstigeAusgaben',
  };
  return mapping[category] || 'sonstigeAusgaben';
}

// ============================================================================
// TAX SERVICE CLASS
// ============================================================================

export class TaxService {
  /**
   * Berechnet Umsatzsteuer-Voranmeldung (UStVA) aus echten Daten
   */
  static async calculateUStVA(
    companyId: string,
    year: number,
    quarter: number
  ): Promise<TaxCalculation['ustVA']> {
    const period = this.getQuarterPeriod(year, quarter);
    const startTimestamp = Timestamp.fromDate(period.periodStart);
    const endTimestamp = Timestamp.fromDate(period.periodEnd);

    // ========================================================================
    // 1. UMSÄTZE AUS RECHNUNGEN LADEN
    // ========================================================================
    const invoicesRef = collection(db, 'companies', companyId, 'invoices');
    const invoicesQuery = query(
      invoicesRef,
      where('invoiceDate', '>=', startTimestamp),
      where('invoiceDate', '<=', endTimestamp)
    );

    const invoicesSnapshot = await getDocs(invoicesQuery);

    let umsatz19 = 0;
    let umsatz7 = 0;
    let umsatz0 = 0;
    let ust19 = 0;
    let ust7 = 0;

    invoicesSnapshot.forEach(docSnapshot => {
      const inv = docSnapshot.data();
      
      // Nur bezahlte/gesperrte/gesendete Rechnungen
      const validStatus = ['paid', 'sent', 'overdue', 'partial'].includes(inv.status);
      const isLocked = inv.isLocked === true || inv.gobdStatus === 'locked';
      
      if (!validStatus && !isLocked) {
        return;
      }

      // Beträge sind in Cent gespeichert
      const netAmount = (inv.netAmount || inv.subtotal || 0) / 100;
      const taxAmount = (inv.taxAmount || inv.tax || 0) / 100;
      const taxRate = inv.taxRate || inv.vatRate || 19;

      if (taxRate === 19) {
        umsatz19 += netAmount;
        ust19 += taxAmount;
      } else if (taxRate === 7) {
        umsatz7 += netAmount;
        ust7 += taxAmount;
      } else {
        umsatz0 += netAmount;
      }
    });

    // ========================================================================
    // 2. VORSTEUER AUS AUSGABEN LADEN
    // ========================================================================
    const expensesRef = collection(db, 'companies', companyId, 'expenses');
    const expensesQuery = query(
      expensesRef,
      where('expenseDate', '>=', startTimestamp),
      where('expenseDate', '<=', endTimestamp)
    );

    const expensesSnapshot = await getDocs(expensesQuery);

    let vorsteuer = 0;

    expensesSnapshot.forEach(docSnapshot => {
      const exp = docSnapshot.data();
      
      // Nur bezahlte Ausgaben
      if (!['PAID', 'APPROVED'].includes(exp.status)) {
        return;
      }
      
      // taxInfo.taxAmount enthält die Vorsteuer
      if (exp.taxInfo?.taxAmount && exp.taxInfo?.isDeductible !== false) {
        vorsteuer += exp.taxInfo.taxAmount / 100;
      }
    });

    // ========================================================================
    // 3. BERECHNUNG
    // ========================================================================
    const umsatzSteuerpflichtig = umsatz19 + umsatz7;
    const umsatzsteuerSchuld = ust19 + ust7;
    const zahllast = umsatzsteuerSchuld - vorsteuer;

    return {
      umsatzSteuerpflichtig19: Math.round(umsatz19 * 100) / 100,
      umsatzSteuerpflichtig7: Math.round(umsatz7 * 100) / 100,
      umsatzSteuerpflichtig: Math.round(umsatzSteuerpflichtig * 100) / 100,
      umsatzSteuerfrei: Math.round(umsatz0 * 100) / 100,
      innergemeinschaftlich: 0, // TODO: Separate Erfassung für EU-Lieferungen
      umsatzsteuer19: Math.round(ust19 * 100) / 100,
      umsatzsteuer7: Math.round(ust7 * 100) / 100,
      vorsteuerAbziehbar: Math.round(vorsteuer * 100) / 100,
      vorsteuerInnergem: 0,
      vorsteuerImport: 0,
      umsatzsteuerSchuld: Math.round(umsatzsteuerSchuld * 100) / 100,
      vorsteuerGuthaben: Math.round(vorsteuer * 100) / 100,
      zahllast: zahllast > 0 ? Math.round(zahllast * 100) / 100 : 0,
      erstattung: zahllast < 0 ? Math.round(Math.abs(zahllast) * 100) / 100 : 0,
    };
  }

  /**
   * Berechnet Einnahmen-Überschuss-Rechnung (EÜR) aus echten Daten
   */
  static async calculateEUeR(companyId: string, year: number): Promise<TaxCalculation['euer']> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // ========================================================================
    // 1. EINNAHMEN AUS RECHNUNGEN
    // ========================================================================
    const invoicesRef = collection(db, 'companies', companyId, 'invoices');
    const invoicesQuery = query(
      invoicesRef,
      where('status', '==', 'paid')
    );

    const invoicesSnapshot = await getDocs(invoicesQuery);

    let umsaetze19 = 0;
    let umsaetze7 = 0;
    let umsaetze0 = 0;
    let vereinnahmteUst = 0;

    invoicesSnapshot.forEach(docSnapshot => {
      const inv = docSnapshot.data();
      
      // Prüfe ob im richtigen Jahr bezahlt
      const paidDate = inv.paidAt?.toDate?.() || inv.updatedAt?.toDate?.();
      if (!paidDate || paidDate < startDate || paidDate > endDate) {
        return;
      }

      const netAmount = (inv.netAmount || inv.subtotal || 0) / 100;
      const taxAmount = (inv.taxAmount || inv.tax || 0) / 100;
      const taxRate = inv.taxRate || inv.vatRate || 19;

      if (taxRate === 19) {
        umsaetze19 += netAmount;
      } else if (taxRate === 7) {
        umsaetze7 += netAmount;
      } else {
        umsaetze0 += netAmount;
      }
      vereinnahmteUst += taxAmount;
    });

    // ========================================================================
    // 2. AUSGABEN LADEN UND KATEGORISIEREN
    // ========================================================================
    const expensesRef = collection(db, 'companies', companyId, 'expenses');
    const expensesQuery = query(
      expensesRef,
      where('status', 'in', ['PAID', 'APPROVED'])
    );

    const expensesSnapshot = await getDocs(expensesQuery);

    const ausgaben: Record<string, number> = {
      wareneinkauf: 0,
      personalkosten: 0,
      raumkosten: 0,
      fahrzeugkosten: 0,
      werbekosten: 0,
      reisekosten: 0,
      kommunikation: 0,
      bueroBedarf: 0,
      versicherungen: 0,
      beratungskosten: 0,
      sonstigeAusgaben: 0,
    };

    let gezahlteVorsteuer = 0;

    expensesSnapshot.forEach(docSnapshot => {
      const exp = docSnapshot.data();
      
      // Prüfe ob im richtigen Jahr bezahlt
      const paymentDate = exp.paymentDate?.toDate?.() || exp.expenseDate?.toDate?.();
      if (!paymentDate || paymentDate < startDate || paymentDate > endDate) {
        return;
      }

      const netAmount = (exp.taxInfo?.netAmount || exp.amount || 0) / 100;
      const taxAmount = (exp.taxInfo?.taxAmount || 0) / 100;
      const category = categorizeExpense(exp.category || 'OTHER');

      ausgaben[category] = (ausgaben[category] || 0) + netAmount;
      
      if (exp.taxInfo?.isDeductible !== false) {
        gezahlteVorsteuer += taxAmount;
      }
    });

    // ========================================================================
    // 3. ABSCHREIBUNGEN AUS ANLAGEN (falls vorhanden)
    // ========================================================================
    let abschreibungen = 0;
    let abschreibungenGwg = 0;

    try {
      const assetsRef = collection(db, 'companies', companyId, 'fixedAssets');
      const assetsQuery = query(
        assetsRef,
        where('status', '==', 'active')
      );
      const assetsSnapshot = await getDocs(assetsQuery);

      assetsSnapshot.forEach(docSnapshot => {
        const asset = docSnapshot.data();
        
        // Berechne AfA für dieses Jahr
        const yearlyAfa = this.calculateYearlyDepreciation(asset, year);
        
        if (asset.isGwg) {
          abschreibungenGwg += yearlyAfa;
        } else {
          abschreibungen += yearlyAfa;
        }
      });
    } catch {
      // fixedAssets Collection existiert möglicherweise noch nicht
    }

    // ========================================================================
    // 4. GEWINNERMITTLUNG
    // ========================================================================
    const umsaetze = umsaetze19 + umsaetze7 + umsaetze0;
    const summeEinnahmen = umsaetze + vereinnahmteUst;
    const summeAusgaben = 
      Object.values(ausgaben).reduce((sum, val) => sum + val, 0) +
      gezahlteVorsteuer +
      abschreibungen +
      abschreibungenGwg;

    const ergebnis = summeEinnahmen - summeAusgaben;

    return {
      umsaetze: Math.round(umsaetze * 100) / 100,
      umsaetze19: Math.round(umsaetze19 * 100) / 100,
      umsaetze7: Math.round(umsaetze7 * 100) / 100,
      umsaetze0: Math.round(umsaetze0 * 100) / 100,
      sonstigeEinnahmen: 0,
      privatentnahmen: 0,
      vereinnahmteUst: Math.round(vereinnahmteUst * 100) / 100,
      wareneinkauf: Math.round(ausgaben.wareneinkauf * 100) / 100,
      personalkosten: Math.round(ausgaben.personalkosten * 100) / 100,
      raumkosten: Math.round(ausgaben.raumkosten * 100) / 100,
      fahrzeugkosten: Math.round(ausgaben.fahrzeugkosten * 100) / 100,
      werbekosten: Math.round(ausgaben.werbekosten * 100) / 100,
      reisekosten: Math.round(ausgaben.reisekosten * 100) / 100,
      kommunikation: Math.round(ausgaben.kommunikation * 100) / 100,
      bueroBedarf: Math.round(ausgaben.bueroBedarf * 100) / 100,
      versicherungen: Math.round(ausgaben.versicherungen * 100) / 100,
      beratungskosten: Math.round(ausgaben.beratungskosten * 100) / 100,
      sonstigeAusgaben: Math.round(ausgaben.sonstigeAusgaben * 100) / 100,
      abschreibungen: Math.round(abschreibungen * 100) / 100,
      abschreibungenGwg: Math.round(abschreibungenGwg * 100) / 100,
      gezahlteVorsteuer: Math.round(gezahlteVorsteuer * 100) / 100,
      summeEinnahmen: Math.round(summeEinnahmen * 100) / 100,
      summeAusgaben: Math.round(summeAusgaben * 100) / 100,
      gewinn: ergebnis > 0 ? Math.round(ergebnis * 100) / 100 : 0,
      verlust: ergebnis < 0 ? Math.round(Math.abs(ergebnis) * 100) / 100 : 0,
    };
  }

  /**
   * Berechnet Gewinn- und Verlustrechnung (GuV) aus echten Daten
   */
  static async calculateGuV(companyId: string, year: number): Promise<TaxCalculation['guv']> {
    // Nutze EÜR-Daten als Basis
    const euerResult = await this.calculateEUeR(companyId, year);

    // Falls keine EÜR-Daten vorhanden, leere GuV zurückgeben
    if (!euerResult) {
      return {
        umsatzerloese: 0,
        bestandsveraenderungen: 0,
        sonstigeErtraege: 0,
        materialaufwand: 0,
        personalaufwand: 0,
        abschreibungen: 0,
        sonstigeAufwendungen: 0,
        finanzertraege: 0,
        finanzaufwendungen: 0,
        steuernVomEinkommen: 0,
        sonstigeSteuern: 0,
        rohertrag: 0,
        betriebsergebnis: 0,
        ergebnisVorSteuern: 0,
        jahresueberschuss: 0,
        jahresfehlbetrag: 0,
      };
    }

    // Umrechnung EÜR → GuV (Gesamtkostenverfahren)
    const umsatzerloese = euerResult.umsaetze;
    const materialaufwand = euerResult.wareneinkauf;
    const personalaufwand = euerResult.personalkosten;
    const abschreibungen = euerResult.abschreibungen + euerResult.abschreibungenGwg;
    const sonstigeAufwendungen = 
      euerResult.raumkosten +
      euerResult.fahrzeugkosten +
      euerResult.werbekosten +
      euerResult.reisekosten +
      euerResult.kommunikation +
      euerResult.bueroBedarf +
      euerResult.versicherungen +
      euerResult.beratungskosten +
      euerResult.sonstigeAusgaben;

    const rohertrag = umsatzerloese - materialaufwand;
    const betriebsergebnis = rohertrag - personalaufwand - abschreibungen - sonstigeAufwendungen;
    const ergebnisVorSteuern = betriebsergebnis; // + Finanzergebnis

    return {
      umsatzerloese: Math.round(umsatzerloese * 100) / 100,
      bestandsveraenderungen: 0,
      sonstigeErtraege: euerResult.sonstigeEinnahmen,
      materialaufwand: Math.round(materialaufwand * 100) / 100,
      personalaufwand: Math.round(personalaufwand * 100) / 100,
      abschreibungen: Math.round(abschreibungen * 100) / 100,
      sonstigeAufwendungen: Math.round(sonstigeAufwendungen * 100) / 100,
      finanzertraege: 0,
      finanzaufwendungen: 0,
      steuernVomEinkommen: 0,
      sonstigeSteuern: 0,
      rohertrag: Math.round(rohertrag * 100) / 100,
      betriebsergebnis: Math.round(betriebsergebnis * 100) / 100,
      ergebnisVorSteuern: Math.round(ergebnisVorSteuern * 100) / 100,
      jahresueberschuss: ergebnisVorSteuern > 0 ? Math.round(ergebnisVorSteuern * 100) / 100 : 0,
      jahresfehlbetrag: ergebnisVorSteuern < 0 ? Math.round(Math.abs(ergebnisVorSteuern) * 100) / 100 : 0,
    };
  }

  /**
   * Berechnet Betriebswirtschaftliche Auswertung (BWA) für einen Monat
   */
  static async calculateBWA(
    companyId: string,
    year: number,
    month: number
  ): Promise<TaxCalculation['bwa']> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // ========================================================================
    // 1. UMSÄTZE FÜR DEN MONAT
    // ========================================================================
    const invoicesRef = collection(db, 'companies', companyId, 'invoices');
    const invoicesQuery = query(
      invoicesRef,
      where('invoiceDate', '>=', startTimestamp),
      where('invoiceDate', '<=', endTimestamp)
    );

    const invoicesSnapshot = await getDocs(invoicesQuery);

    let gesamtleistung = 0;

    invoicesSnapshot.forEach(docSnapshot => {
      const inv = docSnapshot.data();
      const validStatus = ['paid', 'sent', 'overdue', 'partial'].includes(inv.status);
      const isLocked = inv.isLocked === true || inv.gobdStatus === 'locked';
      
      if (validStatus || isLocked) {
        const netAmount = (inv.netAmount || inv.subtotal || 0) / 100;
        gesamtleistung += netAmount;
      }
    });

    // ========================================================================
    // 2. KOSTEN FÜR DEN MONAT
    // ========================================================================
    const expensesRef = collection(db, 'companies', companyId, 'expenses');
    const expensesQuery = query(
      expensesRef,
      where('expenseDate', '>=', startTimestamp),
      where('expenseDate', '<=', endTimestamp)
    );

    const expensesSnapshot = await getDocs(expensesQuery);

    let materialkosten = 0;
    let raumkosten = 0;
    let fahrzeugkosten = 0;
    let werbekosten = 0;
    let sonstigeKosten = 0;

    expensesSnapshot.forEach(docSnapshot => {
      const exp = docSnapshot.data();
      if (!['PAID', 'APPROVED'].includes(exp.status)) return;

      const netAmount = (exp.taxInfo?.netAmount || exp.amount || 0) / 100;
      const category = exp.category || 'OTHER';

      switch (category) {
        case 'OFFICE_SUPPLIES':
        case 'EQUIPMENT':
        case 'SOFTWARE':
          materialkosten += netAmount;
          break;
        case 'UTILITIES':
          raumkosten += netAmount;
          break;
        case 'TRANSPORT':
        case 'TRAVEL':
          fahrzeugkosten += netAmount;
          break;
        case 'MARKETING':
          werbekosten += netAmount;
          break;
        default:
          sonstigeKosten += netAmount;
      }
    });

    // ========================================================================
    // 3. PERSONALKOSTEN (aus Payrolls - echte Lohnabrechnungsdaten)
    // ========================================================================
    let loehne = 0;        // BWA-Zeile 20: Gewerbliche Mitarbeiter (Stundenlohn)
    let gehaelter = 0;     // BWA-Zeile 21: Angestellte (Monatsfixum)
    let sozialversicherungAG = 0; // AG-Anteile SV
    
    try {
      const payrollsRef = collection(db, 'companies', companyId, 'payrolls');
      const payrollsSnapshot = await getDocs(payrollsRef);
      
      payrollsSnapshot.forEach(docSnapshot => {
        const payroll = docSnapshot.data();
        
        // Prüfe ob Payroll im richtigen Monat liegt
        const payrollDate = payroll.payrollDate?.toDate?.() || payroll.periodEnd?.toDate?.();
        if (!payrollDate) return;
        
        const payrollMonth = payrollDate.getMonth() + 1;
        const payrollYear = payrollDate.getFullYear();
        
        if (payrollYear !== year || payrollMonth !== month) return;
        
        // Bruttogehalt (in Cent gespeichert)
        const grossSalary = (payroll.grossSalary || 0) / 100;
        
        // Unterscheide Löhne (Stundenlohn) vs. Gehälter (Monatsfixum)
        // isWage = true bedeutet Lohn, false = Gehalt
        if (payroll.isWage === true || payroll.employmentType === 'hourly') {
          loehne += grossSalary;
        } else {
          gehaelter += grossSalary;
        }
        
        // AG-Anteil Sozialversicherung
        const svAG = (payroll.employerCosts?.socialSecurity || 0) / 100;
        sozialversicherungAG += svAG;
      });
      
      // Falls keine Payrolls gefunden, Fallback auf Employees-Schätzung
      if (loehne === 0 && gehaelter === 0) {
        const employeesRef = collection(db, 'companies', companyId, 'employees');
        const employeesSnapshot = await getDocs(employeesRef);
        
        employeesSnapshot.forEach(docSnapshot => {
          const emp = docSnapshot.data();
          if (emp.status === 'active' && emp.salary) {
            const monthlySalary = (emp.salary || 0) / 100;
            // Bei Fallback: Alle als Gehälter behandeln
            gehaelter += monthlySalary;
            // Schätze AG-Anteile (ca. 20%)
            sozialversicherungAG += monthlySalary * 0.2;
          }
        });
      }
    } catch {
      // payrolls/employees Collection existiert möglicherweise nicht
    }
    
    // Gesamte Personalkosten = Löhne + Gehälter + AG-SV
    const personalkosten = loehne + gehaelter + sozialversicherungAG;

    // ========================================================================
    // 4. ABSCHREIBUNGEN (anteilig für den Monat)
    // ========================================================================
    let abschreibungen = 0;

    try {
      const assetsRef = collection(db, 'companies', companyId, 'fixedAssets');
      const assetsQuery = query(assetsRef, where('status', '==', 'active'));
      const assetsSnapshot = await getDocs(assetsQuery);

      assetsSnapshot.forEach(docSnapshot => {
        const asset = docSnapshot.data();
        const yearlyAfa = this.calculateYearlyDepreciation(asset, year);
        abschreibungen += yearlyAfa / 12; // Monatlicher Anteil
      });
    } catch {
      // fixedAssets Collection existiert möglicherweise nicht
    }

    // ========================================================================
    // 5. BESTANDSVERÄNDERUNG (BWA-Zeile 2)
    // ========================================================================
    let bestandsveraenderung = 0;
    
    try {
      // Importiere dynamisch, um zirkuläre Abhängigkeiten zu vermeiden
      const { InventurService } = await import('./inventurService');
      const stockChange = await InventurService.calculateStockChange(companyId, startDate, endDate);
      bestandsveraenderung = stockChange.change / 100; // Von Cent zu Euro
    } catch {
      // InventurService nicht verfügbar oder keine Snapshots
    }

    // ========================================================================
    // 6. KENNZAHLEN BERECHNEN
    // ========================================================================
    const rohertrag = gesamtleistung + bestandsveraenderung - materialkosten;
    const gesamtkosten = materialkosten + personalkosten + raumkosten + 
                         fahrzeugkosten + werbekosten + abschreibungen + sonstigeKosten;
    const deckungsbeitrag = rohertrag - personalkosten;
    const betriebsergebnis = gesamtleistung + bestandsveraenderung - gesamtkosten;

    const personalaufwandsquote = gesamtleistung > 0 ? (personalkosten / gesamtleistung) * 100 : 0;
    const materialeinsatzquote = gesamtleistung > 0 ? (materialkosten / gesamtleistung) * 100 : 0;
    const rohertragsquote = gesamtleistung > 0 ? (rohertrag / gesamtleistung) * 100 : 0;

    return {
      gesamtleistung: Math.round(gesamtleistung * 100) / 100,
      bestandsveraenderung: Math.round(bestandsveraenderung * 100) / 100,
      rohertrag: Math.round(rohertrag * 100) / 100,
      // Personalkosten aufgeschlüsselt
      loehne: Math.round(loehne * 100) / 100,
      gehaelter: Math.round(gehaelter * 100) / 100,
      sozialversicherungAG: Math.round(sozialversicherungAG * 100) / 100,
      personalkosten: Math.round(personalkosten * 100) / 100,
      // Sonstige Kosten
      materialkosten: Math.round(materialkosten * 100) / 100,
      raumkosten: Math.round(raumkosten * 100) / 100,
      fahrzeugkosten: Math.round(fahrzeugkosten * 100) / 100,
      werbekosten: Math.round(werbekosten * 100) / 100,
      abschreibungen: Math.round(abschreibungen * 100) / 100,
      sonstigeKosten: Math.round(sonstigeKosten * 100) / 100,
      // Kennzahlen
      deckungsbeitrag: Math.round(deckungsbeitrag * 100) / 100,
      betriebsergebnis: Math.round(betriebsergebnis * 100) / 100,
      personalaufwandsquote: Math.round(personalaufwandsquote * 10) / 10,
      materialeinsatzquote: Math.round(materialeinsatzquote * 10) / 10,
      rohertragsquote: Math.round(rohertragsquote * 10) / 10,
    };
  }

  /**
   * Berechnet jährliche Abschreibung für ein Anlagegut
   */
  private static calculateYearlyDepreciation(asset: Record<string, unknown>, year: number): number {
    const purchaseDateRaw = asset.purchaseDate as { toDate?: () => Date } | undefined;
    const purchaseDate = purchaseDateRaw?.toDate?.();
    if (!purchaseDate) return 0;

    const purchasePrice = ((asset.purchasePrice as number) || 0) / 100;
    const usefulLifeMonths = (asset.usefulLife as number) || 36;
    const depreciationMethod = (asset.depreciationMethod as string) || 'linear';

    // GWG: Sofortabschreibung im Anschaffungsjahr
    if (asset.isGwg && purchaseDate.getFullYear() === year) {
      return purchasePrice;
    }

    // Sammelposten: 20% pro Jahr über 5 Jahre
    if (asset.isSammelposten) {
      const yearsActive = year - purchaseDate.getFullYear();
      if (yearsActive >= 0 && yearsActive < 5) {
        return purchasePrice * 0.2;
      }
      return 0;
    }

    // Lineare AfA
    if (depreciationMethod === 'linear') {
      const monthlyAfa = purchasePrice / usefulLifeMonths;
      
      // Zeitanteilig im Anschaffungsjahr
      if (purchaseDate.getFullYear() === year) {
        const monthsActive = 12 - purchaseDate.getMonth();
        return monthlyAfa * monthsActive;
      }
      
      // Voll-Jahr
      const monthsSincePurchase = (year - purchaseDate.getFullYear()) * 12;
      if (monthsSincePurchase < usefulLifeMonths) {
        return monthlyAfa * 12;
      }
      
      // Nach Ende der Nutzungsdauer
      const remainingMonths = usefulLifeMonths - monthsSincePurchase + 12;
      if (remainingMonths > 0) {
        return monthlyAfa * remainingMonths;
      }
    }

    return 0;
  }

  // ============================================================================
  // CRUD OPERATIONS - Jetzt mit Company-Subcollection
  // ============================================================================

  /**
   * Erstellt neuen Steuerbericht
   */
  static async createTaxReport(
    reportData: Omit<TaxReport, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const reportsRef = collection(db, 'companies', reportData.companyId, 'taxReports');
    
    const docRef = await addDoc(reportsRef, {
      ...reportData,
      periodStart: Timestamp.fromDate(reportData.periodStart),
      periodEnd: Timestamp.fromDate(reportData.periodEnd),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  }

  /**
   * Lädt alle Steuerberichte für ein Unternehmen
   */
  static async getTaxReportsByCompany(companyId: string): Promise<TaxReport[]> {
    const reportsRef = collection(db, 'companies', companyId, 'taxReports');
    const q = query(reportsRef, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      companyId,
      ...docSnapshot.data(),
      periodStart: docSnapshot.data().periodStart?.toDate() || new Date(),
      periodEnd: docSnapshot.data().periodEnd?.toDate() || new Date(),
      elsterData: {
        ...docSnapshot.data().elsterData,
        submittedAt: docSnapshot.data().elsterData?.submittedAt?.toDate(),
      },
      createdAt: docSnapshot.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnapshot.data().updatedAt?.toDate() || new Date(),
    })) as TaxReport[];
  }

  /**
   * Validiert Steuerbericht
   */
  static async validateTaxReport(report: TaxReport): Promise<TaxValidation> {
    const validation: TaxValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      plausibilityChecks: {
        umsatzsteuerPlausibel: true,
        vorsteuerPlausibel: true,
        gewinnPlausibel: true,
      },
    };

    // UStVA Validierung
    if (report.type === 'ustVA' && report.taxData.ustVA) {
      const ustVA = report.taxData.ustVA;

      if (ustVA.umsatzSteuerpflichtig < 0) {
        validation.errors.push('Steuerpflichtige Umsätze dürfen nicht negativ sein');
        validation.isValid = false;
      }

      // Plausibilitätsprüfung: USt sollte ca. 19% der Umsätze sein
      const erwarteteUst = ustVA.umsatzSteuerpflichtig19 * 0.19 + ustVA.umsatzSteuerpflichtig7 * 0.07;
      if (Math.abs(erwarteteUst - ustVA.umsatzsteuerSchuld) > 10) {
        validation.warnings.push('Umsatzsteuerschuld weicht von Erwartung ab - bitte prüfen');
        validation.plausibilityChecks.umsatzsteuerPlausibel = false;
      }
    }

    // EÜR Validierung
    if (report.type === 'euer' && report.taxData.euer) {
      const euer = report.taxData.euer;

      if (euer.umsaetze < 0) {
        validation.errors.push('Umsätze dürfen nicht negativ sein');
        validation.isValid = false;
      }

      // Gewinn-Plausibilität
      const berechneterGewinn = euer.summeEinnahmen - euer.summeAusgaben;
      const angegebenerGewinn = euer.gewinn - euer.verlust;
      
      if (Math.abs(berechneterGewinn - angegebenerGewinn) > 1) {
        validation.warnings.push('Gewinnberechnung weicht ab');
        validation.plausibilityChecks.gewinnPlausibel = false;
      }
    }

    return validation;
  }

  /**
   * Übermittelt Steuerbericht an ELSTER (Simulation)
   */
  static async submitToElster(companyId: string, reportId: string): Promise<void> {
    const transferTicket = `TT${Date.now()}`;

    await updateDoc(doc(db, 'companies', companyId, 'taxReports', reportId), {
      status: 'submitted',
      elsterData: {
        transferTicket,
        submittedAt: Timestamp.now(),
        acknowledged: false,
      },
      updatedAt: Timestamp.now(),
    });

    // Simulation: Nach 5 Sekunden als akzeptiert markieren
    setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'companies', companyId, 'taxReports', reportId), {
          status: 'accepted',
          'elsterData.acknowledged': true,
          updatedAt: Timestamp.now(),
        });
      } catch {
        // Fehler ignorieren
      }
    }, 5000);
  }

  /**
   * Generiert Quartalszeitraum
   */
  private static getQuarterPeriod(year: number, quarter: number): TaxPeriod {
    const quarterMonths = {
      1: { start: 0, end: 2 },
      2: { start: 3, end: 5 },
      3: { start: 6, end: 8 },
      4: { start: 9, end: 11 },
    };

    const months = quarterMonths[quarter as keyof typeof quarterMonths];
    const periodStart = new Date(year, months.start, 1);
    const periodEnd = new Date(year, months.end + 1, 0, 23, 59, 59);

    // Abgabefrist: 10. des Folgemonats nach Quartalsende
    const dueDate = new Date(year, months.end + 1, 10);
    if (months.end === 11) {
      dueDate.setFullYear(year + 1);
      dueDate.setMonth(0);
    }

    return {
      year,
      quarter,
      periodStart,
      periodEnd,
      dueDate,
    };
  }

  /**
   * Lädt Steuereinstellungen
   */
  static async getTaxSettings(companyId: string): Promise<TaxSettings | null> {
    const settingsRef = collection(db, 'companies', companyId, 'taxSettings');
    const querySnapshot = await getDocs(settingsRef);

    if (querySnapshot.empty) {
      return null;
    }

    const docData = querySnapshot.docs[0].data();
    return {
      ...docData,
      companyId,
      createdAt: docData.createdAt?.toDate() || new Date(),
      updatedAt: docData.updatedAt?.toDate() || new Date(),
    } as TaxSettings;
  }

  /**
   * Speichert Steuereinstellungen
   */
  static async saveTaxSettings(
    settings: Omit<TaxSettings, 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const settingsRef = collection(db, 'companies', settings.companyId, 'taxSettings');
    const querySnapshot = await getDocs(settingsRef);

    if (querySnapshot.empty) {
      await addDoc(settingsRef, {
        ...settings,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      const docRef = doc(db, 'companies', settings.companyId, 'taxSettings', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        ...settings,
        updatedAt: Timestamp.now(),
      });
    }
  }

  /**
   * Statistiken für Dashboard
   */
  static async getTaxStats(companyId: string): Promise<{
    openReports: number;
    submittedReports: number;
    nextDueDate: Date | null;
    estimatedTaxLiability: number;
  }> {
    try {
      const reports = await this.getTaxReportsByCompany(companyId);
      const currentYear = new Date().getFullYear();

      const openReports = reports.filter(
        r => r.status === 'draft' || r.status === 'calculated'
      ).length;
      const submittedReports = reports.filter(
        r => r.status === 'submitted' || r.status === 'accepted'
      ).length;

      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);

      const latestUStVA = reports.find(r => r.type === 'ustVA' && r.year === currentYear);
      const estimatedTaxLiability = latestUStVA?.taxData.ustVA?.zahllast || 0;

      return {
        openReports,
        submittedReports,
        nextDueDate: nextMonth,
        estimatedTaxLiability,
      };
    } catch {
      return {
        openReports: 0,
        submittedReports: 0,
        nextDueDate: null,
        estimatedTaxLiability: 0,
      };
    }
  }
}
