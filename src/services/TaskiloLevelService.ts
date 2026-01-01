/**
 * Taskilo Level Service
 * 
 * Implementiert ein Level-System ähnlich wie Fiverr's Seller Levels.
 * Tasker können durch gute Leistung aufsteigen und erhalten Benefits.
 * 
 * Level-Stufen:
 * - New Tasker: Startlevel
 * - Level 1: 5+ Aufträge, 3+ Kunden, 400€+, Score 5+, Rating 4.4+, Response 80%
 * - Level 2: 20+ Aufträge, 10+ Kunden, 2000€+, Score 7+, Rating 4.6+, Response 90%
 * - Top Rated: 40+ Aufträge, 20+ Kunden, 10000€+, Score 9+, Rating 4.7+, Response 90%
 */

import { db } from '@/firebase/clients';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

// Level-Typen
export type TaskiloLevel = 'new' | 'level1' | 'level2' | 'top_rated';

// Level-Anforderungen
export interface LevelRequirements {
  successScore: number;
  rating: number;
  responseRate: number;
  completedOrders: number;
  uniqueClients: number;
  totalEarnings: number; // in EUR
  manualReview: boolean;
}

// Level-Konfiguration
export const LEVEL_CONFIG: Record<TaskiloLevel, LevelRequirements> = {
  new: {
    successScore: 0,
    rating: 0,
    responseRate: 0,
    completedOrders: 0,
    uniqueClients: 0,
    totalEarnings: 0,
    manualReview: false,
  },
  level1: {
    successScore: 5,
    rating: 4.4,
    responseRate: 80,
    completedOrders: 5,
    uniqueClients: 3,
    totalEarnings: 400,
    manualReview: false,
  },
  level2: {
    successScore: 7,
    rating: 4.6,
    responseRate: 90,
    completedOrders: 20,
    uniqueClients: 10,
    totalEarnings: 2000,
    manualReview: false,
  },
  top_rated: {
    successScore: 9,
    rating: 4.7,
    responseRate: 90,
    completedOrders: 40,
    uniqueClients: 20,
    totalEarnings: 10000,
    manualReview: true,
  },
};

// Level-Details für UI
export const LEVEL_DETAILS: Record<TaskiloLevel, {
  name: string;
  nameShort: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  new: {
    name: 'Neuer Tasker',
    nameShort: 'Neu',
    description: 'Starte deine Taskilo-Karriere und sammle erste Erfahrungen.',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: 'user',
  },
  level1: {
    name: 'Level 1 Tasker',
    nameShort: 'Level 1',
    description: 'Du hast erste Erfolge erzielt und kannst jetzt mehr Funktionen nutzen.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: 'award',
  },
  level2: {
    name: 'Level 2 Tasker',
    nameShort: 'Level 2',
    description: 'Du bist ein erfahrener Tasker mit nachgewiesener Qualität.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    icon: 'star',
  },
  top_rated: {
    name: 'Top Rated Tasker',
    nameShort: 'Top Rated',
    description: 'Du gehörst zu den besten Taskern auf der Plattform.',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    icon: 'crown',
  },
};

// Level Benefits
export const LEVEL_BENEFITS: Record<TaskiloLevel, {
  maxGigs: number;
  canAdvertise: boolean;
  canOfferSubscriptions: boolean;
  prioritySupport: boolean;
  fasterPayouts: boolean;
  featuredClients: boolean;
  paidConsultations: boolean;
  searchBoost: number; // Multiplikator für Ranking
}> = {
  new: {
    maxGigs: 4,
    canAdvertise: false,
    canOfferSubscriptions: false,
    prioritySupport: false,
    fasterPayouts: false,
    featuredClients: false,
    paidConsultations: false,
    searchBoost: 1.0,
  },
  level1: {
    maxGigs: 10,
    canAdvertise: true,
    canOfferSubscriptions: true,
    prioritySupport: false,
    fasterPayouts: false,
    featuredClients: false,
    paidConsultations: false,
    searchBoost: 1.1,
  },
  level2: {
    maxGigs: 15,
    canAdvertise: true,
    canOfferSubscriptions: true,
    prioritySupport: false,
    fasterPayouts: false,
    featuredClients: true,
    paidConsultations: true,
    searchBoost: 1.25,
  },
  top_rated: {
    maxGigs: 30,
    canAdvertise: true,
    canOfferSubscriptions: true,
    prioritySupport: true,
    fasterPayouts: true,
    featuredClients: true,
    paidConsultations: true,
    searchBoost: 1.5,
  },
};

