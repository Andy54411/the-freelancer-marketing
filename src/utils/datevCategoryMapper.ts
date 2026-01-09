// Intelligente Zuordnung von DATEV-Konten zu Expense-Kategorien
// Basiert auf dem deutschen DATEV SKR03/SKR04 Kontenrahmen
import { DatevCard, DatevCardService } from '@/services/datevCardService';

interface CategoryMapping {
  id: string;
  keywords: string[];
  accountRanges: Array<{ start: number; end: number }>;
  priority?: number; // Höhere Priorität = bevorzugte Zuordnung
}

export class DatevCategoryMapper {
  private static expenseCategoryMappings: CategoryMapping[] = [
    // HÖCHSTE PRIORITÄT - SPEZIFISCHE FINANZ-/STEUERKONTEN ZUERST

    // ZINSEN (Separate Kategorie für Frontend - ALLERHÖCHSTE Priorität!)
    {
      id: 'zinsen',
      keywords: ['zinsen', 'zins', 'zinsaufwendungen', 'zinserträge', 'zinsähnliche', 'diskontaufwendungen', 'kreditzinsen', 'sollzinsen', 'habenzinsen'],
      accountRanges: [
        { start: 6856, end: 6856 }, // Zinsen für kurzfristige Verbindlichkeiten
        { start: 6880, end: 6880 }, // Zinsen und ähnliche Aufwendungen
        { start: 7300, end: 7399 }  // Alle Zinsaufwendungen (7300-7399)
      ],
      priority: 18 // ALLERHÖCHSTE Priorität für Zinsen!
    },

    // STEUERN UND ABGABEN (Alle Steuer-Ranges)
    {
      id: 'steuern-abgaben',
      keywords: ['steuer', 'gewerbesteuer', 'grundsteuer', 'kfz-steuer', 'abgabe', 'betriebssteuer', 'nicht abzugsfähig', 'körperschaftssteuer'],
      accountRanges: [
        { start: 7000, end: 7099 }, // Betriebssteuern
        { start: 7600, end: 7699 }, // Körperschafts-/Gewerbesteuer
        { start: 3500, end: 3999 }  // Steuerverbindlichkeiten
      ],
      priority: 15  // SEHR HOHE Priorität!
    },

    // BANKEN UND FINANZEN (Ohne Zinsen - Bankgebühren, Finanzkosten, Währung) - ULTRA-PRIORITÄT!
    {
      id: 'banken-finanzen',
      keywords: ['bank', 'bankgebühr', 'kontoführung', 'finanzierungskosten', 'wechsel', 'disagio', 'damnum', 'währungsumrechnung', 'kreditgebühren', 'transaktionsgebühren', 'kontokorrent', 'avalkredit'],
      accountRanges: [
        { start: 1600, end: 1799 }, // Bank- und Kassenkonten
        { start: 3000, end: 3199 }, // Darlehen und Verbindlichkeiten (ohne Zinsen)
        { start: 6870, end: 6879 }, // Bankgebühren und Finanzkosten (ohne Zinsen 6880)
        { start: 6890, end: 6999 }  // Weitere Finanz- und Bankkosten
      ],
      priority: 19 // ULTRA-HÖCHSTE Priorität um Büro-Kategorie zu überschreiben!
    },

    // REISEN UND VERPFLEGUNG (Muss vor Werbung stehen!)
    {
      id: 'reisen-verpflegung',
      keywords: ['reise', 'reisekosten', 'übernachtung', 'verpflegung', 'bewirtung', 'geschäftsessen', 'dienstreise', 'verpflegungsmehraufwand', 'fahrtkosten', 'reisenebenkosten'],
      accountRanges: [
        { start: 6650, end: 6679 }  // Reisekosten Arbeitnehmer und Unternehmer
      ],
      priority: 13  // Höher als Werbung!
    },

    // SPENDEN (Klasse 6700-6799)
    {
      id: 'spenden',
      keywords: ['spende', 'spenden', 'gemeinnützig', 'steuerlich begünstigt', '4‰'],
      accountRanges: [
        { start: 6700, end: 6799 }  // Spenden
      ],
      priority: 12 // Hohe Priorität für eindeutige Zuordnung
    },

    // PERSONALKOSTEN (Klasse 4000-4999 - KORREKTE DATEV-Ranges!)
    {
      id: 'personal',
      keywords: ['personal', 'gehalt', 'lohn', 'sozial', 'mitarbeiter', 'geschäftsführer', 'angestellte', 'sozialversicherung', 'berufsgenossenschaft', 'umlage'],
      accountRanges: [
        { start: 4000, end: 4999 }  // KORREKTER Personalbereich nach SKR03/SKR04
      ],
      priority: 11
    },

    {
      // ANLAGEVERMÖGEN (Geschäftsausstattung, Fahrzeuge, Einrichtungen)
      id: 'anlagevermoegen',
      keywords: ['anlagevermögen', 'geschäftsausstattung', 'betriebs-', 'ausstattung', 'fahrzeuge', 'transportmittel', 'einrichtung', 'büroeinrichtung', 'ladeneinrichtung', 'geringwertige', 'wirtschaftsgüter'],
      accountRanges: [
        { start: 500, end: 690 }    // Betriebs- und Geschäftsausstattung, Fahrzeuge, Einrichtungen
      ],
      priority: 1
    },

    // MATERIAL UND WAREN (Klasse 5000-5899)
    {
      id: 'material-waren',
      keywords: ['material', 'waren', 'wareneinkauf', 'rohstoff', 'hilfsstoff', 'betriebsstoff', 'handelswaren', 'roh-', 'hilfs-', 'betriebsstoffe'],
      accountRanges: [
        { start: 5000, end: 5199 }, // Roh-, Hilfs- und Betriebsstoffe
        { start: 5200, end: 5499 }, // Wareneinkauf alle Steuersätze
        { start: 5500, end: 5799 }  // Steuerfreie Einkäufe und Bestandsveränderungen
      ],
      priority: 9
    },

    // BETRIEBSBEDARF (Verbrauchsmaterial, Büromaterial, laufende Betriebskosten)
    {
      id: 'betriebsbedarf',
      keywords: ['betriebsbedarf', 'verbrauchsmaterial', 'büromaterial', 'bürobedarf', 'schreibwaren', 'papier', 'druckerpatronen', 'toner', 'kleinteile', 'verbrauchsgüter'],
      accountRanges: [
        { start: 6000, end: 6199 }  // Sonstige betriebliche Aufwendungen, Verbrauchsmaterial
      ],
      priority: 5
    },

    // RAUMKOSTEN (Miete, Nebenkosten, Gebäude) - SAUBERE TRENNUNG
    {
      id: 'raumkosten',
      keywords: ['miete', 'nebenkosten', 'heizung', 'strom', 'wasser', 'reinigung', 'hausmeister', 'gebäude', 'raum', 'büro', 'gewerbe', 'garagenmieten'],
      accountRanges: [
        { start: 6250, end: 6299 }  // Zweite Hälfte - sauber getrennt von dienstleistung
      ],
      priority: 18  // Erhöhte Priorität
    },

    // FAHRZEUGKOSTEN (Klasse 6300-6399) - EXKLUSIVER BEREICH (ohne Versicherung!)
    {
      id: 'fahrzeug',
      keywords: ['fahrzeug', 'kfz', 'kraftstoff', 'treibstoff', 'reparatur', 'kraftfahrzeug', 'leasing', 'benzin', 'diesel', 'betriebskosten'],
      accountRanges: [
        { start: 6300, end: 6399 }  // Exklusiver Fahrzeugbereich (6400+ ist versicherungen!)
      ],
      priority: 18  // Hohe Priorität (aber niedriger als versicherungen)
    },

        // DIENSTLEISTUNG UND BERATUNG (Erweitert um externe Dienstleistungen)
    {
      id: 'dienstleistung',
      keywords: ['beratung', 'dienstleistung', 'service', 'consulting', 'rechtsanwalt', 'notar', 'steuerberater', 'wirtschaftsprüfer', 'gutachten', 'externe', 'freelancer', 'agentur', 'fremdleistung', 'fremdleistungen', 'subunternehmer'],
      accountRanges: [
        { start: 5900, end: 5905 }, // Externe Dienstleistungen (nur allgemeine, nicht steuerliche)
        { start: 5906, end: 5908 }, // Fremdleistungen (trotz Vorsteuer = Dienstleistungen!)
        { start: 6200, end: 6249 }  // Nur erste Hälfte - Rest für raumkosten/fahrzeug
      ],
      priority: 17  // Hohe Priorität
    },

    // BÜRO UND VERWALTUNG (Erweitert um 6800er Bereich ohne Zinsen) - MUSS VOR BANKEN-FINANZEN STEHEN!
    {
      id: 'buro',
      keywords: ['büro', 'verwaltung', 'büromaterial', 'schreibwaren', 'telefon', 'telefax', 'internet', 'kommunikation', 'porto', 'versand', 'fachliteratur', 'fortbildung', 'zeitschriften', 'bücher', 'rechts-', 'beratung', 'abschluss-', 'prüfung', 'buchführung'],
      accountRanges: [
        { start: 6800, end: 6855 }, // Büro-/Verwaltungskosten (ohne Zinsen 6856, 6880)
        { start: 6857, end: 6879 }, // Weitere Verwaltungskosten (ohne Zins 6880)
        { start: 6881, end: 6999 }  // Restliche Büro- und Verwaltungskosten
      ],
      priority: 16  // HÖCHSTE Priorität für Bürokosten!
    },

    // VERSICHERUNGEN UND BEITRÄGE (Klasse 6400-6499) - HOHE PRIORITÄT!
    {
      id: 'versicherungen',
      keywords: ['versicherung', 'betriebsversicherung', 'haftpflicht', 'feuer', 'beitrag', 'mitgliedsbeitrag', 'verband', 'gebühr', 'behörde', 'genehmigung'],
      accountRanges: [
        { start: 6400, end: 6499 }  // Versicherungen und Beiträge - EXKLUSIVER Bereich!
      ],
      priority: 19  // SEHR HOHE Priorität um fahrzeug zu überschreiben!
    },

    // WERBUNG UND MARKETING (Klasse 6600-6699)
    {
      id: 'werbung',
      keywords: ['werbung', 'marketing', 'werbekosten', 'messe', 'ausstellung', 'geschenk', 'aufmerksamkeit', 'bewirtung', 'geschäftsessen', 'repräsentation'],
      accountRanges: [
        { start: 6600, end: 6699 }  // Werbung und Repräsentation
      ],
      priority: 8
    },

    // SPENDEN (Klasse 6700-6799)
    {
      id: 'spenden',
      keywords: ['spende', 'spenden', 'gemeinnützig', 'steuerlich begünstigt', '4‰'],
      accountRanges: [
        { start: 6700, end: 6799 }  // Spenden
      ],
      priority: 10 // Hohe Priorität für eindeutige Zuordnung
    },

    // ABSCHREIBUNGEN (Klasse 7100-7499 - NUR Abschreibungen!)
    {
      id: 'abschreibungen',
      keywords: ['abschreibung', 'afa', 'wertberichtigung', 'nutzungsdauer', 'restwert'],
      accountRanges: [
        { start: 7100, end: 7499 }  // NUR Abschreibungen (ohne Steuern 7000-7099)
      ],
      priority: 10
    },

    // MASCHINEN UND ANLAGEN (Anlagevermögen Klasse 0-999 ohne Abschreibungen)
    {
      id: 'maschine-gebaude', 
      keywords: ['anlagevermögen', 'maschine', 'anlage', 'gebäude', 'grundstück', 'immobilie'],
      accountRanges: [
        { start: 100, end: 499 }    // Anlagevermögen (ohne Geschäftsausstattung 500-690)
      ],
      priority: 9
    },

    // BEZUGSNEBENKOSTEN (Klasse 5800-5899, ohne 5900+ Dienstleistungen)
    {
      id: 'bezugsnebenkosten',
      keywords: ['bezugsnebenkosten', 'fracht', 'transport', 'zoll', 'einfuhr', 'provision', 'courtage'],
      accountRanges: [
        { start: 5800, end: 5899 }  // Bezugsnebenkosten (aber 5900+ gehen zu Dienstleistung)
      ],
      priority: 8
    },

    // SONSTIGES - Neutrale/außerordentliche Konten (ohne Steuern) - HOHE PRIORITÄT!
    {
      id: 'sonstiges',
      keywords: ['sonstige', 'diverse', 'verschiedene', 'andere', 'neutrale', 'außerordentliche', 'periodenfremde', 'verluste', 'verschmelzung'],
      accountRanges: [
        { start: 7500, end: 7599 }, // Außerordentliche Aufwendungen (ohne Steuern 7600-7699)
        { start: 7700, end: 7999 }, // Weitere außerordentliche (ohne Steuern)
        { start: 8000, end: 8599 }, // Neutrale Erträge und Aufwendungen
        { start: 9000, end: 9999 }  // Saldenvorträge und sonstige
      ],
      priority: 17 // SEHR HOHE Priorität um sicherzustellen dass sonstige Konten hier landen!
    }
  ];

