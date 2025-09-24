'use client';

import { TaxRuleType } from '@/types/taxRules';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { InventoryService } from './inventoryService';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
  unit?: string;
  category?: string;
  inventoryItemId?: string; // Verknüpfung zu Inventar-Artikel
  discountPercent?: number; // Optionaler prozentualer Rabatt je Position
}

export interface Quote {
  id: string;
  companyId: string;
  number: string;

  // Kunde
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Datum & Gültigkeit
  date: Date;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;

  // Status
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

  // Inhalt
  title?: string;
  description?: string;
  notes?: string;
  footerText?: string;
  customerOrderNumber?: string; // Referenz / Bestellnummer des Kunden
  // Zusätzliche optionale Felder (Mehr Optionen)
  taxRule?: TaxRuleType;
  internalContactPerson?: string;
  deliveryTerms?: string;
  paymentTerms?: string;

  // Skonto-Einstellungen
  skontoEnabled?: boolean;
  skontoDays?: number;
  skontoPercentage?: number;
  skontoText?: string;

  // Positionen
  items: QuoteItem[];

  // Beträge
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;

  // Versand
  deliveryDate?: Date;
  deliveryMethod?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Metadaten
  createdBy: string;
  lastModifiedBy?: string;
  template?: string;
  language?: string;

  // Konvertierung
  convertedToInvoice?: boolean;
  invoiceId?: string;
  convertedAt?: Date;

  // Workflow
  sentAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  cancelledAt?: Date;
}

export interface QuoteSettings {
  companyId: string;
  numberPrefix: string;
  numberFormat: string; // z.B. "A-{YYYY}-{NNN}"
  currentNumber: number;
  defaultValidityDays: number;
  defaultTaxRate: number;
  defaultCurrency: string;
  emailTemplate: string;
  emailSubject: string;
  terms?: string;
  footer?: string;
  autoSend: boolean;
  autoConvertToInvoice: boolean;
  reminderDays: number[];
}

