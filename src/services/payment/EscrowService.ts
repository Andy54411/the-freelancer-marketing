/**
 * EscrowService - Treuhand-System für B2B/B2C Zahlungen
 * 
 * Dieses Service verwaltet den Escrow-Workflow:
 * 1. Käufer zahlt → Geld wird im Escrow gehalten
 * 2. Anbieter liefert → Clearing-Periode beginnt
 * 3. Nach Ablauf der Clearing-Periode → Automatische Auszahlung
 * 
 * Alternative Flows:
 * - Käufer bestätigt früher → Vorzeitige Freigabe
 * - Käufer disputet → Manuelle Prüfung
 * - Käufer refundiert → Rückerstattung
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

// ============================================================================
// TYPES
// ============================================================================

export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded' | 'disputed';

export interface EscrowRecord {
  id: string;
  
  // Beteiligte
  orderId: string;
  buyerId: string;
  providerId: string;
  
  // Betrag
  amount: number;
  currency: string;
  platformFee: number; // Taskilo Provision
  providerAmount: number; // Betrag nach Abzug der Provision
  
  // Status & Zeitstempel
  status: EscrowStatus;
  clearingDays: number;
  clearingEndsAt: Timestamp | null;
  
  // Payment Details
  paymentMethod: 'revolut' | 'stripe' | 'bank_transfer';
  paymentId?: string; // Revolut/Stripe Payment ID
  payoutId?: string; // Payout Transaction ID
  
  // Metadaten
  description?: string;
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export interface EscrowSummary {
  totalHeld: number;
  totalReleased: number;
  totalRefunded: number;
  pendingPayouts: number;
  currency: string;
}

// ============================================================================
// ESCROW SERVICE
// ============================================================================

export class EscrowService {
  private static COLLECTION = 'escrows';
  private static DEFAULT_CLEARING_DAYS = 14;
  private static DEFAULT_PLATFORM_FEE_PERCENT = 10; // 10% Taskilo Provision

  /**
   * Erstellt einen neuen Escrow-Eintrag
   */
  static async create(params: CreateEscrowParams): Promise<EscrowRecord> {
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

    // Berechne Provision und Anbieter-Betrag
    const platformFee = Math.round(amount * (platformFeePercent / 100) * 100) / 100;
    const providerAmount = Math.round((amount - platformFee) * 100) / 100;

    const escrowId = `escrow_${orderId}_${Date.now()}`;
    const now = Timestamp.now();

    const escrow: EscrowRecord = {
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
      createdAt: now,
      updatedAt: now,
    };

    // Nur definierte optionale Felder hinzufügen (Firestore akzeptiert keine undefined-Werte)
    if (description !== undefined) {
      escrow.description = description;
    }
    if (metadata !== undefined) {
      escrow.metadata = metadata;
    }

    await setDoc(doc(db, this.COLLECTION, escrowId), escrow);

    return escrow;
  }

  /**
   * Markiert Escrow als "gehalten" (Zahlung eingegangen)
   */
  static async markAsHeld(escrowId: string, paymentId?: string): Promise<void> {
    const escrowRef = doc(db, this.COLLECTION, escrowId);
    const escrowSnap = await getDoc(escrowRef);

    if (!escrowSnap.exists()) {
      throw new Error(`Escrow ${escrowId} not found`);
    }

    const escrow = escrowSnap.data() as EscrowRecord;
    const now = Timestamp.now();
    
    // Berechne Clearing-Ende
    const clearingEndsAt = Timestamp.fromDate(
      new Date(now.toDate().getTime() + (escrow.clearingDays * 24 * 60 * 60 * 1000))
    );

    await updateDoc(escrowRef, {
      status: 'held',
      paymentId,
      heldAt: now,
      clearingEndsAt,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Gibt Escrow frei (Auszahlung an Anbieter)
   */
  static async release(escrowId: string, payoutId?: string): Promise<void> {
    const escrowRef = doc(db, this.COLLECTION, escrowId);
    const escrowSnap = await getDoc(escrowRef);

    if (!escrowSnap.exists()) {
      throw new Error(`Escrow ${escrowId} not found`);
    }

    const escrow = escrowSnap.data() as EscrowRecord;

    if (escrow.status !== 'held') {
      throw new Error(`Escrow ${escrowId} is not in 'held' status`);
    }

    await updateDoc(escrowRef, {
      status: 'released',
      payoutId,
      releasedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Erstattet Escrow zurück an Käufer
   */
  static async refund(escrowId: string, reason?: string): Promise<void> {
    const escrowRef = doc(db, this.COLLECTION, escrowId);
    const escrowSnap = await getDoc(escrowRef);

    if (!escrowSnap.exists()) {
      throw new Error(`Escrow ${escrowId} not found`);
    }

    const escrow = escrowSnap.data() as EscrowRecord;

    if (escrow.status === 'released') {
      throw new Error(`Escrow ${escrowId} already released, cannot refund`);
    }

    await updateDoc(escrowRef, {
      status: 'refunded',
      refundedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        ...escrow.metadata,
        refundReason: reason,
      },
    });
  }

  /**
   * Markiert Escrow als disputed
   */
  static async dispute(escrowId: string, reason: string): Promise<void> {
    const escrowRef = doc(db, this.COLLECTION, escrowId);

    await updateDoc(escrowRef, {
      status: 'disputed',
      disputedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        disputeReason: reason,
        disputeOpenedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Holt einen einzelnen Escrow
   */
  static async getById(escrowId: string): Promise<EscrowRecord | null> {
    const escrowSnap = await getDoc(doc(db, this.COLLECTION, escrowId));
    
    if (!escrowSnap.exists()) {
      return null;
    }

    return { id: escrowSnap.id, ...escrowSnap.data() } as EscrowRecord;
  }

  /**
   * Holt Escrow für einen Auftrag
   */
  static async getByOrderId(orderId: string): Promise<EscrowRecord | null> {
    const q = query(
      collection(db, this.COLLECTION),
      where('orderId', '==', orderId)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as EscrowRecord;
  }

  /**
   * Holt alle Escrows für einen Käufer
   */
  static async getByBuyer(buyerId: string): Promise<EscrowRecord[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('buyerId', '==', buyerId)
    );

    const snapshot = await getDocs(q);
    
    // Client-side sorting (Firestore limitation)
    const escrows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EscrowRecord);
    return escrows.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }

  /**
   * Holt alle Escrows für einen Anbieter
   */
  static async getByProvider(providerId: string): Promise<EscrowRecord[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('providerId', '==', providerId)
    );

    const snapshot = await getDocs(q);
    
    // Client-side sorting
    const escrows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EscrowRecord);
    return escrows.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }

  /**
   * Holt alle pending Escrows (für Dashboard)
   */
  static async getPendingEscrows(providerId: string): Promise<EscrowRecord[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('providerId', '==', providerId),
      where('status', '==', 'held')
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EscrowRecord);
  }

  /**
   * Berechnet Zusammenfassung für einen Anbieter
   */
  static async getProviderSummary(providerId: string): Promise<EscrowSummary> {
    const escrows = await this.getByProvider(providerId);

    const summary: EscrowSummary = {
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
   * Prüft ob vorzeitige Freigabe möglich ist
   */
  static async canEarlyRelease(escrowId: string): Promise<boolean> {
    const escrow = await this.getById(escrowId);
    
    if (!escrow) return false;
    
    return escrow.status === 'held';
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
      throw new Error('Escrow is not in held status');
    }

    // Rufe Payment Backend für Auszahlung auf
    // Dies wird in Produktion über API Route gemacht
    await this.release(escrowId);
  }
}

export default EscrowService;
