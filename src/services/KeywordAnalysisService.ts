/**
 * KeywordAnalysisService
 * 
 * Analysiert Profilbeschreibungen auf Keyword-Optimierung nach Fiverr-Vorbild.
 * Gibt Empfehlungen zur Verbesserung der Auffindbarkeit in der Suche.
 */

import { getSkillsForSubcategory } from '@/data/skills';

// Keyword-Typen
export interface KeywordMatch {
  keyword: string;
  found: boolean;
  count: number;
  position: 'title' | 'tags' | 'description' | 'skills';
  importance: 'high' | 'medium' | 'low';
}

// Analyse-Ergebnis
export interface KeywordAnalysisResult {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categoryKeywords: KeywordMatch[];
  subcategoryKeywords: KeywordMatch[];
  skillKeywords: KeywordMatch[];
  customTags: string[];
  suggestions: KeywordSuggestion[];
  competitiveKeywords: string[];
  missingHighPriorityKeywords: string[];
  keywordDensity: number;
  readabilityScore: number;
}

// Keyword-Vorschlag
export interface KeywordSuggestion {
  type: 'add' | 'improve' | 'remove';
  priority: 'high' | 'medium' | 'low';
  keyword?: string;
  message: string;
  impact: string;
}

// Profil-Daten für Analyse
export interface ProfileDataForAnalysis {
  title?: string;
  description: string;
  category: string;
  subcategory: string;
  skills: string[];
  searchTags: string[];
  location?: string;
}

// Kategorie-spezifische Keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'handwerk': [
    'Handwerker', 'Reparatur', 'Montage', 'Installation', 'professionell',
    'Erfahrung', 'zuverlässig', 'Qualität', 'Facharbeit', 'Meister'
  ],
  'haushalt': [
    'Haushalt', 'Reinigung', 'sauber', 'gründlich', 'zuverlässig',
    'pünktlich', 'flexibel', 'Hauswirtschaft', 'ordentlich', 'hygienisch'
  ],
  'transport': [
    'Transport', 'Umzug', 'Lieferung', 'schnell', 'sicher',
    'pünktlich', 'zuverlässig', 'Fahrzeug', 'Führerschein', 'versichert'
  ],
  'it-digital': [
    'IT', 'digital', 'Entwicklung', 'Programmierung', 'Web',
    'App', 'Software', 'Technik', 'modern', 'innovativ'
  ],
  'garten': [
    'Garten', 'Pflege', 'Grünflächen', 'Pflanzen', 'Landschaftsbau',
    'natürlich', 'ökologisch', 'Rasen', 'Bäume', 'Gestaltung'
  ],
  'wellness': [
    'Wellness', 'Entspannung', 'Wohlbefinden', 'Massage', 'Gesundheit',
    'Ruhe', 'Balance', 'ganzheitlich', 'Therapie', 'professionell'
  ],
  'gastronomie': [
    'Koch', 'Küche', 'kulinarisch', 'Speisen', 'Menü',
    'Catering', 'frisch', 'kreativ', 'Geschmack', 'Qualität'
  ],
  'marketing-werbung': [
    'Marketing', 'Werbung', 'Strategie', 'Kampagne', 'Branding',
    'Social Media', 'Content', 'digital', 'Reichweite', 'Erfolg'
  ],
  'finanzen-recht': [
    'Finanzen', 'Buchhaltung', 'Steuer', 'Beratung', 'professionell',
    'genau', 'zuverlässig', 'transparent', 'kompetent', 'vertrauenswürdig'
  ],
  'bildung-coaching': [
    'Lernen', 'Unterricht', 'Coaching', 'Training', 'Entwicklung',
    'individuell', 'persönlich', 'Erfolg', 'Wissen', 'Erfahrung'
  ],
  'tiere': [
    'Tiere', 'Haustiere', 'Betreuung', 'liebevoll', 'erfahren',
    'verantwortungsvoll', 'Pflege', 'artgerecht', 'zuverlässig', 'vertrauenswürdig'
  ],
  'kreativ-design': [
    'Design', 'kreativ', 'Gestaltung', 'visuell', 'modern',
    'einzigartig', 'professionell', 'Stil', 'Konzept', 'Kunst'
  ],
  'event-entertainment': [
    'Event', 'Veranstaltung', 'Feier', 'Entertainment', 'Show',
    'Unterhaltung', 'Stimmung', 'professionell', 'unvergesslich', 'Erlebnis'
  ],
  'buero-admin': [
    'Büro', 'Organisation', 'Verwaltung', 'effizient', 'strukturiert',
    'zuverlässig', 'genau', 'professionell', 'Sekretariat', 'Support'
  ]
};

