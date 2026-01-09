/**
 * EscrowServiceServer - Server-seitige Escrow-Operationen mit Admin SDK
 * 
 * Verwendet den Firebase Admin SDK für API Routes.
 * Umgeht Firestore-Sicherheitsregeln (für vertrauenswürdige Server-Operationen).
 */

import { db } from '@/firebase/server';
import { FieldValue, Timestamp, Firestore } from 'firebase-admin/firestore';
import { type TaskiloLevel, PAYOUT_CONFIG } from '@/services/TaskiloLevelService';

// ============================================================================
// TYPES
// ============================================================================

export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded' | 'disputed';

export interface EscrowRecord {
  id: string;
  orderId: string;
  buyerId: string;
  providerId: string;
  amount: number;
  currency: string;
  platformFee: number;
  providerAmount: number;
  status: EscrowStatus;
  clearingDays: number;
  clearingEndsAt: Timestamp | null;
  paymentMethod: 'revolut' | 'bank_transfer';
  paymentId?: string;
  payoutId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  heldAt?: Timestamp;
  releasedAt?: Timestamp;
  refundedAt?: Timestamp;
  disputedAt?: Timestamp;
}

export interface CreateEscrowParams {
  orderId: string;
  buyerId: string;
  providerId: string;
  amount: number;
  currency?: string;
  clearingDays?: number;
  platformFeePercent?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// HELPER
// ============================================================================

/**
 * Gibt die Firestore-Instanz zurück oder wirft einen Fehler wenn nicht verfügbar
 */
function getFirestore(): Firestore {
  if (!db) {
    throw new Error('Firestore is not available');
  }
  return db;
}

// ============================================================================
// ESCROW SERVICE (SERVER)
// ============================================================================

export class EscrowServiceServer {
  private static COLLECTION = 'escrows';
  private static DEFAULT_CLEARING_DAYS = 14;

  /**
   * Holt die Platform-Gebühr basierend auf dem Provider-Level
   * - new/level1: 15%
   * - level2/top_rated: 10%
   */
  static async getPlatformFeePercent(providerId: string): Promise<number> {
    try {
      const firestore = getFirestore();
      const companyDoc = await firestore.collection('companies').doc(providerId).get();
      if (!companyDoc.exists) {
        return 15; // Default für neue Unternehmen
      }
      
      const companyData = companyDoc.data();
      const taskerLevel = (companyData?.taskerLevel?.currentLevel || 'new') as TaskiloLevel;
      return PAYOUT_CONFIG[taskerLevel].platformFeePercent;
    } catch {
      return 15; // Default bei Fehler
    }
  }

  /**
   * Erstellt einen neuen Escrow-Eintrag (Server-seitig mit Admin SDK)
   */
  static async create(params: CreateEscrowParams): Promise<EscrowRecord> {
    // db is imported from @/firebase/server
    const {
      orderId,
      buyerId,
      providerId,
      amount,
      currency = 'EUR',
      clearingDays = this.DEFAULT_CLEARING_DAYS,
      platformFeePercent: explicitFeePercent,
      description,
      metadata,
    } = params;

    // Hole Level-basierte Platform-Gebühr wenn nicht explizit angegeben
    const platformFeePercent = explicitFeePercent ?? await this.getPlatformFeePercent(providerId);

    const platformFee = Math.round(amount * (platformFeePercent / 100) * 100) / 100;
    const providerAmount = Math.round((amount - platformFee) * 100) / 100;

    const escrowId = `escrow_${orderId}_${Date.now()}`;
    const now = Timestamp.now();
    
    // Generiere Payment Reference für SEPA-Überweisungen (ESC-XXXXXXXX)
    const paymentReference = `ESC-${escrowId.slice(-8).toUpperCase()}`;

    const escrowData: Record<string, unknown> = {
      id: escrowId,
      orderId,
      buyerId,
      providerId,
      amount,
      currency,
      platformFee,
      providerAmount,
      status: 'pending',
      clearingDays,
      clearingEndsAt: null,
      paymentMethod: 'revolut',
      paymentReference,
      createdAt: now,
      updatedAt: now,
    };

    // Nur definierte optionale Felder hinzufügen
    if (description !== undefined) {
      escrowData.description = description;
    }
    if (metadata !== undefined) {
      escrowData.metadata = metadata;
    }

    const firestore = getFirestore();
    await firestore.collection(this.COLLECTION).doc(escrowId).set(escrowData);

    return escrowData as unknown as EscrowRecord;
  }

