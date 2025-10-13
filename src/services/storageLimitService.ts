/**
 * Storage Limit Enforcement Service
 *
 * Handles:
 * - Free plan limit checks (500 MB)
 * - Paid plan limit checks
 * - Upload blocking when over limit
 * - Download blocking when over limit
 * - Cancellation consent tracking
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  percentUsed: number;
  isOverLimit: boolean;
}

export interface CancellationConsent {
  consentGiven: boolean;
  consentDate: any; // Firestore Timestamp
  ipAddress: string;
  userSignature: string; // User's full name as signature
  acknowledgement: string;
  warningShown: boolean;
  currentUsage: number;
  planId: string;
}

export class StorageLimitService {
  /**
   * Check if upload is allowed based on current usage and limit
   */
  static async canUpload(companyId: string, fileSize: number): Promise<LimitCheckResult> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) {
        return {
          allowed: false,
          reason: 'Firma nicht gefunden',
          currentUsage: 0,
          limit: 0,
          percentUsed: 0,
          isOverLimit: true,
        };
      }

      const data = companyDoc.data();
      const usage = data.usage || {};
      const currentUsage = (usage.storageUsed || 0) + (usage.firestoreUsed || 0);
      const storageLimit = data.storageLimit || 500 * 1024 * 1024; // Default 500 MB
      const storagePlanId = data.storagePlanId || 'free';

      const futureUsage = currentUsage + fileSize;
      const percentUsed = (currentUsage / storageLimit) * 100;
      const isOverLimit = futureUsage > storageLimit;

      if (isOverLimit) {
        return {
          allowed: false,
          reason:
            storagePlanId === 'free'
              ? 'Sie haben Ihr kostenloses 500 MB Limit erreicht. Bitte upgraden Sie Ihren Plan.'
              : `Sie haben Ihr ${this.formatBytes(storageLimit)} Limit erreicht. Bitte upgraden Sie Ihren Plan oder löschen Sie Dateien.`,
          currentUsage,
          limit: storageLimit,
          percentUsed,
          isOverLimit: true,
        };
      }

      return {
        allowed: true,
        currentUsage,
        limit: storageLimit,
        percentUsed,
        isOverLimit: false,
      };
    } catch (error) {
      console.error('[StorageLimitService] Error checking upload permission:', error);
      return {
        allowed: false,
        reason: 'Fehler beim Prüfen des Speicherlimits',
        currentUsage: 0,
        limit: 0,
        percentUsed: 0,
        isOverLimit: true,
      };
    }
  }

  /**
   * Check if download is allowed (blocked if over limit)
   */
  static async canDownload(companyId: string): Promise<LimitCheckResult> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) {
        return {
          allowed: false,
          reason: 'Firma nicht gefunden',
          currentUsage: 0,
          limit: 0,
          percentUsed: 0,
          isOverLimit: true,
        };
      }

      const data = companyDoc.data();
      const usage = data.usage || {};
      const currentUsage = (usage.storageUsed || 0) + (usage.firestoreUsed || 0);
      const storageLimit = data.storageLimit || 500 * 1024 * 1024;
      const storagePlanId = data.storagePlanId || 'free';

      const percentUsed = (currentUsage / storageLimit) * 100;
      const isOverLimit = currentUsage > storageLimit;

      if (isOverLimit) {
        return {
          allowed: false,
          reason:
            storagePlanId === 'free'
              ? '❌ Downloads sind gesperrt. Sie haben Ihr 500 MB Limit überschritten. Bitte upgraden Sie.'
              : '❌ Downloads sind gesperrt. Sie haben Ihr Speicherlimit überschritten. Bitte upgraden Sie oder löschen Sie Dateien.',
          currentUsage,
          limit: storageLimit,
          percentUsed,
          isOverLimit: true,
        };
      }

      return {
        allowed: true,
        currentUsage,
        limit: storageLimit,
        percentUsed,
        isOverLimit: false,
      };
    } catch (error) {
      console.error('[StorageLimitService] Error checking download permission:', error);
      return {
        allowed: false,
        reason: 'Fehler beim Prüfen der Download-Berechtigung',
        currentUsage: 0,
        limit: 0,
        percentUsed: 0,
        isOverLimit: true,
      };
    }
  }

  /**
   * Record cancellation consent before allowing plan cancellation
   */
  static async recordCancellationConsent(
    companyId: string,
    userSignature: string,
    ipAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) {
        return { success: false, error: 'Firma nicht gefunden' };
      }

      const data = companyDoc.data();
      const usage = data.usage || {};
      const currentUsage = (usage.storageUsed || 0) + (usage.firestoreUsed || 0);
      const storagePlanId = data.storagePlanId || 'free';

      const consent: CancellationConsent = {
        consentGiven: true,
        consentDate: serverTimestamp(),
        ipAddress,
        userSignature,
        acknowledgement:
          'Ich bestätige, dass ich über die Löschung meiner Daten nach Ablauf des Plans informiert wurde und stimme zu.',
        warningShown: true,
        currentUsage,
        planId: storagePlanId,
      };

      await updateDoc(companyRef, {
        storageCancellation: consent,
        'storageCancellation.recordedAt': serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('[StorageLimitService] Error recording consent:', error);
      return { success: false, error: 'Fehler beim Speichern der Zustimmung' };
    }
  }

  /**
   * Check if company has given cancellation consent
   */
  static async hasCancellationConsent(companyId: string): Promise<boolean> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) return false;

      const data = companyDoc.data();
      const consent = data.storageCancellation as CancellationConsent | undefined;

      return consent?.consentGiven === true;
    } catch (error) {
      console.error('[StorageLimitService] Error checking consent:', error);
      return false;
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const kb = bytes / 1024;
    const mb = bytes / (1024 * 1024);
    const gb = bytes / (1024 * 1024 * 1024);

    if (gb >= 1) {
      return gb.toFixed(2) + ' GB';
    } else if (mb >= 1) {
      return mb.toFixed(2) + ' MB';
    } else if (kb >= 1) {
      return kb.toFixed(2) + ' KB';
    } else {
      return bytes + ' B';
    }
  }

  /**
   * Get current storage status for display
   */
  static async getStorageStatus(companyId: string): Promise<{
    usage: number;
    limit: number;
    percentUsed: number;
    planId: string;
    isOverLimit: boolean;
    canUpload: boolean;
    canDownload: boolean;
  }> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) {
        return {
          usage: 0,
          limit: 500 * 1024 * 1024,
          percentUsed: 0,
          planId: 'free',
          isOverLimit: false,
          canUpload: false,
          canDownload: false,
        };
      }

      const data = companyDoc.data();
      const usage = data.usage || {};
      const currentUsage = (usage.storageUsed || 0) + (usage.firestoreUsed || 0);
      const storageLimit = data.storageLimit || 500 * 1024 * 1024;
      const storagePlanId = data.storagePlanId || 'free';
      const percentUsed = (currentUsage / storageLimit) * 100;
      const isOverLimit = currentUsage > storageLimit;

      return {
        usage: currentUsage,
        limit: storageLimit,
        percentUsed,
        planId: storagePlanId,
        isOverLimit,
        canUpload: !isOverLimit,
        canDownload: !isOverLimit, // Blocked if over limit
      };
    } catch (error) {
      console.error('[StorageLimitService] Error getting storage status:', error);
      return {
        usage: 0,
        limit: 500 * 1024 * 1024,
        percentUsed: 0,
        planId: 'free',
        isOverLimit: false,
        canUpload: false,
        canDownload: false,
      };
    }
  }
}
