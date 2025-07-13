// Erweiterte KI-Features für den Projekt-Assistenten
// src/lib/ai/projectAssistantFeatures.ts

export interface ProjectOptimization {
  category: string;
  currentBudget: { min: number; max: number };
  optimizedBudget: { min: number; max: number };
  savings: number;
  recommendations: string[];
  confidence: number;
}

export interface ProviderRecommendation {
  providerId: string;
  name: string;
  score: number;
  reasons: string[];
  pricing: {
    estimate: number;
    confidence: number;
  };
  availability: {
    earliest: string;
    flexibility: 'high' | 'medium' | 'low';
  };
  strengths: string[];
  riskFactors: string[];
}

export interface ProjectRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskFactors: Array<{
    type: 'timeline' | 'budget' | 'technical' | 'weather' | 'availability';
    level: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
  }>;
  recommendations: string[];
}

export interface SmartScheduling {
  optimizedTimeline: {
    startDate: string;
    endDate: string;
    milestones: Array<{
      date: string;
      description: string;
      critical: boolean;
    }>;
  };
  alternatives: Array<{
    startDate: string;
    benefits: string[];
    tradeoffs: string[];
  }>;
  weatherConsiderations?: {
    optimalPeriods: string[];
    riskyPeriods: string[];
  };
}

export class TaskiloAIFeatures {
  
  // Projekt-Optimierung mit KI
  static optimizeProject(projectData: any): ProjectOptimization {
    const category = projectData.category || 'general';
    const currentBudget = projectData.budget || { min: 200, max: 500 };
    
    // KI-basierte Budget-Optimierung
    const optimization = this.analyzeBudgetOptimization(category, currentBudget, projectData.description);
    
    return {
      category,
      currentBudget,
      optimizedBudget: optimization.optimizedRange,
      savings: optimization.potentialSavings,
      recommendations: optimization.recommendations,
      confidence: optimization.confidence
    };
  }

  // Intelligente Dienstleister-Empfehlungen
  static async getSmartProviderRecommendations(projectData: any): Promise<ProviderRecommendation[]> {
    // Simuliere KI-Analyse für Dienstleister-Matching
    const recommendations: ProviderRecommendation[] = [
      {
        providerId: 'provider_1',
        name: 'ProService München',
        score: 0.95,
        reasons: [
          'Spezialisiert auf Ihre Projektart',
          'Ausgezeichnete Bewertungen (4.9/5)',
          'Optimal verfügbar für Ihren Zeitrahmen',
          'Faire Preisgestaltung'
        ],
        pricing: {
          estimate: 320,
          confidence: 0.9
        },
        availability: {
          earliest: 'Diese Woche',
          flexibility: 'high'
        },
        strengths: [
          '15 Jahre Erfahrung',
          'ISO-zertifiziert',
          'Garantie auf alle Arbeiten',
          'Notfall-Service verfügbar'
        ],
        riskFactors: [
          'Etwas höhere Preise als Konkurrenz'
        ]
      },
      {
        providerId: 'provider_2',
        name: 'Express-Handwerk',
        score: 0.88,
        reasons: [
          'Schnelle Verfügbarkeit',
          'Kostengünstige Lösung',
          'Gute lokale Bewertungen'
        ],
        pricing: {
          estimate: 280,
          confidence: 0.85
        },
        availability: {
          earliest: 'Morgen',
          flexibility: 'medium'
        },
        strengths: [
          'Schnelle Reaktionszeit',
          '24/7 Erreichbarkeit',
          'Flexible Terminplanung'
        ],
        riskFactors: [
          'Weniger Erfahrung bei komplexen Projekten',
          'Keine Garantie-Erweiterung'
        ]
      },
      {
        providerId: 'provider_3',
        name: 'Premium-Profis',
        score: 0.82,
        reasons: [
          'Höchste Qualitätsstandards',
          'Umfassende Garantie',
          'Spezialisierte Expertise'
        ],
        pricing: {
          estimate: 450,
          confidence: 0.92
        },
        availability: {
          earliest: 'Nächste Woche',
          flexibility: 'low'
        },
        strengths: [
          'Premium-Materialien inklusive',
          '5 Jahre Garantie',
          'Award-winning Service'
        ],
        riskFactors: [
          'Höhere Kosten',
          'Längere Wartezeiten'
        ]
      }
    ];

    // Sortiere nach KI-Score
    return recommendations.sort((a, b) => b.score - a.score);
  }

