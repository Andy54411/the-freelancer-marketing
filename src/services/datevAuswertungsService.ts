'use client';

import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import COMPLETE_DATEV_ACCOUNTS from '@/data/complete-datev-accounts';

/**
 * ====================================================================
 * DATEV AUSWERTUNGS-SERVICE
 * ====================================================================
 * 
 * Dieser Service generiert professionelle Auswertungen basierend auf
 * dem DATEV-Kontenrahmen SKR03/SKR04:
 * 
 * - BWA (Betriebswirtschaftliche Auswertung)
 * - SuSa (Summen- und Saldenliste)
 * - EÜR (Einnahmen-Überschuss-Rechnung)
 * - UStVA (Umsatzsteuer-Voranmeldung)
 * - GuV (Gewinn- und Verlustrechnung)
 * 
 * Alle Buchungen werden DATEV-Konten zugeordnet und entsprechend
 * den BWA-Zeilen aggregiert.
 */

// ============================================================================
// TYPEN FÜR DATEV-KONTEN
// ============================================================================

export interface DatevKonto {
  number: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY';
}

export interface Buchung {
  id: string;
  datum: Date;
  betrag: number;
  kontoNummer: string;
  gegenKonto?: string;
  beschreibung: string;
  belegNummer?: string;
  ustSatz?: number; // 0, 7, 19
  typ: 'einnahme' | 'ausgabe';
}

// ============================================================================
// BWA-STRUKTUR (DATEV Standard)
// ============================================================================

/**
 * BWA nach DATEV-Standard mit 50 Zeilen
 * Basierend auf den echten BWA-PDFs
 */
export interface BWAZeile {
  zeile: number;
  bezeichnung: string;
  kontenVon: number;
  kontenBis: number;
  aktuellerMonat: number;
  kumuliert: number;
  vorjahr?: number;
  abweichungProzent?: number;
}

export interface BWAData {
  periode: { monat: number; jahr: number };
  unternehmen: string;
  erstelltAm: Date;
  
  // 1. Umsatz & Erlöse (Zeilen 1-8)
  umsatzerloese: BWAZeile;
  bestandsveraenderungen: BWAZeile;
  aktivierteEigenleistungen: BWAZeile;
  sonstigeErloese: BWAZeile;
  gesamtleistung: BWAZeile;
  
  // 2. Materialaufwand (Zeilen 10-15)
  wareneinkauf: BWAZeile;
  fremdleistungen: BWAZeile;
  materialaufwandGesamt: BWAZeile;
  rohertrag: BWAZeile;
  rohertragProzent: number;
  
  // 3. Personalkosten (Zeilen 20-25)
  loehneGehaelter: BWAZeile;
  sozialeAbgaben: BWAZeile;
  sonstigePersonalkosten: BWAZeile;
  personalkostenGesamt: BWAZeile;
  
  // 4. Raumkosten (Zeilen 30-35)
  miete: BWAZeile;
  nebenkosten: BWAZeile;
  raumkostenGesamt: BWAZeile;
  
  // 5. Fahrzeugkosten (Zeilen 40-45)
  fahrzeugkosten: BWAZeile;
  reisekosten: BWAZeile;
  kfzKostenGesamt: BWAZeile;
  
  // 6. Sonstige Kosten (Zeilen 50-60)
  werbekosten: BWAZeile;
  versicherungen: BWAZeile;
  reparaturen: BWAZeile;
  buerokosten: BWAZeile;
  telekommunikation: BWAZeile;
  beratungskosten: BWAZeile;
  sonstigeAufwendungen: BWAZeile;
  sonstigeKostenGesamt: BWAZeile;
  
  // 7. Ergebnisse (Zeilen 70-80)
  betriebsergebnis: BWAZeile;
  zinsertraege: BWAZeile;
  zinsaufwendungen: BWAZeile;
  neutralesErgebnis: BWAZeile;
  ergebnisVorSteuern: BWAZeile;
  steuern: BWAZeile;
  jahresueberschuss: BWAZeile;
  
  // Abschreibungen
  abschreibungen: BWAZeile;
  
  // Zusammenfassung
  deckungsbeitrag1: number;
  deckungsbeitrag2: number;
  cashflow: number;
  
  // Für UI-Kompatibilität
  kontenrahmen: string;
  monat: number;
  jahr: number;
  zeilen: Array<{
    zeile: number;
    bezeichnung: string;
    betrag: number;
    prozentVomUmsatz: number;
  }>;
  zusammenfassung: {
    gesamtleistung: number;
    rohertrag: number;
    betriebsergebnis: number;
    jahresueberschuss: number;
  };
}

// ============================================================================
// SUSA (SUMMEN- UND SALDENLISTE)
// ============================================================================

export interface SuSaKonto {
  kontonummer: string;
  bezeichnung: string;
  ebSoll: number;
  ebHaben: number;
  soll: number;
  haben: number;
  saldo: number;
  kontoart: 'AKTIV' | 'PASSIV' | 'AUFWAND' | 'ERTRAG';
}

export interface SuSaData {
  periode: { von: Date; bis: Date };
  unternehmen: string;
  erstelltAm: Date;
  kontenrahmen: string;
  monat: number;
  jahr: number;
  konten: SuSaKonto[];
  summen: {
    anfangsbestandSoll: number;
    anfangsbestandHaben: number;
    summeSoll: number;
    summeHaben: number;
    saldoSoll: number;
    saldoHaben: number;
  };
}

// ============================================================================
// EÜR (EINNAHMEN-ÜBERSCHUSS-RECHNUNG)
// ============================================================================

export interface EURAnlage {
  zeile: number;
  bezeichnung: string;
  betrag: number;
  hinweis?: string;
}

export interface EURData {
  periode: { jahr: number };
  unternehmen: string;
  steuernummer: string;
  erstelltAm: Date;
  
  // Betriebseinnahmen (Anlage EÜR Zeilen 11-22)
  betriebseinnahmen: {
    umsatzerloeseSteuerpflichtig19: EURAnlage;
    umsatzerloeseSteuerpflichtig7: EURAnlage;
    umsatzerloeseSteuerfrei: EURAnlage;
    vereinnahmteUmsatzsteuer: EURAnlage;
    sonstigeEinnahmen: EURAnlage;
    privatnutzungFahrzeug: EURAnlage;
    privatnutzungSonstige: EURAnlage;
    summeEinnahmen: number;
  };
  
