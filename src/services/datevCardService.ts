import COMPLETE_DATEV_ACCOUNTS from '@/data/complete-datev-accounts';

export interface DatevCard {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY';
  iconName: string;
  category: string;
}

export class DatevCardService {
  /**
   * Gibt einen benutzerfreundlichen Namen ohne Kontonummer zurück
   */
  static getDisplayName(card: DatevCard): string {
    // Entferne die Kontonummer am Anfang (z.B. "6770 - ")
    let cleanName = card.name.replace(/^\d+\s*-\s*/, '').trim();
    
    // Bereinige redundante Begriffe
    cleanName = cleanName
      .replace(/\s+/g, ' ') // Mehrfache Leerzeichen
      .replace(/^(Aufwendungen für|Erträge aus|Kosten für)\s+/i, '') // Redundante Präfixe
      .trim();
    
    // Spezielle Behandlung für häufige generische Namen
    if (cleanName.includes('Umsatzerlöse') || 
        cleanName.includes('Aufwendungen') ||
        cleanName.length < 5) {
      
      // Verwende die erste Zeile der Beschreibung für bessere Lesbarkeit
      const firstLine = card.description.split('.')[0].trim();
      if (firstLine.length > 10 && firstLine.length < 80) {
        return firstLine;
      }
      
      return cleanName || card.description;
    }
    
    return cleanName;
  }

  private static getIconForAccount(number: string, type: string): string {
    const num = parseInt(number);
    
    // Icon-Mapping basierend auf Kontonummer und Typ
    if (type === 'INCOME') {
      return 'TrendingUp';
    }
    
    if (type === 'EXPENSE') {
      if (num >= 4000 && num < 5000) return 'Package';
      if (num >= 5000 && num < 6000) return 'Users';
      if (num >= 6000 && num < 6200) return 'Briefcase';
      if (num >= 6200 && num < 6400) return 'Car';
      if (num >= 6400 && num < 6600) return 'Home';
      if (num >= 6600 && num < 6800) return 'FileText';
      if (num >= 6800 && num < 7000) return 'Calculator';
      return 'TrendingDown';
    }
    
    if (type === 'ASSET') {
      return 'Building2';
    }
    
    if (type === 'LIABILITY') {
      return 'CreditCard';
    }
    
    return 'Banknote';
  }

  private static getCategoryForAccount(number: string, type: string): string {
    const num = parseInt(number);
    
    switch (type) {
      case 'INCOME':
        return 'Erlöse & Erträge';
      case 'EXPENSE':
        if (num >= 4000 && num < 4900) return 'Personalkosten';
        if (num >= 5000 && num < 5500) return 'Material & Waren';
        if (num >= 5500 && num < 5900) return 'Sonstige Betriebsausgaben';
        if (num >= 5900 && num < 6000) return 'Dienstleistung & Beratung';
        if (num >= 6000 && num < 6200) return 'Büro & Verwaltung';
        if (num >= 6200 && num < 6300) return 'Raumkosten';
        if (num >= 6300 && num < 6400) return 'Fahrzeugkosten';
        if (num >= 6400 && num < 6500) return 'Versicherungen & Beiträge';
        if (num >= 6500 && num < 6600) return 'Dienstleistung & Beratung';
        if (num >= 6600 && num < 6700) return 'Werbung & Marketing';
        if (num >= 6700 && num < 6800) return 'Spenden';
        if (num >= 6800 && num < 6900) return 'Zinsen';
        if (num >= 7000) return 'Steuern & Abgaben';
        return 'Betriebsausgaben';
      case 'ASSET':
        if (num < 500) return 'Anlagevermögen';
        if (num < 1500) return 'Umlaufvermögen';
        return 'Aktiva';
      case 'LIABILITY':
        if (num >= 2000 && num < 3000) return 'Eigenkapital';
        if (num >= 3000 && num < 4000) return 'Verbindlichkeiten';
        return 'Passiva';
      default:
        return 'Sonstige';
    }
  }

