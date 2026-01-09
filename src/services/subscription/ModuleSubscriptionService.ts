/**
 * Module Subscription Service
 * 
 * Verwaltet Premium-Modul-Buchungen für Unternehmen:
 * - Modul buchen/kündigen
 * - Trial-Verwaltung
 * - Bundle-Logik
 * - Revolut-Integration für wiederkehrende Zahlungen
 */

import { z } from 'zod';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  PREMIUM_MODULES,
  MODULE_BUNDLE,
  DEFAULT_COMPANY_MODULES,
  calculateModulePrice,
  type PremiumModuleId,
  type CompanyModules,
  PremiumModuleIdSchema,
} from '@/lib/moduleConfig';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export type ModuleSubscriptionStatus = 
  | 'trialing'    // 7-Tage Testphase
  | 'active'      // Aktives Modul-Abo
  | 'pending'     // Zahlung ausstehend
  | 'cancelled'   // Gekündigt (läuft noch bis Periodenende)
  | 'expired';    // Abgelaufen

export interface ModuleSubscription {
  id: string;
  companyId: string;
  moduleId: PremiumModuleId;
  moduleName: string;
  
  // Preise (in EUR)
  priceNet: number;
  priceGross: number;
  vatRate: number;
  billingInterval: 'monthly' | 'yearly';
  
  // Status
  status: ModuleSubscriptionStatus;
  
  // Trial
  trialEndDate?: Date;
  trialUsed: boolean;
  
  // Perioden
  startDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate?: Date;
  
  // Kündigung
  cancelledAt?: Date;
  cancellationEffectiveDate?: Date;
  cancelReason?: string;
  
  // Revolut
  revolutSubscriptionId?: string;
  revolutCustomerId?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export const ModuleSubscriptionSchema = z.object({
  moduleId: PremiumModuleIdSchema,
  billingInterval: z.enum(['monthly', 'yearly']).default('monthly'),
  startTrial: z.boolean().default(true),
});

export interface ModuleSubscriptionSummary {
  activeModules: PremiumModuleId[];
  trialingModules: PremiumModuleId[];
  bundleActive: boolean;
  totalMonthlyPrice: number;
  totalYearlyPrice: number;
  nextBillingDate?: Date;
  subscriptions: ModuleSubscription[];
}

// ============================================================================
// SERVICE
// ============================================================================

export class ModuleSubscriptionService {
  private static collection = 'module_subscriptions';

  /**
   * Hole alle Modul-Subscriptions für ein Unternehmen
   */
  static async getModuleSubscriptions(companyId: string): Promise<ModuleSubscription[]> {
    if (!db) return [];

    try {
      const subscriptionsRef = db
        .collection('companies')
        .doc(companyId)
        .collection(this.collection);
      
      const snapshot = await subscriptionsRef.get();
      
      return snapshot.docs.map(doc => this.mapFirestoreToSubscription(doc.data()));
    } catch (error) {
      console.error('[ModuleSubscriptionService] Fehler beim Laden:', error);
      return [];
    }
  }

  /**
   * Hole aktive Module für ein Unternehmen
   */
  static async getActiveModules(companyId: string): Promise<CompanyModules> {
    if (!db) return DEFAULT_COMPANY_MODULES;

    try {
      // Hole Company-Dokument mit modules Feld
      const companyDoc = await db.collection('companies').doc(companyId).get();
      
      if (!companyDoc.exists) {
        return DEFAULT_COMPANY_MODULES;
      }

      const companyData = companyDoc.data();
      
      // Wenn modules Feld existiert, nutze es
      if (companyData?.modules) {
        return {
          ...DEFAULT_COMPANY_MODULES,
          ...companyData.modules,
        };
      }

      return DEFAULT_COMPANY_MODULES;
    } catch (error) {
      console.error('[ModuleSubscriptionService] Fehler beim Laden der Module:', error);
      return DEFAULT_COMPANY_MODULES;
    }
  }