  // Betriebsausgaben (Anlage EÜR Zeilen 23-65)
  betriebsausgaben: {
    wareneinkauf: EURAnlage;
    bezogeneLeistungen: EURAnlage;
    personalkosten: EURAnlage;
    raumkosten: EURAnlage;
    sonstigeGrundstuckskosten: EURAnlage;
    sonstigeUnbeschrAnkteAbzugsfaehige: EURAnlage;
    beschraenktAbzugsfaehig: EURAnlage;
    kfzKosten: EURAnlage;
    kfzKostenNichtAbziehbar: EURAnlage;
    fahrtkosten: EURAnlage;
    reisekosten: EURAnlage;
    ubernachtungskosten: EURAnlage;
    mieteLeasing: EURAnlage;
    abschreibungenBeweglicheWg: EURAnlage;
    abschreibungenUnbeweglicheWg: EURAnlage;
    abschreibungenGwg: EURAnlage;
    sonderabschreibungen: EURAnlage;
    rückstellungen: EURAnlage;
    schuldzinsen: EURAnlage;
    gezahlteVorsteuer: EURAnlage;
    umsatzsteuerVorauszahlungen: EURAnlage;
    üebrigeAusgaben: EURAnlage;
    summeAusgaben: number;
  };
  
  // Gewinnermittlung (Zeilen 66-76)
  gewinnermittlung: {
    gewinnVorSteuern: number;
    hinzurechnungen: number;
    abzuege: number;
    gewinn: number;
  };
  
  // Für UI-Kompatibilität
  jahr: number;
  anlageZeilen: EURAnlage[];
  zusammenfassung: {
    betriebseinnahmen: number;
    betriebsausgaben: number;
    gewinnVerlust: number;
  };
}

// ============================================================================
// KONTENRAHMEN-MAPPING FÜR BWA
// ============================================================================

/**
 * Mapping von DATEV-Konten zu BWA-Zeilen nach SKR03
 */
const BWA_KONTEN_MAPPING = {
  // Umsatzerlöse (4000-4499)
  umsatzerloese: { von: 4000, bis: 4499 },
  
  // Bestandsveränderungen (4800-4899)
  bestandsveraenderungen: { von: 4800, bis: 4899 },
  
  // Sonstige Erlöse (4900-4999)
  sonstigeErloese: { von: 4900, bis: 4999 },
  
  // Wareneinkauf (5000-5199)
  wareneinkauf: { von: 5000, bis: 5199 },
  
  // Fremdleistungen (5900-5999)
  fremdleistungen: { von: 5900, bis: 5999 },
  
  // Bezugsnebenkosten (5800-5899)
  bezugsnebenkosten: { von: 5800, bis: 5899 },
  
  // Personalkosten
  loehneGehaelter: { von: 6000, bis: 6099 },
  sozialeAbgaben: { von: 6100, bis: 6199 },
  sonstigePersonalkosten: { von: 6190, bis: 6199 },
  
  // Raumkosten
  miete: { von: 6200, bis: 6229 },
  nebenkosten: { von: 6230, bis: 6299 },
  
  // Fahrzeugkosten
  kfzKosten: { von: 6300, bis: 6369 },
  reisekosten: { von: 6370, bis: 6399 },
  
  // Versicherungen & Beiträge
  versicherungen: { von: 6400, bis: 6449 },
  beitraege: { von: 6450, bis: 6499 },
  
  // Reparaturen & Instandhaltung
  reparaturen: { von: 6500, bis: 6549 },
  
  // Werbekosten
  werbekosten: { von: 6600, bis: 6699 },
  
  // Bürokosten
  buerokosten: { von: 6800, bis: 6849 },
  telekommunikation: { von: 6850, bis: 6899 },
  
  // Beratungskosten
  beratungskosten: { von: 6700, bis: 6799 },
  
  // Abschreibungen
  abschreibungen: { von: 6900, bis: 6999 },
  
  // Zinsen
  zinsertraege: { von: 7000, bis: 7099 },
  zinsaufwendungen: { von: 7300, bis: 7399 },
  
  // Steuern vom Einkommen
  steuern: { von: 7600, bis: 7699 },
  
  // Sonstige Aufwendungen
  sonstigeAufwendungen: { von: 7700, bis: 7999 },
};

// ============================================================================
// DATEV AUSWERTUNGS-SERVICE
// ============================================================================

export class DatevAuswertungsService {
  