  // Risiko-Bewertung für Projekte
  static assessProjectRisks(projectData: any): ProjectRiskAssessment {
    const risks = [];
    let overallRisk: 'low' | 'medium' | 'high' = 'low';

    // Timeline-Risiken
    if (projectData.timeline?.flexibility === 'rigid') {
      risks.push({
        type: 'timeline' as const,
        level: 'medium' as const,
        description: 'Starrer Zeitplan kann zu Verzögerungen führen',
        mitigation: 'Pufferzeiten einplanen oder Flexibilität erhöhen'
      });
    }

    // Budget-Risiken
    if (projectData.budget && (projectData.budget.max - projectData.budget.min) < 100) {
      risks.push({
        type: 'budget' as const,
        level: 'high' as const,
        description: 'Sehr enger Budgetrahmen erhöht Risiko für Kostenüberschreitungen',
        mitigation: 'Budget um 20-30% erweitern oder Projektumfang reduzieren'
      });
    }

    // Technische Risiken
    if (projectData.description?.includes('komplex') || projectData.description?.includes('schwierig')) {
      risks.push({
        type: 'technical' as const,
        level: 'medium' as const,
        description: 'Komplexes Projekt kann unvorhergesehene Herausforderungen mit sich bringen',
        mitigation: 'Detaillierte Vorab-Analyse und erfahrenen Dienstleister wählen'
      });
    }

    // Wetter-Risiken (für Außenarbeiten)
    if (this.isOutdoorProject(projectData.category, projectData.description)) {
      const currentSeason = this.getCurrentSeason();
      if (currentSeason === 'winter') {
        risks.push({
          type: 'weather' as const,
          level: 'medium' as const,
          description: 'Winterwetter kann Außenarbeiten verzögern',
          mitigation: 'Wetterunabhängige Arbeiten vorziehen oder Frühjahr abwarten'
        });
      }
    }

    // Berechne Gesamt-Risiko
    const highRisks = risks.filter(r => r.level === 'high').length;
    const mediumRisks = risks.filter(r => r.level === 'medium').length;

    if (highRisks > 0 || mediumRisks > 2) {
      overallRisk = 'high';
    } else if (mediumRisks > 0) {
      overallRisk = 'medium';
    }

    return {
      overallRisk,
      riskFactors: risks,
      recommendations: this.generateRiskRecommendations(risks)
    };
  }

  // Intelligente Terminplanung
  static generateSmartScheduling(projectData: any): SmartScheduling {
    const startDate = new Date();
    const estimatedDuration = this.estimateProjectDuration(projectData);
    
    // Optimaler Starttermin
    const optimalStart = this.findOptimalStartDate(projectData, startDate);
    const endDate = new Date(optimalStart);
    endDate.setDate(endDate.getDate() + estimatedDuration);

    // Meilensteine generieren
    const milestones = this.generateMilestones(projectData, optimalStart, estimatedDuration);

    // Alternative Termine
    const alternatives = this.generateAlternativeSchedules(projectData, startDate);

    const scheduling: SmartScheduling = {
      optimizedTimeline: {
        startDate: optimalStart.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        milestones
      },
      alternatives
    };

    // Wetter-Überlegungen für Außenprojekte
    if (this.isOutdoorProject(projectData.category, projectData.description)) {
      scheduling.weatherConsiderations = {
        optimalPeriods: ['März-Mai', 'September-Oktober'],
        riskyPeriods: ['Dezember-Februar', 'Juli-August']
      };
    }

    return scheduling;
  }

  // Hilfsmethoden
  private static analyzeBudgetOptimization(category: string, currentBudget: any, description: string) {
    // Simuliere KI-Analyse
    const marketData = this.getMarketData(category);
    const complexity = this.analyzeComplexity(description);
    
    let optimizationFactor = 1.0;
    const recommendations = [];

    // Optimierungslogik
    if (currentBudget.max > marketData.averageMax * 1.2) {
      optimizationFactor = 0.85;
      recommendations.push('Budget kann um 15% reduziert werden');
      recommendations.push('Mehrere Angebote einholen für bessere Preise');
    }

    if (complexity.score < 0.5) {
      recommendations.push('Einfaches Projekt - günstigere Anbieter möglich');
    }

    const optimizedRange = {
      min: Math.round(currentBudget.min * optimizationFactor),
      max: Math.round(currentBudget.max * optimizationFactor)
    };

    const potentialSavings = currentBudget.max - optimizedRange.max;

    return {
      optimizedRange,
      potentialSavings,
      recommendations,
      confidence: 0.8 + (complexity.score * 0.2)
    };
  }

  private static getMarketData(category: string) {
    const marketRanges: Record<string, { averageMin: number; averageMax: number }> = {
      'handwerk': { averageMin: 150, averageMax: 600 },
      'reinigung': { averageMin: 50, averageMax: 200 },
      'garten': { averageMin: 80, averageMax: 400 },
      'transport': { averageMin: 100, averageMax: 500 },
      'it': { averageMin: 80, averageMax: 300 }
    };
    return marketRanges[category] || marketRanges['handwerk'];
  }