// Allgemeine Power-Keywords
const POWER_KEYWORDS = [
  'professionell', 'erfahren', 'zuverlässig', 'qualifiziert', 'flexibel',
  'schnell', 'günstig', 'hochwertig', 'Experte', 'spezialisiert',
  'individuell', 'persönlich', 'kostenlos', 'Angebot', 'Beratung'
];

// Lokale Keywords
const LOCAL_KEYWORDS = [
  'lokal', 'vor Ort', 'in der Nähe', 'regional', 'bundesweit',
  'deutschlandweit', 'Umgebung', 'Anfahrt'
];

export class KeywordAnalysisService {
  
  /**
   * Analysiert ein Profil auf Keyword-Optimierung
   */
  static analyzeProfile(data: ProfileDataForAnalysis): KeywordAnalysisResult {
    const categoryKeywords = this.analyzeCatego(data);
    const subcategoryKeywords = this.analyzeSubcategoryKeywords(data);
    const skillKeywords = this.analyzeSkillKeywords(data);
    const suggestions = this.generateSuggestions(data, categoryKeywords, subcategoryKeywords, skillKeywords);
    
    const keywordDensity = this.calculateKeywordDensity(data.description);
    const readabilityScore = this.calculateReadabilityScore(data.description);
    
    const score = this.calculateOverallScore({
      categoryKeywords,
      subcategoryKeywords,
      skillKeywords,
      customTags: data.searchTags,
      keywordDensity,
      readabilityScore,
      title: data.title
    });
    
    const grade = this.getGradeFromScore(score);
    
    const missingHighPriorityKeywords = this.findMissingHighPriorityKeywords(
      data, categoryKeywords, subcategoryKeywords
    );
    
    const competitiveKeywords = this.getCompetitiveKeywords(data.category, data.subcategory);
    
    return {
      score,
      grade,
      categoryKeywords,
      subcategoryKeywords,
      skillKeywords,
      customTags: data.searchTags,
      suggestions,
      competitiveKeywords,
      missingHighPriorityKeywords,
      keywordDensity,
      readabilityScore
    };
  }
  
  /**
   * Analysiert Kategorie-Keywords
   */
  private static analyzeCatego(data: ProfileDataForAnalysis): KeywordMatch[] {
    const categoryKeywords = CATEGORY_KEYWORDS[data.category] || [];
    const fullText = this.getFullText(data).toLowerCase();
    
    return categoryKeywords.map((keyword, index) => {
      const lowerKeyword = keyword.toLowerCase();
      const count = this.countKeywordOccurrences(fullText, lowerKeyword);
      const position = this.findKeywordPosition(data, keyword);
      
      return {
        keyword,
        found: count > 0,
        count,
        position,
        importance: index < 3 ? 'high' : index < 6 ? 'medium' : 'low'
      };
    });
  }
  