  /**
   * Ordnet eine DATEV-Karte basierend auf Kontonummer und Keywords einer Expense-Kategorie zu
   */
  static mapDatevCardToExpenseCategory(card: DatevCard): string | null {
    const accountNumber = parseInt(card.code);
    const cardName = card.name.toLowerCase();
    const cardDescription = card.description.toLowerCase();
    
    // Sammle alle passenden Mappings mit Priorität
    const matchedMappings: Array<{ mapping: CategoryMapping; matchType: 'range' | 'keyword'; priority: number }> = [];
    
    // 1. Prüfe zuerst Kontonummer-Bereiche (höhere Priorität)
    for (const mapping of this.expenseCategoryMappings) {
      for (const range of mapping.accountRanges) {
        if (accountNumber >= range.start && accountNumber <= range.end) {
          matchedMappings.push({
            mapping,
            matchType: 'range',
            priority: (mapping.priority || 5) + 3 // Bereichs-Matches haben höhere Priorität
          });
        }
      }
    }
    
    // 2. Prüfe dann Keywords in Name und Beschreibung
    for (const mapping of this.expenseCategoryMappings) {
      for (const keyword of mapping.keywords) {
        if (cardName.includes(keyword) || cardDescription.includes(keyword)) {
          matchedMappings.push({
            mapping,
            matchType: 'keyword',
            priority: mapping.priority || 5
          });
        }
      }
    }
    
    // 3. Wähle das Mapping mit der höchsten Priorität
    if (matchedMappings.length > 0) {
      const bestMatch = matchedMappings.reduce((best, current) => 
        current.priority > best.priority ? current : best
      );
      return bestMatch.mapping.id;
    }
    
    // KEIN FALLBACK - null zeigt fehlende Kategorisierung an
    return null;
  }