  private static analyzeComplexity(description: string) {
    let score = 0.3; // Basis-Komplexität
    
    const complexKeywords = ['komplex', 'schwierig', 'speziell', 'umfangreich', 'renovation'];
    const simpleKeywords = ['einfach', 'standard', 'basic', 'klein'];

    complexKeywords.forEach(keyword => {
      if (description.toLowerCase().includes(keyword)) score += 0.2;
    });

    simpleKeywords.forEach(keyword => {
      if (description.toLowerCase().includes(keyword)) score -= 0.1;
    });

    return { score: Math.max(0.1, Math.min(1.0, score)) };
  }

  private static isOutdoorProject(category: string, description: string): boolean {
    const outdoorCategories = ['garten', 'dach', 'fassade'];
    const outdoorKeywords = ['außen', 'outdoor', 'garten', 'terrasse', 'balkon', 'dach'];
    
    return outdoorCategories.includes(category) || 
           outdoorKeywords.some(keyword => description.toLowerCase().includes(keyword));
  }

  private static getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private static estimateProjectDuration(projectData: any): number {
    const baseDurations: Record<string, number> = {
      'handwerk': 5,
      'reinigung': 1,
      'garten': 3,
      'transport': 1,
      'it': 2
    };

    const baseDuration = baseDurations[projectData.category] || 3;
    const complexity = this.analyzeComplexity(projectData.description || '');
    
    return Math.round(baseDuration * (1 + complexity.score));
  }

  private static findOptimalStartDate(projectData: any, requestedStart: Date): Date {
    // Berücksichtige Wochentage, Feiertage, etc.
    const optimal = new Date(requestedStart);
    
    // Vermeide Wochenenden für Business-Projekte
    if (optimal.getDay() === 0 || optimal.getDay() === 6) {
      optimal.setDate(optimal.getDate() + (8 - optimal.getDay()));
    }

    return optimal;
  }

  private static generateMilestones(projectData: any, startDate: Date, duration: number) {
    const milestones = [];
    const category = projectData.category;

    if (duration > 3) {
      // Planungsphase
      milestones.push({
        date: new Date(startDate).toISOString().split('T')[0],
        description: 'Projektplanung und Vorbereitung',
        critical: true
      });

      // Zwischenmeilenstein
      const midDate = new Date(startDate);
      midDate.setDate(midDate.getDate() + Math.floor(duration / 2));
      milestones.push({
        date: midDate.toISOString().split('T')[0],
        description: 'Zwischenstand und Qualitätskontrolle',
        critical: false
      });
    }

    // Abschluss
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);
    milestones.push({
      date: endDate.toISOString().split('T')[0],
      description: 'Projektabschluss und Abnahme',
      critical: true
    });

    return milestones;
  }

  private static generateAlternativeSchedules(projectData: any, requestedStart: Date) {
    const alternatives = [];

    // Eine Woche später
    const laterStart = new Date(requestedStart);
    laterStart.setDate(laterStart.getDate() + 7);
    alternatives.push({
      startDate: laterStart.toISOString().split('T')[0],
      benefits: ['Mehr Anbieter verfügbar', 'Möglicherweise bessere Preise'],
      tradeoffs: ['Späterer Projektstart']
    });

    // Einen Monat später
    const muchLaterStart = new Date(requestedStart);
    muchLaterStart.setDate(muchLaterStart.getDate() + 30);
    alternatives.push({
      startDate: muchLaterStart.toISOString().split('T')[0],
      benefits: ['Optimale Planung möglich', 'Beste Anbieter-Auswahl', 'Günstigere Preise'],
      tradeoffs: ['Deutlich späterer Start']
    });

    return alternatives;
  }

  private static generateRiskRecommendations(risks: any[]): string[] {
    const recommendations = [];

    if (risks.some(r => r.type === 'budget')) {
      recommendations.push('Detaillierte Kostenaufstellung anfordern');
      recommendations.push('Verträge mit Festpreisgarantie bevorzugen');
    }

    if (risks.some(r => r.type === 'timeline')) {
      recommendations.push('Realistische Zeitpläne mit Puffern einplanen');
      recommendations.push('Regelmäßige Fortschritts-Updates vereinbaren');
    }

    if (risks.some(r => r.type === 'technical')) {
      recommendations.push('Erfahrene Dienstleister mit Referenzen wählen');
      recommendations.push('Detaillierte Vorab-Analyse durchführen lassen');
    }

    if (risks.some(r => r.type === 'weather')) {
      recommendations.push('Wetterabhängige Arbeiten saisonal planen');
      recommendations.push('Notfall-Pläne für Witterungsunterbrechungen');
    }

    return recommendations;
  }
}