  private static getDescriptionForAccount(number: string, name: string, type: string): string {
    const num = parseInt(number);
    const lowerName = name.toLowerCase();
    
    // DETAILLIERTE BESCHREIBUNGEN NACH DATEV-KONTENRAHMEN
    // Basierend auf SKR03/SKR04 Standardkontenrahmen
    
    // === ANLAGEVERMÖGEN (Klasse 0) ===
    if (num >= 100 && num <= 149) return 'Immaterielle Vermögensgegenstände (Software, Lizenzen, Patente)';
    if (num >= 200 && num <= 299) return 'Grundstücke und grundstücksgleiche Rechte';
    if (num >= 300 && num <= 399) return 'Bauten auf fremdem Grund und Wohngebäude';
    if (num >= 400 && num <= 499) return 'Technische Anlagen und Maschinen';
    if (num >= 500 && num <= 559) return 'Betriebs- und Geschäftsausstattung';
    if (num >= 560 && num <= 599) return 'Fahrzeuge und Transportmittel';
    if (num >= 600 && num <= 699) return 'Büroeinrichtung und geringwertige Wirtschaftsgüter';
    
    // === FINANZANLAGEN UND UMLAUFVERMÖGEN (Klasse 1) ===
    if (num >= 1000 && num <= 1199) return 'Vorräte (Roh-, Hilfs- und Betriebsstoffe, Waren)';
    if (num >= 1200 && num <= 1299) return 'Fertige und unfertige Erzeugnisse';
    if (num >= 1300 && num <= 1399) return 'Kautionen, Anzahlungen und Forderungen';
    if (num >= 1400 && num <= 1499) return 'Forderungen aus Lieferungen und Leistungen';
    if (num >= 1500 && num <= 1599) return 'Sonstige Vermögensgegenstände und Forderungen';
    if (num >= 1600 && num <= 1799) return 'Bank-, Kassen- und Scheckkonto';
    
    // === EIGENKAPITAL (Klasse 2) ===
    if (num >= 2000 && num <= 2099) return 'Eigenkapital und Kapitalrücklagen';
    if (num >= 2100 && num <= 2199) return 'Privatentnahmen (nur bei Einzelunternehmen)';
    if (num >= 2200 && num <= 2299) return 'Sonderausgaben und außergewöhnliche Belastungen';
    if (num >= 2300 && num <= 2499) return 'Rückstellungen für Steuern, Pensionen und sonstige';
    if (num >= 2900 && num <= 2999) return 'Gezeichnetes Kapital und Gesellschafterkonten';
    
    // === VERBINDLICHKEITEN (Klasse 3) ===
    if (num >= 3000 && num <= 3199) return 'Darlehen und langfristige Verbindlichkeiten';
    if (num >= 3200 && num <= 3299) return 'Erhaltene Anzahlungen von Kunden';
    if (num >= 3300 && num <= 3399) return 'Verbindlichkeiten aus Lieferungen und Leistungen';
    if (num >= 3400 && num <= 3499) return 'Verbindlichkeiten gegenüber Gesellschaftern';
    if (num >= 3500 && num <= 3599) return 'Steuerverbindlichkeiten (Lohn-, Umsatz-, Körperschaftsteuer)';
    if (num >= 3600 && num <= 3699) return 'Sozialversicherungsverbindlichkeiten';
    if (num >= 3700 && num <= 3799) return 'Sonstige Verbindlichkeiten und Rückstellungen';
    if (num >= 3800 && num <= 3999) {
      if (lowerName.includes('umsatzsteuer')) return 'Umsatzsteuerverbindlichkeiten und Vorauszahlungen';
      if (lowerName.includes('vorsteuer')) return 'Vorsteueransprüche und Erstattungen';
      return 'Steuer- und Vorsteuerkonten';
    }
    
    // === UMSATZERLÖSE (Klasse 4) ===
    if (num >= 4000 && num < 5000) {
      if (lowerName.includes('steuerfrei') || lowerName.includes('export')) return 'Steuerfreie Umsätze (Export, innergemeinschaftliche Lieferungen)';
      if (lowerName.includes('7%') || lowerName.includes('ermäßigt')) return 'Umsätze mit ermäßigtem Steuersatz (7%)';
      if (lowerName.includes('19%')) return 'Umsätze mit Regelsteuersatz (19%)';
      if (lowerName.includes('kleinunternehmer')) return 'Umsätze Kleinunternehmer (§19 UStG ohne Steuer)';
      return 'Umsatzerlöse aus dem Verkauf von Waren und Dienstleistungen';
    }
    
    // === AUFWENDUNGEN FÜR ROH-, HILFS- UND BETRIEBSSTOFFE (Klasse 5) ===
    if (num >= 5000 && num <= 5099) return 'Aufwendungen für Roh-, Hilfs- und Betriebsstoffe';
    if (num >= 5100 && num <= 5199) return 'Wareneinkauf ohne Vorsteuer';
    if (num >= 5200 && num <= 5299) return 'Wareneinkauf mit verschiedenen Steuersätzen';
    if (num >= 5300 && num <= 5399) {
      if (lowerName.includes('7%')) return 'Wareneinkauf mit 7% Vorsteuer (ermäßigter Steuersatz)';
      return 'Wareneinkauf mit ermäßigtem Steuersatz';
    }
    if (num >= 5400 && num <= 5499) {
      if (lowerName.includes('19%')) return 'Wareneinkauf mit 19% Vorsteuer (Regelsteuersatz)';
      return 'Wareneinkauf mit Regelsteuersatz';
    }
    if (num >= 5500 && num <= 5599) {
      if (lowerName.includes('steuerfrei')) return 'Steuerfreie Einkäufe (innergemeinschaftlicher Erwerb)';
      return 'Nicht abziehbare Vorsteuer und steuerfreie Einkäufe';
    }
    if (num >= 5600 && num <= 5799) return 'Bestandsveränderungen, Nachlässe und Boni';
    if (num >= 5800 && num <= 5899) return 'Bezugsnebenkosten (Fracht, Zoll, Versicherung, Provision)';
    if (num >= 5900 && num <= 5999) return 'Fremdleistungen und Subunternehmerkosten';
    
    // === PERSONALKOSTEN (Klasse 6000-6199) ===
    if (num >= 6000 && num <= 6099) {
      if (lowerName.includes('geschäftsführer')) return 'Geschäftsführergehälter und -bezüge';
      if (lowerName.includes('lohn')) return 'Löhne für gewerbliche Arbeitnehmer';
      if (lowerName.includes('gehalt')) return 'Gehälter für Angestellte';
      return 'Löhne und Gehälter';
    }
    if (num >= 6100 && num <= 6199) {
      if (lowerName.includes('sozialversicherung')) return 'Arbeitgeberanteil Sozialversicherung';
      if (lowerName.includes('berufsgenossenschaft')) return 'Beiträge zur Berufsgenossenschaft';
      if (lowerName.includes('umlage')) return 'Umlage U1/U2 (Krankheit/Mutterschaft)';
      return 'Gesetzliche Sozialaufwendungen';
    }
    
    // === RAUMKOSTEN (Klasse 6200-6299) ===
    if (num >= 6200 && num <= 6299) {
      if (lowerName.includes('miete')) return 'Miete für Geschäftsräume und Betriebsgelände';
      if (lowerName.includes('pacht')) return 'Pachtaufwendungen für Grundstücke und Räume';
      if (lowerName.includes('nebenkosten')) return 'Nebenkosten (Strom, Heizung, Wasser, Müll)';
      if (lowerName.includes('reinigung')) return 'Reinigungskosten für Geschäftsräume';
      return 'Raumkosten und Betriebskosten für Geschäftsräume';
    }
    
    // === FAHRZEUGKOSTEN (Klasse 6300-6399) ===
    if (num >= 6300 && num <= 6399) {
      if (lowerName.includes('kraftstoff')) return 'Kraftstoff- und Treibstoffkosten';
      if (lowerName.includes('reparatur')) return 'Fahrzeugreparaturen und Instandhaltung';
      if (lowerName.includes('versicherung')) return 'KFZ-Versicherung und Haftpflicht';
      if (lowerName.includes('steuer')) return 'Kraftfahrzeugsteuer';
      if (lowerName.includes('leasing')) return 'Fahrzeugleasing und Mietkosten';
      if (lowerName.includes('reise')) return 'Reisekosten und Übernachtungen';
      return 'Fahrzeugkosten und Reiseaufwendungen';
    }
    
    // === VERSCHIEDENE BETRIEBLICHE AUFWENDUNGEN (Klasse 6400-6599) ===
    if (num >= 6400 && num <= 6499) {
      if (lowerName.includes('versicherung')) return 'Betriebsversicherungen (Haftpflicht, Feuer, etc.)';
      if (lowerName.includes('beitrag')) return 'Mitgliedsbeiträge und Verbandsbeiträge';
      if (lowerName.includes('gebühr')) return 'Behördengebühren und Genehmigungen';
      return 'Versicherungen, Beiträge und Gebühren';
    }
    if (num >= 6500 && num <= 6599) {
      if (lowerName.includes('steuerberater')) return 'Steuerberatungskosten und Jahresabschluss';
      if (lowerName.includes('rechtsanwalt')) return 'Rechtsberatung und Anwaltskosten';
      if (lowerName.includes('wirtschaftsprüfer')) return 'Wirtschaftsprüfung und Prüfungskosten';
      if (lowerName.includes('notar')) return 'Notarkosten und Beurkundungen';
      if (lowerName.includes('beratung')) return 'Unternehmensberatung und Consulting';
      return 'Fremdleistungen, Beratung und rechtliche Kosten';
    }
    
    // === WERBUNG UND REISEKOSTEN (Klasse 6600-6699) ===
    if (num >= 6600 && num <= 6699) {
      if (lowerName.includes('werbung')) return 'Werbekosten und Marketingaufwendungen';
      if (lowerName.includes('messe')) return 'Messe- und Ausstellungskosten';
      if (lowerName.includes('geschenk')) return 'Geschenke und Aufmerksamkeiten';
      if (lowerName.includes('bewirtung')) return 'Bewirtungskosten und Geschäftsessen';
      return 'Werbung, Repräsentation und Marketing';
    }
    
    // === SONSTIGE BETRIEBLICHE AUFWENDUNGEN (Klasse 6700-6999) ===
    if (num >= 6700 && num <= 6799) {
      if (lowerName.includes('spende')) return 'Spenden (steuerlich begünstigt bis 4‰ des Umsatzes)';
      return 'Spenden und gemeinnützige Aufwendungen';
    }
    if (num >= 6800 && num <= 6899) {
      if (lowerName.includes('zins')) return 'Kreditzinsen und Finanzierungskosten';
      if (lowerName.includes('diskont')) return 'Diskontaufwendungen und Wechselkosten';
      if (lowerName.includes('bank')) return 'Bankgebühren und Kontoführung';
      return 'Zinsen und ähnliche Aufwendungen';
    }
    if (num >= 6900 && num <= 6999) {
      if (lowerName.includes('bürobedarf')) return 'Büromaterial, Druckkosten und Schreibwaren';
      if (lowerName.includes('telefon')) return 'Telefon- und Internetkosten';
      if (lowerName.includes('porto')) return 'Porto- und Versandkosten';
      if (lowerName.includes('zeitschrift')) return 'Fachliteratur und Zeitschriften';
      if (lowerName.includes('fortbildung')) return 'Fortbildungskosten und Schulungen';
      return 'Bürokosten und Verwaltungsaufwendungen';
    }
    
    // === STEUERN UND ABSCHREIBUNGEN (Klasse 7000+) ===
    if (num >= 7000 && num <= 7099) {
      if (lowerName.includes('gewerbesteuer')) return 'Gewerbesteuer (nicht abzugsfähig)';
      if (lowerName.includes('grundsteuer')) return 'Grundsteuer für betrieblich genutzte Grundstücke';
      if (lowerName.includes('kfz-steuer')) return 'Kraftfahrzeugsteuer für Firmenfahrzeuge';
      return 'Nicht abzugsfähige Betriebssteuern';
    }
    if (num >= 7100 && num <= 7199) return 'Abschreibungen auf Sachanlagen';
    if (num >= 7200 && num <= 7299) return 'Abschreibungen auf immaterielle Vermögensgegenstände';
    if (num >= 7300 && num <= 7399) return 'Abschreibungen auf Finanzanlagen';
    if (num >= 7400 && num <= 7499) return 'Sonstige Abschreibungen und Wertberichtigungen';
    
    // === NEUTRALE AUFWENDUNGEN UND ERTRÄGE (Klasse 8000+) ===
    if (num >= 8000 && num <= 8099) return 'Zinserträge und Kapitalerträge';
    if (num >= 8100 && num <= 8199) return 'Beteiligungserträge und Gewinnausschüttungen';
    if (num >= 8200 && num <= 8299) return 'Außerordentliche Erträge';
    if (num >= 8400 && num <= 8499) return 'Außerordentliche Aufwendungen';
    if (num >= 8500 && num <= 8599) return 'Steuern vom Einkommen und Ertrag';
    
    // === FALLBACK NACH KONTENKLASSE ===
    if (type === 'ASSET') {
      if (num < 1000) return 'Anlagevermögen (Grundstücke, Gebäude, Maschinen, Ausstattung)';
      if (num < 2000) return 'Umlaufvermögen (Vorräte, Forderungen, Bank, Kasse)';
      return 'Vermögensgegenstände';
    }
    
    if (type === 'LIABILITY') {
      if (num >= 2000 && num < 3000) return 'Eigenkapital, Rücklagen und Privatkonten';
      if (num >= 3000 && num < 4000) return 'Verbindlichkeiten und Rückstellungen';
      return 'Kapital und Schulden';
    }
    
    if (type === 'INCOME') {
      return 'Betriebliche Erträge und Umsatzerlöse';
    }
    
    if (type === 'EXPENSE') {
      if (num >= 5000 && num < 6000) return 'Material- und Wareneinkauf';
      if (num >= 6000 && num < 7000) return 'Betriebskosten und Aufwendungen';
      if (num >= 7000) return 'Steuern, Abschreibungen und neutrale Aufwendungen';
      return 'Betriebliche Aufwendungen';
    }
    
    // Letzter Fallback
    const category = this.getCategoryForAccount(number, type);
    return `${category} • Deutsches DATEV-Buchungskonto`;
  }

