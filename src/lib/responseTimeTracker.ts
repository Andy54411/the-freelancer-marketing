import { db } from '@/firebase/clients';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface ResponseTimeMetric {
  id?: string;
  providerId: string;
  messageId: string;
  chatId: string;
  customerMessageTime: Timestamp;
  providerResponseTime?: Timestamp;
  responseTimeHours?: number;
  isWithinGuarantee?: boolean;
  guaranteeHours: number;
  createdAt: Timestamp;
}

export interface LocalTrackingData {
  providerId: string;
  messageId: string;
  chatId: string;
  customerMessageTime: number;
  guaranteeHours: number;
  createdAt: number;
  responseTime?: number;
  responseTimeHours?: number;
  isWithinGuarantee?: boolean;
  responseMessageId?: string;
}

export interface ResponseTimeStats {
  averageResponseTimeHours: number;
  totalMessages: number;
  responsesWithinGuarantee: number;
  guaranteeComplianceRate: number; // Prozentsatz
  lastUpdated: Timestamp;
}

export class ResponseTimeTracker {
  /**
   * Startet die Zeitmessung für eine Kundennachricht
   * CLIENT-VERSION: Nur lokale Speicherung, keine Firestore-Schreibvorgänge
   */
  static async startTracking(
    providerId: string,
    chatId: string,
    messageId: string,
    guaranteeHours: number = 24
  ): Promise<void> {
    try {
      // CLIENT-SEITIGE VERSION: Nur lokale Speicherung
      const trackingData: LocalTrackingData = {
        providerId,
        messageId,
        chatId,
        customerMessageTime: Date.now(),
        guaranteeHours,
        createdAt: Date.now(),
      };

      // Lokale Speicherung im LocalStorage für Client-seitige Verfolgung
      const existingData = localStorage.getItem('responseTimeTracking') || '{}';
      const allTracking: Record<string, LocalTrackingData> = JSON.parse(existingData);
      allTracking[messageId] = trackingData;
      localStorage.setItem('responseTimeTracking', JSON.stringify(allTracking));

      // HINWEIS: Echte Metrics werden durch Cloud Functions erstellt
      // Diese Client-Version dient nur zur lokalen Verfolgung
    } catch (error) {}
  }

  /**
   * Stoppt die Zeitmessung und berechnet die Antwortzeit
   * CLIENT-VERSION: Nur lokale Verarbeitung
   */
  static async recordProviderResponse(
    providerId: string,
    chatId: string,
    responseMessageId: string
  ): Promise<void> {
    try {
      // CLIENT-SEITIGE VERSION: Lokale Datenverarbeitung
      const existingData = localStorage.getItem('responseTimeTracking') || '{}';
      const allTracking: Record<string, LocalTrackingData> = JSON.parse(existingData);

      // Finde die letzte unbeantwortete Nachricht für diesen Chat
      let latestUnrespondedMessage: (LocalTrackingData & { messageId: string }) | null = null;
      let latestTime = 0;

      for (const [messageId, tracking] of Object.entries(allTracking)) {
        if (
          tracking.providerId === providerId &&
          tracking.chatId === chatId &&
          !tracking.responseTime &&
          tracking.customerMessageTime > latestTime
        ) {
          latestUnrespondedMessage = { ...tracking, messageId };
          latestTime = tracking.customerMessageTime;
        }
      }

      if (latestUnrespondedMessage) {
        const responseTime = Date.now();
        const responseTimeHours =
          (responseTime - latestUnrespondedMessage.customerMessageTime) / (1000 * 60 * 60);
        const isWithinGuarantee = responseTimeHours <= latestUnrespondedMessage.guaranteeHours;

        // Aktualisiere lokale Daten
        allTracking[latestUnrespondedMessage.messageId].responseTime = responseTime;
        allTracking[latestUnrespondedMessage.messageId].responseTimeHours = responseTimeHours;
        allTracking[latestUnrespondedMessage.messageId].isWithinGuarantee = isWithinGuarantee;
        allTracking[latestUnrespondedMessage.messageId].responseMessageId = responseMessageId;

        localStorage.setItem('responseTimeTracking', JSON.stringify(allTracking));

        // HINWEIS: Echte Metrics-Updates werden durch Cloud Functions verarbeitet
      }
    } catch (error) {}
  }

