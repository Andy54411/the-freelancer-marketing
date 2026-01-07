/**
 * Seat Service
 * 
 * Verwaltet Nutzer-Seats für Unternehmen:
 * - Seat-Limit prüfen
 * - Seats hinzufügen/entfernen
 * - Anteilige Berechnung bei Änderungen
 * - Integration mit Mitarbeiter-Dashboard-Zugang
 */

import { z } from 'zod';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  SEAT_CONFIG,
  DEFAULT_COMPANY_SEATS,
  type CompanySeats,
} from '@/lib/moduleConfig';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface SeatInfo {
  included: number;      // Im Abo enthaltene Seats (1 für Business)
  additional: number;    // Zusätzlich gebuchte Seats
  total: number;         // Gesamt verfügbare Seats
  used: number;          // Aktuell genutzte Seats
  available: number;     // Noch verfügbare Seats
  pricePerSeat: number;  // Preis pro Seat/Monat
  monthlyTotal: number;  // Monatliche Gesamtkosten für zusätzliche Seats
}

export interface SeatChange {
  id: string;
  companyId: string;
  type: 'add' | 'remove';
  quantity: number;
  previousTotal: number;
  newTotal: number;
  effectiveDate: Date;
  proratedAmount?: number;  // Anteilige Berechnung
  invoiceId?: string;
  createdAt: Date;
  createdBy: string;
}

export const AddSeatsSchema = z.object({
  quantity: z.number().min(1).max(50),
});

export const RemoveSeatsSchema = z.object({
  quantity: z.number().min(1),
});

// ============================================================================
// SERVICE
// ============================================================================

export class SeatService {
  private static changesCollection = 'seat_changes';

  /**
   * Hole Seat-Informationen für ein Unternehmen
   */
  static async getSeatInfo(companyId: string): Promise<SeatInfo> {
    if (!db) {
      return {
        included: SEAT_CONFIG.includedInBusiness,
        additional: 0,
        total: SEAT_CONFIG.includedInBusiness,
        used: 1,
        available: 0,
        pricePerSeat: SEAT_CONFIG.pricePerSeat.monthly,
        monthlyTotal: 0,
      };
    }

    try {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      
      if (!companyDoc.exists) {
        return {
          included: SEAT_CONFIG.includedInBusiness,
          additional: 0,
          total: SEAT_CONFIG.includedInBusiness,
          used: 1,
          available: 0,
          pricePerSeat: SEAT_CONFIG.pricePerSeat.monthly,
          monthlyTotal: 0,
        };
      }

      const companyData = companyDoc.data();
      const seats = companyData?.seats || DEFAULT_COMPANY_SEATS;
      
      // Zähle aktive Dashboard-Zugänge
      const usedSeats = await this.countUsedSeats(companyId);
      
      const included = seats.included || SEAT_CONFIG.includedInBusiness;
      const additional = seats.additional || 0;
      const total = included + additional;
      const pricePerSeat = seats.pricePerSeat || SEAT_CONFIG.pricePerSeat.monthly;
      
      return {
        included,
        additional,
        total,
        used: usedSeats,
        available: Math.max(0, total - usedSeats),
        pricePerSeat,
        monthlyTotal: Math.round(additional * pricePerSeat * 100) / 100,
      };
    } catch (error) {
      console.error('[SeatService] Fehler beim Laden:', error);
      return {
        included: SEAT_CONFIG.includedInBusiness,
        additional: 0,
        total: SEAT_CONFIG.includedInBusiness,
        used: 1,
        available: 0,
        pricePerSeat: SEAT_CONFIG.pricePerSeat.monthly,
        monthlyTotal: 0,
      };
    }
  }

  /**
   * Prüfe ob ein weiterer Seat verfügbar ist
   */
  static async checkSeatAvailable(companyId: string): Promise<{
    available: boolean;
    currentUsed: number;
    totalSeats: number;
    upgradeRequired: boolean;
  }> {
    const seatInfo = await this.getSeatInfo(companyId);
    const available = seatInfo.available > 0;
    
    return {
      available,
      currentUsed: seatInfo.used,
      totalSeats: seatInfo.total,
      upgradeRequired: !available,
    };
  }

