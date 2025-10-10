// src/services/storageTrackingService.ts
import { db } from '@/firebase/clients';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

/**
 * Storage Tracking Service
 * Trackt den Speicherverbrauch pro Firma über alle Dokumente hinweg
 */
export class StorageTrackingService {
  /**
   * Fügt die Dateigröße zum Gesamt-Storage der Firma hinzu
   * @param companyId - Die Firmen-ID
   * @param fileSize - Die Dateigröße in Bytes
   */
  static async trackUpload(companyId: string, fileSize: number): Promise<void> {
    try {
      const companyRef = doc(db, 'companies', companyId);

      await updateDoc(companyRef, {
        storageUsed: increment(fileSize),
        lastStorageUpdate: new Date(),
      });

      console.log(`[Storage Tracking] Added ${fileSize} bytes to company ${companyId}`);
    } catch (error) {
      console.error('[Storage Tracking] Error tracking upload:', error);
      // Nicht werfen - Upload soll nicht fehlschlagen wegen Tracking
    }
  }

  /**
   * Entfernt die Dateigröße vom Gesamt-Storage der Firma
   * @param companyId - Die Firmen-ID
   * @param fileSize - Die Dateigröße in Bytes
   */
  static async trackDeletion(companyId: string, fileSize: number): Promise<void> {
    try {
      const companyRef = doc(db, 'companies', companyId);

      await updateDoc(companyRef, {
        storageUsed: increment(-fileSize), // Negativ für Subtraktion
        lastStorageUpdate: new Date(),
      });

      console.log(`[Storage Tracking] Removed ${fileSize} bytes from company ${companyId}`);
    } catch (error) {
      console.error('[Storage Tracking] Error tracking deletion:', error);
    }
  }

  /**
   * Holt den aktuellen Storage-Verbrauch einer Firma
   * @param companyId - Die Firmen-ID
   * @returns Storage in Bytes
   */
  static async getStorageUsage(companyId: string): Promise<number> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);

      if (!companySnap.exists()) {
        return 0;
      }

      return companySnap.data().storageUsed || 0;
    } catch (error) {
      console.error('[Storage Tracking] Error getting storage usage:', error);
      return 0;
    }
  }

  /**
   * Überprüft, ob genug Storage verfügbar ist
   * @param companyId - Die Firmen-ID
   * @param requiredSize - Benötigte Größe in Bytes
   * @returns true wenn genug Platz vorhanden ist
   */
  static async hasStorageAvailable(companyId: string, requiredSize: number): Promise<boolean> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);

      if (!companySnap.exists()) {
        return false;
      }

      const data = companySnap.data();
      const storageUsed = data.storageUsed || 0;
      const storageLimit = data.storageLimit || 1 * 1024 * 1024 * 1024; // Default 1GB

      return storageUsed + requiredSize <= storageLimit;
    } catch (error) {
      console.error('[Storage Tracking] Error checking storage availability:', error);
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
   * Berechnet den Storage-Prozentsatz
   * @param companyId - Die Firmen-ID
   * @returns Prozentsatz (0-100)
   */
  static async getStoragePercentage(companyId: string): Promise<number> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);

      if (!companySnap.exists()) {
        return 0;
      }

      const data = companySnap.data();
      const storageUsed = data.storageUsed || 0;
      const storageLimit = data.storageLimit || 1 * 1024 * 1024 * 1024; // Default 1GB

      return Math.round((storageUsed / storageLimit) * 100);
    } catch (error) {
      console.error('[Storage Tracking] Error calculating storage percentage:', error);
      return 0;
    }
  }
}