  /**
   * Generiert eine vollständige BWA nach DATEV-Standard
   */
  static async generateBWA(
    companyId: string,
    monat: number,
    jahr: number
  ): Promise<BWAData> {
    // Lade alle Buchungen für den Zeitraum
    const buchungen = await this.getBuchungenFuerZeitraum(
      companyId,
      new Date(jahr, monat - 1, 1),
      new Date(jahr, monat, 0)
    );
    
    // Lade kumulierte Buchungen (Jahresbeginn bis Monat)
    const kumulierteBuchungen = await this.getBuchungenFuerZeitraum(
      companyId,
      new Date(jahr, 0, 1),
      new Date(jahr, monat, 0)
    );
    
    // Berechne alle BWA-Zeilen
    const umsatzerloese = this.berechneBWAZeile(1, 'Umsatzerlöse', BWA_KONTEN_MAPPING.umsatzerloese, buchungen, kumulierteBuchungen);
    const bestandsveraenderungen = this.berechneBWAZeile(2, 'Bestandsveränderungen', BWA_KONTEN_MAPPING.bestandsveraenderungen, buchungen, kumulierteBuchungen);
    const sonstigeErloese = this.berechneBWAZeile(4, 'Sonstige Erlöse', BWA_KONTEN_MAPPING.sonstigeErloese, buchungen, kumulierteBuchungen);
    
    const gesamtleistung: BWAZeile = {
      zeile: 5,
      bezeichnung: 'Gesamtleistung',
      kontenVon: 4000,
      kontenBis: 4999,
      aktuellerMonat: umsatzerloese.aktuellerMonat + bestandsveraenderungen.aktuellerMonat + sonstigeErloese.aktuellerMonat,
      kumuliert: umsatzerloese.kumuliert + bestandsveraenderungen.kumuliert + sonstigeErloese.kumuliert,
    };
    
    // Materialaufwand
    const wareneinkauf = this.berechneBWAZeile(10, 'Wareneinkauf', BWA_KONTEN_MAPPING.wareneinkauf, buchungen, kumulierteBuchungen, true);
    const fremdleistungen = this.berechneBWAZeile(11, 'Fremdleistungen', BWA_KONTEN_MAPPING.fremdleistungen, buchungen, kumulierteBuchungen, true);
    
    const materialaufwandGesamt: BWAZeile = {
      zeile: 15,
      bezeichnung: 'Materialaufwand gesamt',
      kontenVon: 5000,
      kontenBis: 5999,
      aktuellerMonat: wareneinkauf.aktuellerMonat + fremdleistungen.aktuellerMonat,
      kumuliert: wareneinkauf.kumuliert + fremdleistungen.kumuliert,
    };
    
    const rohertrag: BWAZeile = {
      zeile: 16,
      bezeichnung: 'Rohertrag',
      kontenVon: 0,
      kontenBis: 0,
      aktuellerMonat: gesamtleistung.aktuellerMonat - materialaufwandGesamt.aktuellerMonat,
      kumuliert: gesamtleistung.kumuliert - materialaufwandGesamt.kumuliert,
    };
    
    // Personalkosten
    const loehneGehaelter = this.berechneBWAZeile(20, 'Löhne und Gehälter', BWA_KONTEN_MAPPING.loehneGehaelter, buchungen, kumulierteBuchungen, true);
    const sozialeAbgaben = this.berechneBWAZeile(21, 'Soziale Abgaben', BWA_KONTEN_MAPPING.sozialeAbgaben, buchungen, kumulierteBuchungen, true);
    const sonstigePersonalkosten = this.berechneBWAZeile(22, 'Sonstige Personalkosten', BWA_KONTEN_MAPPING.sonstigePersonalkosten, buchungen, kumulierteBuchungen, true);
    
    const personalkostenGesamt: BWAZeile = {
      zeile: 25,
      bezeichnung: 'Personalkosten gesamt',
      kontenVon: 6000,
      kontenBis: 6199,
      aktuellerMonat: loehneGehaelter.aktuellerMonat + sozialeAbgaben.aktuellerMonat + sonstigePersonalkosten.aktuellerMonat,
      kumuliert: loehneGehaelter.kumuliert + sozialeAbgaben.kumuliert + sonstigePersonalkosten.kumuliert,
    };
    
    // Raumkosten
    const miete = this.berechneBWAZeile(30, 'Miete/Pacht', BWA_KONTEN_MAPPING.miete, buchungen, kumulierteBuchungen, true);
    const nebenkosten = this.berechneBWAZeile(31, 'Nebenkosten', BWA_KONTEN_MAPPING.nebenkosten, buchungen, kumulierteBuchungen, true);
    
    const raumkostenGesamt: BWAZeile = {
      zeile: 35,
      bezeichnung: 'Raumkosten gesamt',
      kontenVon: 6200,
      kontenBis: 6299,
      aktuellerMonat: miete.aktuellerMonat + nebenkosten.aktuellerMonat,
      kumuliert: miete.kumuliert + nebenkosten.kumuliert,
    };
    
    // Fahrzeugkosten
    const fahrzeugkosten = this.berechneBWAZeile(40, 'Kfz-Kosten', BWA_KONTEN_MAPPING.kfzKosten, buchungen, kumulierteBuchungen, true);
    const reisekosten = this.berechneBWAZeile(41, 'Reisekosten', BWA_KONTEN_MAPPING.reisekosten, buchungen, kumulierteBuchungen, true);
    
    const kfzKostenGesamt: BWAZeile = {
      zeile: 45,
      bezeichnung: 'Fahrzeug-/Reisekosten gesamt',
      kontenVon: 6300,
      kontenBis: 6399,
      aktuellerMonat: fahrzeugkosten.aktuellerMonat + reisekosten.aktuellerMonat,
      kumuliert: fahrzeugkosten.kumuliert + reisekosten.kumuliert,
    };
    
    // Sonstige Kosten
    const werbekosten = this.berechneBWAZeile(50, 'Werbekosten', BWA_KONTEN_MAPPING.werbekosten, buchungen, kumulierteBuchungen, true);
    const versicherungen = this.berechneBWAZeile(51, 'Versicherungen', BWA_KONTEN_MAPPING.versicherungen, buchungen, kumulierteBuchungen, true);
    const reparaturen = this.berechneBWAZeile(52, 'Reparaturen/Instandhaltung', BWA_KONTEN_MAPPING.reparaturen, buchungen, kumulierteBuchungen, true);
    const buerokosten = this.berechneBWAZeile(53, 'Bürokosten', BWA_KONTEN_MAPPING.buerokosten, buchungen, kumulierteBuchungen, true);
    const telekommunikation = this.berechneBWAZeile(54, 'Telekommunikation', BWA_KONTEN_MAPPING.telekommunikation, buchungen, kumulierteBuchungen, true);
    const beratungskosten = this.berechneBWAZeile(55, 'Beratungskosten', BWA_KONTEN_MAPPING.beratungskosten, buchungen, kumulierteBuchungen, true);
    const sonstigeAufwendungen = this.berechneBWAZeile(56, 'Sonstige Aufwendungen', BWA_KONTEN_MAPPING.sonstigeAufwendungen, buchungen, kumulierteBuchungen, true);
    
    const sonstigeKostenGesamt: BWAZeile = {
      zeile: 60,
      bezeichnung: 'Sonstige Kosten gesamt',
      kontenVon: 6400,
      kontenBis: 6899,
      aktuellerMonat: werbekosten.aktuellerMonat + versicherungen.aktuellerMonat + reparaturen.aktuellerMonat + 
                      buerokosten.aktuellerMonat + telekommunikation.aktuellerMonat + beratungskosten.aktuellerMonat + 
                      sonstigeAufwendungen.aktuellerMonat,
      kumuliert: werbekosten.kumuliert + versicherungen.kumuliert + reparaturen.kumuliert + 
                 buerokosten.kumuliert + telekommunikation.kumuliert + beratungskosten.kumuliert + 
                 sonstigeAufwendungen.kumuliert,
    };
    
    // Abschreibungen aus Buchungen
    const abschreibungenAusBuchungen = this.berechneBWAZeile(65, 'Abschreibungen', BWA_KONTEN_MAPPING.abschreibungen, buchungen, kumulierteBuchungen, true);
    
    // Abschreibungen aus fixedAssets Collection berechnen
    const afaAusAnlagen = await this.berechneAfaAusFixedAssets(companyId, monat, jahr);
    
    // Kombiniere Buchungen und berechnete AfA aus Anlagen
    const abschreibungen: BWAZeile = {
      zeile: 65,
      bezeichnung: 'Abschreibungen',
      kontenVon: 6900,
      kontenBis: 6999,
      aktuellerMonat: abschreibungenAusBuchungen.aktuellerMonat + afaAusAnlagen.monatlich,
      kumuliert: abschreibungenAusBuchungen.kumuliert + afaAusAnlagen.kumuliert,
    };
    
    // Betriebsergebnis
    const gesamtkosten = personalkostenGesamt.aktuellerMonat + raumkostenGesamt.aktuellerMonat + 
                         kfzKostenGesamt.aktuellerMonat + sonstigeKostenGesamt.aktuellerMonat + 
                         abschreibungen.aktuellerMonat;
    const gesamtkostenKum = personalkostenGesamt.kumuliert + raumkostenGesamt.kumuliert + 
                            kfzKostenGesamt.kumuliert + sonstigeKostenGesamt.kumuliert + 
                            abschreibungen.kumuliert;
    
    const betriebsergebnis: BWAZeile = {
      zeile: 70,
      bezeichnung: 'Betriebsergebnis',
      kontenVon: 0,
      kontenBis: 0,
      aktuellerMonat: rohertrag.aktuellerMonat - gesamtkosten,
      kumuliert: rohertrag.kumuliert - gesamtkostenKum,
    };
    
    // Zinsen
    const zinsertraege = this.berechneBWAZeile(71, 'Zinserträge', BWA_KONTEN_MAPPING.zinsertraege, buchungen, kumulierteBuchungen);
    const zinsaufwendungen = this.berechneBWAZeile(72, 'Zinsaufwendungen', BWA_KONTEN_MAPPING.zinsaufwendungen, buchungen, kumulierteBuchungen, true);
    
    const neutralesErgebnis: BWAZeile = {
      zeile: 73,
      bezeichnung: 'Neutrales Ergebnis',
      kontenVon: 7000,
      kontenBis: 7599,
      aktuellerMonat: zinsertraege.aktuellerMonat - zinsaufwendungen.aktuellerMonat,
      kumuliert: zinsertraege.kumuliert - zinsaufwendungen.kumuliert,
    };
    
    const ergebnisVorSteuern: BWAZeile = {
      zeile: 74,
      bezeichnung: 'Ergebnis vor Steuern',
      kontenVon: 0,
      kontenBis: 0,
      aktuellerMonat: betriebsergebnis.aktuellerMonat + neutralesErgebnis.aktuellerMonat,
      kumuliert: betriebsergebnis.kumuliert + neutralesErgebnis.kumuliert,
    };
    
    const steuern = this.berechneBWAZeile(75, 'Steuern vom Einkommen', BWA_KONTEN_MAPPING.steuern, buchungen, kumulierteBuchungen, true);
    
    const jahresueberschuss: BWAZeile = {
      zeile: 80,
      bezeichnung: 'Jahresüberschuss',
      kontenVon: 0,
      kontenBis: 0,
      aktuellerMonat: ergebnisVorSteuern.aktuellerMonat - steuern.aktuellerMonat,
      kumuliert: ergebnisVorSteuern.kumuliert - steuern.kumuliert,
    };
    
    // Berechne Kennzahlen
    const rohertragProzent = gesamtleistung.aktuellerMonat > 0 
      ? (rohertrag.aktuellerMonat / gesamtleistung.aktuellerMonat) * 100 
      : 0;
    
    const deckungsbeitrag1 = rohertrag.aktuellerMonat;
    const deckungsbeitrag2 = deckungsbeitrag1 - personalkostenGesamt.aktuellerMonat;
    const cashflow = jahresueberschuss.aktuellerMonat + abschreibungen.aktuellerMonat;
    
    // Erstelle Zeilen-Array für UI
    const alleZeilen = [
      umsatzerloese,
      bestandsveraenderungen,
      sonstigeErloese,
      gesamtleistung,
      wareneinkauf,
      fremdleistungen,
      materialaufwandGesamt,
      rohertrag,
      loehneGehaelter,
      sozialeAbgaben,
      sonstigePersonalkosten,
      personalkostenGesamt,
      miete,
      nebenkosten,
      raumkostenGesamt,
      fahrzeugkosten,
      reisekosten,
      kfzKostenGesamt,
      werbekosten,
      versicherungen,
      reparaturen,
      buerokosten,
      telekommunikation,
      beratungskosten,
      sonstigeAufwendungen,
      sonstigeKostenGesamt,
      abschreibungen,
      betriebsergebnis,
      zinsertraege,
      zinsaufwendungen,
      neutralesErgebnis,
      ergebnisVorSteuern,
      steuern,
      jahresueberschuss,
    ];
    
    const gesamtumsatz = gesamtleistung.kumuliert || 1; // Verhindert Division durch 0
    const zeilen = alleZeilen.map(z => ({
      zeile: z.zeile,
      bezeichnung: z.bezeichnung,
      betrag: z.kumuliert,
      prozentVomUmsatz: (z.kumuliert / gesamtumsatz) * 100,
    }));
    
    return {
      periode: { monat, jahr },
      unternehmen: '',
      erstelltAm: new Date(),
      
      umsatzerloese,
      bestandsveraenderungen,
      aktivierteEigenleistungen: this.berechneBWAZeile(3, 'Aktivierte Eigenleistungen', { von: 0, bis: 0 }, buchungen, kumulierteBuchungen),
      sonstigeErloese,
      gesamtleistung,
      
      wareneinkauf,
      fremdleistungen,
      materialaufwandGesamt,
      rohertrag,
      rohertragProzent,
      
      loehneGehaelter,
      sozialeAbgaben,
      sonstigePersonalkosten,
      personalkostenGesamt,
      
      miete,
      nebenkosten,
      raumkostenGesamt,
      
      fahrzeugkosten,
      reisekosten,
      kfzKostenGesamt,
      
      werbekosten,
      versicherungen,
      reparaturen,
      buerokosten,
      telekommunikation,
      beratungskosten,
      sonstigeAufwendungen,
      sonstigeKostenGesamt,
      
      abschreibungen,
      
      betriebsergebnis,
      zinsertraege,
      zinsaufwendungen,
      neutralesErgebnis,
      ergebnisVorSteuern,
      steuern,
      jahresueberschuss,
      
      deckungsbeitrag1,
      deckungsbeitrag2,
      cashflow,
      
      // UI-Kompatibilität
      kontenrahmen: 'SKR03',
      monat,
      jahr,
      zeilen,
      zusammenfassung: {
        gesamtleistung: gesamtleistung.kumuliert,
        rohertrag: rohertrag.kumuliert,
        betriebsergebnis: betriebsergebnis.kumuliert,
        jahresueberschuss: jahresueberschuss.kumuliert,
      },
    };
  }
  
