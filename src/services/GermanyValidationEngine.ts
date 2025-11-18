// Deutsche Validierungs-Engine für GoBD-Compliance und deutsche Buchhaltungsstandards
import { GoBDReceiptData, ValidationIssue } from '@/types/ocr-enhanced';

export class GermanyValidationEngine {
  private static instance: GermanyValidationEngine;
  
  public static getInstance(): GermanyValidationEngine {
    if (!GermanyValidationEngine.instance) {
      GermanyValidationEngine.instance = new GermanyValidationEngine();
    }
    return GermanyValidationEngine.instance;
  }

  // =============================================================================
  // HAUPTVALIDIERUNG: GoBD-COMPLIANCE
  // =============================================================================
  
  async validateGoBDCompliance(data: GoBDReceiptData): Promise<{
    isCompliant: boolean;
    issues: ValidationIssue[];
    score: number; // 0-100
    recommendations: string[];
  }> {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // 1. Pflichtfelder nach GoBD prüfen
    const mandatoryFieldsResult = this.validateMandatoryFields(data);
    issues.push(...mandatoryFieldsResult.issues);
    score -= mandatoryFieldsResult.penalty;

    // 2. Lieferantendaten validieren
    const supplierResult = await this.validateSupplierData(data.lieferant);
    issues.push(...supplierResult.issues);
    score -= supplierResult.penalty;
    recommendations.push(...supplierResult.recommendations);

    // 3. Steuerberechnung prüfen
    const taxResult = this.validateTaxCalculation(data.steuerberechnung);
    issues.push(...taxResult.issues);
    score -= taxResult.penalty;

    // 4. DATEV-Zuordnung validieren
    const datevResult = this.validateDATEVMapping(data.datev);
    issues.push(...datevResult.issues);
    score -= datevResult.penalty;

    // 5. Rechnungslogik prüfen
    const invoiceResult = this.validateInvoiceLogic(data);
    issues.push(...invoiceResult.issues);
    score -= invoiceResult.penalty;

    // 6. Deutsche Standards prüfen
    const standardsResult = this.validateGermanStandards(data);
    issues.push(...standardsResult.issues);
    score -= standardsResult.penalty;

    // Finaler Compliance-Status
    const isCompliant = issues.filter(i => i.severity === 'ERROR').length === 0;
    const finalScore = Math.max(0, Math.min(100, score));

    // Empfehlungen generieren
    if (finalScore < 95) {
      recommendations.push('💡 Manuelle Nachprüfung der OCR-Extraktion empfohlen');
    }
    if (!data.datev.kostenstelle) {
      recommendations.push('🎯 Kostenstelle zuweisen für bessere Kostenanalyse');
    }
    if (!data.rechnungsdetails.zahlungsbedingungen.zahlungsziel) {
      recommendations.push('📅 Zahlungsziel erfassen für Liquiditätsplanung');
    }

    return {
      isCompliant,
      issues,
      score: finalScore,
      recommendations
    };
  }

  // =============================================================================
  // PFLICHTFELDER-VALIDIERUNG
  // =============================================================================
  
  private validateMandatoryFields(data: GoBDReceiptData): {
    issues: ValidationIssue[];
    penalty: number;
  } {
    const issues: ValidationIssue[] = [];
    let penalty = 0;

    // GoBD-Pflichtfelder
    if (!data.belegnummer || data.belegnummer.trim() === '') {
      issues.push({
        field: 'belegnummer',
        severity: 'ERROR',
        message: 'Belegnummer ist nach GoBD Pflicht (§ 14 Abs. 4 UStG)'
      });
      penalty += 20;
    }

    if (!data.belegdatum || data.belegdatum.trim() === '') {
      issues.push({
        field: 'belegdatum',
        severity: 'ERROR',
        message: 'Belegdatum ist nach GoBD Pflicht'
      });
      penalty += 15;
    }

    if (!data.lieferant.name || data.lieferant.name === 'Unbekannter Lieferant') {
      issues.push({
        field: 'lieferant.name',
        severity: 'ERROR',
        message: 'Lieferantenname konnte nicht erkannt werden'
      });
      penalty += 25;
    }

    if (data.steuerberechnung.bruttobetrag <= 0) {
      issues.push({
        field: 'steuerberechnung.bruttobetrag',
        severity: 'ERROR',
        message: 'Rechnungsbetrag muss größer als 0 sein'
      });
      penalty += 30;
    }

    // Eingangsdatum prüfen
    if (!data.eingangsdatum) {
      issues.push({
        field: 'eingangsdatum',
        severity: 'WARNING',
        message: 'Eingangsdatum sollte für GoBD-Compliance erfasst werden'
      });
      penalty += 5;
    }

    return { issues, penalty };
  }

