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

export interface ResponseTimeStats {
  averageResponseTimeHours: number;
  totalMessages: number;
  responsesWithinGuarantee: number;
  guaranteeComplianceRate: number; // Prozentsatz
  lastUpdated: Timestamp;
}

export class ResponseTimeTracker {
  /**
   * Startet die Zeitmessung für eine neue Kundenanfrage
   */
  static async startResponseTimeTracking(
    providerId: string,
    chatId: string,
    messageId: string,
    guaranteeHours: number = 24
  ): Promise<void> {
    try {
      const metric: Omit<ResponseTimeMetric, 'id'> = {
        providerId,
        messageId,
        chatId,
        customerMessageTime: serverTimestamp() as Timestamp,
        guaranteeHours,
        createdAt: serverTimestamp() as Timestamp,
      };

      await addDoc(collection(db, 'responseTimeMetrics'), metric);
      console.log('[ResponseTimeTracker] Started tracking for message:', messageId);
    } catch (error) {
      console.error('[ResponseTimeTracker] Error starting tracking:', error);
    }
  }

  /**
   * Stoppt die Zeitmessung und berechnet die Antwortzeit
   */
  static async recordProviderResponse(
    providerId: string,
    chatId: string,
    responseMessageId: string
  ): Promise<void> {
    try {
      // Finde die letzte unbeantwortete Kundenanfrage in diesem Chat
      const metricsQuery = query(
        collection(db, 'responseTimeMetrics'),
        where('providerId', '==', providerId),
        where('chatId', '==', chatId),
        where('providerResponseTime', '==', null),
        orderBy('customerMessageTime', 'desc'),
        limit(1)
      );

      const metricsSnapshot = await getDocs(metricsQuery);

      if (!metricsSnapshot.empty) {
        const metricDoc = metricsSnapshot.docs[0];
        const metricData = metricDoc.data() as ResponseTimeMetric;
        const responseTime = new Date();
        const customerMessageTime = metricData.customerMessageTime.toDate();

        // Berechne Antwortzeit in Stunden
        const responseTimeHours =
          (responseTime.getTime() - customerMessageTime.getTime()) / (1000 * 60 * 60);
        const isWithinGuarantee = responseTimeHours <= metricData.guaranteeHours;

        // Update das Metric-Dokument
        await updateDoc(doc(db, 'responseTimeMetrics', metricDoc.id), {
          providerResponseTime: serverTimestamp(),
          responseTimeHours: Math.round(responseTimeHours * 100) / 100, // Runde auf 2 Dezimalstellen
          isWithinGuarantee,
        });

        console.log('[ResponseTimeTracker] Response recorded:', {
          responseTimeHours,
          isWithinGuarantee,
          guaranteeHours: metricData.guaranteeHours,
        });

        // Aktualisiere Provider-Statistiken
        await this.updateProviderStats(providerId);
      }
    } catch (error) {
      console.error('[ResponseTimeTracker] Error recording response:', error);
    }
  }

  /**
   * Aktualisiert die Antwortzeit-Statistiken für einen Provider
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

      console.log('[ResponseTimeTracker] Provider stats updated:', {
        providerId,
        stats,
      });
    } catch (error) {
      console.error('[ResponseTimeTracker] Error updating provider stats:', error);
    }
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
      console.error('[ResponseTimeTracker] Error getting provider stats:', error);
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

          console.log('[ResponseTimeTracker] Marked as overdue:', {
            providerId: metric.providerId,
            chatId: metric.chatId,
            hoursOverdue: hoursElapsed - metric.guaranteeHours,
          });
        }
      }
    } catch (error) {
      console.error('[ResponseTimeTracker] Error checking overdue responses:', error);
    }
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