export class QuoteService {
  /**
   * Alle Angebote für eine Company abrufen
   */
  static async getQuotes(companyId: string): Promise<Quote[]> {
    try {
      const quotesRef = collection(db, 'companies', companyId, 'quotes');
      const q = query(quotesRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        validUntil: doc.data().validUntil?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        deliveryDate: doc.data().deliveryDate?.toDate(),
        sentAt: doc.data().sentAt?.toDate(),
        acceptedAt: doc.data().acceptedAt?.toDate(),
        rejectedAt: doc.data().rejectedAt?.toDate(),
        convertedAt: doc.data().convertedAt?.toDate(),
        cancelledAt: doc.data().cancelledAt?.toDate(),
      })) as Quote[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebot nach ID abrufen
   */
  static async getQuote(companyId: string, quoteId: string): Promise<Quote | null> {
    try {
      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
      const snapshot = await getDoc(quoteRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      return {
        id: snapshot.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        validUntil: data.validUntil?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        deliveryDate: data.deliveryDate?.toDate(),
        sentAt: data.sentAt?.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        convertedAt: data.convertedAt?.toDate(),
        cancelledAt: data.cancelledAt?.toDate(),
      } as Quote;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Neues Angebot erstellen
   */
  static async createQuote(
    companyId: string,
    quoteData: Omit<Quote, 'id' | 'number' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      // Angebotsnummer generieren
      const number = await this.generateQuoteNumber(companyId);

      const quotesRef = collection(db, 'companies', companyId, 'quotes');
      const payload: Record<string, any> = {
        ...quoteData,
        number,
        companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: Timestamp.fromDate(quoteData.date),
        validUntil: Timestamp.fromDate(quoteData.validUntil),
        deliveryDate: quoteData.deliveryDate ? Timestamp.fromDate(quoteData.deliveryDate) : null,
      };
      const cleanedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
      );
      const docRef = await addDoc(quotesRef, cleanedPayload);

      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebot aktualisieren
   */
  static async updateQuote(
    companyId: string,
    quoteId: string,
    updates: Partial<Quote>
  ): Promise<void> {
    try {
      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);

      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Datum-Felder konvertieren
      if (updates.date) updateData.date = Timestamp.fromDate(updates.date);
      if (updates.validUntil) updateData.validUntil = Timestamp.fromDate(updates.validUntil);
      if (updates.deliveryDate) updateData.deliveryDate = Timestamp.fromDate(updates.deliveryDate);

      const cleaned = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined)
      );
      await updateDoc(quoteRef, cleaned);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebot löschen
   */
  static async deleteQuote(companyId: string, quoteId: string): Promise<void> {
    try {
      // Vor dem Löschen: evtl. bestehende Reservierungen freigeben
      const quote = await this.getQuote(companyId, quoteId);
      if (quote && (quote.status === 'draft' || quote.status === 'sent')) {
        const inventoryItems = (quote.items || [])
          .filter(it => it.inventoryItemId && it.quantity > 0 && it.category !== 'discount')
          .map(it => ({ itemId: it.inventoryItemId as string, quantity: it.quantity }));
        if (inventoryItems.length > 0) {
          await InventoryService.releaseReservationForQuote(companyId, quoteId, inventoryItems);
        }
      }
      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
      await deleteDoc(quoteRef);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebot versenden
   */
  static async sendQuote(companyId: string, quoteId: string): Promise<void> {
    try {
      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
      await updateDoc(quoteRef, {
        status: 'sent',
        sentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebot annehmen
   */
  static async acceptQuote(companyId: string, quoteId: string): Promise<void> {
    try {
      const quote = await this.getQuote(companyId, quoteId);
      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
      await updateDoc(quoteRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reservierte Artikel als verkauft markieren
      const inventoryItems = (quote?.items || [])
        .filter(it => it.inventoryItemId && it.quantity > 0 && it.category !== 'discount')
        .map(it => ({ itemId: it.inventoryItemId as string, quantity: it.quantity }));
      if (inventoryItems.length > 0) {
        await InventoryService.sellReservedItems(companyId, quoteId, inventoryItems);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebot ablehnen
   */
  static async rejectQuote(companyId: string, quoteId: string, reason?: string): Promise<void> {
    try {
      const quote = await this.getQuote(companyId, quoteId);
      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
      await updateDoc(quoteRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectionReason: reason || '',
        updatedAt: serverTimestamp(),
      });

      // Reservierungen freigeben
      const inventoryItems = (quote?.items || [])
        .filter(it => it.inventoryItemId && it.quantity > 0 && it.category !== 'discount')
        .map(it => ({ itemId: it.inventoryItemId as string, quantity: it.quantity }));
      if (inventoryItems.length > 0) {
        await InventoryService.releaseReservationForQuote(companyId, quoteId, inventoryItems);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebot stornieren
   */
  static async cancelQuote(companyId: string, quoteId: string): Promise<void> {
    try {
      const quote = await this.getQuote(companyId, quoteId);
      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
      await updateDoc(quoteRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reservierungen freigeben (falls vorhanden)
      const inventoryItems = (quote?.items || [])
        .filter(it => it.inventoryItemId && it.quantity > 0 && it.category !== 'discount')
        .map(it => ({ itemId: it.inventoryItemId as string, quantity: it.quantity }));
      if (inventoryItems.length > 0) {
        await InventoryService.releaseReservationForQuote(companyId, quoteId, inventoryItems);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebot in Rechnung umwandeln
   */
  static async convertToInvoice(companyId: string, quoteId: string): Promise<string> {
    try {
      const quote = await this.getQuote(companyId, quoteId);
      if (!quote) {
        throw new Error('Angebot nicht gefunden');
      }

      if (quote.status !== 'accepted') {
        throw new Error('Nur angenommene Angebote können in Rechnungen umgewandelt werden');
      }

      // TODO: Hier würde die Rechnung erstellt werden
      // const invoiceId = await InvoiceService.createFromQuote(companyId, quote);

      // Angebot als konvertiert markieren
      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
      await updateDoc(quoteRef, {
        convertedToInvoice: true,
        // invoiceId,
        convertedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return 'temp-invoice-id'; // TODO: Echte Invoice-ID zurückgeben
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebotsnummer generieren
   */
  static async generateQuoteNumber(companyId: string): Promise<string> {
    try {
      const settings = await this.getQuoteSettings(companyId);
      const year = new Date().getFullYear();
      const nextNumber = settings.currentNumber + 1;

      // Format: A-2025-001
      const number = settings.numberFormat
        .replace('{PREFIX}', settings.numberPrefix)
        .replace('{YYYY}', year.toString())
        .replace('{NNN}', nextNumber.toString().padStart(3, '0'));

      // Zähler erhöhen
      await this.updateQuoteSettings(companyId, { currentNumber: nextNumber });

      return number;
    } catch (error) {
      // Fallback
      return `A-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Angebots-Einstellungen abrufen
   */
  static async getQuoteSettings(companyId: string): Promise<QuoteSettings> {
    try {
      const settingsRef = doc(db, 'companies', companyId, 'settings', 'quotes');
      const snapshot = await getDoc(settingsRef);

      if (!snapshot.exists()) {
        // Standard-Einstellungen erstellen
        const defaultSettings: QuoteSettings = {
          companyId,
          numberPrefix: 'A',
          numberFormat: '{PREFIX}-{YYYY}-{NNN}',
          currentNumber: 0,
          defaultValidityDays: 30,
          defaultTaxRate: 19,
          defaultCurrency: 'EUR',
          emailTemplate: 'Anbei erhalten Sie unser Angebot {NUMBER}.',
          emailSubject: 'Angebot {NUMBER}',
          autoSend: false,
          autoConvertToInvoice: false,
          reminderDays: [7, 3, 1],
        };

        await this.updateQuoteSettings(companyId, defaultSettings);
        return defaultSettings;
      }

      return snapshot.data() as QuoteSettings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebots-Einstellungen aktualisieren
   */
  static async updateQuoteSettings(
    companyId: string,
    settings: Partial<QuoteSettings>
  ): Promise<void> {
    try {
      const settingsRef = doc(db, 'companies', companyId, 'settings', 'quotes');
      await updateDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Statistiken abrufen
   */
  static async getQuoteStatistics(companyId: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    expired: number;
    totalValue: number;
    acceptedValue: number;
  }> {
    try {
      const quotes = await this.getQuotes(companyId);

      const stats = {
        total: quotes.length,
        draft: quotes.filter(q => q.status === 'draft').length,
        sent: quotes.filter(q => q.status === 'sent').length,
        accepted: quotes.filter(q => q.status === 'accepted').length,
        rejected: quotes.filter(q => q.status === 'rejected').length,
        expired: quotes.filter(q => q.status === 'expired').length,
        totalValue: quotes.reduce((sum, q) => sum + q.total, 0),
        acceptedValue: quotes
          .filter(q => q.status === 'accepted')
          .reduce((sum, q) => sum + q.total, 0),
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Real-time Listener für Angebote
   */
  static subscribeToQuotes(companyId: string, callback: (quotes: Quote[]) => void): () => void {
    const quotesRef = collection(db, 'companies', companyId, 'quotes');
    const q = query(quotesRef, orderBy('date', 'desc'));

    return onSnapshot(q, snapshot => {
      const quotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        validUntil: doc.data().validUntil?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        deliveryDate: doc.data().deliveryDate?.toDate(),
        sentAt: doc.data().sentAt?.toDate(),
        acceptedAt: doc.data().acceptedAt?.toDate(),
        rejectedAt: doc.data().rejectedAt?.toDate(),
        convertedAt: doc.data().convertedAt?.toDate(),
      })) as Quote[];

      callback(quotes);
    });
  }
}