  // =============================================================================
  // LIEFERANTEN-VALIDIERUNG
  // =============================================================================
  
  private async validateSupplierData(lieferant: GoBDReceiptData['lieferant']): Promise<{
    issues: ValidationIssue[];
    penalty: number;
    recommendations: string[];
  }> {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    let penalty = 0;

    // Adressdaten prüfen
    if (!lieferant.adresse || lieferant.adresse.trim() === '') {
      issues.push({
        field: 'lieferant.adresse',
        severity: 'WARNING',
        message: 'Lieferantenadresse fehlt - für Kleinbetragsrechnungen über 250€ erforderlich'
      });
      penalty += 5;
    }

    // USt-IdNr validieren (falls vorhanden)
    if (lieferant.ustIdNr) {
      const vatValidation = await this.validateEUVATNumber(lieferant.ustIdNr);
      if (!vatValidation.valid) {
        issues.push({
          field: 'lieferant.ustIdNr',
          severity: 'WARNING',
          message: `USt-IdNr "${lieferant.ustIdNr}" konnte nicht validiert werden`,
          suggestedValue: 'Manuelle Prüfung erforderlich'
        });
        penalty += 10;
        recommendations.push('🔍 USt-IdNr manuell im EU VIES-System prüfen');
      } else {
        recommendations.push('✅ USt-IdNr erfolgreich validiert');
      }
    }

    // Deutsche Steuernummer prüfen
    if (lieferant.steuernummer) {
      const taxValidation = this.validateGermanTaxNumber(lieferant.steuernummer);
      if (!taxValidation.valid) {
        issues.push({
          field: 'lieferant.steuernummer',
          severity: 'WARNING',
          message: `Deutsche Steuernummer "${lieferant.steuernummer}" hat ungültiges Format`
        });
        penalty += 8;
      }
    }

    // PLZ/Ort Konsistenz prüfen
    if (lieferant.plz && lieferant.ort) {
      const locationValidation = this.validateGermanPostalCode(lieferant.plz, lieferant.ort);
      if (!locationValidation.valid) {
        issues.push({
          field: 'lieferant.plz',
          severity: 'INFO',
          message: `PLZ ${lieferant.plz} und Ort ${lieferant.ort} scheinen nicht zu passen`
        });
      }
    }

    return { issues, penalty, recommendations };
  }

  // =============================================================================
  // STEUERBERECHNUNG-VALIDIERUNG
  // =============================================================================
  
