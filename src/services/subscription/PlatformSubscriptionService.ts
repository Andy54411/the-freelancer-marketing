/**
 * Taskilo Platform Subscription Service
 * 
 * Verwaltet Abonnements fuer die Taskilo Business Platform
 * - 7-Tage kostenlose Testphase
 * - Monatliche/jaehrliche Abrechnung ueber Revolut
 * - GoBD-konforme Rechnungserstellung
 */

import { z } from 'zod';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

interface FirestoreTimestamp {
  toDate: () => Date;
}

// Subscription Status Types
export type PlatformSubscriptionStatus = 
  | 'trialing'      // 7-Tage Testphase
  | 'active'        // Aktives Abo
  | 'past_due'      // Zahlung ueberfaellig
  | 'cancelled'     // Gekuendigt
  | 'expired';      // Abgelaufen

export type BillingInterval = 'monthly' | 'yearly';

// Taskilo Platform Tarife
export const TASKILO_PLANS = {
  free: {
    id: 'free',
    name: 'FreeMail',
    price: { monthly: 0, yearly: 0 },
    features: [
      '1 GB E-Mail-Speicher',
      '2 GB Cloud-Speicher',
      '2 E-Mail-Adressen @taskilo.de',
      'Webmail-Zugang',
      'Standard Support',
    ],
    limits: {
      emailStorageGB: 1,
      cloudStorageGB: 2,
      emailAddresses: 2,
      invoicesPerMonth: 0,
      customersLimit: 0,
    },
  },
  domain: {
    id: 'domain',
    name: 'Eigene Domain',
    price: { monthly: 1.99, yearly: 19.99 },
    features: [
      'FreeMail-Postfach mit allen Vorteilen',
      'Eigene Wunsch-Domain',
      'Individuelle E-Mail-Adressen',
      '100 E-Mail-Adressen',
      'Weltweite Domains',
    ],
    limits: {
      emailStorageGB: 1,
      cloudStorageGB: 2,
      emailAddresses: 100,
      invoicesPerMonth: 0,
      customersLimit: 0,
    },
  },
  pro: {
    id: 'pro',
    name: 'ProMail',
    price: { monthly: 2.99, yearly: 29.99 },
    features: [
      '10 GB E-Mail-Speicher',
      '25 GB Cloud-Speicher',
      '10 E-Mail-Adressen @taskilo.de',
      'Werbefreies Postfach',
      'Prioritaet Support',
    ],
    limits: {
      emailStorageGB: 10,
      cloudStorageGB: 25,
      emailAddresses: 10,
      invoicesPerMonth: 0,
      customersLimit: 0,
    },
  },
  business: {
    id: 'business',
    name: 'Taskilo Business',
    price: { monthly: 29.99, yearly: 299.99 },
    trialDays: 7,
    features: [
      'Company Dashboard',
      'Rechnungen & Angebote (GoBD-konform)',
      'Geschaeftspartner (CRM)',
      'Zeiterfassung',
      'Personal & Recruiting',
      'Workspace',
      'Banking & Zahlungen',
      'Online-Zahlungen',
      'Lagerbestand',
      'Taskilo Advertising',
      'WhatsApp Business',
      'DATEV Export',
      'Premium Support',
    ],
    limits: {
      emailStorageGB: 50,
      cloudStorageGB: 100,
      emailAddresses: 'unlimited',
      invoicesPerMonth: 'unlimited',
      customersLimit: 'unlimited',
    },
  },
} as const;

export type TaskiloPlanId = keyof typeof TASKILO_PLANS;

// Subscription Schema
export const PlatformSubscriptionSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  userId: z.string(),
  
  // Plan Details
  planId: z.enum(['free', 'domain', 'pro', 'business']),
  status: z.enum(['trialing', 'active', 'past_due', 'cancelled', 'expired']),
  billingInterval: z.enum(['monthly', 'yearly']),
  
  // Trial
  trialStartDate: z.date().optional(),
  trialEndDate: z.date().optional(),
  trialUsed: z.boolean().default(false),
  
  // Billing
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  nextBillingDate: z.date().optional(),
  priceNet: z.number(),
  vatRate: z.number().default(19),
  priceGross: z.number(),
  
  // Payment
  paymentMethod: z.enum(['revolut', 'sepa', 'invoice']).optional(),
  revolutSubscriptionId: z.string().optional(),
  lastPaymentDate: z.date().optional(),
  lastPaymentAmount: z.number().optional(),
  
  // Cancellation
  cancelledAt: z.date().optional(),
  cancelReason: z.string().optional(),
  cancellationEffectiveDate: z.date().optional(),
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PlatformSubscription = z.infer<typeof PlatformSubscriptionSchema>;

