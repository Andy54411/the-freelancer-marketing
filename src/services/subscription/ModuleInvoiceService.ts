/**
 * Module Invoice Service
 * 
 * Erstellt automatische Rechnungen für:
 * - Premium-Module (einzeln oder Bundle)
 * - Zusätzliche Seats
 * - Anteilige Abrechnungen bei Änderungen
 * 
 * Nutzt das bestehende Taskilo Rechnungssystem
 */

import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  PREMIUM_MODULES,
  MODULE_BUNDLE,
  SEAT_CONFIG,
  type PremiumModuleId,
} from '@/lib/moduleConfig';
import type { ModuleSubscription } from './ModuleSubscriptionService';

// ============================================================================
// TYPES
// ============================================================================

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPriceNet: number;
  unitPriceGross: number;
  totalNet: number;
  totalGross: number;
  vatRate: number;
}

interface ModuleInvoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  type: 'module_subscription' | 'seat_purchase' | 'bundle_subscription';
  
  // Kunde
  customerName: string;
  customerEmail: string;
  customerAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  
  // Steuer
  vatId?: string;
  taxNumber?: string;
  isKleinunternehmer: boolean;
  
  // Positionen
  items: InvoiceItem[];
  
  // Beträge
  subtotalNet: number;
  subtotalGross: number;
  vatAmount: number;
  vatRate: number;
  totalNet: number;
  totalGross: number;
  
  // Zeitraum
  periodStart: Date;
  periodEnd: Date;
  billingInterval: 'monthly' | 'yearly';
  
  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidAt?: Date;
  
  // Referenzen
  moduleSubscriptionIds?: string[];
  seatChangeId?: string;
  revolutOrderId?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}

interface CompanyData {
  companyName?: string;
  displayName?: string;
  email?: string;
  contactEmail?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  vatId?: string;
  taxNumber?: string;
  kleinunternehmer?: string;
  ust?: string;
  step2?: {
    kleinunternehmer?: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateInvoiceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `MOD-${timestamp}-${random}`.toUpperCase();
}

async function getNextInvoiceNumber(companyId: string): Promise<string> {
  if (!db) throw new Error('Datenbank nicht verfügbar');
  
  const year = new Date().getFullYear();
  const counterRef = db.collection('companies').doc(companyId).collection('counters').doc('moduleInvoices');
  
  const result = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextNumber = 1;
    
    if (counterDoc.exists) {
      const data = counterDoc.data();
      if (data?.year === year) {
        nextNumber = (data.lastNumber || 0) + 1;
      }
    }
    
    transaction.set(counterRef, {
      year,
      lastNumber: nextNumber,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return nextNumber;
  });
  
  return `MOD-${year}-${String(result).padStart(5, '0')}`;
}

async function getCompanyData(companyId: string): Promise<CompanyData | null> {
  if (!db) return null;
  
  try {
    const doc = await db.collection('companies').doc(companyId).get();
    if (!doc.exists) return null;
    return doc.data() as CompanyData;
  } catch {
    return null;
  }
}

function isKleinunternehmer(company: CompanyData): boolean {
  return (
    company.kleinunternehmer === 'ja' ||
    company.ust === 'kleinunternehmer' ||
    company.step2?.kleinunternehmer === 'ja'
  );
}

function getModuleName(moduleId: string): string {
  const premiumModule = PREMIUM_MODULES[moduleId as PremiumModuleId];
  return premiumModule?.name || moduleId;
}

// ============================================================================
// INVOICE CREATION
// ============================================================================

export class ModuleInvoiceService {
  private static collection = 'module_invoices';