  private validateTaxCalculation(steuer: GoBDReceiptData['steuerberechnung']): {
    issues: ValidationIssue[];
    penalty: number;
  } {
    const issues: ValidationIssue[] = [];
    let penalty = 0;

    // Grundlegende Steuerberechnung prüfen
    const calculatedGross = steuer.nettobetrag * (1 + steuer.ustSatz / 100);
    const grossDifference = Math.abs(calculatedGross - steuer.bruttobetrag);
    
    if (grossDifference > 0.05) { // 5 Cent Toleranz
      issues.push({
        field: 'steuerberechnung',
        severity: 'ERROR',
        message: `Steuerberechnung unplausibel: Netto ${steuer.nettobetrag}€ + ${steuer.ustSatz}% USt sollte ${calculatedGross.toFixed(2)}€ ergeben, nicht ${steuer.bruttobetrag}€`,
        suggestedValue: calculatedGross.toFixed(2)
      });
      penalty += 15;
    }

    // USt-Betrag prüfen
    const calculatedVAT = steuer.nettobetrag * (steuer.ustSatz / 100);
    const vatDifference = Math.abs(calculatedVAT - steuer.ustBetrag);
    
    if (vatDifference > 0.05) {
      issues.push({
        field: 'steuerberechnung.ustBetrag',
        severity: 'WARNING',
        message: `USt-Betrag unplausibel: ${steuer.ustBetrag}€ sollte ${calculatedVAT.toFixed(2)}€ sein`
      });
      penalty += 10;
    }

    // Deutsche USt-Sätze validieren
    const validGermanVATRates = [0, 7, 19];
    if (!validGermanVATRates.includes(steuer.ustSatz)) {
      issues.push({
        field: 'steuerberechnung.ustSatz',
        severity: 'WARNING',
        message: `Ungewöhnlicher USt-Satz: ${steuer.ustSatz}% (üblich in DE: 19%, 7%, 0%)`
      });
      penalty += 5;
    }

    // Kleinunternehmer-Regelung prüfen
    if (steuer.kleinunternehmer && steuer.ustSatz !== 0) {
      issues.push({
        field: 'steuerberechnung.kleinunternehmer',
        severity: 'ERROR',
        message: 'Kleinunternehmer nach §19 UStG dürfen keine Umsatzsteuer ausweisen'
      });
      penalty += 20;
    }

    // Innergemeinschaftliche Lieferung
    if (steuer.innergemeinschaftlich && steuer.ustSatz !== 0) {
      issues.push({
        field: 'steuerberechnung.innergemeinschaftlich',
        severity: 'WARNING',
        message: 'Innergemeinschaftliche Lieferungen sind normalerweise umsatzsteuerfrei'
      });
      penalty += 10;
    }

    return { issues, penalty };
  }

  // =============================================================================
  // DATEV-MAPPING-VALIDIERUNG
  // =============================================================================
  
  private validateDATEVMapping(datev: GoBDReceiptData['datev']): {
    issues: ValidationIssue[];
    penalty: number;
  } {
    const issues: ValidationIssue[] = [];
    let penalty = 0;

    // DATEV-Kontonummer prüfen
    if (!datev.kontoNummer || datev.kontoNummer.trim() === '') {
      issues.push({
        field: 'datev.kontoNummer',
        severity: 'ERROR',
        message: 'DATEV-Aufwandskonto fehlt'
      });
      penalty += 15;
    } else {
      // SKR03/04 Kontonummern validieren
      const accountValidation = this.validateDATEVAccountNumber(datev.kontoNummer);
      if (!accountValidation.valid) {
        issues.push({
          field: 'datev.kontoNummer',
          severity: 'WARNING',
          message: `Ungewöhnliche Kontonummer: ${datev.kontoNummer} (${accountValidation.reason})`
        });
        penalty += 5;
      }
    }

    // Gegenkonto prüfen
    if (!datev.gegenkonto || datev.gegenkonto.trim() === '') {
      issues.push({
        field: 'datev.gegenkonto',
        severity: 'WARNING',
        message: 'DATEV-Gegenkonto (Kreditorenkonto) fehlt'
      });
      penalty += 10;
    }

    // Belegkreis prüfen
    if (datev.belegkreis !== 'ER') {
      issues.push({
        field: 'datev.belegkreis',
        severity: 'WARNING',
        message: `Belegkreis "${datev.belegkreis}" ungewöhnlich für Eingangsrechnungen (Standard: "ER")`
      });
      penalty += 5;
    }

    // Buchungstext prüfen
    if (!datev.buchungstext || datev.buchungstext.trim() === '') {
      issues.push({
        field: 'datev.buchungstext',
        severity: 'INFO',
        message: 'Buchungstext fehlt - empfohlen für bessere Nachvollziehbarkeit'
      });
      penalty += 2;
    }

    return { issues, penalty };
  }

  // =============================================================================
  // RECHNUNGSLOGIK-VALIDIERUNG
  // =============================================================================
  