  /**
   * Hole Modul-Subscription-Zusammenfassung
   */
  static async getModuleSummary(companyId: string): Promise<ModuleSubscriptionSummary> {
    const subscriptions = await this.getModuleSubscriptions(companyId);
    
    const activeModules: PremiumModuleId[] = [];
    const trialingModules: PremiumModuleId[] = [];
    let totalMonthlyPrice = 0;
    let totalYearlyPrice = 0;
    let earliestNextBilling: Date | undefined;
    
    for (const sub of subscriptions) {
      if (sub.status === 'active') {
        activeModules.push(sub.moduleId);
        if (sub.billingInterval === 'monthly') {
          totalMonthlyPrice += sub.priceGross;
        } else {
          totalYearlyPrice += sub.priceGross;
        }
      } else if (sub.status === 'trialing') {
        trialingModules.push(sub.moduleId);
      }
      
      if (sub.nextBillingDate) {
        if (!earliestNextBilling || sub.nextBillingDate < earliestNextBilling) {
          earliestNextBilling = sub.nextBillingDate;
        }
      }
    }
    
    // Prüfe ob Bundle aktiv ist
    const bundleModules = new Set(MODULE_BUNDLE.includes);
    const activeSet = new Set(activeModules);
    const bundleActive = MODULE_BUNDLE.includes.every(m => activeSet.has(m));
    
    return {
      activeModules,
      trialingModules,
      bundleActive,
      totalMonthlyPrice,
      totalYearlyPrice,
      nextBillingDate: earliestNextBilling,
      subscriptions,
    };
  }

  /**
   * Buche ein Premium-Modul
   */
  static async subscribeModule(data: {
    companyId: string;
    moduleId: PremiumModuleId;
    billingInterval: 'monthly' | 'yearly';
    startTrial?: boolean;
    revolutCustomerId?: string;
  }): Promise<{ success: boolean; subscriptionId?: string; checkoutUrl?: string; error?: string }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    try {
      const moduleConfig = PREMIUM_MODULES[data.moduleId];
      if (!moduleConfig) {
        return { success: false, error: 'Modul nicht gefunden' };
      }

      // Prüfe ob bereits eine aktive Subscription existiert
      const existingSub = await this.getModuleSubscription(data.companyId, data.moduleId);
      if (existingSub && ['active', 'trialing'].includes(existingSub.status)) {
        return { success: false, error: 'Modul bereits aktiv' };
      }

      // Prüfe ob Trial bereits genutzt wurde
      const trialUsed = existingSub?.trialUsed ?? false;
      const startTrial = data.startTrial !== false && !trialUsed && moduleConfig.trialDays > 0;

      const now = new Date();
      const subscriptionId = this.generateId();
      
      // Trial oder sofort aktiv
      const status: ModuleSubscriptionStatus = startTrial ? 'trialing' : 'pending';
      let trialEndDate: Date | undefined;
      let periodEnd: Date;
      
      if (startTrial) {
        trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + moduleConfig.trialDays);
        periodEnd = trialEndDate;
      } else {
        periodEnd = new Date(now);
        if (data.billingInterval === 'monthly') {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }
      }

      const priceGross = moduleConfig.price[data.billingInterval];
      const priceNet = moduleConfig.priceNet[data.billingInterval];

