import { TaxRuleType } from '@/types/taxRules';
import { InvoiceData } from '@/types/invoiceTypes';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class InvoiceValidationService {
  /**
   * Validiert die Steuerregeln einer Rechnung
   */
  static validateTaxRules(invoice: InvoiceData): ValidationResult {
    const errors: string[] = [];

    // Validiere Kleinunternehmerregelung
    if (invoice.isSmallBusiness && invoice.tax > 0) {
      errors.push('Bei Kleinunternehmerregelung darf keine MwSt. ausgewiesen werden');
    }

    // Validiere spezifische Steuerregeln
    switch (invoice.taxRuleType) {
      case TaxRuleType.EU_REVERSE_18B:
      case TaxRuleType.DE_REVERSE_13B:
        if (!invoice.reverseChargeInfo?.customerVatId) {
          errors.push('USt-IdNr. des Kunden ist für Reverse-Charge erforderlich');
        }
        if (!invoice.reverseChargeInfo?.euCountryCode) {
          errors.push('EU-Ländercode ist für Reverse-Charge erforderlich');
        }
        if (invoice.tax > 0) {
          errors.push('Bei Reverse-Charge darf keine MwSt. ausgewiesen werden');
        }
        break;

      case TaxRuleType.DE_EXEMPT_4_USTG:
        if (!invoice.taxRuleReason) {
          errors.push('Begründung für Steuerbefreiung nach §4 UStG ist erforderlich');
        }
        if (invoice.tax > 0) {
          errors.push('Bei Steuerbefreiung darf keine MwSt. ausgewiesen werden');
        }
        break;

      case TaxRuleType.EU_INTRACOMMUNITY_SUPPLY:
        if (!invoice.reverseChargeInfo?.customerVatId) {
          errors.push('USt-IdNr. des EU-Kunden ist für innergemeinschaftliche Lieferung erforderlich');
        }
        if (!invoice.reverseChargeInfo?.euCountryCode) {
          errors.push('EU-Ländercode ist für innergemeinschaftliche Lieferung erforderlich');
        }
        if (invoice.tax > 0) {
          errors.push('Bei innergemeinschaftlicher Lieferung darf keine MwSt. ausgewiesen werden');
        }
        break;

      case TaxRuleType.EU_OSS:
        if (!invoice.taxRuleText?.includes('OSS')) {
          errors.push('Bei OSS-Regelung muss ein entsprechender Hinweis auf der Rechnung erscheinen');
        }
        // Hier könnten weitere OSS-spezifische Validierungen erfolgen
        break;

      case TaxRuleType.NON_EU_EXPORT:
        if (!invoice.taxRuleText?.includes('Ausfuhrlieferung')) {
          errors.push('Bei Ausfuhrlieferungen muss ein entsprechender Hinweis auf der Rechnung erscheinen');
        }
        if (invoice.tax > 0) {
          errors.push('Bei Ausfuhrlieferungen darf keine MwSt. ausgewiesen werden');
        }
        break;

      case TaxRuleType.NON_EU_OUT_OF_SCOPE:
        if (!invoice.taxRuleText?.includes('nicht steuerbar')) {
          errors.push('Bei nicht steuerbaren Leistungen muss ein entsprechender Hinweis auf der Rechnung erscheinen');
        }
        if (invoice.tax > 0) {
          errors.push('Bei nicht steuerbaren Leistungen darf keine MwSt. ausgewiesen werden');
        }
        break;

      case TaxRuleType.DE_TAXABLE:
        if (invoice.taxRuleText?.includes('steuerfrei') || invoice.taxRuleText?.includes('nicht steuerbar')) {
          errors.push('Bei steuerpflichtigen Leistungen darf kein Hinweis auf Steuerbefreiung erscheinen');
        }
        if (invoice.tax <= 0 && !invoice.isSmallBusiness) {
          errors.push('Bei steuerpflichtigen Leistungen muss MwSt. ausgewiesen werden');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Prüft die Gültigkeit des Steuersatzes für die gewählte Steuerregel
   */
  static validateTaxRate(taxRuleType: TaxRuleType, taxRate: number): boolean {
    switch (taxRuleType) {
      case TaxRuleType.DE_TAXABLE:
        return taxRate === 19 || taxRate === 7; // Standard- oder ermäßigter Steuersatz

      case TaxRuleType.EU_OSS:
        return taxRate >= 0 && taxRate <= 27; // Max. MwSt. in der EU (Ungarn)

      case TaxRuleType.DE_EXEMPT_4_USTG:
      case TaxRuleType.DE_REVERSE_13B:
      case TaxRuleType.EU_REVERSE_18B:
      case TaxRuleType.EU_INTRACOMMUNITY_SUPPLY:
      case TaxRuleType.NON_EU_EXPORT:
      case TaxRuleType.NON_EU_OUT_OF_SCOPE:
        return taxRate === 0;

      default:
        return false;
    }
  }
}