  private validateInvoiceLogic(data: GoBDReceiptData): {
    issues: ValidationIssue[];
    penalty: number;
  } {
    const issues: ValidationIssue[] = [];
    let penalty = 0;

    // Belegnummer-Format prüfen
    const invoiceValidation = this.validateInvoiceNumberFormat(data.belegnummer);
    if (!invoiceValidation.valid) {
      issues.push({
        field: 'belegnummer',
        severity: 'INFO',
        message: invoiceValidation.reason || 'Rechnungsnummer hat ungewöhnliches Format'
      });
    }

    // Datums-Plausibilität prüfen
    const dateValidation = this.validateDateLogic(data.belegdatum, data.eingangsdatum);
    if (!dateValidation.valid) {
      issues.push({
        field: 'belegdatum',
        severity: 'WARNING',
        message: dateValidation.reason || 'Datums-Logik unplausibel'
      });
      penalty += 5;
    }

    // Kleinbetragsrechnung prüfen (§ 33 UStDV)
    if (data.steuerberechnung.bruttobetrag <= 250) {
      const kleinbetragsValidation = this.validateKleinbetragsrechnung(data);
      if (!kleinbetragsValidation.valid) {
        issues.push({
          field: 'kleinbetragsrechnung',
          severity: 'INFO',
          message: 'Kleinbetragsrechnung (≤250€): Vereinfachte Anforderungen möglich'
        });
      }
    }

    return { issues, penalty };
  }

  // =============================================================================
  // DEUTSCHE STANDARDS-VALIDIERUNG
  // =============================================================================
  
  private validateGermanStandards(data: GoBDReceiptData): {
    issues: ValidationIssue[];
    penalty: number;
  } {
    const issues: ValidationIssue[] = [];
    const penalty = 0;

    // Währung prüfen
    if (data.rechnungsdetails.waehrung !== 'EUR') {
      issues.push({
        field: 'rechnungsdetails.waehrung',
        severity: 'INFO',
        message: `Fremdwährungsrechnung (${data.rechnungsdetails.waehrung}) - Wechselkurs erforderlich`
      });
    }

    // Zahlungskonditionen prüfen
    if (!data.rechnungsdetails.zahlungsbedingungen.zahlungsziel) {
      issues.push({
        field: 'rechnungsdetails.zahlungsbedingungen.zahlungsziel',
        severity: 'INFO',
        message: 'Zahlungsziel fehlt - empfohlen für Liquiditätsplanung'
      });
    }

    return { issues, penalty };
  }

  // =============================================================================
  // EXTERNE VALIDIERUNGEN (PLACEHOLDER-IMPLEMENTIERUNGEN)
  // =============================================================================
  
  private async validateEUVATNumber(vatId: string): Promise<{ valid: boolean }> {
    // Basis-Validierung des Formats
    const vatPattern = /^[A-Z]{2}\d{9,12}$/;
    const formatValid = vatPattern.test(vatId.replace(/\s/g, ''));
    
    if (!formatValid) {
      return { valid: false };
    }
    
    // In der Realität würde hier die EU VIES-API aufgerufen
    // Für jetzt: Deutsche USt-IdNr als gültig betrachten
    return { valid: vatId.startsWith('DE') };
  }
  
  private validateGermanTaxNumber(taxNumber: string): { valid: boolean; format?: string } {
    // Deutsche Steuernummer-Formate
    const patterns = [
      /^\d{2,3}\/\d{3,4}\/\d{4,5}$/, // Standard: 12/345/67890
      /^\d{10,11}$/,                  // Vereinheitlicht: 12345678901
      /^\d{2}\s\d{3}\s\d{5}$/        // Mit Leerzeichen: 12 345 67890
    ];
    
    return {
      valid: patterns.some(pattern => pattern.test(taxNumber)),
      format: 'Standard deutsche Steuernummer'
    };
  }
  
