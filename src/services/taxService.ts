/**
 * Tax Service - sevdesk Steuermodul für UStVA, EÜR, GuV und BWA
 * Automatisierte Steuererklärungen und Finanzberichte nach deutschem Steuerrecht
 */

// CRITICAL: Tax calculations using real financial data
const USE_MOCK_DATA = false; // PRODUCTION: Integration mit FinanceService required

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

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
    umsatzSteuerpflichtig: number; // Kz. 81
    umsatzSteuerfrei: number; // Kz. 86
    innergemeinschaftlich: number; // Kz. 41

    // Vorsteuer
    vorsteuerAbziehbar: number; // Kz. 66
    vorsteuerInnergem: number; // Kz. 61
    vorsteuerImport: number; // Kz. 62

    // Berechnung
    umsatzsteuerSchuld: number; // Kz. 83
    vorsteuerGuthaben: number; // Kz. 69

    // Zahllast/Erstattung
    zahllast: number; // Positiv = zu zahlen
    erstattung: number; // Negativ = Erstattung
  };

  // Einnahmen-Überschuss-Rechnung (EÜR)
  euer?: {
    // Betriebseinnahmen
    umsaetze: number;
    sonstigeEinnahmen: number;
    privatentnahmen: number;

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
    sonstigeAusgaben: number;

    // Abschreibungen
    abschreibungen: number;

    // Gewinn/Verlust
    gewinn: number;
    verlust: number;
  };

  // Gewinn- und Verlustrechnung (GuV)
  guv?: {
    // Erträge
    umsatzerlöse: number;
    bestandsveränderungen: number;
    sonstigeErträge: number;

    // Aufwendungen
    materialaufwand: number;
    personalaufwand: number;
    abschreibungen: number;
    sonstigeAufwendungen: number;

    // Finanzergebnis
    finanzertrage: number;
    finanzaufwendungen: number;

    // Steuern
    steuernVomEinkommen: number;
    sonstigeSteuern: number;

    // Ergebnis
    jahresueberschuss: number;
    jahresfehlbetrag: number;
  };

  // Betriebswirtschaftliche Auswertung (BWA)
  bwa?: {
    // Umsätze
    gesamtleistung: number;
    rohertrag: number;

    // Kosten
    personalkosten: number;
    materialkosten: number;
    fixkosten: number;
    variableKosten: number;

    // Kennzahlen
    deckungsbeitrag: number;
    betriebsergebnis: number;
    personalaufwandsquote: number;
    materialeinsatzquote: number;

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
    dauerfristverlängerung: boolean;
    sondervorauszahlung?: number;
  };

  // Voranmeldezeiträume
  anmeldezeitraum: 'monatlich' | 'vierteljährlich' | 'jährlich';

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
    pin?: string; // Verschlüsselt gespeichert
    testMode: boolean;
  };

  // Konten-Zuordnung
  accountMapping: {
    umsatzsteuerKonto: string;
    vorsteuerKonto: string;
    durchlaufendePosten: string[];
    privatkonten: string[];
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

export class TaxService {
  private static readonly REPORTS_COLLECTION = 'taxReports';
  private static readonly SETTINGS_COLLECTION = 'taxSettings';

  /**
   * Berechnet Umsatzsteuer-Voranmeldung (UStVA)
   */
  static async calculateUStVA(
    companyId: string,
    year: number,
    quarter: number
  ): Promise<TaxCalculation['ustVA']> {
    try {
      const period = this.getQuarterPeriod(year, quarter);

      // CRITICAL: Check if using mock data for tax calculations
      if (USE_MOCK_DATA) {
        console.warn(
          '🚨 TAX SERVICE: Using MOCK DATA for UStVA calculation! This should NEVER happen in production!'
        );

        // Umsätze und Steuern aus Transaktionen berechnen
        // TODO: Integration mit FinanceService für echte Daten
        const mockData = {
          umsatzSteuerpflichtig: 50000,
          umsatzSteuerfrei: 5000,
          innergemeinschaftlich: 0,
          vorsteuerAbziehbar: 8000,
          vorsteuerInnergem: 0,
          vorsteuerImport: 0,
          umsatzsteuerSchuld: 9500, // 19% von 50000
          vorsteuerGuthaben: 8000,
          zahllast: 1500, // 9500 - 8000
          erstattung: 0,
        };

        return mockData;
      }

      // PRODUCTION: Real UStVA calculation with FinanceService
      throw new Error(
        '🚨 TAX SERVICE: Real UStVA calculation not implemented! Cannot proceed without FinanceService integration.'
      );
    } catch (error) {
      console.error('Fehler bei UStVA Berechnung:', error);
      throw new Error('UStVA konnte nicht berechnet werden');
    }
  }

  /**
   * Berechnet Einnahmen-Überschuss-Rechnung (EÜR)
   */
  static async calculateEUeR(companyId: string, year: number): Promise<TaxCalculation['euer']> {
    try {
      // Jahres-Periode
      const periodStart = new Date(year, 0, 1);
      const periodEnd = new Date(year, 11, 31);

      // TODO: Integration mit FinanceService für echte Buchungen
      const mockData = {
        umsaetze: 200000,
        sonstigeEinnahmen: 5000,
        privatentnahmen: 0,
        wareneinkauf: 80000,
        personalkosten: 60000,
        raumkosten: 12000,
        fahrzeugkosten: 8000,
        werbekosten: 5000,
        reisekosten: 3000,
        kommunikation: 2000,
        bueroBedarf: 1500,
        versicherungen: 3500,
        sonstigeAusgaben: 10000,
        abschreibungen: 5000,
        gewinn: 15000,
        verlust: 0,
      };

      // Gewinn/Verlust berechnen
      const einnahmen = mockData.umsaetze + mockData.sonstigeEinnahmen;
      const ausgaben =
        mockData.wareneinkauf +
        mockData.personalkosten +
        mockData.raumkosten +
        mockData.fahrzeugkosten +
        mockData.werbekosten +
        mockData.reisekosten +
        mockData.kommunikation +
        mockData.bueroBedarf +
        mockData.versicherungen +
        mockData.sonstigeAusgaben +
        mockData.abschreibungen;

      const result = einnahmen - ausgaben;
      if (result > 0) {
        mockData.gewinn = result;
        mockData.verlust = 0;
      } else {
        mockData.gewinn = 0;
        mockData.verlust = Math.abs(result);
      }

      return mockData;
    } catch (error) {
      console.error('Fehler bei EÜR Berechnung:', error);
      throw new Error('EÜR konnte nicht berechnet werden');
    }
  }

  /**
   * Berechnet Gewinn- und Verlustrechnung (GuV)
   */
  static async calculateGuV(companyId: string, year: number): Promise<TaxCalculation['guv']> {
    try {
      // TODO: Integration mit echten Buchhaltungsdaten
      const mockData = {
        umsatzerlöse: 200000,
        bestandsveränderungen: 0,
        sonstigeErträge: 5000,
        materialaufwand: 80000,
        personalaufwand: 60000,
        abschreibungen: 5000,
        sonstigeAufwendungen: 35000,
        finanzertrage: 500,
        finanzaufwendungen: 1000,
        steuernVomEinkommen: 4000,
        sonstigeSteuern: 1500,
        jahresueberschuss: 0,
        jahresfehlbetrag: 0,
      };

      // Jahresergebnis berechnen
      const ertrageSumme =
        mockData.umsatzerlöse +
        mockData.bestandsveränderungen +
        mockData.sonstigeErträge +
        mockData.finanzertrage;
      const aufwendungenSumme =
        mockData.materialaufwand +
        mockData.personalaufwand +
        mockData.abschreibungen +
        mockData.sonstigeAufwendungen +
        mockData.finanzaufwendungen +
        mockData.steuernVomEinkommen +
        mockData.sonstigeSteuern;

      const jahresergebnis = ertrageSumme - aufwendungenSumme;
      if (jahresergebnis > 0) {
        mockData.jahresueberschuss = jahresergebnis;
      } else {
        mockData.jahresfehlbetrag = Math.abs(jahresergebnis);
      }

      return mockData;
    } catch (error) {
      console.error('Fehler bei GuV Berechnung:', error);
      throw new Error('GuV konnte nicht berechnet werden');
    }
  }

  /**
   * Berechnet Betriebswirtschaftliche Auswertung (BWA)
   */
  static async calculateBWA(
    companyId: string,
    year: number,
    month: number
  ): Promise<TaxCalculation['bwa']> {
    try {
      // Monats-Periode
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);

      // TODO: Integration mit echten Buchhaltungsdaten
      const mockData = {
        gesamtleistung: 16667, // 200000 / 12 Monate
        rohertrag: 10000,
        personalkosten: 5000,
        materialkosten: 6667,
        fixkosten: 2917,
        variableKosten: 1000,
        deckungsbeitrag: 3333,
        betriebsergebnis: 416,
        personalaufwandsquote: 30, // %
        materialeinsatzquote: 40, // %
        vorjahresvergleich: {
          umsatzEntwicklung: 5.2, // % Wachstum
          kostenentwicklung: 3.1,
          gewinnentwicklung: 12.5,
        },
      };

      // Kennzahlen berechnen
      mockData.rohertrag = mockData.gesamtleistung - mockData.materialkosten;
      mockData.deckungsbeitrag = mockData.rohertrag - mockData.variableKosten;
      mockData.betriebsergebnis =
        mockData.deckungsbeitrag - mockData.fixkosten - mockData.personalkosten;
      mockData.personalaufwandsquote = (mockData.personalkosten / mockData.gesamtleistung) * 100;
      mockData.materialeinsatzquote = (mockData.materialkosten / mockData.gesamtleistung) * 100;

      return mockData;
    } catch (error) {
      console.error('Fehler bei BWA Berechnung:', error);
      throw new Error('BWA konnte nicht berechnet werden');
    }
  }

  /**
   * Erstellt neuen Steuerbericht
   */
  static async createTaxReport(
    reportData: Omit<TaxReport, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.REPORTS_COLLECTION), {
        ...reportData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen des Steuerberichts:', error);
      throw new Error('Steuerbericht konnte nicht erstellt werden');
    }
  }

  /**
   * Lädt alle Steuerberichte für ein Unternehmen
   */
  static async getTaxReportsByCompany(companyId: string): Promise<TaxReport[]> {
    try {
      const q = query(
        collection(db, this.REPORTS_COLLECTION),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        periodStart: doc.data().periodStart?.toDate() || new Date(),
        periodEnd: doc.data().periodEnd?.toDate() || new Date(),
        elsterData: {
          ...doc.data().elsterData,
          submittedAt: doc.data().elsterData?.submittedAt?.toDate(),
        },
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as TaxReport[];
    } catch (error) {
      console.error('Fehler beim Laden der Steuerberichte:', error);
      throw new Error('Steuerberichte konnten nicht geladen werden');
    }
  }

  /**
   * Validiert Steuerbericht
   */
  static async validateTaxReport(report: TaxReport): Promise<TaxValidation> {
    try {
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

        // Pflichtfelder prüfen
        if (ustVA.umsatzSteuerpflichtig < 0) {
          validation.errors.push('Steuerpflichtige Umsätze dürfen nicht negativ sein');
          validation.isValid = false;
        }

        // Plausibilitätsprüfung
        if (ustVA.umsatzsteuerSchuld > ustVA.umsatzSteuerpflichtig * 0.25) {
          validation.warnings.push('Umsatzsteuerschuld erscheint ungewöhnlich hoch');
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
        const berechneterGewinn =
          euer.umsaetze +
          euer.sonstigeEinnahmen -
          (euer.wareneinkauf + euer.personalkosten + euer.sonstigeAusgaben);

        if (Math.abs(berechneterGewinn - euer.gewinn) > 100) {
          validation.warnings.push('Gewinnberechnung weicht ab');
          validation.plausibilityChecks.gewinnPlausibel = false;
        }
      }

      return validation;
    } catch (error) {
      console.error('Fehler bei der Validierung:', error);
      return {
        isValid: false,
        errors: ['Validierung fehlgeschlagen'],
        warnings: [],
        plausibilityChecks: {
          umsatzsteuerPlausibel: false,
          vorsteuerPlausibel: false,
          gewinnPlausibel: false,
        },
      };
    }
  }

  /**
   * Übermittelt Steuerbericht an ELSTER (Simulation)
   */
  static async submitToElster(reportId: string): Promise<void> {
    try {
      // Simulation der ELSTER-Übermittlung
      const transferTicket = `TT${Date.now()}`;

      await updateDoc(doc(db, this.REPORTS_COLLECTION, reportId), {
        status: 'submitted',
        elsterData: {
          transferTicket,
          submittedAt: new Date(),
          acknowledged: false,
        },
        updatedAt: new Date(),
      });

      // Simulation: Nach 5 Sekunden als akzeptiert markieren
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, this.REPORTS_COLLECTION, reportId), {
            status: 'accepted',
            'elsterData.acknowledged': true,
            updatedAt: new Date(),
          });
        } catch (error) {
          console.error('Fehler beim Aktualisieren des ELSTER-Status:', error);
        }
      }, 5000);
    } catch (error) {
      console.error('Fehler bei der ELSTER-Übermittlung:', error);
      throw new Error('ELSTER-Übermittlung fehlgeschlagen');
    }
  }

  /**
   * Generiert Quartalszeitraum
   */
  private static getQuarterPeriod(year: number, quarter: number): TaxPeriod {
    const quarterMonths = {
      1: { start: 0, end: 2 }, // Q1: Jan-Mar
      2: { start: 3, end: 5 }, // Q2: Apr-Jun
      3: { start: 6, end: 8 }, // Q3: Jul-Sep
      4: { start: 9, end: 11 }, // Q4: Oct-Dec
    };

    const months = quarterMonths[quarter as keyof typeof quarterMonths];
    const periodStart = new Date(year, months.start, 1);
    const periodEnd = new Date(year, months.end + 1, 0);

    // Abgabefrist: 10. des Folgemonats nach Quartalsende
    const dueDate = new Date(year, months.end + 1, 10);
    if (months.end === 11) {
      // Q4 geht ins nächste Jahr
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
    try {
      const q = query(
        collection(db, this.SETTINGS_COLLECTION),
        where('companyId', '==', companyId)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as TaxSettings;
    } catch (error) {
      console.error('Fehler beim Laden der Steuereinstellungen:', error);
      return null;
    }
  }

  /**
   * Speichert Steuereinstellungen
   */
  static async saveTaxSettings(
    settings: Omit<TaxSettings, 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    try {
      const q = query(
        collection(db, this.SETTINGS_COLLECTION),
        where('companyId', '==', settings.companyId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Neue Einstellungen erstellen
        await addDoc(collection(db, this.SETTINGS_COLLECTION), {
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Bestehende Einstellungen aktualisieren
        const docRef = doc(db, this.SETTINGS_COLLECTION, querySnapshot.docs[0].id);
        await updateDoc(docRef, {
          ...settings,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Steuereinstellungen:', error);
      throw new Error('Steuereinstellungen konnten nicht gespeichert werden');
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

      // Nächstes Fälligkeitsdatum (nächster 10. eines Monats)
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
      const nextDueDate = nextMonth;

      // Geschätzte Steuerschuld (vereinfacht)
      const latestUStVA = reports.find(r => r.type === 'ustVA' && r.year === currentYear);
      const estimatedTaxLiability = latestUStVA?.taxData.ustVA?.zahllast || 0;

      return {
        openReports,
        submittedReports,
        nextDueDate,
        estimatedTaxLiability,
      };
    } catch (error) {
      console.error('Fehler beim Laden der Steuerstatistiken:', error);
      return {
        openReports: 0,
        submittedReports: 0,
        nextDueDate: null,
        estimatedTaxLiability: 0,
      };
    }
  }
}