  /**
   * Prüft ob ein Konto steuerrelevant ist
   */
  static isTaxRelatedAccount(card: DatevCard): boolean {
    const accountNumber = parseInt(card.code);
    const cardName = card.name.toLowerCase();
    const cardDescription = card.description.toLowerCase();
    
    // Erweiterte Steuer-Kontonummern-Bereiche nach DATEV-Standard
    const taxRanges = [
      { start: 3500, end: 3599 }, // Steuerverbindlichkeiten
      { start: 3800, end: 3999 }, // Umsatzsteuer- und Vorsteuerkonten
      { start: 7000, end: 7099 }, // Betriebssteuern
      { start: 8500, end: 8599 }  // Steuern vom Einkommen und Ertrag
    ];
    
    // Prüfe Kontonummer
    for (const range of taxRanges) {
      if (accountNumber >= range.start && accountNumber <= range.end) {
        return true;
      }
    }
    
    // Erweiterte Steuer-Keywords (aber AUSNAHMEN für Fremdleistungen!)
    const taxKeywords = [
      'steuer', 'umsatzsteuer', 'vorsteuer', 'gewerbesteuer', 
      'körperschaftsteuer', 'einkommensteuer', 'kfz-steuer',
      'grundsteuer', 'nicht abzugsfähig', 'steuerverbindlichkeit',
      'vorauszahlung', 'erstattung'
    ];
    
    // AUSNAHME: Fremdleistungen sind DIENSTLEISTUNGEN, nicht Steuern!
    if (cardName.includes('fremdleistung') || cardName.includes('fremdleistungen')) {
      return false; // Fremdleistungen gehören zu Dienstleistungen!
    }
    
    return taxKeywords.some(keyword => 
      cardName.includes(keyword) || cardDescription.includes(keyword)
    );
  }