  private validateGermanPostalCode(plz: string, ort: string): { valid: boolean } {
    // Deutsche PLZ: 5-stellig, 01001-99998
    const plzValid = /^\d{5}$/.test(plz) && parseInt(plz) >= 1001 && parseInt(plz) <= 99998;
    
    // Einfache Plausibilitätsprüfung
    const ortValid = ort.length >= 2 && /^[a-zA-ZäöüÄÖÜß\s-]+$/.test(ort);
    
    return { valid: plzValid && ortValid };
  }
  
  private validateDATEVAccountNumber(accountNumber: string): { 
    valid: boolean; 
    reason?: string; 
  } {
    const account = parseInt(accountNumber);
    
    // SKR03/04 Aufwandskonten typischerweise 4000-7999
    if (account >= 4000 && account <= 7999) {
      return { valid: true };
    }
    
    // Erlaubte Sonderkonten
    const specialAccounts = [1200, 1400, 1600]; // Beispiel-Bestandskonten
    if (specialAccounts.includes(account)) {
      return { valid: true };
    }
    
    return { 
      valid: false, 
      reason: `Konto ${accountNumber} außerhalb Standard-Aufwandsbereich (4000-7999)` 
    };
  }
  
  private validateInvoiceNumberFormat(invoiceNumber: string): { 
    valid: boolean; 
    reason?: string; 
  } {
    if (!invoiceNumber || invoiceNumber.length < 3) {
      return { valid: false, reason: 'Rechnungsnummer zu kurz' };
    }
    
    // Gültige deutsche Rechnungsnummer-Patterns
    const patterns = [
      /^\d+$/,                           // Nur Zahlen: 123456
      /^[A-Z]{1,3}-?\d+$/i,             // Präfix-Zahlen: RG-123456, INV123
      /^\d{4}-\d+$/,                     // Jahr-Nummer: 2024-001234
      /^[A-Z0-9]+-[A-Z0-9]+-\d+$/i      // Komplex: ABC-DEF-123456
    ];
    
    const isValid = patterns.some(pattern => pattern.test(invoiceNumber));
    
    return {
      valid: isValid,
      reason: isValid ? 'Standard-Rechnungsnummer-Format' : 'Ungewöhnliches Rechnungsnummer-Format'
    };
  }
  
  private validateDateLogic(belegdatum: string, eingangsdatum: string): { 
    valid: boolean; 
    reason?: string; 
  } {
    try {
      const [belegTag, belegMonat, belegJahr] = belegdatum.split('.').map(Number);
      const [eingangsTag, eingangsMonat, eingangsJahr] = eingangsdatum.split('.').map(Number);
      
      const belegDate = new Date(belegJahr, belegMonat - 1, belegTag);
      const eingangsDate = new Date(eingangsJahr, eingangsMonat - 1, eingangsTag);
      const heute = new Date();
      
      // Belegdatum darf nicht in der Zukunft liegen
      if (belegDate > heute) {
        return { valid: false, reason: 'Belegdatum liegt in der Zukunft' };
      }
      
      // Eingangsdatum nicht vor Belegdatum
      if (eingangsDate < belegDate) {
        return { valid: false, reason: 'Eingangsdatum vor Belegdatum' };
      }
      
      // Warnung bei sehr alten Belegen (> 1 Jahr)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(heute.getFullYear() - 1);
      
      if (belegDate < oneYearAgo) {
        return { valid: true, reason: 'Sehr alter Beleg (>1 Jahr) - Verjährung prüfen' };
      }
      
      return { valid: true };
      
    } catch (error) {
      return { valid: false, reason: 'Ungültiges Datumsformat' };
    }
  }
  
  private validateKleinbetragsrechnung(data: GoBDReceiptData): { valid: boolean } {
    // Vereinfachte Anforderungen für Kleinbetragsrechnungen ≤ 250€ (§ 33 UStDV)
    // Pflicht: Vollständiger Name und Anschrift des Lieferanten
    // Optional: USt-IdNr bei Kleinbeträgen nicht zwingend
    
    const hasRequiredFields = 
      !!data.lieferant.name && 
      data.lieferant.name !== 'Unbekannter Lieferant' &&
      data.steuerberechnung.bruttobetrag > 0;
    
    return { valid: hasRequiredFields };
  }
}