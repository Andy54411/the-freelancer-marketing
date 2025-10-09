/**
 * Gemini AI-powered Receipt Categorization Service
 * Intelligent DATEV category suggestions based on OCR data
 */

interface ReceiptData {
  vendor?: string;
  description?: string;
  title?: string;
  amount?: number;
  invoiceNumber?: string;
  date?: string;
}

interface CategorySuggestion {
  categoryCode: string;
  categoryName: string;
  confidence: number; // 0-100
  reasoning: string;
  modelUsed?: string;
  success?: boolean;
  error?: string;
}

export class GeminiReceiptCategorizationService {
  /**
   * Get intelligent DATEV category suggestion using Gemini AI
   */
  static async suggestCategory(receiptData: ReceiptData): Promise<CategorySuggestion> {
    try {






      const response = await fetch('/api/gemini/categorize-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(receiptData)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {

        return {
          categoryCode: result.categoryCode,
          categoryName: result.categoryName,
          confidence: result.confidence,
          reasoning: result.reasoning,
          modelUsed: result.modelUsed,
          success: true
        };
      } else {
        throw new Error(result.error || 'Unknown API error');
      }
    } catch (error) {
      console.error('❌ Gemini categorization failed:', error);

      // Fallback to simple categorization
      const fallback = this.getFallbackCategory(receiptData);
      return {
        ...fallback,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Simple fallback categorization without AI
   */
  private static getFallbackCategory(receiptData: ReceiptData): CategorySuggestion {
    const text = [
    receiptData.vendor?.toLowerCase() || '',
    receiptData.description?.toLowerCase() || '',
    receiptData.title?.toLowerCase() || ''].
    join(' ');

    // Enhanced keyword mappings with all DATEV categories
    const categoryMappings = this.getAllDatevExpenseCategories().map((category) => ({
      keywords: category.keywords,
      code: category.code,
      name: category.name,
      reasoning: `${category.name} erkannt`
    }));

    // Find best match
    for (const mapping of categoryMappings) {
      const matchCount = mapping.keywords.filter((keyword) => text.includes(keyword)).length;
      if (matchCount > 0) {
        return {
          categoryCode: mapping.code,
          categoryName: mapping.name,
          confidence: Math.min(80, 40 + matchCount * 20), // 40-80% confidence
          reasoning: mapping.reasoning,
          modelUsed: 'fallback'
        };
      }
    }

    // Ultimate fallback
    return {
      categoryCode: '6850',
      categoryName: 'Sonstiger Betriebsbedarf',
      confidence: 30,
      reasoning: 'Keine spezifische Kategorie erkannt',
      modelUsed: 'fallback'
    };
  }

  /**
   * Enhanced categorization with multiple AI attempts
   */
  static async suggestCategoryWithRetry(
  receiptData: ReceiptData,
  maxRetries: number = 2)
  : Promise<CategorySuggestion> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {

        const result = await this.suggestCategory(receiptData);

        if (result.success && result.confidence > 60) {
          return result;
        }

        if (attempt === maxRetries) {
          return result; // Return last result even if low confidence
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`❌ Attempt ${attempt} failed:`, lastError.message);

        if (attempt === maxRetries) {
          return this.getFallbackCategory(receiptData);
        }
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }

    return this.getFallbackCategory(receiptData);
  }

  /**
   * Alle verfügbaren DATEV-Kategorien für Expense-Konten
   */
  private static getAllDatevExpenseCategories(): Array<{
    code: string;
    name: string;
    keywords: string[];
  }> {
    return [
    // IT & Software
    {
      code: '135',
      name: 'EDV-Software',
      keywords: ['software', 'edv', 'app', 'programm', 'lizenz', 'subscription', 'saas']
    },
    {
      code: '144',
      name: 'EDV Software',
      keywords: ['software', 'edv', 'microsoft', 'adobe', 'google', 'cloud']
    },
    {
      code: '6805',
      name: 'Software und EDV',
      keywords: ['software', 'edv', 'it', 'computer', 'digitalisierung']
    },
    {
      code: '6815',
      name: 'Geringwertige Wirtschaftsgüter bis 800€',
      keywords: ['gering', 'wirtschaftsgut', 'gwg', 'hardware', 'elektronik']
    },

    // Büro & Verwaltung
    {
      code: '6640',
      name: 'Bürobedarf',
      keywords: ['büro', 'papier', 'stift', 'ordner', 'schreibware', 'office']
    },
    {
      code: '6645',
      name: 'Telefon/Internet/Kommunikation',
      keywords: [
      'telefon',
      'internet',
      'telekom',
      'vodafone',
      'handy',
      'mobilfunk',
      'kommunikation']

    },
    {
      code: '6650',
      name: 'Porto und Versandkosten',
      keywords: ['porto', 'versand', 'paket', 'post', 'dhl', 'ups', 'dpd']
    },

    // Fahrzeugkosten
    {
      code: '6540',
      name: 'Kraftstoffe und Schmiermittel',
      keywords: ['tankstelle', 'benzin', 'diesel', 'shell', 'aral', 'esso', 'bp', 'kraftstoff']
    },
    {
      code: '6520',
      name: 'Kfz-Reparaturen und -Wartung',
      keywords: ['kfz', 'auto', 'reparatur', 'werkstatt', 'wartung', 'inspektion']
    },
    {
      code: '6530',
      name: 'Parkgebühren und Maut',
      keywords: ['parken', 'parkgebühr', 'maut', 'parkplatz', 'parkhaus']
    },

    // Reisen & Bewirtung
    {
      code: '6572',
      name: 'Reisekosten Unternehmer',
      keywords: ['reise', 'hotel', 'flug', 'bahn', 'übernachtung', 'geschäftsreise']
    },
    {
      code: '6574',
      name: 'Bewirtungskosten (70% abzugsfähig)',
      keywords: ['restaurant', 'bewirtung', 'essen', 'gasthaus', 'catering', 'geschäftsessen']
    },

    // Beratung & Dienstleistungen
    {
      code: '5900',
      name: 'Freelancer/Dienstleistungen',
      keywords: [
      'honorar',
      'freelancer',
      'dienstleistung',
      'freelance',
      'externe',
      'subunternehmer']

    },
    {
      code: '6330',
      name: 'Rechts- und Beratungskosten',
      keywords: ['rechtsanwalt', 'anwalt', 'steuerberater', 'notar', 'beratung', 'kanzlei']
    },
    {
      code: '6360',
      name: 'Reinigung und Instandhaltung',
      keywords: ['reinigung', 'putzen', 'instandhaltung', 'wartung', 'reparatur']
    },

    // Marketing & Werbung
    {
      code: '6600',
      name: 'Werbekosten',
      keywords: [
      'werbung',
      'marketing',
      'anzeige',
      'google ads',
      'facebook',
      'instagram',
      'social media']

    },
    {
      code: '6610',
      name: 'Messen und Ausstellungen',
      keywords: ['messe', 'ausstellung', 'exhibition', 'stand', 'präsentation']
    },

    // Betriebsausgaben
    {
      code: '6300',
      name: 'Mieten für Einrichtungen',
      keywords: ['miete', 'mietkosten', 'büroräume', 'gewerbemiete']
    },
    {
      code: '6200',
      name: 'Raumkosten',
      keywords: ['raumkosten', 'nebenkosten', 'strom', 'heizung', 'wasser']
    },
    {
      code: '6850',
      name: 'Sonstiger Betriebsbedarf',
      keywords: ['sonstiges', 'verschiedenes', 'betriebsbedarf']
    },

    // Personalkosten
    {
      code: '6100',
      name: 'Löhne und Gehälter',
      keywords: ['lohn', 'gehalt', 'personal', 'mitarbeiter', 'beschäftigte']
    },
    {
      code: '6210',
      name: 'Gesetzliche Sozialaufwendungen',
      keywords: ['sozialversicherung', 'sozialaufwendungen', 'krankenkasse', 'rentenbeitrag']
    },

    // Versicherungen & Beiträge
    {
      code: '6500',
      name: 'Versicherungen',
      keywords: ['versicherung', 'haftpflicht', 'betriebshaftpflicht', 'rechtsschutz']
    },
    {
      code: '6510',
      name: 'Beiträge',
      keywords: ['beitrag', 'mitgliedsbeitrag', 'verband', 'kammer', 'berufsgenossenschaft']
    },

    // Zinsen & Gebühren
    {
      code: '6760',
      name: 'Zinsaufwendungen',
      keywords: ['zinsen', 'zinsaufwendungen', 'kreditzinsen', 'darlehen']
    },
    {
      code: '6280',
      name: 'Bankgebühren',
      keywords: ['bank', 'gebühren', 'kontoführung', 'überweisungsgebühr', 'banking']
    },

    // Erweiterte Kategorien
    {
      code: '6670',
      name: 'Abschreibungen auf Sachanlagen',
      keywords: ['abschreibung', 'afa', 'anlage', 'investition']
    },
    {
      code: '6680',
      name: 'Sofortabschreibung geringwertiger Wirtschaftsgüter',
      keywords: ['sofortabschreibung', 'gwg', 'gering', 'wirtschaftsgut']
    },
    {
      code: '6720',
      name: 'Buchführungskosten',
      keywords: ['buchführung', 'steuerberatung', 'buchhaltung', 'datev']
    },
    {
      code: '6730',
      name: 'Prüfungskosten',
      keywords: ['prüfung', 'wirtschaftsprüfer', 'audit', 'prüfungskosten']
    },
    {
      code: '6740',
      name: 'Sonstige Beratungskosten',
      keywords: ['beratung', 'consulting', 'beratungskosten', 'berater']
    },
    {
      code: '6750',
      name: 'Fortbildungskosten',
      keywords: ['fortbildung', 'schulung', 'weiterbildung', 'seminar', 'kurs']
    },
    {
      code: '6770',
      name: 'Repräsentationskosten',
      keywords: ['repräsentation', 'geschenke', 'kundengeschenke', 'aufmerksamkeiten']
    },
    {
      code: '6780',
      name: 'Patente, Lizenzen und ähnliche Rechte',
      keywords: ['patent', 'lizenz', 'markenrecht', 'urheberrecht']
    },
    {
      code: '6790',
      name: 'Sonstige Aufwendungen für Fremdleistungen',
      keywords: ['fremdleistung', 'outsourcing', 'externe', 'dienstleister']
    }];

  }

  /**
   * Validate DATEV category code
   */
  static isValidDatevCategory(categoryCode: string): boolean {
    const allCategories = this.getAllDatevExpenseCategories();
    return allCategories.some((cat) => cat.code === categoryCode);
  }

  /**
   * Get confidence level description
   */
  static getConfidenceDescription(confidence: number): string {
    if (confidence >= 90) return 'Sehr sicher';
    if (confidence >= 75) return 'Sicher';
    if (confidence >= 60) return 'Wahrscheinlich';
    if (confidence >= 40) return 'Möglich';
    return 'Unsicher';
  }
}

export default GeminiReceiptCategorizationService;