      // Subscription in Firestore speichern
      const subscriptionData = {
        id: subscriptionId,
        companyId: data.companyId,
        moduleId: data.moduleId,
        moduleName: moduleConfig.name,
        priceNet,
        priceGross,
        vatRate: 19,
        billingInterval: data.billingInterval,
        status,
        trialEndDate: trialEndDate ? FieldValue.serverTimestamp() : null,
        trialUsed: startTrial,
        startDate: FieldValue.serverTimestamp(),
        currentPeriodStart: FieldValue.serverTimestamp(),
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        revolutCustomerId: data.revolutCustomerId || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await db
        .collection('companies')
        .doc(data.companyId)
        .collection(this.collection)
        .doc(subscriptionId)
        .set(subscriptionData);

      // Update Company modules Feld
      await this.updateCompanyModules(data.companyId, data.moduleId, true);

      // Wenn Trial, ist das Modul sofort aktiv
      // Wenn nicht Trial, brauchen wir Revolut Checkout
      if (startTrial) {
        return { success: true, subscriptionId };
      }

      // TODO: Revolut Checkout erstellen
      // Für jetzt: Modul direkt aktivieren (später mit Revolut)
      await this.activateModule(data.companyId, subscriptionId);
      
      return { success: true, subscriptionId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error('[ModuleSubscriptionService] Fehler beim Buchen:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Kündige ein Premium-Modul
   */
  static async cancelModule(
    companyId: string,
    moduleId: PremiumModuleId,
    reason?: string
  ): Promise<{ success: boolean; effectiveDate?: Date; error?: string }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    try {
      const subscription = await this.getModuleSubscription(companyId, moduleId);
      
      if (!subscription) {
        return { success: false, error: 'Modul-Subscription nicht gefunden' };
      }

      if (!['active', 'trialing'].includes(subscription.status)) {
        return { success: false, error: 'Modul ist nicht aktiv' };
      }

      const now = new Date();
      const effectiveDate = subscription.currentPeriodEnd;

      // Update Subscription
      await db
        .collection('companies')
        .doc(companyId)
        .collection(this.collection)
        .doc(subscription.id)
        .update({
          status: 'cancelled',
          cancelledAt: FieldValue.serverTimestamp(),
          cancellationEffectiveDate: effectiveDate,
          cancelReason: reason || null,
          updatedAt: FieldValue.serverTimestamp(),
        });

      // Bei Trial: Sofort deaktivieren
      if (subscription.status === 'trialing') {
        await this.updateCompanyModules(companyId, moduleId, false);
        return { success: true, effectiveDate: now };
      }

      // Bei aktivem Abo: Läuft bis Periodenende
      return { success: true, effectiveDate };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error('[ModuleSubscriptionService] Fehler beim Kündigen:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Aktiviere ein Modul nach Zahlung
   */
  static async activateModule(
    companyId: string,
    subscriptionId: string,
    revolutSubscriptionId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    try {
      const subscriptionRef = db
        .collection('companies')
        .doc(companyId)
        .collection(this.collection)
        .doc(subscriptionId);

      const doc = await subscriptionRef.get();
      if (!doc.exists) {
        return { success: false, error: 'Subscription nicht gefunden' };
      }

      const data = doc.data()!;

      await subscriptionRef.update({
        status: 'active',
        revolutSubscriptionId: revolutSubscriptionId || null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update Company modules Feld
      await this.updateCompanyModules(companyId, data.moduleId as PremiumModuleId, true);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Buche alle Premium-Module im Bundle
   */
  static async subscribeBundle(data: {
    companyId: string;
    billingInterval: 'monthly' | 'yearly';
    startTrial?: boolean;
  }): Promise<{ success: boolean; subscriptionIds?: string[]; error?: string }> {
    const subscriptionIds: string[] = [];
    
    for (const moduleId of MODULE_BUNDLE.includes) {
      const result = await this.subscribeModule({
        companyId: data.companyId,
        moduleId,
        billingInterval: data.billingInterval,
        startTrial: data.startTrial,
      });
      
      if (!result.success) {
        // Rollback: Bereits gebuchte Module kündigen
        for (const id of subscriptionIds) {
          // In der Praxis sollte hier ein besseres Rollback stattfinden
          console.error(`Bundle-Buchung fehlgeschlagen bei ${moduleId}, Rollback nötig`);
        }
        return { success: false, error: result.error };
      }
      
      if (result.subscriptionId) {
        subscriptionIds.push(result.subscriptionId);
      }
    }

    // Update Company mit Bundle-Status
    if (db) {
      await db.collection('companies').doc(data.companyId).update({
        moduleBundleActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true, subscriptionIds };
  }

  /**
   * Buche mehrere Premium-Module mit Rabattstaffel
   * 
   * Rabatte:
   * - 2 Module = 10% Rabatt
   * - 3 Module = 20% Rabatt
   * - 4 Module = 28% Rabatt (Bundle-Preis)
   */
  static async subscribeMultipleModules(data: {
    companyId: string;
    moduleIds: PremiumModuleId[];
    billingInterval: 'monthly' | 'yearly';
    startTrial?: boolean;
  }): Promise<{ 
    success: boolean; 
    subscriptionIds?: string[]; 
    pricing?: {
      originalPrice: number;
      discountPercent: number;
      discountAmount: number;
      finalPrice: number;
    };
    error?: string;
  }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    const { moduleIds, companyId, billingInterval, startTrial } = data;
    
    // Validiere Module
    const validModules = moduleIds.filter(id => PREMIUM_MODULES[id]);
    if (validModules.length === 0) {
      return { success: false, error: 'Keine gültigen Module ausgewählt' };
    }

    // Entferne Duplikate
    const uniqueModules = [...new Set(validModules)] as PremiumModuleId[];
    
    // Wenn 4 Module = Bundle
    if (uniqueModules.length === 4) {
      const result = await this.subscribeBundle({
        companyId,
        billingInterval,
        startTrial,
      });
      
      if (result.success) {
        const pricing = calculateModulePrice(uniqueModules, billingInterval);
        return {
          success: true,
          subscriptionIds: result.subscriptionIds,
          pricing: {
            originalPrice: pricing.originalPrice,
            discountPercent: pricing.discountPercent,
            discountAmount: pricing.discountAmount,
            finalPrice: pricing.finalPrice,
          },
        };
      }
      return result;
    }

    // Berechne Preise mit Rabatt
    const pricing = calculateModulePrice(uniqueModules, billingInterval);
    const subscriptionIds: string[] = [];

    try {
      // Buche jedes Modul mit anteiligem rabattierten Preis
      for (const moduleId of uniqueModules) {
        const moduleConfig = PREMIUM_MODULES[moduleId];
        const originalModulePrice = moduleConfig.price[billingInterval];
        
        // Berechne den anteiligen rabattierten Preis
        const discountMultiplier = 1 - (pricing.discountPercent / 100);
        const discountedPrice = Math.round(originalModulePrice * discountMultiplier * 100) / 100;
        const discountedPriceNet = Math.round(discountedPrice / 1.19 * 100) / 100;
        
        const now = new Date();
        const subscriptionId = this.generateId();
        
        // Trial oder sofort aktiv
        const trialUsed = false; // Prüfe später
        const usesTrial = startTrial !== false && !trialUsed && moduleConfig.trialDays > 0;
        const status: ModuleSubscriptionStatus = usesTrial ? 'trialing' : 'pending';
        let trialEndDate: Date | undefined;
        let periodEnd: Date;
        
        if (usesTrial) {
          trialEndDate = new Date(now);
          trialEndDate.setDate(trialEndDate.getDate() + moduleConfig.trialDays);
          periodEnd = trialEndDate;
        } else {
          periodEnd = new Date(now);
          if (billingInterval === 'monthly') {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          }
        }

        const subscriptionData = {
          id: subscriptionId,
          companyId,
          moduleId,
          moduleName: moduleConfig.name,
          priceNet: discountedPriceNet,
          priceGross: discountedPrice,
          originalPrice: originalModulePrice,
          discountPercent: pricing.discountPercent,
          bundleSize: uniqueModules.length,
          vatRate: 19,
          billingInterval,
          status,
          trialEndDate: trialEndDate ? FieldValue.serverTimestamp() : null,
          trialUsed: usesTrial,
          startDate: FieldValue.serverTimestamp(),
          currentPeriodStart: FieldValue.serverTimestamp(),
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        await db
          .collection('companies')
          .doc(companyId)
          .collection(this.collection)
          .doc(subscriptionId)
          .set(subscriptionData);

        // Update Company modules Feld
        await this.updateCompanyModules(companyId, moduleId, true);
        
        // Wenn nicht Trial, aktiviere sofort (später mit Revolut)
        if (!usesTrial) {
          await this.activateModule(companyId, subscriptionId);
        }

        subscriptionIds.push(subscriptionId);
      }

      // Update Company mit Multi-Module Status
      await db.collection('companies').doc(companyId).update({
        moduleDiscountApplied: pricing.discountPercent,
        moduleCount: uniqueModules.length,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        subscriptionIds,
        pricing: {
          originalPrice: pricing.originalPrice,
          discountPercent: pricing.discountPercent,
          discountAmount: pricing.discountAmount,
          finalPrice: pricing.finalPrice,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Prüfe und aktualisiere abgelaufene Trials
   */
  static async checkExpiredTrials(): Promise<{ expired: number; errors: number }> {
    if (!db) return { expired: 0, errors: 0 };

    let expired = 0;
    let errors = 0;
    const now = new Date();

    try {
      // Finde alle trialing Subscriptions mit abgelaufenem Trial
      const companiesSnapshot = await db.collection('companies').get();
      
      for (const companyDoc of companiesSnapshot.docs) {
        const subsSnapshot = await companyDoc.ref
          .collection(this.collection)
          .where('status', '==', 'trialing')
          .get();
        
        for (const subDoc of subsSnapshot.docs) {
          const data = subDoc.data();
          const trialEnd = data.trialEndDate?.toDate?.() || data.currentPeriodEnd?.toDate?.();
          
          if (trialEnd && trialEnd < now) {
            try {
              // Trial abgelaufen - deaktivieren oder in pending umwandeln
              await subDoc.ref.update({
                status: 'expired',
                updatedAt: FieldValue.serverTimestamp(),
              });
              
              // Modul deaktivieren
              await this.updateCompanyModules(companyDoc.id, data.moduleId, false);
              expired++;
            } catch {
              errors++;
            }
          }
        }
      }
    } catch (error) {
      console.error('[ModuleSubscriptionService] Fehler bei Trial-Check:', error);
    }

    return { expired, errors };
  }

  // ============================================================================
  // PRIVATE HELPER
  // ============================================================================

  /**
   * Hole einzelne Modul-Subscription
   */
  private static async getModuleSubscription(
    companyId: string,
    moduleId: PremiumModuleId
  ): Promise<ModuleSubscription | null> {
    if (!db) return null;

    try {
      const snapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection(this.collection)
        .where('moduleId', '==', moduleId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      return this.mapFirestoreToSubscription(snapshot.docs[0].data());
    } catch {
      return null;
    }
  }

  /**
   * Update Company modules Feld
   */
  private static async updateCompanyModules(
    companyId: string,
    moduleId: PremiumModuleId,
    active: boolean
  ): Promise<void> {
    if (!db) return;

    try {
      await db.collection('companies').doc(companyId).update({
        [`modules.${moduleId}`]: active,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update activeModules Array
      if (active) {
        await db.collection('companies').doc(companyId).update({
          activeModules: FieldValue.arrayUnion(moduleId),
        });
      } else {
        await db.collection('companies').doc(companyId).update({
          activeModules: FieldValue.arrayRemove(moduleId),
        });
      }
    } catch (error) {
      console.error('[ModuleSubscriptionService] Fehler beim Update:', error);
    }
  }

  /**
   * Map Firestore Daten zu Subscription Objekt
   */
  private static mapFirestoreToSubscription(data: Record<string, unknown>): ModuleSubscription {
    const toDate = (val: unknown): Date => {
      if (val && typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function') {
        return val.toDate();
      }
      if (val instanceof Date) return val;
      return new Date();
    };

    return {
      id: data.id as string,
      companyId: data.companyId as string,
      moduleId: data.moduleId as PremiumModuleId,
      moduleName: data.moduleName as string,
      priceNet: data.priceNet as number,
      priceGross: data.priceGross as number,
      vatRate: data.vatRate as number || 19,
      billingInterval: data.billingInterval as 'monthly' | 'yearly',
      status: data.status as ModuleSubscriptionStatus,
      trialEndDate: data.trialEndDate ? toDate(data.trialEndDate) : undefined,
      trialUsed: data.trialUsed as boolean || false,
      startDate: toDate(data.startDate),
      currentPeriodStart: toDate(data.currentPeriodStart),
      currentPeriodEnd: toDate(data.currentPeriodEnd),
      nextBillingDate: data.nextBillingDate ? toDate(data.nextBillingDate) : undefined,
      cancelledAt: data.cancelledAt ? toDate(data.cancelledAt) : undefined,
      cancellationEffectiveDate: data.cancellationEffectiveDate 
        ? toDate(data.cancellationEffectiveDate) 
        : undefined,
      cancelReason: data.cancelReason as string | undefined,
      revolutSubscriptionId: data.revolutSubscriptionId as string | undefined,
      revolutCustomerId: data.revolutCustomerId as string | undefined,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }

  /**
   * Generiere eindeutige ID
   */
  private static generateId(): string {
    return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