  /**
   * Aktualisiert die Antwortzeit-Statistiken für einen Provider
   * CLIENT-VERSION: Deaktiviert, da nur Cloud Functions schreiben können
   */
  static async updateProviderStats(providerId: string): Promise<void> {
    try {
      // Hole alle Metriken der letzten 30 Tage
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const metricsQuery = query(
        collection(db, 'responseTimeMetrics'),
        where('providerId', '==', providerId),
        where('providerResponseTime', '!=', null),
        where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
      );

      const metricsSnapshot = await getDocs(metricsQuery);
      const metrics = metricsSnapshot.docs.map(doc => doc.data() as ResponseTimeMetric);

      if (metrics.length === 0) return;

      // Berechne Statistiken
      const totalResponseTime = metrics.reduce(
        (sum, metric) => sum + (metric.responseTimeHours || 0),
        0
      );
      const averageResponseTimeHours = totalResponseTime / metrics.length;
      const responsesWithinGuarantee = metrics.filter(metric => metric.isWithinGuarantee).length;
      const guaranteeComplianceRate = (responsesWithinGuarantee / metrics.length) * 100;

      const stats: ResponseTimeStats = {
        averageResponseTimeHours: Math.round(averageResponseTimeHours * 100) / 100,
        totalMessages: metrics.length,
        responsesWithinGuarantee,
        guaranteeComplianceRate: Math.round(guaranteeComplianceRate * 100) / 100,
        lastUpdated: serverTimestamp() as Timestamp,
      };

      // Aktualisiere Provider-Dokument (verwende users als Hauptcollection)
      const providerDocRef = doc(db, 'users', providerId);
      const providerDoc = await getDoc(providerDocRef);

      if (providerDoc.exists()) {
        await updateDoc(providerDocRef, {
          responseTimeStats: stats,
          averageResponseTimeHours: stats.averageResponseTimeHours,
          guaranteeComplianceRate: stats.guaranteeComplianceRate,
        });
      } else {
        // Versuche auch in users Collection
        const userDocRef = doc(db, 'users', providerId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          await updateDoc(userDocRef, {
            responseTimeStats: stats,
            averageResponseTimeHours: stats.averageResponseTimeHours,
            guaranteeComplianceRate: stats.guaranteeComplianceRate,
          });
        }
      }
    } catch (error) {}
  }

  /**
   * Holt die aktuellen Antwortzeit-Statistiken für einen Provider
   */
  static async getProviderResponseTimeStats(providerId: string): Promise<ResponseTimeStats | null> {
    try {
      // Verwende users Collection als Hauptcollection
      const providerDoc = await getDoc(doc(db, 'users', providerId));

      if (providerDoc.exists()) {
        const data = providerDoc.data();
        return data.responseTimeStats || null;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Überprüft überfällige Antworten und markiert sie
   */
  static async checkOverdueResponses(): Promise<void> {
    try {
      const now = new Date();

      // Finde alle unbeantworteten Nachrichten
      const metricsQuery = query(
        collection(db, 'responseTimeMetrics'),
        where('providerResponseTime', '==', null)
      );

      const metricsSnapshot = await getDocs(metricsQuery);

      for (const metricDoc of metricsSnapshot.docs) {
        const metric = metricDoc.data() as ResponseTimeMetric;
        const customerMessageTime = metric.customerMessageTime.toDate();
        const hoursElapsed = (now.getTime() - customerMessageTime.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed > metric.guaranteeHours) {
          // Markiere als überfällig
          await updateDoc(doc(db, 'responseTimeMetrics', metricDoc.id), {
            isOverdue: true,
            hoursOverdue: Math.round((hoursElapsed - metric.guaranteeHours) * 100) / 100,
          });
        }
      }
    } catch (error) {}
  }

  /**
   * Formatiert Antwortzeit für Anzeige
   */
  static formatResponseTime(hours: number): string {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} Min`;
    } else if (hours < 24) {
      return `${Math.round(hours)} Std`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      if (remainingHours === 0) {
        return `${days} Tag${days > 1 ? 'e' : ''}`;
      }
      return `${days}T ${remainingHours}Std`;
    }
  }

  /**
   * Berechnet die Antwortzeit-Garantie-Farbe für UI
   */
  static getResponseTimeColor(complianceRate: number): string {
    if (complianceRate >= 95) return 'text-green-600';
    if (complianceRate >= 85) return 'text-yellow-600';
    if (complianceRate >= 70) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Gibt die Antwortzeit-Garantie-Beschreibung zurück
   */
  static getResponseTimeDescription(complianceRate: number): string {
    if (complianceRate >= 95) return 'Exzellent';
    if (complianceRate >= 85) return 'Sehr gut';
    if (complianceRate >= 70) return 'Gut';
    return 'Verbesserungsbedarf';
  }
}