  /**
   * Analysiert Subkategorie-Keywords
   */
  private static analyzeSubcategoryKeywords(data: ProfileDataForAnalysis): KeywordMatch[] {
    const subcategoryKeywords = this.getSubcategoryKeywords(data.subcategory);
    const fullText = this.getFullText(data).toLowerCase();
    
    return subcategoryKeywords.map((keyword, index) => {
      const lowerKeyword = keyword.toLowerCase();
      const count = this.countKeywordOccurrences(fullText, lowerKeyword);
      const position = this.findKeywordPosition(data, keyword);
      
      return {
        keyword,
        found: count > 0,
        count,
        position,
        importance: index < 2 ? 'high' : index < 4 ? 'medium' : 'low'
      };
    });
  }
  
  /**
   * Analysiert Skill-Keywords
   */
  private static analyzeSkillKeywords(data: ProfileDataForAnalysis): KeywordMatch[] {
    const availableSkills = getSkillsForSubcategory(data.category, data.subcategory);
    const fullText = this.getFullText(data).toLowerCase();
    
    return availableSkills.map((skill) => {
      const lowerSkill = skill.toLowerCase();
      const count = this.countKeywordOccurrences(fullText, lowerSkill);
      const isSelected = data.skills.includes(skill);
      
      return {
        keyword: skill,
        found: count > 0 || isSelected,
        count: isSelected ? count + 1 : count,
        position: isSelected ? 'skills' : this.findKeywordPosition(data, skill),
        importance: isSelected ? 'high' : 'medium'
      };
    });
  }
  