  /**
   * Prüft ob ein Konto ein Einnahmekonto ist
   */
  static isIncomeAccount(card: DatevCard): boolean {
    return card.type === 'INCOME';
  }

  /**
   * Gibt die verfügbaren Expense-Kategorien zurück
   */
  static getAvailableExpenseCategories(): string[] {
    return this.expenseCategoryMappings.map(mapping => mapping.id);
  }

  /**
   * Prüft ob ein Konto Anlagevermögen ist
   */
  static isAssetAccount(card: DatevCard): boolean {
    const accountNumber = parseInt(card.code);
    return card.type === 'ASSET' || (accountNumber >= 100 && accountNumber <= 1799);
  }

  /**
   * Prüft ob ein Konto eine Verbindlichkeit ist  
   */
  static isLiabilityAccount(card: DatevCard): boolean {
    const accountNumber = parseInt(card.code);
    return card.type === 'LIABILITY' || (accountNumber >= 2000 && accountNumber <= 3999);
  }

  /**
   * Ermittelt die deutsche Steuerklassifikation eines Kontos
   */
  static getTaxClassification(card: DatevCard): 'regelsteuersatz' | 'ermäßigt' | 'steuerfrei' | 'kleinunternehmer' | 'neutral' {
    const cardName = card.name.toLowerCase();
    const cardDescription = card.description.toLowerCase();
    
    if (cardName.includes('19%') || cardDescription.includes('regelsteuersatz')) {
      return 'regelsteuersatz';
    }
    
    if (cardName.includes('7%') || cardDescription.includes('ermäßigt')) {
      return 'ermäßigt';  
    }
    
    if (cardName.includes('steuerfrei') || cardDescription.includes('steuerfreie')) {
      return 'steuerfrei';
    }
    
    if (cardName.includes('kleinunternehmer') || cardDescription.includes('§19 ustg')) {
      return 'kleinunternehmer';
    }
    
    return 'neutral';
  }