  /**
   * Holt einen Escrow by ID
   */
  static async getById(escrowId: string): Promise<EscrowRecord | null> {
    const firestore = getFirestore();
    const doc = await firestore.collection(this.COLLECTION).doc(escrowId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as EscrowRecord;
  }

  /**
   * Markiert Escrow als "gehalten" (Zahlung eingegangen)
   */
  static async markAsHeld(escrowId: string, paymentId?: string): Promise<void> {
    const firestore = getFirestore();
    const escrowRef = firestore.collection(this.COLLECTION).doc(escrowId);
    const escrowSnap = await escrowRef.get();

    if (!escrowSnap.exists) {
      throw new Error(`Escrow ${escrowId} not found`);
    }

    const escrow = escrowSnap.data() as EscrowRecord;
    const now = Timestamp.now();
    
    const clearingEndsAt = Timestamp.fromDate(
      new Date(now.toDate().getTime() + (escrow.clearingDays * 24 * 60 * 60 * 1000))
    );

    const updateData: Record<string, unknown> = {
      status: 'held',
      heldAt: now,
      clearingEndsAt,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (paymentId !== undefined) {
      updateData.paymentId = paymentId;
    }

    await escrowRef.update(updateData);
  }

  /**
   * Gibt Escrow frei (Auszahlung an Anbieter)
   */
  static async release(escrowId: string, payoutId?: string): Promise<void> {
    const firestore = getFirestore();
    const escrowRef = firestore.collection(this.COLLECTION).doc(escrowId);
    
    const updateData: Record<string, unknown> = {
      status: 'released',
      releasedAt: Timestamp.now(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (payoutId !== undefined) {
      updateData.payoutId = payoutId;
    }

    await escrowRef.update(updateData);
  }

  /**
   * Erstattet Escrow
   */
  static async refund(escrowId: string, reason?: string): Promise<void> {
    const firestore = getFirestore();
    const escrowRef = firestore.collection(this.COLLECTION).doc(escrowId);
    
    const updateData: Record<string, unknown> = {
      status: 'refunded',
      refundedAt: Timestamp.now(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (reason !== undefined) {
      updateData.refundReason = reason;
    }

    await escrowRef.update(updateData);
  }

  /**
   * Markiert Escrow als disputed
   */
  static async dispute(escrowId: string, reason?: string): Promise<void> {
    const firestore = getFirestore();
    const escrowRef = firestore.collection(this.COLLECTION).doc(escrowId);
    
    const updateData: Record<string, unknown> = {
      status: 'disputed',
      disputedAt: Timestamp.now(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (reason !== undefined) {
      updateData.disputeReason = reason;
    }

    await escrowRef.update(updateData);
  }

  /**
   * Holt Escrows für einen Käufer
   */
  static async getByBuyer(buyerId: string): Promise<EscrowRecord[]> {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('buyerId', '==', buyerId)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as EscrowRecord);
  }

  /**
   * Holt Escrows für einen Anbieter
   */
  static async getByProvider(providerId: string): Promise<EscrowRecord[]> {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('providerId', '==', providerId)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as EscrowRecord);
  }

  /**
   * Holt Escrow by Order ID
   */
  static async getByOrderId(orderId: string): Promise<EscrowRecord | null> {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('orderId', '==', orderId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return snapshot.docs[0].data() as EscrowRecord;
  }

  /**
   * Holt alle pending Escrows für einen Anbieter
   */
  static async getPendingEscrows(providerId: string): Promise<EscrowRecord[]> {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('providerId', '==', providerId)
      .where('status', '==', 'held')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as EscrowRecord);
  }

  /**
   * Berechnet Zusammenfassung für einen Anbieter
   */
  static async getProviderSummary(providerId: string): Promise<{
    totalHeld: number;
    totalReleased: number;
    totalRefunded: number;
    pendingPayouts: number;
    currency: string;
  }> {
    const escrows = await this.getByProvider(providerId);

    const summary = {
      totalHeld: 0,
      totalReleased: 0,
      totalRefunded: 0,
      pendingPayouts: 0,
      currency: 'EUR',
    };

    for (const escrow of escrows) {
      switch (escrow.status) {
        case 'held':
          summary.totalHeld += escrow.providerAmount;
          summary.pendingPayouts++;
          break;
        case 'released':
          summary.totalReleased += escrow.providerAmount;
          break;
        case 'refunded':
          summary.totalRefunded += escrow.amount;
          break;
      }
    }

    return summary;
  }

  /**
   * Vorzeitige Freigabe durch Käufer-Bestätigung
   */
  static async earlyRelease(escrowId: string, buyerId: string): Promise<void> {
    const escrow = await this.getById(escrowId);

    if (!escrow) {
      throw new Error(`Escrow ${escrowId} not found`);
    }

    if (escrow.buyerId !== buyerId) {
      throw new Error('Only buyer can trigger early release');
    }

    if (escrow.status !== 'held') {
      throw new Error(`Escrow is not in held status: ${escrow.status}`);
    }

    // Setze clearingEndsAt auf jetzt, damit Auszahlung sofort möglich ist
    const firestore = getFirestore();
    await firestore.collection(this.COLLECTION).doc(escrowId).update({
      clearingEndsAt: Timestamp.now(),
      earlyReleaseBy: buyerId,
      earlyReleaseAt: Timestamp.now(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