  /**
   * Generiert eine Summen- und Saldenliste (SuSa)
   */
  static async generateSuSa(
    companyId: string,
    jahr: number,
    monat: number
  ): Promise<SuSaData> {
    const startDate = new Date(jahr, 0, 1);
    const endDate = new Date(jahr, monat, 0); // Letzter Tag des Monats
    const buchungen = await this.getBuchungenFuerZeitraum(companyId, startDate, endDate);
    
    // Gruppiere Buchungen nach Kontonummer
    const kontenMap = new Map<string, SuSaKonto>();
    
    buchungen.forEach(buchung => {
      const kontoInfo = COMPLETE_DATEV_ACCOUNTS.find(k => k.number === buchung.kontoNummer);
      
      if (!kontenMap.has(buchung.kontoNummer)) {
        kontenMap.set(buchung.kontoNummer, {
          kontonummer: buchung.kontoNummer,
          bezeichnung: kontoInfo?.name || buchung.beschreibung,
          ebSoll: 0,
          ebHaben: 0,
          soll: 0,
          haben: 0,
          saldo: 0,
          kontoart: this.getKontoart(buchung.kontoNummer),
        });
      }
      
      const konto = kontenMap.get(buchung.kontoNummer)!;
      
      if (buchung.typ === 'ausgabe') {
        konto.soll += Math.abs(buchung.betrag);
      } else {
        konto.haben += Math.abs(buchung.betrag);
      }
      
      konto.saldo = konto.soll - konto.haben;
    });
    
    const konten = Array.from(kontenMap.values()).sort((a, b) => 
      a.kontonummer.localeCompare(b.kontonummer, undefined, { numeric: true })
    );
    
    // Berechne Summen
    const summen = konten.reduce((acc, konto) => ({
      anfangsbestandSoll: acc.anfangsbestandSoll + konto.ebSoll,
      anfangsbestandHaben: acc.anfangsbestandHaben + konto.ebHaben,
      summeSoll: acc.summeSoll + konto.soll,
      summeHaben: acc.summeHaben + konto.haben,
      saldoSoll: acc.saldoSoll + (konto.saldo > 0 ? konto.saldo : 0),
      saldoHaben: acc.saldoHaben + (konto.saldo < 0 ? Math.abs(konto.saldo) : 0),
    }), {
      anfangsbestandSoll: 0,
      anfangsbestandHaben: 0,
      summeSoll: 0,
      summeHaben: 0,
      saldoSoll: 0,
      saldoHaben: 0,
    });
    
    return {
      periode: { von: startDate, bis: endDate },
      unternehmen: '',
      erstelltAm: new Date(),
      kontenrahmen: 'SKR03',
      monat,
      jahr,
      konten,
      summen,
    };
  }
  