  /**
   * Füge zusätzliche Seats hinzu
   */
  static async addSeats(data: {
    companyId: string;
    quantity: number;
    userId: string;
  }): Promise<{
    success: boolean;
    newTotal?: number;
    proratedAmount?: number;
    error?: string;
  }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    try {
      // Validierung
      if (data.quantity < 1 || data.quantity > 50) {
        return { success: false, error: 'Ungültige Anzahl (1-50)' };
      }

      const seatInfo = await this.getSeatInfo(data.companyId);
      const newAdditional = seatInfo.additional + data.quantity;
      
      if (newAdditional > SEAT_CONFIG.maxSeats) {
        return { 
          success: false, 
          error: `Maximale Anzahl von ${SEAT_CONFIG.maxSeats} zusätzlichen Seats erreicht` 
        };
      }

      // Berechne anteilige Kosten (für Rest des Monats)
      const proratedAmount = this.calculateProratedAmount(data.quantity, seatInfo.pricePerSeat);
      
      const now = new Date();
      const changeId = this.generateId();

      // Seat-Änderung dokumentieren
      await db
        .collection('companies')
        .doc(data.companyId)
        .collection(this.changesCollection)
        .doc(changeId)
        .set({
          id: changeId,
          companyId: data.companyId,
          type: 'add',
          quantity: data.quantity,
          previousTotal: seatInfo.total,
          newTotal: seatInfo.total + data.quantity,
          effectiveDate: FieldValue.serverTimestamp(),
          proratedAmount,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: data.userId,
        });

      // Company Seats aktualisieren
      await db.collection('companies').doc(data.companyId).update({
        'seats.additional': newAdditional,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        newTotal: seatInfo.total + data.quantity,
        proratedAmount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error('[SeatService] Fehler beim Hinzufügen:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Entferne Seats (zum Monatsende)
   */
  static async removeSeats(data: {
    companyId: string;
    quantity: number;
    userId: string;
  }): Promise<{
    success: boolean;
    effectiveDate?: Date;
    error?: string;
  }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    try {
      const seatInfo = await this.getSeatInfo(data.companyId);
      
      // Validierung
      if (data.quantity > seatInfo.additional) {
        return { 
          success: false, 
          error: `Nur ${seatInfo.additional} zusätzliche Seats vorhanden` 
        };
      }

      // Prüfe ob genug Seats frei werden
      const newTotal = seatInfo.total - data.quantity;
      if (newTotal < seatInfo.used) {
        return { 
          success: false, 
          error: `Aktuell ${seatInfo.used} Seats in Verwendung. Bitte zuerst Dashboard-Zugänge entfernen.` 
        };
      }

      // Effektiv zum Monatsende
      const effectiveDate = this.getNextMonthStart();
      const changeId = this.generateId();

      // Seat-Änderung dokumentieren (pending)
      await db
        .collection('companies')
        .doc(data.companyId)
        .collection(this.changesCollection)
        .doc(changeId)
        .set({
          id: changeId,
          companyId: data.companyId,
          type: 'remove',
          quantity: data.quantity,
          previousTotal: seatInfo.total,
          newTotal,
          effectiveDate,
          status: 'pending', // Wird zum Monatsende verarbeitet
          createdAt: FieldValue.serverTimestamp(),
          createdBy: data.userId,
        });

      // Pending-Änderung in Company speichern
      await db.collection('companies').doc(data.companyId).update({
        'seats.pendingRemoval': data.quantity,
        'seats.pendingRemovalDate': effectiveDate,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        effectiveDate,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error('[SeatService] Fehler beim Entfernen:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Verarbeite ausstehende Seat-Änderungen (Cron-Job)
   */
  static async processPendingChanges(): Promise<{ processed: number; errors: number }> {
    if (!db) return { processed: 0, errors: 0 };

    let processed = 0;
    let errors = 0;
    const now = new Date();

    try {
      // Finde alle Companies mit pending Seat-Änderungen
      const companiesSnapshot = await db
        .collection('companies')
        .where('seats.pendingRemovalDate', '<=', now)
        .get();

      for (const companyDoc of companiesSnapshot.docs) {
        try {
          const data = companyDoc.data();
          const pendingRemoval = data.seats?.pendingRemoval || 0;
          const currentAdditional = data.seats?.additional || 0;
          const newAdditional = Math.max(0, currentAdditional - pendingRemoval);

          await companyDoc.ref.update({
            'seats.additional': newAdditional,
            'seats.pendingRemoval': FieldValue.delete(),
            'seats.pendingRemovalDate': FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          processed++;
        } catch {
          errors++;
        }
      }
    } catch (error) {
      console.error('[SeatService] Fehler bei Verarbeitung:', error);
    }

    return { processed, errors };
  }

  /**
   * Hole Seat-Änderungshistorie
   */
  static async getSeatHistory(companyId: string, limit = 20): Promise<SeatChange[]> {
    if (!db) return [];

    try {
      const snapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection(this.changesCollection)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          companyId: data.companyId,
          type: data.type,
          quantity: data.quantity,
          previousTotal: data.previousTotal,
          newTotal: data.newTotal,
          effectiveDate: data.effectiveDate?.toDate?.() || new Date(),
          proratedAmount: data.proratedAmount,
          invoiceId: data.invoiceId,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          createdBy: data.createdBy,
        };
      });
    } catch (error) {
      console.error('[SeatService] Fehler beim Laden der Historie:', error);
      return [];
    }
  }

  /**
   * Nutze einen Seat (bei Dashboard-Zugang)
   * Wird automatisch beim Erstellen eines Mitarbeiter-Dashboard-Zugangs aufgerufen
   */
  static async useSeat(companyId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const check = await this.checkSeatAvailable(companyId);
    
    if (!check.available) {
      return {
        success: false,
        error: `Seat-Limit erreicht (${check.currentUsed}/${check.totalSeats}). Bitte buchen Sie zusätzliche Nutzer-Plätze.`,
      };
    }

    // Seat-Zähler wird durch employees-Subcollection automatisch ermittelt
    return { success: true };
  }

  /**
   * Gebe einen Seat frei (bei Entfernen eines Dashboard-Zugangs)
   */
  static async releaseSeat(companyId: string): Promise<void> {
    // Seat-Zähler wird durch employees-Subcollection automatisch ermittelt
    // Keine explizite Aktion nötig
  }

  // ============================================================================
  // PRIVATE HELPER
  // ============================================================================

  /**
   * Zähle aktuell genutzte Seats (Mitarbeiter mit Dashboard-Zugang)
   */
  private static async countUsedSeats(companyId: string): Promise<number> {
    if (!db) return 1;

    try {
      // Inhaber zählt als 1
      let count = 1;

      // Zähle Mitarbeiter mit aktivem Dashboard-Zugang
      const employeesSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('employees')
        .where('dashboardAccess.enabled', '==', true)
        .get();

      count += employeesSnapshot.size;

      return count;
    } catch (error) {
      console.error('[SeatService] Fehler beim Zählen:', error);
      return 1; // Mindestens der Inhaber
    }
  }

  /**
   * Berechne anteilige Kosten für den Rest des Monats
   */
  private static calculateProratedAmount(
    quantity: number,
    pricePerSeat: number
  ): number {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate() + 1;
    
    const dailyRate = pricePerSeat / daysInMonth;
    const proratedAmount = quantity * dailyRate * remainingDays;
    
    return Math.round(proratedAmount * 100) / 100;
  }

  /**
   * Ermittle den Start des nächsten Monats
   */
  private static getNextMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Generiere eindeutige ID
   */
  private static generateId(): string {
    return `seat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// INITIALISIERUNG
// ============================================================================

/**
 * Initialisiere Seats für ein neues Unternehmen
 */
export async function initializeCompanySeats(companyId: string): Promise<void> {
  if (!db) return;

  try {
    await db.collection('companies').doc(companyId).update({
      seats: DEFAULT_COMPANY_SEATS,
    });
  } catch (error) {
    console.error('[SeatService] Fehler bei Initialisierung:', error);
  }
}