// Tasker-Metriken
export interface TaskerMetrics {
  successScore: number;
  rating: number;
  ratingCount: number;
  responseRate: number;
  completedOrders: number;
  uniqueClients: number;
  totalEarnings: number;
  // Success Score Komponenten
  clientSatisfaction: number;
  effectiveCommunication: number;
  conflictFreeOrders: number;
  orderCancellations: number;
  deliveryTime: number;
  valueForMoney: number;
}

// Level-Status
export interface TaskerLevelStatus {
  currentLevel: TaskiloLevel;
  metrics: TaskerMetrics;
  nextLevel: TaskiloLevel | null;
  progress: Record<string, { current: number; required: number; met: boolean }>;
  levelSince: Date | null;
  lastEvaluated: Date;
  pendingManualReview: boolean;
  gracePeriodEnd: Date | null; // 30-Tage Schonfrist
  atRisk: boolean; // Gefahr des Abstiegs
}

export class TaskiloLevelService {
  /**
   * Berechnet das aktuelle Level basierend auf den Metriken
   */
  static calculateLevel(metrics: TaskerMetrics): TaskiloLevel {
    // Prüfe von oben nach unten
    if (this.meetsRequirements(metrics, 'top_rated')) {
      return 'top_rated';
    }
    if (this.meetsRequirements(metrics, 'level2')) {
      return 'level2';
    }
    if (this.meetsRequirements(metrics, 'level1')) {
      return 'level1';
    }
    return 'new';
  }

  /**
   * Prüft ob die Metriken die Anforderungen für ein Level erfüllen
   */
  static meetsRequirements(metrics: TaskerMetrics, level: TaskiloLevel): boolean {
    const req = LEVEL_CONFIG[level];
    
    return (
      metrics.successScore >= req.successScore &&
      metrics.rating >= req.rating &&
      metrics.responseRate >= req.responseRate &&
      metrics.completedOrders >= req.completedOrders &&
      metrics.uniqueClients >= req.uniqueClients &&
      metrics.totalEarnings >= req.totalEarnings
    );
  }

  /**
   * Berechnet den Fortschritt zum nächsten Level
   */
  static calculateProgress(
    metrics: TaskerMetrics,
    currentLevel: TaskiloLevel
  ): Record<string, { current: number; required: number; met: boolean; percentage: number }> {
    const nextLevel = this.getNextLevel(currentLevel);
    if (!nextLevel) {
      return {};
    }

    const req = LEVEL_CONFIG[nextLevel];

    return {
      successScore: {
        current: metrics.successScore,
        required: req.successScore,
        met: metrics.successScore >= req.successScore,
        percentage: Math.min(100, (metrics.successScore / req.successScore) * 100),
      },
      rating: {
        current: metrics.rating,
        required: req.rating,
        met: metrics.rating >= req.rating,
        percentage: Math.min(100, (metrics.rating / req.rating) * 100),
      },
      responseRate: {
        current: metrics.responseRate,
        required: req.responseRate,
        met: metrics.responseRate >= req.responseRate,
        percentage: Math.min(100, (metrics.responseRate / req.responseRate) * 100),
      },
      completedOrders: {
        current: metrics.completedOrders,
        required: req.completedOrders,
        met: metrics.completedOrders >= req.completedOrders,
        percentage: Math.min(100, (metrics.completedOrders / req.completedOrders) * 100),
      },
      uniqueClients: {
        current: metrics.uniqueClients,
        required: req.uniqueClients,
        met: metrics.uniqueClients >= req.uniqueClients,
        percentage: Math.min(100, (metrics.uniqueClients / req.uniqueClients) * 100),
      },
      totalEarnings: {
        current: metrics.totalEarnings,
        required: req.totalEarnings,
        met: metrics.totalEarnings >= req.totalEarnings,
        percentage: Math.min(100, (metrics.totalEarnings / req.totalEarnings) * 100),
      },
    };
  }