  /**
   * Generiert eine EÜR nach amtlichem Formular
   */
  static async generateEUR(
    companyId: string,
    jahr: number
  ): Promise<EURData> {
    const startDate = new Date(jahr, 0, 1);
    const endDate = new Date(jahr, 11, 31);
    const buchungen = await this.getBuchungenFuerZeitraum(companyId, startDate, endDate);
    
    // Einnahmen nach Steuersatz gruppieren
    // WICHTIG: Die Buchungen enthalten bereits NETTO-Beträge!
    const einnahmen19Netto = this.summiereBuchungen(buchungen.filter(b => 
      b.typ === 'einnahme' && b.ustSatz === 19
    ));
    const einnahmen7Netto = this.summiereBuchungen(buchungen.filter(b => 
      b.typ === 'einnahme' && b.ustSatz === 7
    ));
    const einnahmenSteuerfreiNetto = this.summiereBuchungen(buchungen.filter(b => 
      b.typ === 'einnahme' && (b.ustSatz === 0 || !b.ustSatz)
    ));
    
    // USt-Beträge berechnen (Netto * Steuersatz)
    const ust19 = einnahmen19Netto * 0.19;
    const ust7 = einnahmen7Netto * 0.07;
    
    // Ausgaben nach Kategorien
    const ausgabenNachKategorie = this.kategorisiereAusgaben(buchungen.filter(b => b.typ === 'ausgabe'));
    
    // Summe Einnahmen = Netto + USt (Bruttoprinzip bei EÜR für Ist-Versteuerung)
    const summeEinnahmenNetto = einnahmen19Netto + einnahmen7Netto + einnahmenSteuerfreiNetto;
    const summeVereinnUst = ust19 + ust7;
    const summeEinnahmen = summeEinnahmenNetto + summeVereinnUst;
    const summeAusgaben = Object.values(ausgabenNachKategorie).reduce((a, b) => a + b, 0);
    
    return {
      periode: { jahr },
      unternehmen: '',
      steuernummer: '',
      erstelltAm: new Date(),
      
      betriebseinnahmen: {
        umsatzerloeseSteuerpflichtig19: { zeile: 14, bezeichnung: 'Umsätze 19%', betrag: einnahmen19Netto },
        umsatzerloeseSteuerpflichtig7: { zeile: 15, bezeichnung: 'Umsätze 7%', betrag: einnahmen7Netto },
        umsatzerloeseSteuerfrei: { zeile: 16, bezeichnung: 'Steuerfreie Umsätze', betrag: einnahmenSteuerfreiNetto },
        vereinnahmteUmsatzsteuer: { zeile: 17, bezeichnung: 'Vereinnahmte USt', betrag: summeVereinnUst },
        sonstigeEinnahmen: { zeile: 18, bezeichnung: 'Sonstige Einnahmen', betrag: 0 },
        privatnutzungFahrzeug: { zeile: 19, bezeichnung: 'Privatnutzung Kfz', betrag: 0 },
        privatnutzungSonstige: { zeile: 20, bezeichnung: 'Sonstige Privatnutzung', betrag: 0 },
        summeEinnahmen,
      },
      
      betriebsausgaben: {
        wareneinkauf: { zeile: 23, bezeichnung: 'Wareneinkauf', betrag: ausgabenNachKategorie.wareneinkauf || 0 },
        bezogeneLeistungen: { zeile: 24, bezeichnung: 'Bezogene Leistungen', betrag: ausgabenNachKategorie.fremdleistungen || 0 },
        personalkosten: { zeile: 25, bezeichnung: 'Personalkosten', betrag: ausgabenNachKategorie.personal || 0 },
        raumkosten: { zeile: 26, bezeichnung: 'Raumkosten', betrag: ausgabenNachKategorie.raum || 0 },
        sonstigeGrundstuckskosten: { zeile: 27, bezeichnung: 'Sonstige Grundstückskosten', betrag: 0 },
        sonstigeUnbeschrAnkteAbzugsfaehige: { zeile: 28, bezeichnung: 'Sonstige unbeschränkt abzugsfähige BA', betrag: ausgabenNachKategorie.sonstige || 0 },
        beschraenktAbzugsfaehig: { zeile: 29, bezeichnung: 'Beschränkt abzugsfähige BA', betrag: ausgabenNachKategorie.bewirtung || 0 },
        kfzKosten: { zeile: 30, bezeichnung: 'Kfz-Kosten', betrag: ausgabenNachKategorie.kfz || 0 },
        kfzKostenNichtAbziehbar: { zeile: 31, bezeichnung: 'Kfz-Kosten nicht abziehbar', betrag: 0 },
        fahrtkosten: { zeile: 32, bezeichnung: 'Fahrtkosten', betrag: 0 },
        reisekosten: { zeile: 33, bezeichnung: 'Reisekosten', betrag: ausgabenNachKategorie.reise || 0 },
        ubernachtungskosten: { zeile: 34, bezeichnung: 'Übernachtungskosten', betrag: 0 },
        mieteLeasing: { zeile: 35, bezeichnung: 'Miete/Leasing bewegliche WG', betrag: ausgabenNachKategorie.leasing || 0 },
        abschreibungenBeweglicheWg: { zeile: 36, bezeichnung: 'AfA bewegliche WG', betrag: ausgabenNachKategorie.afa || 0 },
        abschreibungenUnbeweglicheWg: { zeile: 37, bezeichnung: 'AfA unbewegliche WG', betrag: 0 },
        abschreibungenGwg: { zeile: 38, bezeichnung: 'AfA GWG', betrag: ausgabenNachKategorie.gwg || 0 },
        sonderabschreibungen: { zeile: 39, bezeichnung: 'Sonderabschreibungen', betrag: 0 },
        rückstellungen: { zeile: 40, bezeichnung: 'Rückstellungen', betrag: 0 },
        schuldzinsen: { zeile: 41, bezeichnung: 'Schuldzinsen', betrag: ausgabenNachKategorie.zinsen || 0 },
        gezahlteVorsteuer: { zeile: 42, bezeichnung: 'Gezahlte Vorsteuer', betrag: ausgabenNachKategorie.vorsteuer || 0 },
        umsatzsteuerVorauszahlungen: { zeile: 43, bezeichnung: 'USt-Vorauszahlungen', betrag: ausgabenNachKategorie.ustVorauszahlung || 0 },
        üebrigeAusgaben: { zeile: 44, bezeichnung: 'Übrige Ausgaben', betrag: ausgabenNachKategorie.uebrige || 0 },
        summeAusgaben,
      },
      
      gewinnermittlung: {
        gewinnVorSteuern: summeEinnahmen - summeAusgaben,
        hinzurechnungen: 0,
        abzuege: 0,
        gewinn: summeEinnahmen - summeAusgaben,
      },
      
      // Für UI-Kompatibilität
      jahr,
      anlageZeilen: [
        { zeile: 14, bezeichnung: 'Umsatzerlöse 19%', betrag: einnahmen19Netto },
        { zeile: 15, bezeichnung: 'Umsatzerlöse 7%', betrag: einnahmen7Netto },
        { zeile: 16, bezeichnung: 'Steuerfreie Umsätze', betrag: einnahmenSteuerfreiNetto },
        { zeile: 17, bezeichnung: 'Vereinnahmte USt', betrag: summeVereinnUst },
        { zeile: 23, bezeichnung: 'Summe Betriebseinnahmen', betrag: summeEinnahmen },
        { zeile: 25, bezeichnung: 'Wareneinkauf', betrag: ausgabenNachKategorie.wareneinkauf || 0 },
        { zeile: 26, bezeichnung: 'Bezogene Leistungen', betrag: ausgabenNachKategorie.fremdleistungen || 0 },
        { zeile: 27, bezeichnung: 'Personalkosten', betrag: ausgabenNachKategorie.personal || 0 },
        { zeile: 28, bezeichnung: 'Raumkosten', betrag: ausgabenNachKategorie.raum || 0 },
        { zeile: 30, bezeichnung: 'Kfz-Kosten', betrag: ausgabenNachKategorie.kfz || 0 },
        { zeile: 35, bezeichnung: 'Abschreibungen', betrag: ausgabenNachKategorie.abschreibungen || 0 },
        { zeile: 42, bezeichnung: 'Gezahlte Vorsteuer', betrag: ausgabenNachKategorie.vorsteuer || 0 },
        { zeile: 44, bezeichnung: 'Übrige Ausgaben', betrag: ausgabenNachKategorie.uebrige || 0 },
        { zeile: 87, bezeichnung: 'Summe Betriebsausgaben', betrag: summeAusgaben },
        { zeile: 88, bezeichnung: 'Gewinn/Verlust', betrag: summeEinnahmen - summeAusgaben },
      ],
      zusammenfassung: {
        betriebseinnahmen: summeEinnahmen,
        betriebsausgaben: summeAusgaben,
        gewinnVerlust: summeEinnahmen - summeAusgaben,
      },
    };
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  /**
   * Berechnet den Nettobetrag aus dem Bruttobetrag basierend auf taxRuleType
   * Unterstützt alle deutschen Steuersätze: 19%, 7%, 0% und Reverse Charge
   */
  private static calculateNetAmount(bruttoAmount: number, taxRuleType?: string): number {
    if (!taxRuleType) {
      // Fallback auf 19% wenn kein taxRuleType angegeben
      return bruttoAmount / 1.19;
    }
    
    // Mapping von taxRuleType zu Steuersatz
    const noTaxRules = [
      'DE_EXEMPT_4_USTG',       // §4 UStG Steuerbefreiung (0%)
      'DE_REVERSE_13B',         // §13b Reverse Charge - Leistungsempfänger schuldet USt
      'EU_REVERSE_18B',         // §18b EU Reverse Charge
      'EU_INTRACOMMUNITY_SUPPLY', // Innergemeinschaftliche Lieferung (0%)
      'NON_EU_EXPORT',          // Ausfuhrlieferung (0%)
      'NON_EU_OUT_OF_SCOPE',    // Nicht steuerbar
    ];
    
    const reducedTaxRules = [
      'DE_TAXABLE_REDUCED',     // §12 Abs. 2 UStG - 7%
    ];
    
    if (noTaxRules.includes(taxRuleType)) {
      // Keine Umsatzsteuer - Brutto = Netto
      return bruttoAmount;
    }
    
    if (reducedTaxRules.includes(taxRuleType)) {
      // 7% ermäßigter Steuersatz
      return bruttoAmount / 1.07;
    }
    
    // Standard: 19% Regelsteuersatz (DE_TAXABLE)
    return bruttoAmount / 1.19;
  }
  
  /**
   * Ermittelt den USt-Satz aus dem taxRuleType
   */
  private static getUstSatzFromTaxRuleType(taxRuleType?: string): number {
    if (!taxRuleType) return 19;
    
    const noTaxRules = [
      'DE_EXEMPT_4_USTG', 'DE_REVERSE_13B', 'EU_REVERSE_18B',
      'EU_INTRACOMMUNITY_SUPPLY', 'NON_EU_EXPORT', 'NON_EU_OUT_OF_SCOPE',
    ];
    
    if (noTaxRules.includes(taxRuleType)) return 0;
    if (taxRuleType === 'DE_TAXABLE_REDUCED') return 7;
    
    return 19;
  }
  
  private static async getBuchungenFuerZeitraum(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buchung[]> {
    const buchungen: Buchung[] = [];
    
    // Lade Rechnungen (Einnahmen)
    try {
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      const invoicesSnap = await getDocs(invoicesRef);
      
      invoicesSnap.forEach(doc => {
        const data = doc.data();
        const datum = this.toDate(data.issueDate || data.createdAt);
        
        // GoBD-Konformität: Festgeschriebene (isLocked) ODER bezahlte Rechnungen berücksichtigen
        // Eine festgeschriebene Rechnung ist steuerlich relevant, auch wenn noch nicht bezahlt
        const isGobdLocked = data.isLocked === true || data.gobdStatus === 'locked';
        const isPaid = data.status === 'paid';
        
        if (datum >= startDate && datum <= endDate && (isPaid || isGobdLocked)) {
          // Ermittle den korrekten USt-Satz aus taxRuleType oder vatRate
          const taxRuleType = data.taxRuleType as string | undefined;
          const ustSatz = taxRuleType 
            ? this.getUstSatzFromTaxRuleType(taxRuleType)
            : (data.vatRate ?? 19);
          
          // Berechne Nettobetrag korrekt basierend auf taxRuleType
          const bruttoTotal = data.total || 0;
          const nettoAmount = data.netAmount || data.amount || this.calculateNetAmount(bruttoTotal, taxRuleType);
          
          buchungen.push({
            id: doc.id,
            datum,
            betrag: nettoAmount, // WICHTIG: Nettobetrag für Buchungen verwenden!
            kontoNummer: data.datevKonto || '4000', // Standard: Umsatzerlöse
            beschreibung: data.description || 'Rechnung',
            belegNummer: data.invoiceNumber,
            ustSatz,
            typ: 'einnahme',
          });
        }
      });
    } catch {
      // Ignoriere Fehler
    }
    
    // Lade Ausgaben
    try {
      const expensesRef = collection(db, 'companies', companyId, 'expenses');
      const expensesSnap = await getDocs(expensesRef);
      
      expensesSnap.forEach(doc => {
        const data = doc.data();
        const datum = this.toDate(data.date || data.createdAt);
        
        if (datum >= startDate && datum <= endDate) {
          buchungen.push({
            id: doc.id,
            datum,
            betrag: data.amount || 0,
            kontoNummer: data.datevKonto || this.mapKategorieZuKonto(data.category),
            beschreibung: data.description || 'Ausgabe',
            belegNummer: data.receiptNumber,
            ustSatz: data.vatRate || 19,
            typ: 'ausgabe',
          });
        }
      });
    } catch {
      // Ignoriere Fehler
    }
    
    // Lade Gehälter (Personalkosten)
    try {
      const payrollsRef = collection(db, 'companies', companyId, 'payrolls');
      const payrollsSnap = await getDocs(payrollsRef);
      
      payrollsSnap.forEach(doc => {
        const data = doc.data();
        const monat = data.period?.month;
        const jahr = data.period?.year;
        
        if (monat && jahr) {
          const datum = new Date(jahr, monat - 1, 15);
          
          if (datum >= startDate && datum <= endDate) {
            // Bruttogehälter
            if (data.grossSalary) {
              buchungen.push({
                id: `${doc.id}-brutto`,
                datum,
                betrag: data.grossSalary,
                kontoNummer: '6000', // Löhne und Gehälter
                beschreibung: `Gehalt ${data.employeeName || ''}`,
                typ: 'ausgabe',
              });
            }
            
            // Sozialversicherung AG-Anteil
            if (data.employerCosts?.socialSecurity) {
              buchungen.push({
                id: `${doc.id}-sv`,
                datum,
                betrag: data.employerCosts.socialSecurity,
                kontoNummer: '6100', // Soziale Abgaben
                beschreibung: `SV-AG-Anteil ${data.employeeName || ''}`,
                typ: 'ausgabe',
              });
            }
          }
        }
      });
    } catch {
      // Ignoriere Fehler
    }
    
    return buchungen;
  }
  
  private static berechneBWAZeile(
    zeile: number,
    bezeichnung: string,
    kontenBereich: { von: number; bis: number },
    buchungen: Buchung[],
    kumulierteBuchungen: Buchung[],
    istAufwand: boolean = false
  ): BWAZeile {
    const filterFn = (b: Buchung) => {
      const konto = parseInt(b.kontoNummer);
      return konto >= kontenBereich.von && konto <= kontenBereich.bis;
    };
    
    let aktuellerMonat = this.summiereBuchungen(buchungen.filter(filterFn));
    let kumuliert = this.summiereBuchungen(kumulierteBuchungen.filter(filterFn));
    
    // Aufwendungen als positive Werte darstellen
    if (istAufwand) {
      aktuellerMonat = Math.abs(aktuellerMonat);
      kumuliert = Math.abs(kumuliert);
    }
    
    return {
      zeile,
      bezeichnung,
      kontenVon: kontenBereich.von,
      kontenBis: kontenBereich.bis,
      aktuellerMonat,
      kumuliert,
    };
  }
  
  private static summiereBuchungen(buchungen: Buchung[]): number {
    return buchungen.reduce((sum, b) => sum + b.betrag, 0);
  }
  
  private static kategorisiereAusgaben(buchungen: Buchung[]): Record<string, number> {
    const kategorien: Record<string, number> = {
      wareneinkauf: 0,
      fremdleistungen: 0,
      personal: 0,
      raum: 0,
      kfz: 0,
      reise: 0,
      werbung: 0,
      versicherung: 0,
      buero: 0,
      beratung: 0,
      afa: 0,
      gwg: 0,
      zinsen: 0,
      leasing: 0,
      bewirtung: 0,
      vorsteuer: 0,
      ustVorauszahlung: 0,
      sonstige: 0,
      uebrige: 0,
    };
    
    buchungen.forEach(buchung => {
      const konto = parseInt(buchung.kontoNummer);
      
      if (konto >= 5000 && konto < 5200) kategorien.wareneinkauf += buchung.betrag;
      else if (konto >= 5900 && konto < 6000) kategorien.fremdleistungen += buchung.betrag;
      else if (konto >= 6000 && konto < 6200) kategorien.personal += buchung.betrag;
      else if (konto >= 6200 && konto < 6300) kategorien.raum += buchung.betrag;
      else if (konto >= 6300 && konto < 6370) kategorien.kfz += buchung.betrag;
      else if (konto >= 6370 && konto < 6400) kategorien.reise += buchung.betrag;
      else if (konto >= 6400 && konto < 6500) kategorien.versicherung += buchung.betrag;
      else if (konto >= 6500 && konto < 6600) kategorien.beratung += buchung.betrag;
      else if (konto >= 6600 && konto < 6700) kategorien.werbung += buchung.betrag;
      else if (konto >= 6700 && konto < 6800) kategorien.bewirtung += buchung.betrag;
      else if (konto >= 6800 && konto < 6900) kategorien.buero += buchung.betrag;
      else if (konto >= 6900 && konto < 7000) kategorien.afa += buchung.betrag;
      else if (konto >= 7300 && konto < 7400) kategorien.zinsen += buchung.betrag;
      else kategorien.sonstige += buchung.betrag;
    });
    
    return kategorien;
  }
  
  private static mapKategorieZuKonto(kategorie: string): string {
    const mapping: Record<string, string> = {
      'Material': '5000',
      'Wareneinkauf': '5000',
      'Fremdleistungen': '5900',
      'Miete': '6200',
      'Nebenkosten': '6230',
      'Fahrzeug': '6300',
      'Reise': '6370',
      'Versicherung': '6400',
      'Reparatur': '6500',
      'Beratung': '6550',
      'Werbung': '6600',
      'Bewirtung': '6640',
      'Büro': '6800',
      'Telefon': '6850',
      'AfA': '6900',
      'Zinsen': '7300',
      'default': '6800',
    };
    
    return mapping[kategorie] || mapping['default'];
  }
  
  private static getKontoart(kontoNummer: string): 'AKTIV' | 'PASSIV' | 'AUFWAND' | 'ERTRAG' {
    const konto = parseInt(kontoNummer);
    
    if (konto < 1000) return 'AKTIV'; // Anlagevermögen
    if (konto >= 1000 && konto < 2000) return 'AKTIV'; // Umlaufvermögen
    if (konto >= 2000 && konto < 4000) return 'PASSIV'; // Eigenkapital & Verbindlichkeiten
    if (konto >= 4000 && konto < 5000) return 'ERTRAG'; // Erlöse
    if (konto >= 5000 && konto < 8000) return 'AUFWAND'; // Aufwendungen
    
    return 'AUFWAND';
  }
  
  private static toDate(value: unknown): Date {
    if (!value) return new Date();
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
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

  // ============================================================================
  // ABSCHREIBUNGEN AUS ANLAGEVERMÖGEN (fixedAssets)
  // ============================================================================

  /**
   * Berechnet AfA aus der fixedAssets Collection
   * Berücksichtigt: Lineare AfA, GWG-Sofortabschreibung, Sammelposten
   */
  private static async berechneAfaAusFixedAssets(
    companyId: string,
    monat: number,
    jahr: number
  ): Promise<{ monatlich: number; kumuliert: number }> {
    try {
      const assetsRef = collection(db, 'companies', companyId, 'fixedAssets');
      const assetsQuery = query(assetsRef, where('status', '==', 'active'));
      const assetsSnapshot = await getDocs(assetsQuery);

      let monatlicheAfa = 0;
      let kumulierteAfa = 0;

      assetsSnapshot.forEach(docSnapshot => {
        const asset = docSnapshot.data();
        
        // Berechne monatliche AfA für diesen Monat
        const monatAfa = this.berechneMonatlicheAfa(asset, monat, jahr);
        monatlicheAfa += monatAfa;
        
        // Berechne kumulierte AfA (Januar bis aktueller Monat)
        for (let m = 1; m <= monat; m++) {
          kumulierteAfa += this.berechneMonatlicheAfa(asset, m, jahr);
        }
      });

      return {
        monatlich: Math.round(monatlicheAfa * 100) / 100,
        kumuliert: Math.round(kumulierteAfa * 100) / 100,
      };
    } catch {
      // fixedAssets Collection existiert möglicherweise noch nicht
      return { monatlich: 0, kumuliert: 0 };
    }
  }

  /**
   * Berechnet die monatliche AfA für ein einzelnes Anlagegut
   */
  private static berechneMonatlicheAfa(
    asset: Record<string, unknown>,
    monat: number,
    jahr: number
  ): number {
    const purchaseDateRaw = asset.purchaseDate as { toDate?: () => Date } | undefined;
    const acquisitionDateRaw = asset.acquisitionDate as { toDate?: () => Date } | undefined;
    const purchaseDate = purchaseDateRaw?.toDate?.() || acquisitionDateRaw?.toDate?.();
    if (!purchaseDate) return 0;

    // Anschaffungskosten (in Cent oder Euro gespeichert)
    const rawCost = (asset.purchasePrice as number) || (asset.acquisitionCost as number) || 0;
    const purchasePrice = rawCost > 10000 ? rawCost / 100 : rawCost; // Cent zu Euro wenn nötig
    
    const usefulLifeMonths = ((asset.usefulLife as number) || (asset.usefulLifeYears as number) * 12) || 36;
    const depreciationMethod = (asset.depreciationMethod as string) || 'linear';

    const purchaseYear = purchaseDate.getFullYear();
    const purchaseMonth = purchaseDate.getMonth() + 1; // 1-12

    // Prüfe ob das Asset in diesem Monat/Jahr überhaupt abgeschrieben wird
    if (jahr < purchaseYear) return 0;
    if (jahr === purchaseYear && monat < purchaseMonth) return 0;

    // GWG: Sofortabschreibung im Anschaffungsmonat
    if (asset.isGwg && purchaseYear === jahr && purchaseMonth === monat) {
      return purchasePrice;
    }
    if (asset.isGwg && (purchaseYear !== jahr || purchaseMonth !== monat)) {
      return 0; // GWG nur im Anschaffungsmonat
    }

    // Sammelposten: 20% pro Jahr über 5 Jahre (gleichmäßig auf 12 Monate)
    if (asset.isSammelposten) {
      const yearsActive = jahr - purchaseYear;
      if (yearsActive >= 0 && yearsActive < 5) {
        return (purchasePrice * 0.2) / 12;
      }
      return 0;
    }

    // Lineare AfA
    if (depreciationMethod === 'linear' || depreciationMethod === 'none') {
      const monthlyAfa = purchasePrice / usefulLifeMonths;
      
      // Berechne wie viele Monate seit Anschaffung
      const monthsSincePurchase = (jahr - purchaseYear) * 12 + (monat - purchaseMonth);
      
      // Noch innerhalb der Nutzungsdauer?
      if (monthsSincePurchase >= 0 && monthsSincePurchase < usefulLifeMonths) {
        return monthlyAfa;
      }
    }

    return 0;
  }
}