// Subscription Summary fuer Admin-Ansicht
export interface SubscriptionSummary {
  planId: TaskiloPlanId;
  planName: string;
  status: PlatformSubscriptionStatus;
  statusLabel: string;
  billingInterval: BillingInterval;
  priceGross: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  daysRemaining: number;
  isTrialing: boolean;
  nextBillingDate?: Date;
  lastPaymentDate?: Date;
  features: string[];
}

export class PlatformSubscriptionService {
  private static collection = 'platformSubscriptions';

  /**
   * Hole Subscription fuer ein Unternehmen
   */
  static async getSubscriptionByCompanyId(companyId: string): Promise<PlatformSubscription | null> {
    if (!db) return null;

    try {
      const snapshot = await db.collection(this.collection)
        .where('companyId', '==', companyId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const data = doc.data();

      return this.mapFirestoreToSubscription(data);
    } catch (error) {
      console.error('Fehler beim Laden der Subscription:', error);
      return null;
    }
  }

  /**
   * Erstelle 7-Tage Trial Subscription
   */
  static async startTrial(data: {
    companyId: string;
    userId: string;
    planId: TaskiloPlanId;
    billingInterval: BillingInterval;
  }): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    if (!db) return { success: false, error: 'Datenbank nicht verfuegbar' };

    try {
      // Pruefe ob bereits eine Subscription existiert
      const existing = await this.getSubscriptionByCompanyId(data.companyId);
      if (existing && existing.trialUsed) {
        return { success: false, error: 'Testphase wurde bereits genutzt' };
      }

      const plan = TASKILO_PLANS[data.planId];
      if (!plan || !('trialDays' in plan)) {
        return { success: false, error: 'Dieser Tarif bietet keine Testphase' };
      }

      const now = new Date();
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + (plan.trialDays || 7));

      const priceNet = plan.price[data.billingInterval];
      const vatAmount = priceNet * 0.19;
      const priceGross = priceNet + vatAmount;

      const subscriptionId = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const subscription = {
        id: subscriptionId,
        companyId: data.companyId,
        userId: data.userId,
        planId: data.planId,
        status: 'trialing',
        billingInterval: data.billingInterval,
        trialStartDate: now,
        trialEndDate: trialEndDate,
        trialUsed: true,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndDate,
        nextBillingDate: trialEndDate,
        priceNet,
        vatRate: 19,
        priceGross,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await db.collection(this.collection).doc(subscriptionId).set(subscription);

      // Update Company mit Subscription-Info
      await db.collection('companies').doc(data.companyId).update({
        subscriptionId: subscriptionId,
        subscriptionStatus: 'trialing',
        subscriptionPlanId: data.planId,
        trialEndDate: trialEndDate,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, subscriptionId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Aktiviere Subscription nach Zahlung
   */
  static async activateSubscription(
    subscriptionId: string,
    paymentData: {
      paymentMethod: 'revolut' | 'sepa' | 'invoice';
      revolutSubscriptionId?: string;
      paymentAmount: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!db) return { success: false, error: 'Datenbank nicht verfuegbar' };

    try {
      const subDoc = await db.collection(this.collection).doc(subscriptionId).get();
      if (!subDoc.exists) {
        return { success: false, error: 'Subscription nicht gefunden' };
      }

      const subData = subDoc.data()!;
      const now = new Date();
      
      // Berechne naechste Abrechnungsperiode
      const periodEnd = new Date(now);
      if (subData.billingInterval === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      await db.collection(this.collection).doc(subscriptionId).update({
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        paymentMethod: paymentData.paymentMethod,
        revolutSubscriptionId: paymentData.revolutSubscriptionId || null,
        lastPaymentDate: now,
        lastPaymentAmount: paymentData.paymentAmount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update Company
      await db.collection('companies').doc(subData.companyId).update({
        subscriptionStatus: 'active',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Hole Subscription-Summary fuer Admin-Ansicht
   */
  static async getSubscriptionSummary(companyId: string): Promise<SubscriptionSummary | null> {
    const subscription = await this.getSubscriptionByCompanyId(companyId);
    
    if (!subscription) {
      // Keine Subscription = Free Plan
      const freePlan = TASKILO_PLANS.free;
      return {
        planId: 'free',
        planName: freePlan.name,
        status: 'active',
        statusLabel: 'Kostenlos',
        billingInterval: 'monthly',
        priceGross: 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        daysRemaining: 365,
        isTrialing: false,
        features: [...freePlan.features],
      };
    }

    const plan = TASKILO_PLANS[subscription.planId];
    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd;
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const statusLabels: Record<PlatformSubscriptionStatus, string> = {
      trialing: 'Testphase',
      active: 'Aktiv',
      past_due: 'Zahlung ausstehend',
      cancelled: 'Gekuendigt',
      expired: 'Abgelaufen',
    };

    return {
      planId: subscription.planId,
      planName: plan.name,
      status: subscription.status,
      statusLabel: statusLabels[subscription.status],
      billingInterval: subscription.billingInterval,
      priceGross: subscription.priceGross,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEndsAt: subscription.trialEndDate,
      daysRemaining,
      isTrialing: subscription.status === 'trialing',
      nextBillingDate: subscription.nextBillingDate,
      lastPaymentDate: subscription.lastPaymentDate,
      features: [...plan.features],
    };
  }

  /**
   * Pruefe ob Trial abgelaufen ist und aktualisiere Status
   */
  static async checkAndUpdateTrialStatus(companyId: string): Promise<void> {
    if (!db) return;

    const subscription = await this.getSubscriptionByCompanyId(companyId);
    if (!subscription || subscription.status !== 'trialing') return;

    const now = new Date();
    if (subscription.trialEndDate && now > subscription.trialEndDate) {
      // Trial abgelaufen - auf expired setzen
      await db.collection(this.collection).doc(subscription.id).update({
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      });

      await db.collection('companies').doc(companyId).update({
        subscriptionStatus: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  /**
   * Alle aktiven Subscriptions abrufen (fuer Admin)
   */
  static async getAllSubscriptions(): Promise<PlatformSubscription[]> {
    if (!db) return [];

    try {
      const snapshot = await db.collection(this.collection).get();
      return snapshot.docs.map(doc => this.mapFirestoreToSubscription(doc.data()));
    } catch (error) {
      console.error('Fehler beim Laden aller Subscriptions:', error);
      return [];
    }
  }

  private static mapFirestoreToSubscription(data: Record<string, unknown>): PlatformSubscription {
    const toDateSafe = (value: unknown): Date | undefined => {
      if (value instanceof Date) return value;
      if (value && typeof value === 'object' && 'toDate' in value) {
        return (value as FirestoreTimestamp).toDate();
      }
      return undefined;
    };

    return {
      id: data.id as string,
      companyId: data.companyId as string,
      userId: data.userId as string,
      planId: data.planId as TaskiloPlanId,
      status: data.status as PlatformSubscriptionStatus,
      billingInterval: data.billingInterval as BillingInterval,
      trialStartDate: toDateSafe(data.trialStartDate),
      trialEndDate: toDateSafe(data.trialEndDate),
      trialUsed: data.trialUsed as boolean || false,
      currentPeriodStart: toDateSafe(data.currentPeriodStart) || new Date(),
      currentPeriodEnd: toDateSafe(data.currentPeriodEnd) || new Date(),
      nextBillingDate: toDateSafe(data.nextBillingDate),
      priceNet: data.priceNet as number || 0,
      vatRate: data.vatRate as number || 19,
      priceGross: data.priceGross as number || 0,
      paymentMethod: data.paymentMethod as 'revolut' | 'sepa' | 'invoice' | undefined,
      revolutSubscriptionId: data.revolutSubscriptionId as string | undefined,
      lastPaymentDate: toDateSafe(data.lastPaymentDate),
      lastPaymentAmount: data.lastPaymentAmount as number | undefined,
      cancelledAt: toDateSafe(data.cancelledAt),
      cancelReason: data.cancelReason as string | undefined,
      cancellationEffectiveDate: toDateSafe(data.cancellationEffectiveDate),
      createdAt: toDateSafe(data.createdAt) || new Date(),
      updatedAt: toDateSafe(data.updatedAt) || new Date(),
    };
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