  /**
   * Ermittelt das nächste Level
   */
  static getNextLevel(currentLevel: TaskiloLevel): TaskiloLevel | null {
    const levelOrder: TaskiloLevel[] = ['new', 'level1', 'level2', 'top_rated'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    
    if (currentIndex < levelOrder.length - 1) {
      return levelOrder[currentIndex + 1];
    }
    return null;
  }

  /**
   * Berechnet den Success Score aus den Komponenten
   */
  static calculateSuccessScore(components: {
    clientSatisfaction: number; // 0-10
    effectiveCommunication: number; // 0-10
    conflictFreeOrders: number; // 0-10
    orderCancellations: number; // 0-10 (invertiert: weniger = besser)
    deliveryTime: number; // 0-10
    valueForMoney: number; // 0-10
  }): number {
    const weights = {
      clientSatisfaction: 0.25,
      effectiveCommunication: 0.15,
      conflictFreeOrders: 0.15,
      orderCancellations: 0.20,
      deliveryTime: 0.15,
      valueForMoney: 0.10,
    };

    const score =
      components.clientSatisfaction * weights.clientSatisfaction +
      components.effectiveCommunication * weights.effectiveCommunication +
      components.conflictFreeOrders * weights.conflictFreeOrders +
      components.orderCancellations * weights.orderCancellations +
      components.deliveryTime * weights.deliveryTime +
      components.valueForMoney * weights.valueForMoney;

    return Math.round(score * 10) / 10;
  }

  /**
   * Lädt die Metriken eines Taskers aus Firebase
   */
  static async getTaskerMetrics(companyId: string): Promise<TaskerMetrics> {
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    
    if (!companyDoc.exists()) {
      return this.getEmptyMetrics();
    }

    const data = companyDoc.data();
    const levelData = data.taskerLevel || {};
    const metrics = levelData.metrics || {};

    // Berechne Auftrags-Statistiken wenn nicht vorhanden
    let completedOrders = metrics.completedOrders || 0;
    let uniqueClients = metrics.uniqueClients || 0;
    let totalEarnings = metrics.totalEarnings || 0;

    // Lade aus Aufträgen wenn nicht gecached
    if (!metrics.lastCalculated) {
      const orderStats = await this.calculateOrderStats(companyId);
      completedOrders = orderStats.completedOrders;
      uniqueClients = orderStats.uniqueClients;
      totalEarnings = orderStats.totalEarnings;
    }

    // Berechne Response Rate aus Chats
    const responseRate = metrics.responseRate || await this.calculateResponseRate(companyId);

    // Rating aus reviews
    const rating = data.rating || data.averageRating || 0;
    const ratingCount = data.ratingCount || data.reviewCount || 0;

    // Success Score Komponenten - echte Berechnungen
    // clientSatisfaction: Basiert auf Rating (5 Sterne = 10 Punkte)
    const clientSatisfaction = rating > 0 ? (rating / 5) * 10 : 0;
    
    // effectiveCommunication: Basiert auf Antwortrate
    const effectiveCommunication = (responseRate / 100) * 10;
    
    // conflictFreeOrders: Berechne aus Aufträgen ohne Disputes
    const conflictFreeData = await this.calculateConflictFreeRate(companyId);
    const conflictFreeOrders = conflictFreeData.rate;
    
    // orderCancellations: Berechne Stornierungsrate (invertiert: weniger Stornos = höherer Score)
    const cancellationData = await this.calculateCancellationRate(companyId);
    const orderCancellations = cancellationData.score;
    
    // deliveryTime: Berechne aus pünktlichen Lieferungen
    const deliveryData = await this.calculateDeliveryScore(companyId);
    const deliveryTime = deliveryData.score;
    
    // valueForMoney: Basiert auf Rating (kann später durch spezifische Bewertungen ersetzt werden)
    const valueForMoney = rating > 0 ? (rating / 5) * 10 : 0;

    const successScore = this.calculateSuccessScore({
      clientSatisfaction,
      effectiveCommunication,
      conflictFreeOrders,
      orderCancellations,
      deliveryTime,
      valueForMoney,
    });

    return {
      successScore,
      rating,
      ratingCount,
      responseRate,
      completedOrders,
      uniqueClients,
      totalEarnings,
      clientSatisfaction,
      effectiveCommunication,
      conflictFreeOrders,
      orderCancellations,
      deliveryTime,
      valueForMoney,
    };
  }

  /**
   * Berechnet Auftrags-Statistiken
   */
  static async calculateOrderStats(companyId: string): Promise<{
    completedOrders: number;
    uniqueClients: number;
    totalEarnings: number;
  }> {
    try {
      // Aufträge aus Company-Subcollection
      const ordersRef = collection(db, 'companies', companyId, 'auftraege');
      const completedQuery = query(ordersRef, where('status', '==', 'completed'));
      const ordersSnap = await getDocs(completedQuery);

      const clientIds = new Set<string>();
      let totalEarnings = 0;

      ordersSnap.forEach((doc) => {
        const order = doc.data();
        if (order.clientId) {
          clientIds.add(order.clientId);
        }
        totalEarnings += order.totalAmount || order.amount || 0;
      });

      return {
        completedOrders: ordersSnap.size,
        uniqueClients: clientIds.size,
        totalEarnings,
      };
    } catch {
      return { completedOrders: 0, uniqueClients: 0, totalEarnings: 0 };
    }
  }

  /**
   * Berechnet die Antwortrate aus Chat-Nachrichten
   */
  static async calculateResponseRate(companyId: string): Promise<number> {
    try {
      const chatsRef = collection(db, 'chats');
      const chatsQuery = query(chatsRef, where('participants', 'array-contains', companyId));
      const chatsSnap = await getDocs(chatsQuery);

      if (chatsSnap.empty) {
        return 100; // Keine Chats = 100% (neutral)
      }

      let respondedCount = 0;
      let totalInitialMessages = 0;

      chatsSnap.forEach((chatDoc) => {
        const chat = chatDoc.data();
        // Prüfe ob der Tasker auf erste Nachricht geantwortet hat
        if (chat.lastMessageBy !== companyId && chat.messageCount > 1) {
          totalInitialMessages++;
          if (chat.hasTaskerResponse !== false) {
            respondedCount++;
          }
        }
      });

      if (totalInitialMessages === 0) {
        return 100;
      }

      return Math.round((respondedCount / totalInitialMessages) * 100);
    } catch {
      return 0; // Bei Fehler 0 statt Fake-Wert
    }
  }

  /**
   * Berechnet die Rate konfliktfreier Aufträge
   */
  static async calculateConflictFreeRate(companyId: string): Promise<{ rate: number; total: number; conflicts: number }> {
    try {
      const ordersRef = collection(db, 'companies', companyId, 'auftraege');
      const ordersSnap = await getDocs(ordersRef);
      
      if (ordersSnap.empty) {
        return { rate: 0, total: 0, conflicts: 0 };
      }
      
      let totalOrders = 0;
      let conflictOrders = 0;
      
      ordersSnap.forEach((orderDoc) => {
        const order = orderDoc.data();
        // Zähle abgeschlossene und stornierte Aufträge
        if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'disputed') {
          totalOrders++;
          // Prüfe auf Streitfälle
          if (order.status === 'disputed' || order.hasDispute === true || order.disputeStatus) {
            conflictOrders++;
          }
        }
      });
      
      if (totalOrders === 0) {
        return { rate: 0, total: 0, conflicts: 0 };
      }
      
      // Score: 10 = 100% konfliktfrei, 0 = alle mit Konflikten
      const conflictFreePercent = ((totalOrders - conflictOrders) / totalOrders) * 100;
      const score = (conflictFreePercent / 100) * 10;
      
      return { rate: Math.round(score * 10) / 10, total: totalOrders, conflicts: conflictOrders };
    } catch {
      return { rate: 0, total: 0, conflicts: 0 };
    }
  }