  static getAllCards(): DatevCard[] {
    return COMPLETE_DATEV_ACCOUNTS.map(account => ({
      id: `datev-${account.number}`,
      name: `${account.number} - ${account.name}`,
      code: account.number,
      description: this.getDescriptionForAccount(account.number, account.name, account.type),
      type: account.type as 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY',
      iconName: this.getIconForAccount(account.number, account.type),
      category: this.getCategoryForAccount(account.number, account.type)
    }));
  }

  static getCardsByType(type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'): DatevCard[] {
    return this.getAllCards().filter(card => card.type === type);
  }

  static searchCards(query: string): DatevCard[] {
    if (!query.trim()) return this.getAllCards();
    
    const searchTerm = query.toLowerCase().trim();
    return this.getAllCards().filter(card => 
      card.name.toLowerCase().includes(searchTerm) ||
      card.code.toLowerCase().includes(searchTerm) ||
      card.description.toLowerCase().includes(searchTerm) ||
      card.category.toLowerCase().includes(searchTerm)
    );
  }

  static getCardsByCategory(category: string): DatevCard[] {
    return this.getAllCards().filter(card => card.category === category);
  }

  static getUniqueCategories(): string[] {
    const categories = this.getAllCards().map(card => card.category);
    return [...new Set(categories)].sort();
  }

  static getCardById(id: string): DatevCard | undefined {
    return this.getAllCards().find(card => card.id === id);
  }

  static getTypeLabel(type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'): string {
    const labels = {
      'INCOME': 'Einnahme',
      'EXPENSE': 'Ausgabe',
      'ASSET': 'Aktiva', 
      'LIABILITY': 'Passiva'
    };
    return labels[type];
  }

  static getTypeBadgeColor(type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'): string {
    const colors = {
      'INCOME': 'bg-green-100 text-green-800',
      'EXPENSE': 'bg-red-100 text-red-800',
      'ASSET': 'bg-blue-100 text-blue-800',
      'LIABILITY': 'bg-purple-100 text-purple-800'
    };
    return colors[type];
  }
}