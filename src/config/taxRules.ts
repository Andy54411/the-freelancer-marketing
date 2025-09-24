import { TaxRule, TaxRuleCategory, TaxRuleType } from '@/types/taxRules';

export const TAX_RULES: TaxRule[] = [
  {
    id: TaxRuleType.DE_TAXABLE,
    name: "Umsatzsteuerpflichtige Umsätze",
    category: TaxRuleCategory.DOMESTIC,
    taxRate: 19,
    invoiceText: "",  // Standardfall benötigt keinen speziellen Text
    legalBasis: "§1 UStG",
    description: "Standard-Umsatzsteuer für Leistungen in Deutschland",
    validCountries: ["DE"],
  },
  {
    id: TaxRuleType.DE_TAXABLE_REDUCED,
    name: "Ermäßigter Steuersatz",
    category: TaxRuleCategory.DOMESTIC,
    taxRate: 7,
    invoiceText: "",
    legalBasis: "§12 Abs. 2 UStG",
    description: "Ermäßigter Steuersatz für bestimmte Waren und Dienstleistungen",
    validCountries: ["DE"],
  },
  {
    id: TaxRuleType.DE_REVERSE_13B,
    name: "Reverse Charge gem. §13b UStG",
    category: TaxRuleCategory.DOMESTIC,
    taxRate: 0,
    invoiceText: "Steuerschuldnerschaft des Leistungsempfängers nach §13b UStG",
    legalBasis: "§13b UStG",
    description: "Für B2B-Leistungen an deutsche Unternehmen mit Reverse-Charge-Verfahren",
    validCountries: ["DE"],
    requirements: ["Empfänger muss Unternehmer sein", "USt-IdNr. erforderlich"],
  },
  {
    id: TaxRuleType.DE_EXEMPT_4_USTG,
    name: "Steuerfreie Umsätze §4 UStG",
    category: TaxRuleCategory.TAX_FREE,
    taxRate: 0,
    invoiceText: "Steuerfreie Leistung gemäß §4 UStG",
    legalBasis: "§4 UStG",
    description: "Steuerfreie Umsätze nach §4 UStG",
    validCountries: ["DE"],
  },
  {
    id: TaxRuleType.EU_REVERSE_18B,
    name: "Reverse Charge gem. §18b UStG",
    category: TaxRuleCategory.EU_REVERSE,
    taxRate: 0,
    invoiceText: "Steuerschuldnerschaft des Leistungsempfängers nach Art. 196 MwStSystRL\nReverse charge according to Art. 196 VAT Directive",
    legalBasis: "§18b UStG, Art. 196 MwStSystRL",
    description: "Für B2B-Leistungen an Unternehmen in der EU",
    validCountries: ["EU"],
    requirements: ["Empfänger muss Unternehmer sein", "Gültige EU USt-IdNr. erforderlich"],
  },
  {
    id: TaxRuleType.EU_INTRACOMMUNITY_SUPPLY,
    name: "Innergemeinschaftliche Lieferungen",
    category: TaxRuleCategory.EU_DELIVERY,
    taxRate: 0,
    invoiceText: "Steuerfreie innergemeinschaftliche Lieferung nach §4 Nr. 1b i.V.m. §6a UStG\nTax-exempt intra-Community supply according to §4 No. 1b in conjunction with §6a of the German VAT Act",
    legalBasis: "§4 Nr. 1b i.V.m. §6a UStG",
    description: "Warenlieferungen an Unternehmen in der EU",
    validCountries: ["EU"],
    requirements: ["Empfänger muss Unternehmer sein", "Gültige EU USt-IdNr. erforderlich", "Beförderungsnachweis"],
  },
  {
    id: TaxRuleType.EU_OSS,
    name: "OSS – One-Stop-Shop",
    category: TaxRuleCategory.EU_DELIVERY,
    taxRate: 0, // Variiert je nach Land
    invoiceText: "Meldung über OSS-Verfahren",
    legalBasis: "§18j UStG",
    description: "Für B2C-Leistungen in der EU (One-Stop-Shop)",
    validCountries: ["EU"],
  },
  {
    id: TaxRuleType.NON_EU_EXPORT,
    name: "Ausfuhren",
    category: TaxRuleCategory.NON_EU,
    taxRate: 0,
    invoiceText: "Steuerfreie Ausfuhrlieferung nach §4 Nr. 1a i.V.m. §6 UStG\nTax-exempt export delivery according to §4 No. 1a in conjunction with §6 of the German VAT Act",
    legalBasis: "§4 Nr. 1a i.V.m. §6 UStG",
    description: "Warenlieferungen in Nicht-EU-Länder",
    validCountries: ["NON_EU"],
    requirements: ["Ausfuhrnachweis erforderlich"],
  },
  {
    id: TaxRuleType.NON_EU_OUT_OF_SCOPE,
    name: "Nicht im Inland steuerbare Leistung",
    category: TaxRuleCategory.NON_EU,
    taxRate: 0,
    invoiceText: "Nicht steuerbare Leistung (Leistungsort nicht in Deutschland)\nNon-taxable service (place of service not in Germany)",
    legalBasis: "§3a Abs. 2 UStG",
    description: "Dienstleistungen an Empfänger außerhalb der EU",
    validCountries: ["NON_EU"],
  },
];

// Hilfsfunktion um eine Steuerregel anhand der ID zu finden
export function getTaxRule(id: string): TaxRule | undefined {
  return TAX_RULES.find(rule => rule.id === id);
}

// Hilfsfunktion um den lokalisierten Namen einer Kategorie zu erhalten
export function getCategoryLabel(category: TaxRuleCategory): string {
  const labels: Record<TaxRuleCategory, string> = {
    [TaxRuleCategory.DOMESTIC]: "In Deutschland",
    [TaxRuleCategory.EU_REVERSE]: "Im EU-Ausland",
    [TaxRuleCategory.EU_DELIVERY]: "Innergemeinschaftliche Lieferungen",
    [TaxRuleCategory.NON_EU]: "Außerhalb der EU",
    [TaxRuleCategory.TAX_FREE]: "Steuerfreie Umsätze",
  };
  return labels[category];
}