  /**
   * Generiert Verbesserungsvorschläge
   */
  private static generateSuggestions(
    data: ProfileDataForAnalysis,
    categoryKeywords: KeywordMatch[],
    subcategoryKeywords: KeywordMatch[],
    _skillKeywords: KeywordMatch[]
  ): KeywordSuggestion[] {
    const suggestions: KeywordSuggestion[] = [];
    
    // Prüfe fehlende Kategorie-Keywords
    const missingCategoryKeywords = categoryKeywords
      .filter(k => k.importance === 'high' && !k.found);
    
    if (missingCategoryKeywords.length > 0) {
      suggestions.push({
        type: 'add',
        priority: 'high',
        keyword: missingCategoryKeywords[0].keyword,
        message: `Füge das Keyword "${missingCategoryKeywords[0].keyword}" zu deiner Beschreibung hinzu`,
        impact: 'Verbessert deine Auffindbarkeit in der Kategorie erheblich'
      });
    }
    
    // Prüfe fehlende Subkategorie-Keywords
    const missingSubcategoryKeywords = subcategoryKeywords
      .filter(k => k.importance === 'high' && !k.found);
    
    if (missingSubcategoryKeywords.length > 0) {
      suggestions.push({
        type: 'add',
        priority: 'high',
        keyword: missingSubcategoryKeywords[0].keyword,
        message: `Erwähne "${missingSubcategoryKeywords[0].keyword}" in deiner Beschreibung`,
        impact: 'Steigert dein Ranking für spezifische Suchanfragen'
      });
    }
    
    // Prüfe Such-Tags
    if (data.searchTags.length < 3) {
      suggestions.push({
        type: 'add',
        priority: 'high',
        message: `Füge mindestens ${3 - data.searchTags.length} weitere Such-Tags hinzu`,
        impact: 'Such-Tags sind entscheidend für die Auffindbarkeit'
      });
    }
    
    if (data.searchTags.length < 5) {
      suggestions.push({
        type: 'improve',
        priority: 'medium',
        message: 'Nutze alle 5 verfügbaren Such-Tags für maximale Sichtbarkeit',
        impact: 'Mehr Tags bedeuten mehr Suchanfragen, bei denen du erscheinst'
      });
    }
    
    // Prüfe Profil-Titel
    if (!data.title || data.title.length === 0) {
      suggestions.push({
        type: 'add',
        priority: 'high',
        message: 'Füge einen Profil-Titel hinzu - dieser ist entscheidend für die Suche',
        impact: 'Der Titel ist das Erste, was Kunden sehen und beeinflusst das Ranking stark'
      });
    } else if (data.title.length < 30) {
      suggestions.push({
        type: 'improve',
        priority: 'medium',
        message: 'Dein Titel ist zu kurz - nutze 30-80 Zeichen für bessere Sichtbarkeit',
        impact: 'Längere Titel mit Keywords ranken besser'
      });
    } else {
      // Prüfe ob Titel relevante Keywords enthält
      const titleLower = data.title.toLowerCase();
      const categoryKeywordList = CATEGORY_KEYWORDS[data.category] || [];
      const hasRelevantKeyword = categoryKeywordList.some(kw => 
        titleLower.includes(kw.toLowerCase())
      );
      
      if (!hasRelevantKeyword && data.subcategory) {
        const subcatLower = data.subcategory.toLowerCase();
        if (!titleLower.includes(subcatLower)) {
          suggestions.push({
            type: 'improve',
            priority: 'medium',
            keyword: data.subcategory,
            message: `Erwähne "${data.subcategory}" oder ein Kategorie-Keyword in deinem Titel`,
            impact: 'Keywords im Titel verbessern dein Ranking erheblich'
          });
        }
      }
    }
    
    // Prüfe Beschreibungslänge
    const descriptionLength = data.description.replace(/<[^>]*>/g, '').length;
    
    if (descriptionLength < 200) {
      suggestions.push({
        type: 'improve',
        priority: 'high',
        message: 'Erweitere deine Beschreibung auf mindestens 200 Zeichen',
        impact: 'Längere Beschreibungen ranken besser in der Suche'
      });
    }
    
    if (descriptionLength > 2000) {
      suggestions.push({
        type: 'improve',
        priority: 'low',
        message: 'Deine Beschreibung ist sehr lang - überlege sie zu kürzen',
        impact: 'Kürzere, prägnante Texte werden besser gelesen'
      });
    }
    
    // Prüfe Power-Keywords
    const fullText = this.getFullText(data).toLowerCase();
    const powerKeywordsUsed = POWER_KEYWORDS.filter(pk => 
      fullText.includes(pk.toLowerCase())
    ).length;
    
    if (powerKeywordsUsed < 3) {
      const unusedPowerKeyword = POWER_KEYWORDS.find(pk => 
        !fullText.includes(pk.toLowerCase())
      );
      if (unusedPowerKeyword) {
        suggestions.push({
          type: 'add',
          priority: 'medium',
          keyword: unusedPowerKeyword,
          message: `Nutze überzeugende Wörter wie "${unusedPowerKeyword}"`,
          impact: 'Power-Keywords erhöhen die Conversion-Rate'
        });
      }
    }
    
    // Prüfe lokale Keywords wenn Standort angegeben
    if (data.location) {
      const locationInDescription = data.description
        .toLowerCase()
        .includes(data.location.toLowerCase());
      
      if (!locationInDescription) {
        suggestions.push({
          type: 'add',
          priority: 'medium',
          keyword: data.location,
          message: `Erwähne deinen Standort "${data.location}" in der Beschreibung`,
          impact: 'Verbessert lokales Ranking und Vertrauen'
        });
      }
    }
    
    // Prüfe Keyword-Stuffing
    const keywordDensity = this.calculateKeywordDensity(data.description);
    if (keywordDensity > 5) {
      suggestions.push({
        type: 'remove',
        priority: 'high',
        message: 'Deine Keyword-Dichte ist zu hoch - reduziere Wiederholungen',
        impact: 'Zu viele Keywords wirken unprofessionell und werden abgestraft'
      });
    }
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  /**
   * Berechnet die Keyword-Dichte
   */
  private static calculateKeywordDensity(text: string): number {
    const cleanText = text.replace(/<[^>]*>/g, '').toLowerCase();
    const words = cleanText.split(/\s+/).filter(w => w.length > 2);
    
    if (words.length === 0) return 0;
    
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    const repeatedWords = Object.values(wordCount).filter(count => count > 2).length;
    return (repeatedWords / words.length) * 100;
  }
  
  /**
   * Berechnet den Lesbarkeits-Score
   */
  private static calculateReadabilityScore(text: string): number {
    const cleanText = text.replace(/<[^>]*>/g, '');
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    
    // Optimal: 15-20 Wörter pro Satz, 5-7 Zeichen pro Wort
    let score = 100;
    
    if (avgWordsPerSentence > 25) score -= 20;
    else if (avgWordsPerSentence > 20) score -= 10;
    else if (avgWordsPerSentence < 8) score -= 15;
    
    if (avgWordLength > 8) score -= 15;
    else if (avgWordLength < 4) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Berechnet den Gesamt-Score
   */
  private static calculateOverallScore(data: {
    categoryKeywords: KeywordMatch[];
    subcategoryKeywords: KeywordMatch[];
    skillKeywords: KeywordMatch[];
    customTags: string[];
    keywordDensity: number;
    readabilityScore: number;
    title?: string;
  }): number {
    let score = 0;
    
    // Titel: 15 Punkte (NEU - wichtig für SEO)
    if (data.title && data.title.length > 0) {
      if (data.title.length >= 30 && data.title.length <= 80) {
        score += 15; // Optimale Länge
      } else if (data.title.length >= 20) {
        score += 10; // Akzeptable Länge
      } else {
        score += 5; // Zu kurz
      }
    }
    // Kein Titel = 0 Punkte
    
    // Kategorie-Keywords: 20 Punkte (reduziert von 25)
    const categoryScore = data.categoryKeywords
      .filter(k => k.found)
      .reduce((sum, k) => sum + (k.importance === 'high' ? 4 : k.importance === 'medium' ? 2 : 1), 0);
    score += Math.min(20, categoryScore);
    
    // Subkategorie-Keywords: 20 Punkte (reduziert von 25)
    const subcategoryScore = data.subcategoryKeywords
      .filter(k => k.found)
      .reduce((sum, k) => sum + (k.importance === 'high' ? 6 : k.importance === 'medium' ? 4 : 2), 0);
    score += Math.min(20, subcategoryScore);
    
    // Skills: 15 Punkte (reduziert von 20)
    const skillScore = data.skillKeywords.filter(k => k.found).length * 3;
    score += Math.min(15, skillScore);
    
    // Such-Tags: 15 Punkte (3 pro Tag)
    score += Math.min(15, data.customTags.length * 3);
    
    // Lesbarkeit: 15 Punkte
    score += Math.min(15, data.readabilityScore * 0.15);
    
    // Abzug für Keyword-Stuffing
    if (data.keywordDensity > 5) {
      score -= 20;
    } else if (data.keywordDensity > 3) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * Gibt die Note basierend auf dem Score zurück
   */
  private static getGradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
  
  /**
   * Findet fehlende hochpriorisierte Keywords
   */
  private static findMissingHighPriorityKeywords(
    _data: ProfileDataForAnalysis,
    categoryKeywords: KeywordMatch[],
    subcategoryKeywords: KeywordMatch[]
  ): string[] {
    const missing: string[] = [];
    
    categoryKeywords
      .filter(k => k.importance === 'high' && !k.found)
      .forEach(k => missing.push(k.keyword));
    
    subcategoryKeywords
      .filter(k => k.importance === 'high' && !k.found)
      .forEach(k => missing.push(k.keyword));
    
    return missing.slice(0, 5);
  }
  
  /**
   * Gibt wettbewerbsfähige Keywords für die Kategorie zurück
   */
  private static getCompetitiveKeywords(category: string, subcategory: string): string[] {
    const keywords: string[] = [];
    
    // Kategorie-spezifische competitive Keywords
    const catKeywords = CATEGORY_KEYWORDS[category] || [];
    keywords.push(...catKeywords.slice(0, 3));
    
    // Subkategorie-Keywords
    const subKeywords = this.getSubcategoryKeywords(subcategory);
    keywords.push(...subKeywords.slice(0, 3));
    
    // Allgemeine Power-Keywords
    keywords.push(...POWER_KEYWORDS.slice(0, 3));
    
    return [...new Set(keywords)].slice(0, 10);
  }
  
  /**
   * Gibt Keywords für eine Subkategorie zurück
   */
  private static getSubcategoryKeywords(subcategory: string): string[] {
    // Normalisiere den Subcategory-Namen
    const normalized = subcategory.toLowerCase();
    
    // Subkategorie-spezifische Keywords
    const subcategoryMap: Record<string, string[]> = {
      'mietkoch': ['Koch', 'Küche', 'Catering', 'Menü', 'Event-Küche', 'privat'],
      'mietkellner': ['Service', 'Kellner', 'Gastronomie', 'Event', 'professionell'],
      'elektriker': ['Elektrik', 'Installation', 'Reparatur', 'Strom', 'Sicherheit'],
      'klempner': ['Sanitär', 'Wasser', 'Rohr', 'Installation', 'Reparatur'],
      'maler & lackierer': ['Malerarbeiten', 'Anstrich', 'Lackierung', 'Renovierung'],
      'tischler': ['Holz', 'Möbel', 'Maßanfertigung', 'Handwerk'],
      'webentwicklung': ['Website', 'Webseite', 'Entwicklung', 'Frontend', 'Backend'],
      'hundebetreuung': ['Hund', 'Gassi', 'Betreuung', 'Hundesitter', 'liebevoll'],
      'reinigungskraft': ['Reinigung', 'Putzen', 'sauber', 'gründlich', 'Haushalt'],
    };
    
    // Suche nach passendem Eintrag
    for (const [key, keywords] of Object.entries(subcategoryMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return keywords;
      }
    }
    
    // Fallback: Teile den Namen auf
    return subcategory.split(/[-\s&]+/).filter(w => w.length > 2);
  }
  
  /**
   * Kombiniert alle Texte für die Analyse
   */
  private static getFullText(data: ProfileDataForAnalysis): string {
    return [
      data.title || '',
      data.description.replace(/<[^>]*>/g, ''),
      data.skills.join(' '),
      data.searchTags.join(' '),
      data.location || ''
    ].join(' ');
  }
  
  /**
   * Zählt Keyword-Vorkommen
   */
  private static countKeywordOccurrences(text: string, keyword: string): number {
    const regex = new RegExp(keyword, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }
  
  /**
   * Findet die Position eines Keywords
   */
  private static findKeywordPosition(
    data: ProfileDataForAnalysis, 
    keyword: string
  ): 'title' | 'tags' | 'description' | 'skills' {
    const lowerKeyword = keyword.toLowerCase();
    
    if (data.title && data.title.toLowerCase().includes(lowerKeyword)) {
      return 'title';
    }
    
    if (data.searchTags.some(tag => tag.toLowerCase().includes(lowerKeyword))) {
      return 'tags';
    }
    
    if (data.skills.some(skill => skill.toLowerCase().includes(lowerKeyword))) {
      return 'skills';
    }
    
    return 'description';
  }
  
  /**
   * Generiert Tag-Vorschläge basierend auf Kategorie
   */
  static getSuggestedTags(category: string, subcategory: string): string[] {
    const suggestions: string[] = [];
    
    // Kategorie-Keywords
    const catKeywords = CATEGORY_KEYWORDS[category] || [];
    suggestions.push(...catKeywords.slice(0, 5));
    
    // Subkategorie-Keywords
    const subKeywords = this.getSubcategoryKeywords(subcategory);
    suggestions.push(...subKeywords);
    
    // Power-Keywords
    suggestions.push(...POWER_KEYWORDS.slice(0, 5));
    
    // Local Keywords
    suggestions.push(...LOCAL_KEYWORDS.slice(0, 3));
    
    return [...new Set(suggestions)];
  }
}