  /**
   * Berechnet die Stornierungsrate (invertiert: weniger = besser)
   */
  static async calculateCancellationRate(companyId: string): Promise<{ score: number; total: number; cancelled: number }> {
    try {
      const ordersRef = collection(db, 'companies', companyId, 'auftraege');
      const ordersSnap = await getDocs(ordersRef);
      
      if (ordersSnap.empty) {
        return { score: 0, total: 0, cancelled: 0 };
      }
      
      let totalOrders = 0;
      let cancelledOrders = 0;
      
      ordersSnap.forEach((orderDoc) => {
        const order = orderDoc.data();
        // Zähle alle bearbeiteten Aufträge
        if (order.status === 'completed' || order.status === 'cancelled') {
          totalOrders++;
          if (order.status === 'cancelled') {
            cancelledOrders++;
          }
        }
      });
      
      if (totalOrders === 0) {
        return { score: 0, total: 0, cancelled: 0 };
      }
      
      // Score: 10 = 0% Stornos, 0 = 100% Stornos
      const nonCancelledPercent = ((totalOrders - cancelledOrders) / totalOrders) * 100;
      const score = (nonCancelledPercent / 100) * 10;
      
      return { score: Math.round(score * 10) / 10, total: totalOrders, cancelled: cancelledOrders };
    } catch {
      return { score: 0, total: 0, cancelled: 0 };
    }
  }