  /**
   * Erstelle Rechnung für ein Modul-Abonnement
   */
  static async createModuleInvoice(
    companyId: string,
    subscription: ModuleSubscription,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    try {
      const company = await getCompanyData(companyId);
      if (!company) {
        return { success: false, error: 'Unternehmen nicht gefunden' };
      }

      const invoiceId = generateInvoiceId();
      const invoiceNumber = await getNextInvoiceNumber(companyId);
      const isKU = isKleinunternehmer(company);
      const vatRate = isKU ? 0 : 19;

      const unitPriceGross = subscription.priceGross;
      const unitPriceNet = isKU ? unitPriceGross : unitPriceGross / 1.19;

      const items: InvoiceItem[] = [{
        description: `${subscription.moduleName} - ${subscription.billingInterval === 'monthly' ? 'Monatlich' : 'Jährlich'}`,
        quantity: 1,
        unitPriceNet: Math.round(unitPriceNet * 100) / 100,
        unitPriceGross,
        totalNet: Math.round(unitPriceNet * 100) / 100,
        totalGross: unitPriceGross,
        vatRate,
      }];

      const totalNet = items.reduce((sum, item) => sum + item.totalNet, 0);
      const totalGross = items.reduce((sum, item) => sum + item.totalGross, 0);
      const vatAmount = totalGross - totalNet;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const invoice: Omit<ModuleInvoice, 'createdAt' | 'updatedAt'> & { createdAt: FieldValue; updatedAt: FieldValue } = {
        id: invoiceId,
        companyId,
        invoiceNumber,
        type: 'module_subscription',
        customerName: company.companyName || company.displayName || '',
        customerEmail: company.email || company.contactEmail || '',
        customerAddress: {
          street: company.address?.street || '',
          city: company.address?.city || '',
          postalCode: company.address?.postalCode || '',
          country: company.address?.country || 'DE',
        },
        vatId: company.vatId,
        taxNumber: company.taxNumber,
        isKleinunternehmer: isKU,
        items,
        subtotalNet: totalNet,
        subtotalGross: totalGross,
        vatAmount,
        vatRate,
        totalNet,
        totalGross,
        periodStart,
        periodEnd,
        billingInterval: subscription.billingInterval,
        status: 'draft',
        dueDate,
        moduleSubscriptionIds: [subscription.id],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await db
        .collection('companies')
        .doc(companyId)
        .collection(this.collection)
        .doc(invoiceId)
        .set(invoice);

      return { success: true, invoiceId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error('[ModuleInvoiceService] Fehler:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Erstelle Rechnung für Bundle-Abonnement
   */
  static async createBundleInvoice(
    companyId: string,
    subscriptions: ModuleSubscription[],
    periodStart: Date,
    periodEnd: Date,
    billingInterval: 'monthly' | 'yearly'
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    try {
      const company = await getCompanyData(companyId);
      if (!company) {
        return { success: false, error: 'Unternehmen nicht gefunden' };
      }

      const invoiceId = generateInvoiceId();
      const invoiceNumber = await getNextInvoiceNumber(companyId);
      const isKU = isKleinunternehmer(company);
      const vatRate = isKU ? 0 : 19;

      const bundlePrice = MODULE_BUNDLE.price[billingInterval];
      const bundlePriceNet = isKU ? bundlePrice : MODULE_BUNDLE.priceNet[billingInterval];

      const items: InvoiceItem[] = [{
        description: `${MODULE_BUNDLE.name} - ${billingInterval === 'monthly' ? 'Monatlich' : 'Jährlich'}`,
        quantity: 1,
        unitPriceNet: bundlePriceNet,
        unitPriceGross: bundlePrice,
        totalNet: bundlePriceNet,
        totalGross: bundlePrice,
        vatRate,
      }];

      // Enthaltene Module als Info-Zeilen
      for (const moduleId of MODULE_BUNDLE.includes) {
        const moduleName = getModuleName(moduleId);
        items.push({
          description: `  └ ${moduleName} (im Bundle enthalten)`,
          quantity: 1,
          unitPriceNet: 0,
          unitPriceGross: 0,
          totalNet: 0,
          totalGross: 0,
          vatRate: 0,
        });
      }

      const totalNet = bundlePriceNet;
      const totalGross = bundlePrice;
      const vatAmount = totalGross - totalNet;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const invoice: Omit<ModuleInvoice, 'createdAt' | 'updatedAt'> & { createdAt: FieldValue; updatedAt: FieldValue } = {
        id: invoiceId,
        companyId,
        invoiceNumber,
        type: 'bundle_subscription',
        customerName: company.companyName || company.displayName || '',
        customerEmail: company.email || company.contactEmail || '',
        customerAddress: {
          street: company.address?.street || '',
          city: company.address?.city || '',
          postalCode: company.address?.postalCode || '',
          country: company.address?.country || 'DE',
        },
        vatId: company.vatId,
        taxNumber: company.taxNumber,
        isKleinunternehmer: isKU,
        items,
        subtotalNet: totalNet,
        subtotalGross: totalGross,
        vatAmount,
        vatRate,
        totalNet,
        totalGross,
        periodStart,
        periodEnd,
        billingInterval,
        status: 'draft',
        dueDate,
        moduleSubscriptionIds: subscriptions.map(s => s.id),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await db
        .collection('companies')
        .doc(companyId)
        .collection(this.collection)
        .doc(invoiceId)
        .set(invoice);

      return { success: true, invoiceId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error('[ModuleInvoiceService] Bundle-Rechnung Fehler:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Erstelle Rechnung für Seat-Kauf
   */
  static async createSeatInvoice(
    companyId: string,
    quantity: number,
    billingInterval: 'monthly' | 'yearly',
    proratedAmount?: number
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    try {
      const company = await getCompanyData(companyId);
      if (!company) {
        return { success: false, error: 'Unternehmen nicht gefunden' };
      }

      const invoiceId = generateInvoiceId();
      const invoiceNumber = await getNextInvoiceNumber(companyId);
      const isKU = isKleinunternehmer(company);
      const vatRate = isKU ? 0 : 19;

      const unitPrice = SEAT_CONFIG.pricePerSeat[billingInterval];
      const totalPrice = proratedAmount ?? (quantity * unitPrice);
      const totalPriceNet = isKU ? totalPrice : totalPrice / 1.19;

      const now = new Date();
      const periodEnd = new Date(now);
      if (billingInterval === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const description = proratedAmount
        ? `${quantity} zusätzliche Seat(s) - Anteilig für laufenden Zeitraum`
        : `${quantity} zusätzliche Seat(s) - ${billingInterval === 'monthly' ? 'Monatlich' : 'Jährlich'}`;

      const items: InvoiceItem[] = [{
        description,
        quantity,
        unitPriceNet: Math.round((unitPrice / (isKU ? 1 : 1.19)) * 100) / 100,
        unitPriceGross: unitPrice,
        totalNet: Math.round(totalPriceNet * 100) / 100,
        totalGross: totalPrice,
        vatRate,
      }];

      const vatAmount = totalPrice - totalPriceNet;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const invoice: Omit<ModuleInvoice, 'createdAt' | 'updatedAt'> & { createdAt: FieldValue; updatedAt: FieldValue } = {
        id: invoiceId,
        companyId,
        invoiceNumber,
        type: 'seat_purchase',
        customerName: company.companyName || company.displayName || '',
        customerEmail: company.email || company.contactEmail || '',
        customerAddress: {
          street: company.address?.street || '',
          city: company.address?.city || '',
          postalCode: company.address?.postalCode || '',
          country: company.address?.country || 'DE',
        },
        vatId: company.vatId,
        taxNumber: company.taxNumber,
        isKleinunternehmer: isKU,
        items,
        subtotalNet: Math.round(totalPriceNet * 100) / 100,
        subtotalGross: totalPrice,
        vatAmount: Math.round(vatAmount * 100) / 100,
        vatRate,
        totalNet: Math.round(totalPriceNet * 100) / 100,
        totalGross: totalPrice,
        periodStart: now,
        periodEnd,
        billingInterval,
        status: 'draft',
        dueDate,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await db
        .collection('companies')
        .doc(companyId)
        .collection(this.collection)
        .doc(invoiceId)
        .set(invoice);

      return { success: true, invoiceId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error('[ModuleInvoiceService] Seat-Rechnung Fehler:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Markiere Rechnung als bezahlt
   */
  static async markAsPaid(
    companyId: string,
    invoiceId: string,
    revolutOrderId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      return { success: false, error: 'Datenbank nicht verfügbar' };
    }

    try {
      await db
        .collection('companies')
        .doc(companyId)
        .collection(this.collection)
        .doc(invoiceId)
        .update({
          status: 'paid',
          paidAt: FieldValue.serverTimestamp(),
          revolutOrderId: revolutOrderId || null,
          updatedAt: FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: message };
    }
  }

  /**
   * Hole alle Rechnungen für ein Unternehmen
   */
  static async getInvoices(
    companyId: string,
    limit = 50
  ): Promise<ModuleInvoice[]> {
    if (!db) return [];

    try {
      const snapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection(this.collection)
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          periodStart: data.periodStart?.toDate?.() || new Date(),
          periodEnd: data.periodEnd?.toDate?.() || new Date(),
          dueDate: data.dueDate?.toDate?.() || new Date(),
          paidAt: data.paidAt?.toDate?.(),
          sentAt: data.sentAt?.toDate?.(),
        } as ModuleInvoice;
      });
    } catch (error) {
      console.error('[ModuleInvoiceService] Fehler beim Laden:', error);
      return [];
    }
  }
}