  /**
   * Mappt eine Kategorie-Beschreibung zu einer DATEV-Kategorie-ID
   * Verwendung für OCR-Parsing und externe Kategoriezuordnung
   */
  static mapToCategory(categoryDescription: string): string {
    const normalizedDesc = categoryDescription.toLowerCase().replace(/[\/\-\s]/g, '');
    
    // Mapping von Beschreibungen zu Kategorie-IDs
    const mappings: Record<string, string> = {
      // Software & IT
      'software': 'software-it',
      'softwarelizenzen': 'software-it', 
      'softwaretools': 'software-it',
      'ithosting': 'software-it',
      'hosting': 'software-it',
      
      // Marketing & Werbung
      'marketing': 'werbung-marketing',
      'werbung': 'werbung-marketing',
      'designmarketing': 'werbung-marketing',
      
      // Kommunikation
      'kommunikation': 'telefon-internet',
      'telekommunikation': 'telefon-internet',
      
      // Reise & Verpflegung
      'reisekosten': 'reisen-verpflegung',
      'reisen': 'reisen-verpflegung',
      
      // Standard-Ausgaben
      'sonstigebetriebsausgaben': 'sonstige-betriebsausgaben',
      'sonstiges': 'sonstige-betriebsausgaben',
      'buero': 'buero-verwaltung',
      'bueromaterial': 'buero-verwaltung'
    };
    
    // Direkte Zuordnung versuchen
    for (const [key, value] of Object.entries(mappings)) {
      if (normalizedDesc.includes(key)) {
        return value;
      }
    }
    
    // Fallback zu Standard-Kategorie
    return 'sonstige-betriebsausgaben';
  }

  /**
   * Debug-Funktion: Findet alle nicht kategorisierten DATEV-Konten
   */
  static findUncategorizedAccounts(): DatevCard[] {
    const allCards = DatevCardService.getAllCards();
    
    return allCards.filter(card => {
      const category = this.mapDatevCardToExpenseCategory(card);
      return category === null;
    });
  }

  /**
   * Debug-Funktion: Analysiert Kategorisierungs-Verteilung
   */
  static analyzeCategoryDistribution(): Record<string, number> {
    const allCards = DatevCardService.getAllCards();
    const distribution: Record<string, number> = {};
    
    allCards.forEach(card => {
      const category = this.mapDatevCardToExpenseCategory(card) || 'NICHT_KATEGORISIERT';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    
    return distribution;
  }
}