  /**
   * Berechnet den Lieferpünktlichkeits-Score
   */
  static async calculateDeliveryScore(companyId: string): Promise<{ score: number; total: number; onTime: number }> {
    try {
      const ordersRef = collection(db, 'companies', companyId, 'auftraege');
      const completedQuery = query(ordersRef, where('status', '==', 'completed'));
      const ordersSnap = await getDocs(completedQuery);
      
      if (ordersSnap.empty) {
        return { score: 0, total: 0, onTime: 0 };
      }
      
      let totalOrders = 0;
      let onTimeOrders = 0;
      
      ordersSnap.forEach((orderDoc) => {
        const order = orderDoc.data();
        totalOrders++;
        
        // Prüfe ob pünktlich geliefert wurde
        if (order.completedAt && order.deadline) {
          const completedAt = order.completedAt instanceof Timestamp 
            ? order.completedAt.toDate() 
            : new Date(order.completedAt);
          const deadline = order.deadline instanceof Timestamp 
            ? order.deadline.toDate() 
            : new Date(order.deadline);
          
          if (completedAt <= deadline) {
            onTimeOrders++;
          }
        } else if (order.deliveredOnTime === true || !order.wasLate) {
          // Fallback auf explizite Felder
          onTimeOrders++;
        }
      });
      
      if (totalOrders === 0) {
        return { score: 0, total: 0, onTime: 0 };
      }
      
      // Score: 10 = 100% pünktlich, 0 = keine pünktlichen Lieferungen
      const onTimePercent = (onTimeOrders / totalOrders) * 100;
      const score = (onTimePercent / 100) * 10;
      
      return { score: Math.round(score * 10) / 10, total: totalOrders, onTime: onTimeOrders };
    } catch {
      return { score: 0, total: 0, onTime: 0 };
    }
  }

