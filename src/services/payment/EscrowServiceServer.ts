/**
 * EscrowServiceServer - Server-seitige Escrow-Operationen mit Admin SDK
 * 
 * Verwendet den Firebase Admin SDK für API Routes.
 * Umgeht Firestore-Sicherheitsregeln (für vertrauenswürdige Server-Operationen).
 */

import { db } from '@/firebase/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

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
// ESCROW SERVICE (SERVER)
// ============================================================================

export class EscrowServiceServer {
  private static COLLECTION = 'escrows';
  private static DEFAULT_CLEARING_DAYS = 14;
  private static DEFAULT_PLATFORM_FEE_PERCENT = 10;

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
      platformFeePercent = this.DEFAULT_PLATFORM_FEE_PERCENT,
      description,
      metadata,
    } = params;

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

    await db.collection(this.COLLECTION).doc(escrowId).set(escrowData);

    return escrowData as EscrowRecord;
  }

  /**
   * Holt einen Escrow by ID
   */
  static async getById(escrowId: string): Promise<EscrowRecord | null> {
    // db is imported from @/firebase/server
    const doc = await db.collection(this.COLLECTION).doc(escrowId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as EscrowRecord;
  }

  /**
   * Markiert Escrow als "gehalten" (Zahlung eingegangen)
   */
  static async markAsHeld(escrowId: string, paymentId?: string): Promise<void> {
    // db is imported from @/firebase/server
    const escrowRef = db.collection(this.COLLECTION).doc(escrowId);
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
    // db is imported from @/firebase/server
    const escrowRef = db.collection(this.COLLECTION).doc(escrowId);
    
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
    // db is imported from @/firebase/server
    const escrowRef = db.collection(this.COLLECTION).doc(escrowId);
    
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
    // db is imported from @/firebase/server
    const escrowRef = db.collection(this.COLLECTION).doc(escrowId);
    
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
    // db is imported from @/firebase/server
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('buyerId', '==', buyerId)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as EscrowRecord);
  }

  /**
   * Holt Escrows für einen Anbieter
   */
  static async getByProvider(providerId: string): Promise<EscrowRecord[]> {
    // db is imported from @/firebase/server
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('providerId', '==', providerId)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as EscrowRecord);
  }
}
