// src/services/usageTrackingService.ts
import { db } from '@/firebase/clients';
import { doc, updateDoc, increment, getDoc, collection, getDocs } from 'firebase/firestore';

/**
 * Usage Tracking Service
 * Trackt sowohl Storage (Dateien) als auch Firestore (Datenbank) Nutzung
 */
export class UsageTrackingService {
  /**
   * Fügt Storage-Größe zum Gesamt-Verbrauch hinzu
   * @param companyId - Die Firmen-ID
   * @param fileSize - Die Dateigröße in Bytes
   */
  static async trackStorageUpload(companyId: string, fileSize: number): Promise<void> {
    try {
      const companyRef = doc(db, 'companies', companyId);

      await updateDoc(companyRef, {
        'usage.storageUsed': increment(fileSize),
        'usage.lastStorageUpdate': new Date(),
      });
    } catch (error) {
      console.error('[Usage Tracking] Error tracking storage upload:', error);
    }
  }

  /**
   * Entfernt Storage-Größe vom Gesamt-Verbrauch
   * @param companyId - Die Firmen-ID
   * @param fileSize - Die Dateigröße in Bytes
   */
  static async trackStorageDeletion(companyId: string, fileSize: number): Promise<void> {
    try {
      const companyRef = doc(db, 'companies', companyId);

      await updateDoc(companyRef, {
        'usage.storageUsed': increment(-fileSize),
        'usage.lastStorageUpdate': new Date(),
      });
    } catch (error) {
      console.error('[Usage Tracking] Error tracking storage deletion:', error);
    }
  }

  /**
   * Trackt Firestore Dokument-Erstellung
   * @param companyId - Die Firmen-ID
   * @param documentSize - Geschätzte Dokumentgröße in Bytes
   */
  static async trackFirestoreWrite(companyId: string, documentSize: number): Promise<void> {
    try {
      const companyRef = doc(db, 'companies', companyId);

      await updateDoc(companyRef, {
        'usage.firestoreUsed': increment(documentSize),
        'usage.firestoreWrites': increment(1),
        'usage.lastFirestoreUpdate': new Date(),
      });
    } catch (error) {
      console.error('[Usage Tracking] Error tracking Firestore write:', error);
    }
  }

  /**
   * Trackt Firestore Dokument-Löschung
   * @param companyId - Die Firmen-ID
   * @param documentSize - Geschätzte Dokumentgröße in Bytes
   */
  static async trackFirestoreDeletion(companyId: string, documentSize: number): Promise<void> {
    try {
      const companyRef = doc(db, 'companies', companyId);

      await updateDoc(companyRef, {
        'usage.firestoreUsed': increment(-documentSize),
        'usage.firestoreDeletes': increment(1),
        'usage.lastFirestoreUpdate': new Date(),
      });
    } catch (error) {
      console.error('[Usage Tracking] Error tracking Firestore deletion:', error);
    }
  }

