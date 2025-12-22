/**
 * Webmail Subscription Service
 * 
 * Verwaltet Abonnements fuer Domain und E-Mail-Dienste
 * - Monatliche/jaehrliche Abrechnung
 * - Automatische Rechnungserstellung
 * - GoBD-konforme fortlaufende Nummern
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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { z } from 'zod';
import { NumberSequenceService } from '@/services/numberSequenceService';

// Subscription Status
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'past_due';
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionType = 'domain' | 'mailbox' | 'bundle';

// Subscription Schema
export const WebmailSubscriptionSchema = z.object({
  id: z.string(),
  
  // Kunde
  userId: z.string(),
  companyId: z.string().optional(),
  customerEmail: z.string().email(),
  customerName: z.string(),
  customerAddress: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string().default('DE'),
  }),
  
  // Abo-Details
  type: z.enum(['domain', 'mailbox', 'bundle']),
  status: z.enum(['active', 'cancelled', 'expired', 'pending', 'past_due']),
  billingInterval: z.enum(['monthly', 'yearly']),
  
  // Produkt-Details
  domain: z.string().optional(),
  mailboxEmail: z.string().optional(),
  mailboxQuotaMB: z.number().optional(),
  
  // Preise (Netto in EUR)
  priceNet: z.number(),
  vatRate: z.number().default(19),
  priceGross: z.number(),
  
  // Billing Cycle
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  nextBillingDate: z.date(),
  
  // Zahlungsmethode
  paymentMethod: z.enum(['revolut', 'sepa', 'invoice']),
  revolutCustomerId: z.string().optional(),
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  cancelledAt: z.date().optional(),
  cancelReason: z.string().optional(),
});

export type WebmailSubscription = z.infer<typeof WebmailSubscriptionSchema>;

// Subscription Invoice Schema
export const SubscriptionInvoiceSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  
  // Rechnungsdetails
  invoiceNumber: z.string(), // GoBD-konform: WM-2025-0001
  sequentialNumber: z.number(),
  
  // Kunde
  userId: z.string(),
  companyId: z.string().optional(),
  customerEmail: z.string().email(),
  customerName: z.string(),
  customerAddress: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }),
  
  // Rechnungspositionen
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    total: z.number(),
  })),
  
  // Betraege
  subtotal: z.number(),
  vatRate: z.number(),
  vatAmount: z.number(),
  total: z.number(),
  
  // Zeitraum
  periodStart: z.date(),
  periodEnd: z.date(),
  
  // Status
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  dueDate: z.date(),
  paidAt: z.date().optional(),
  
  // PDF
  pdfPath: z.string().optional(),
  pdfGeneratedAt: z.date().optional(),
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  sentAt: z.date().optional(),
});

export type SubscriptionInvoice = z.infer<typeof SubscriptionInvoiceSchema>;

// Pricing Configuration
const WEBMAIL_PRICING = {
  mailbox: {
    monthly: 2.99,
    yearly: 29.90,
    storage5GB: 0,
    storagePerAdditionalGB: 0.50,
  },
  domain: {
    // Preise kommen von INWX, hier nur Aufschlag
    markup: 1.2, // 20% Aufschlag
  },
  vatRate: 19,
};

export class WebmailSubscriptionService {
  private static subscriptionsCollection = 'webmailSubscriptions';
  private static invoicesCollection = 'webmailInvoices';

  /**
   * Erstelle neues Abonnement nach erfolgreicher Zahlung
   */
  static async createSubscription(data: {
    orderId: string;
    userId: string;
    companyId?: string;
    type: SubscriptionType;
    domain?: string;
    mailboxEmail?: string;
    mailboxQuotaMB?: number;
    billingInterval: BillingInterval;
    priceNet: number;
    customerEmail: string;
    customerName: string;
    customerAddress: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    paymentMethod: 'revolut' | 'sepa' | 'invoice';
  }): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      const subscriptionId = `SUB-${this.generateId()}`;
      const now = new Date();
      
      // Berechne Abrechnungszeitraum
      const periodEnd = new Date(now);
      if (data.billingInterval === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }
      
      const vatAmount = data.priceNet * (WEBMAIL_PRICING.vatRate / 100);
      const priceGross = data.priceNet + vatAmount;
      
      const subscription: Record<string, unknown> = {
        id: subscriptionId,
        orderId: data.orderId,
        userId: data.userId,
        type: data.type,
        status: 'active',
        billingInterval: data.billingInterval,
        priceNet: data.priceNet,
        vatRate: WEBMAIL_PRICING.vatRate,
        priceGross: Math.round(priceGross * 100) / 100,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        paymentMethod: data.paymentMethod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Optionale Felder
      if (data.companyId) subscription.companyId = data.companyId;
      if (data.domain) subscription.domain = data.domain;
      if (data.mailboxEmail) subscription.mailboxEmail = data.mailboxEmail;
      if (data.mailboxQuotaMB) subscription.mailboxQuotaMB = data.mailboxQuotaMB;
      
      await setDoc(doc(db, this.subscriptionsCollection, subscriptionId), subscription);
      
      // Erstelle erste Rechnung
      await this.createInvoiceForSubscription(subscriptionId, now, periodEnd);
      
      return { success: true, subscriptionId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: message };
    }
  }

  /**
   * Erstelle Rechnung fuer Abonnement
   */
  static async createInvoiceForSubscription(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    try {
      // Lade Subscription
      const subDoc = await getDoc(doc(db, this.subscriptionsCollection, subscriptionId));
      if (!subDoc.exists()) {
        return { success: false, error: 'Abonnement nicht gefunden' };
      }
      
      const subscription = subDoc.data();
      
      // Generiere GoBD-konforme Rechnungsnummer
      const { invoiceNumber, sequentialNumber } = await this.getNextInvoiceNumber();
      
      const invoiceId = `WMI-${this.generateId()}`;
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 14); // 14 Tage Zahlungsziel
      
      // Erstelle Rechnungspositionen
      const items = this.createInvoiceItems(subscription, periodStart, periodEnd);
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const vatAmount = subtotal * (subscription.vatRate / 100);
      const total = subtotal + vatAmount;
      
      const invoice: Record<string, unknown> = {
        id: invoiceId,
        subscriptionId,
        invoiceNumber,
        sequentialNumber,
        userId: subscription.userId,
        customerEmail: subscription.customerEmail,
        customerName: subscription.customerName,
        customerAddress: subscription.customerAddress,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        vatRate: subscription.vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        periodStart,
        periodEnd,
        status: 'draft',
        dueDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      if (subscription.companyId) {
        invoice.companyId = subscription.companyId;
      }
      
      await setDoc(doc(db, this.invoicesCollection, invoiceId), invoice);
      
      return { success: true, invoiceId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: message };
    }
  }

  /**
   * Erstelle Rechnungspositionen basierend auf Abo-Typ
   */
  private static createInvoiceItems(
    subscription: Record<string, unknown>,
    periodStart: Date,
    periodEnd: Date
  ): { description: string; quantity: number; unitPrice: number; total: number }[] {
    const items: { description: string; quantity: number; unitPrice: number; total: number }[] = [];
    const formatDate = (d: Date) => d.toLocaleDateString('de-DE');
    const period = `${formatDate(periodStart)} - ${formatDate(periodEnd)}`;
    
    if (subscription.type === 'domain' || subscription.type === 'bundle') {
      items.push({
        description: `Domain-Registrierung: ${subscription.domain}\nZeitraum: ${period}`,
        quantity: 1,
        unitPrice: subscription.priceNet as number,
        total: subscription.priceNet as number,
      });
    }
    
    if (subscription.type === 'mailbox' || subscription.type === 'bundle') {
      const mailboxPrice = subscription.billingInterval === 'monthly' 
        ? WEBMAIL_PRICING.mailbox.monthly 
        : WEBMAIL_PRICING.mailbox.yearly;
      
      items.push({
        description: `E-Mail-Postfach: ${subscription.mailboxEmail}\nSpeicher: ${subscription.mailboxQuotaMB || 5120}MB\nZeitraum: ${period}`,
        quantity: 1,
        unitPrice: mailboxPrice,
        total: mailboxPrice,
      });
    }
    
    return items;
  }

  /**
   * Generiere naechste Webmail-Rechnungsnummer (GoBD-konform)
   */
  private static async getNextInvoiceNumber(): Promise<{
    invoiceNumber: string;
    sequentialNumber: number;
  }> {
    try {
      // Verwende den TaskiloAdmin-Nummernkreis fuer Webmail-Rechnungen
      const result = await NumberSequenceService.getNextNumberForType('taskilo-admin', 'WebmailRechnung');
      return {
        invoiceNumber: result.formattedNumber,
        sequentialNumber: result.number,
      };
    } catch {
      // Fallback: Eigener Nummernkreis
      const year = new Date().getFullYear();
      const timestamp = Date.now() % 10000;
      return {
        invoiceNumber: `WM-${year}-${String(timestamp).padStart(4, '0')}`,
        sequentialNumber: timestamp,
      };
    }
  }

  /**
   * Hole alle faelligen Abonnements fuer automatische Abrechnung
   */
  static async getDueSubscriptions(): Promise<WebmailSubscription[]> {
    const now = new Date();
    const q = query(
      collection(db, this.subscriptionsCollection),
      where('status', '==', 'active'),
      where('nextBillingDate', '<=', Timestamp.fromDate(now))
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        currentPeriodStart: data.currentPeriodStart?.toDate(),
        currentPeriodEnd: data.currentPeriodEnd?.toDate(),
        nextBillingDate: data.nextBillingDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as WebmailSubscription;
    });
  }

  /**
   * Verarbeite monatliche Abrechnung fuer ein Abo
   * Erstellt Revolut-Zahlungslink und sendet E-Mail
   */
  static async processBilling(subscriptionId: string): Promise<{
    success: boolean;
    invoiceId?: string;
    invoiceNumber?: string;
    paymentUrl?: string;
    error?: string;
  }> {
    try {
      const subRef = doc(db, this.subscriptionsCollection, subscriptionId);
      const subDoc = await getDoc(subRef);
      
      if (!subDoc.exists()) {
        return { success: false, error: 'Abonnement nicht gefunden' };
      }
      
      const subscription = subDoc.data();
      
      // Neuer Abrechnungszeitraum
      const newPeriodStart = subscription.nextBillingDate.toDate();
      const newPeriodEnd = new Date(newPeriodStart);
      
      if (subscription.billingInterval === 'monthly') {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      } else {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      }
      
      // Erstelle neue Rechnung
      const invoiceResult = await this.createInvoiceForSubscription(
        subscriptionId,
        newPeriodStart,
        newPeriodEnd
      );
      
      if (!invoiceResult.success) {
        return invoiceResult;
      }
      
      // Erstelle Revolut Zahlungslink
      let _paymentUrl: string | undefined;
      if (subscription.priceGross > 0) {
        try {
          const revolutResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webmail/create-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptionId,
              invoiceId: invoiceResult.invoiceId,
              amount: subscription.priceGross,
              customerEmail: subscription.customerEmail,
              customerName: subscription.customerName,
              description: `Taskilo Webmail - ${subscription.billingInterval === 'monthly' ? 'Monatlich' : 'Jährlich'}`,
            }),
          });
          
          if (revolutResponse.ok) {
            const paymentData = await revolutResponse.json();
            _paymentUrl = paymentData.checkoutUrl;
          }
        } catch {
          // Zahlungslink-Fehler - Rechnung trotzdem erstellen
        }
      }
      
      // Update Subscription
      await updateDoc(subRef, {
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        nextBillingDate: newPeriodEnd,
        updatedAt: serverTimestamp(),
      });
      
      return { success: true, invoiceId: invoiceResult.invoiceId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: message };
    }
  }

  /**
   * Hole alle Rechnungen (fuer Admin Dashboard)
   */
  static async getAllInvoices(options?: {
    status?: string;
    limit?: number;
  }): Promise<SubscriptionInvoice[]> {
    let q = query(collection(db, this.invoicesCollection));
    
    if (options?.status) {
      q = query(q, where('status', '==', options.status));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        periodStart: data.periodStart?.toDate(),
        periodEnd: data.periodEnd?.toDate(),
        dueDate: data.dueDate?.toDate(),
        paidAt: data.paidAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        sentAt: data.sentAt?.toDate(),
        pdfGeneratedAt: data.pdfGeneratedAt?.toDate(),
      } as SubscriptionInvoice;
    });
  }

  /**
   * Hole alle Abonnements (fuer Admin Dashboard)
   */
  static async getAllSubscriptions(): Promise<WebmailSubscription[]> {
    const snapshot = await getDocs(collection(db, this.subscriptionsCollection));
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        currentPeriodStart: data.currentPeriodStart?.toDate(),
        currentPeriodEnd: data.currentPeriodEnd?.toDate(),
        nextBillingDate: data.nextBillingDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        cancelledAt: data.cancelledAt?.toDate(),
      } as WebmailSubscription;
    });
  }

  /**
   * Markiere Rechnung als bezahlt
   */
  static async markInvoiceAsPaid(invoiceId: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.invoicesCollection, invoiceId), {
        status: 'paid',
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Markiere Rechnung als versendet
   */
  static async markInvoiceAsSent(invoiceId: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.invoicesCollection, invoiceId), {
        status: 'sent',
        sentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Kuendige Abonnement
   */
  static async cancelSubscription(
    subscriptionId: string, 
    reason?: string
  ): Promise<boolean> {
    try {
      // Kündige auch bei Revolut
      const subDoc = await getDoc(doc(db, this.subscriptionsCollection, subscriptionId));
      if (subDoc.exists()) {
        const data = subDoc.data();
        if (data.revolutSubscriptionId) {
          await this.cancelRevolutSubscription(data.revolutSubscriptionId);
        }
      }

      await updateDoc(doc(db, this.subscriptionsCollection, subscriptionId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelReason: reason,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generiere eindeutige ID
   */
  private static generateId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // ============================================
  // REVOLUT SUBSCRIPTION API INTEGRATION
  // Automatische Abbuchung am 1. des Monats
  // ============================================

  private static readonly REVOLUT_API_VERSION = '2025-10-16';

  private static getRevolutConfig() {
    const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
    return {
      apiKey: process.env.REVOLUT_MERCHANT_API_KEY,
      // Neue Subscription API (mit Version Header)
      baseUrl: isProduction
        ? 'https://merchant.revolut.com/api'
        : 'https://sandbox-merchant.revolut.com/api',
      // Legacy API 1.0 (fuer Customers und Orders)
      legacyBaseUrl: isProduction
        ? 'https://merchant.revolut.com/api/1.0'
        : 'https://sandbox-merchant.revolut.com/api/1.0',
    };
  }

  /**
   * Revolut API Request Helper (neue Subscription API)
   */
  private static async revolutRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const config = this.getRevolutConfig();
    
    if (!config.apiKey) {
      return { success: false, error: 'Revolut API nicht konfiguriert' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${config.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'Revolut-Api-Version': this.REVOLUT_API_VERSION,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Timeout: Revolut API antwortet nicht' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  /**
   * Revolut Legacy API Request Helper (1.0 - fuer Customers und Orders)
   */
  private static async revolutLegacyRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const config = this.getRevolutConfig();
    
    if (!config.apiKey) {
      return { success: false, error: 'Revolut API nicht konfiguriert' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${config.legacyBaseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Timeout: Revolut API antwortet nicht' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  /**
   * Erstellt oder findet einen Revolut Customer (Legacy API)
   */
  static async getOrCreateRevolutCustomer(
    email: string,
    fullName: string
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    // Suche nach existierendem Customer (Legacy API gibt Array zurueck)
    const searchResult = await this.revolutLegacyRequest<Array<{ id: string; email: string }>>(
      `/customers?email=${encodeURIComponent(email)}`
    );

    if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
      const existingCustomer = searchResult.data[0];
      if (existingCustomer) {
        return { success: true, customerId: existingCustomer.id };
      }
    }

    // Erstelle neuen Customer
    const createResult = await this.revolutLegacyRequest<{ id: string }>('/customers', 'POST', {
      email,
      full_name: fullName,
    });

    if (createResult.success && createResult.data) {
      return { success: true, customerId: createResult.data.id };
    }

    return { success: false, error: createResult.error };
  }

  /**
   * Erstellt eine Revolut Subscription mit automatischer Abbuchung
   * Kunde wird zur Checkout-Seite weitergeleitet um Zahlungsmethode einzugeben
   */
  static async createRevolutSubscription(
    customerId: string,
    planVariationId: string,
    localSubscriptionId: string
  ): Promise<{ success: boolean; subscriptionId?: string; checkoutUrl?: string; error?: string }> {
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/webmail/pricing/success?subscription_id=${localSubscriptionId}`;

    const result = await this.revolutRequest<{
      id: string;
      setup_order_id?: string;
    }>('/subscriptions', 'POST', {
      customer_id: customerId,
      plan_variation_id: planVariationId,
      setup_order_redirect_url: redirectUrl,
      external_reference: localSubscriptionId,
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    // Hole Checkout URL vom Setup Order (Legacy API)
    if (result.data.setup_order_id) {
      const orderResult = await this.revolutLegacyRequest<{ checkout_url: string }>(
        `/orders/${result.data.setup_order_id}`
      );

      if (orderResult.success && orderResult.data?.checkout_url) {
        return {
          success: true,
          subscriptionId: result.data.id,
          checkoutUrl: orderResult.data.checkout_url,
        };
      }
    }

    return {
      success: true,
      subscriptionId: result.data.id,
    };
  }

  /**
   * Kündigt eine Revolut Subscription
   */
  static async cancelRevolutSubscription(revolutSubscriptionId: string): Promise<boolean> {
    const result = await this.revolutRequest(
      `/subscriptions/${revolutSubscriptionId}/cancel`,
      'POST'
    );
    return result.success;
  }

  /**
   * Erstellt Subscription Plans bei Revolut (einmalig beim Setup)
   * Speichert die Plan IDs in Firestore für spätere Verwendung
   */
  static async initializeRevolutPlans(): Promise<{
    success: boolean;
    plans?: {
      promail: { planId: string; monthlyId: string; yearlyId: string };
      businessmail: { planId: string; monthlyId: string; yearlyId: string };
    };
    error?: string;
  }> {
    // ProMail Plan erstellen
    const promailResult = await this.revolutRequest<{
      id: string;
      variations: Array<{ id: string }>;
    }>('/subscription-plans', 'POST', {
      name: 'Taskilo ProMail',
      variations: [
        { phases: [{ ordinal: 1, cycle_duration: 'P1M', amount: 299, currency: 'EUR' }] },
        { phases: [{ ordinal: 1, cycle_duration: 'P1Y', amount: 2990, currency: 'EUR' }] },
      ],
    });

    if (!promailResult.success || !promailResult.data) {
      return { success: false, error: `ProMail: ${promailResult.error}` };
    }

    // BusinessMail Plan erstellen
    const businessResult = await this.revolutRequest<{
      id: string;
      variations: Array<{ id: string }>;
    }>('/subscription-plans', 'POST', {
      name: 'Taskilo BusinessMail',
      variations: [
        { phases: [{ ordinal: 1, cycle_duration: 'P1M', amount: 499, currency: 'EUR' }] },
        { phases: [{ ordinal: 1, cycle_duration: 'P1Y', amount: 4990, currency: 'EUR' }] },
      ],
    });

    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: `BusinessMail: ${businessResult.error}` };
    }

    // Speichere Plan IDs in Firestore
    const plans = {
      promail: {
        planId: promailResult.data.id,
        monthlyId: promailResult.data.variations[0]?.id,
        yearlyId: promailResult.data.variations[1]?.id,
      },
      businessmail: {
        planId: businessResult.data.id,
        monthlyId: businessResult.data.variations[0]?.id,
        yearlyId: businessResult.data.variations[1]?.id,
      },
    };

    await setDoc(doc(db, 'settings', 'revolutPlans'), {
      ...plans,
      createdAt: serverTimestamp(),
    });

    return { success: true, plans };
  }

  /**
   * Holt die gespeicherten Revolut Plan IDs
   */
  static async getRevolutPlanIds(): Promise<{
    promail?: { monthlyId: string; yearlyId: string };
    businessmail?: { monthlyId: string; yearlyId: string };
  } | null> {
    try {
      const planDoc = await getDoc(doc(db, 'settings', 'revolutPlans'));
      if (planDoc.exists()) {
        return planDoc.data() as {
          promail: { monthlyId: string; yearlyId: string };
          businessmail: { monthlyId: string; yearlyId: string };
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Kompletter Checkout-Flow für neues Webmail-Abo mit Revolut
   * 
   * 1. Lokale Subscription erstellen (pending)
   * 2. Revolut Customer erstellen/finden
   * 3. Revolut Subscription erstellen
   * 4. Checkout URL zurückgeben
   * 
   * Nach erfolgreicher Zahlung wird Revolut automatisch am 1. des Monats abbuchen
   */
  static async startRevolutCheckout(data: {
    userId: string;
    companyId?: string;
    planId: 'promail' | 'businessmail';
    billingInterval: BillingInterval;
    customerEmail: string;
    customerName: string;
    customerAddress: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    domain?: string;
  }): Promise<{
    success: boolean;
    subscriptionId?: string;
    checkoutUrl?: string;
    error?: string;
  }> {
    // 1. Hole Revolut Plan IDs
    const plans = await this.getRevolutPlanIds();
    if (!plans) {
      return { success: false, error: 'Revolut Plans nicht initialisiert. Bitte initializeRevolutPlans() ausführen.' };
    }

    const planConfig = plans[data.planId];
    if (!planConfig) {
      return { success: false, error: `Plan ${data.planId} nicht gefunden` };
    }

    const variationId = data.billingInterval === 'monthly' 
      ? planConfig.monthlyId 
      : planConfig.yearlyId;

    // 2. Erstelle lokale Subscription (pending)
    const priceNet = data.planId === 'promail'
      ? (data.billingInterval === 'monthly' ? 2.99 : 29.90)
      : (data.billingInterval === 'monthly' ? 4.99 : 49.90);

    const localResult = await this.createSubscription({
      orderId: `ORD-${this.generateId()}`,
      userId: data.userId,
      companyId: data.companyId,
      type: 'mailbox',
      billingInterval: data.billingInterval,
      priceNet,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      paymentMethod: 'revolut',
      domain: data.domain,
    });

    if (!localResult.success || !localResult.subscriptionId) {
      return { success: false, error: localResult.error };
    }

    // 3. Erstelle/finde Revolut Customer
    const customerResult = await this.getOrCreateRevolutCustomer(
      data.customerEmail,
      data.customerName
    );

    if (!customerResult.success || !customerResult.customerId) {
      return { success: false, error: customerResult.error };
    }

    // 4. Erstelle Revolut Subscription
    const revolutResult = await this.createRevolutSubscription(
      customerResult.customerId,
      variationId,
      localResult.subscriptionId
    );

    if (!revolutResult.success) {
      return { success: false, error: revolutResult.error };
    }

    // 5. Speichere Revolut IDs in lokaler Subscription
    await updateDoc(doc(db, this.subscriptionsCollection, localResult.subscriptionId), {
      revolutCustomerId: customerResult.customerId,
      revolutSubscriptionId: revolutResult.subscriptionId,
      status: 'pending', // Wird auf 'active' gesetzt wenn Zahlung erfolgt
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      subscriptionId: localResult.subscriptionId,
      checkoutUrl: revolutResult.checkoutUrl,
    };
  }
}