  /**
   * Ermittelt den vollständigen Level-Status eines Taskers
   */
  static async getTaskerLevelStatus(companyId: string): Promise<TaskerLevelStatus> {
    const metrics = await this.getTaskerMetrics(companyId);
    const calculatedLevel = this.calculateLevel(metrics);

    // Lade gespeicherten Level-Status
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    const savedLevelData = companyDoc.exists() ? companyDoc.data().taskerLevel || {} : {};

    const currentLevel = savedLevelData.currentLevel || calculatedLevel;
    const nextLevel = this.getNextLevel(currentLevel);
    const progress = this.calculateProgress(metrics, currentLevel);

    // Prüfe ob Level-Abstieg droht
    const atRisk = !this.meetsRequirements(metrics, currentLevel) && currentLevel !== 'new';

    // Grace Period (30 Tage)
    let gracePeriodEnd = savedLevelData.gracePeriodEnd 
      ? (savedLevelData.gracePeriodEnd instanceof Timestamp 
          ? savedLevelData.gracePeriodEnd.toDate() 
          : new Date(savedLevelData.gracePeriodEnd))
      : null;

    if (atRisk && !gracePeriodEnd) {
      gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);
    } else if (!atRisk) {
      gracePeriodEnd = null;
    }

    return {
      currentLevel,
      metrics,
      nextLevel,
      progress,
      levelSince: savedLevelData.levelSince 
        ? (savedLevelData.levelSince instanceof Timestamp 
            ? savedLevelData.levelSince.toDate() 
            : new Date(savedLevelData.levelSince))
        : null,
      lastEvaluated: new Date(),
      pendingManualReview: currentLevel === 'level2' && calculatedLevel === 'top_rated' && !savedLevelData.manualReviewPassed,
      gracePeriodEnd,
      atRisk,
    };
  }

  /**
   * Aktualisiert den Level-Status in Firebase
   */
  static async updateTaskerLevel(companyId: string): Promise<TaskerLevelStatus> {
    const status = await this.getTaskerLevelStatus(companyId);

    await updateDoc(doc(db, 'companies', companyId), {
      taskerLevel: {
        currentLevel: status.currentLevel,
        metrics: status.metrics,
        levelSince: status.levelSince || new Date(),
        lastEvaluated: new Date(),
        gracePeriodEnd: status.gracePeriodEnd,
        atRisk: status.atRisk,
        pendingManualReview: status.pendingManualReview,
      },
    });

    return status;
  }

  /**
   * Gibt leere Metriken zurück
   */
  static getEmptyMetrics(): TaskerMetrics {
    return {
      successScore: 0,
      rating: 0,
      ratingCount: 0,
      responseRate: 100,
      completedOrders: 0,
      uniqueClients: 0,
      totalEarnings: 0,
      clientSatisfaction: 0,
      effectiveCommunication: 10,
      conflictFreeOrders: 10,
      orderCancellations: 10,
      deliveryTime: 10,
      valueForMoney: 0,
    };
  }

  /**
   * Formatiert den Level-Namen für die Anzeige
   */
  static getLevelDisplayName(level: TaskiloLevel): string {
    return LEVEL_DETAILS[level].name;
  }

  /**
   * Gibt die Level-Farben zurück
   */
  static getLevelColors(level: TaskiloLevel): { color: string; bgColor: string; borderColor: string } {
    return {
      color: LEVEL_DETAILS[level].color,
      bgColor: LEVEL_DETAILS[level].bgColor,
      borderColor: LEVEL_DETAILS[level].borderColor,
    };
  }

  /**
   * Gibt die Benefits für ein Level zurück
   */
  static getLevelBenefits(level: TaskiloLevel) {
    return LEVEL_BENEFITS[level];
  }
}