  /**
   * Berechnet die Größe eines Firestore-Dokuments
   * @param data - Das Dokument-Objekt
   * @returns Geschätzte Größe in Bytes
   */
  static calculateDocumentSize(data: any): number {
    // Konvertiere zu JSON String und messe Größe
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonString]).size;

    // Firestore overhead: ~32 bytes pro Dokument + Field overhead
    const overhead = 32 + Object.keys(data).length * 8;

    return sizeInBytes + overhead;
  }

  /**
   * Holt die aktuelle Gesamt-Nutzung (Storage + Firestore)
   * @param companyId - Die Firmen-ID
   * @returns Nutzungs-Statistiken
   */
  static async getUsageStats(companyId: string): Promise<{
    storage: { used: number; limit: number };
    firestore: { used: number; writes: number; deletes: number };
    total: { used: number; limit: number };
  }> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);

      if (!companySnap.exists()) {
        return {
          storage: { used: 0, limit: 1 * 1024 * 1024 * 1024 },
          firestore: { used: 0, writes: 0, deletes: 0 },
          total: { used: 0, limit: 1 * 1024 * 1024 * 1024 },
        };
      }

      const data = companySnap.data();
      const usage = data.usage || {};

      const storageUsed = usage.storageUsed || 0;
      const firestoreUsed = usage.firestoreUsed || 0;
      const storageLimit = data.storageLimit || 1 * 1024 * 1024 * 1024; // Default 1GB

      return {
        storage: {
          used: storageUsed,
          limit: storageLimit,
        },
        firestore: {
          used: firestoreUsed,
          writes: usage.firestoreWrites || 0,
          deletes: usage.firestoreDeletes || 0,
        },
        total: {
          used: storageUsed + firestoreUsed,
          limit: storageLimit,
        },
      };
    } catch (error) {
      console.error('[Usage Tracking] Error getting usage stats:', error);
      return {
        storage: { used: 0, limit: 1 * 1024 * 1024 * 1024 },
        firestore: { used: 0, writes: 0, deletes: 0 },
        total: { used: 0, limit: 1 * 1024 * 1024 * 1024 },
      };
    }
  }

  /**
   * Überprüft, ob genug Platz verfügbar ist (Storage + Firestore)
   * @param companyId - Die Firmen-ID
   * @param requiredSize - Benötigte Größe in Bytes
   * @returns true wenn genug Platz vorhanden ist
   */
  static async hasSpaceAvailable(companyId: string, requiredSize: number): Promise<boolean> {
    try {
      const stats = await this.getUsageStats(companyId);
      return stats.total.used + requiredSize <= stats.total.limit;
    } catch (error) {
      console.error('[Usage Tracking] Error checking space availability:', error);
      return false;
    }
  }

  /**
   * Formatiert Bytes in lesbare Größe
   * @param bytes - Anzahl der Bytes
   * @returns Formatierte Größe (z.B. "1.5 GB")
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Berechnet den Gesamt-Nutzungs-Prozentsatz
   * @param companyId - Die Firmen-ID
   * @returns Prozentsatz (0-100)
   */
  static async getUsagePercentage(companyId: string): Promise<number> {
    try {
      const stats = await this.getUsageStats(companyId);
      return Math.round((stats.total.used / stats.total.limit) * 100);
    } catch (error) {
      console.error('[Usage Tracking] Error calculating usage percentage:', error);
      return 0;
    }
  }

  /**
   * Berechnet die Firestore-Größe einer Collection
   * @param companyId - Die Firmen-ID
   * @param collectionName - Name der Collection
   * @returns Geschätzte Größe in Bytes
   */
  static async calculateCollectionSize(companyId: string, collectionName: string): Promise<number> {
    try {
      const collectionRef = collection(db, 'companies', companyId, collectionName);
      const snapshot = await getDocs(collectionRef);

      let totalSize = 0;
      snapshot.forEach(doc => {
        totalSize += this.calculateDocumentSize(doc.data());
      });

      return totalSize;
    } catch (error) {
      console.error(
        `[Usage Tracking] Error calculating collection size for ${collectionName}:`,
        error
      );
      return 0;
    }
  }
}

// Backward compatibility: Export old StorageTrackingService methods
export class StorageTrackingService {
  static async trackUpload(companyId: string, fileSize: number): Promise<void> {
    return UsageTrackingService.trackStorageUpload(companyId, fileSize);
  }

  static async trackDeletion(companyId: string, fileSize: number): Promise<void> {
    return UsageTrackingService.trackStorageDeletion(companyId, fileSize);
  }

  static async getStorageUsage(companyId: string): Promise<number> {
    const stats = await UsageTrackingService.getUsageStats(companyId);
    return stats.storage.used;
  }

  static async hasStorageAvailable(companyId: string, requiredSize: number): Promise<boolean> {
    return UsageTrackingService.hasSpaceAvailable(companyId, requiredSize);
  }

  static formatBytes(bytes: number): string {
    return UsageTrackingService.formatBytes(bytes);
  }

  static async getStoragePercentage(companyId: string): Promise<number> {
    return UsageTrackingService.getUsagePercentage(companyId);
  }
}
