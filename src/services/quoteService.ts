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
import { NumberSequenceService } from './numberSequenceService';

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
  customerFirstName?: string;
  customerLastName?: string;
  customerNumber?: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?:
    | string
    | {
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
  headTextHtml?: string;
  notes?: string;
  footerText?: string;
  customerOrderNumber?: string; // Referenz / Bestellnummer des Kunden
  servicePeriod?: string;
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

      const quotes = snapshot.docs.map(doc => {
        const data = doc.data();

        // Debug logging to see what's happening

        // CRITICAL FIX: Always use Firestore document ID, ignore any id field in data
        const quote = {
          ...data,
          id: doc.id, // ALWAYS override with Firestore document ID
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

        // Force ID to be the document ID - this fixes existing data
        quote.id = doc.id;

        return quote;
      });

      return quotes;
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

      // CRITICAL FIX: Always use Firestore document ID, ignore any id field in data
      const quote = {
        ...data,
        id: snapshot.id, // ALWAYS override with Firestore document ID
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

      // Force ID to be the document ID - this fixes existing data
      quote.id = snapshot.id;

      return quote;
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
      // 🔥 Lade vollständige Company-Daten für PDF-Generierung
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);

      let companyEnrichment = {};
      if (companySnap.exists()) {
        const companyData = companySnap.data();

        // Extrahiere Bank-Daten aus allen verfügbaren Quellen (wie placeholderSystem.ts)
        const bankDetails = companyData.bankDetails || companyData.step4 || companyData.step3 || {};

        companyEnrichment = {
          // Company Basis-Daten
          companyName: companyData.companyName || '',
          companyStreet: companyData.companyStreet || '',
          companyHouseNumber: companyData.companyHouseNumber || '',
          companyPostalCode: companyData.companyPostalCode || '',
          companyCity: companyData.companyCity || '',
          companyCountry: companyData.companyCountry || 'Deutschland',
          companyPhone: companyData.phoneNumber || companyData.companyPhoneNumber || '',
          companyEmail: companyData.email || companyData.contactEmail || '',
          companyWebsite: companyData.website || companyData.companyWebsite || '',
          companyTaxNumber: companyData.taxNumber || '',
          companyVatId: companyData.vatId || '',

          // Bank-Daten (komplett für Platzhalter-System)
          companyIban: bankDetails.iban || companyData.iban || '',
          companyBic: bankDetails.bic || companyData.bic || '',
          bankDetails: {
            iban: bankDetails.iban || companyData.iban || '',
            bic: bankDetails.bic || companyData.bic || '',
            bankName: bankDetails.bankName || companyData.bankName || '',
            accountHolder:
              bankDetails.accountHolder ||
              companyData.accountHolder ||
              companyData.companyName ||
              '',
          },

          // Registrierungsdaten
          companyRegister: companyData.companyRegister || companyData.registrationNumber || '',
          companyRegistrationNumber:
            companyData.companyRegister || companyData.registrationNumber || '',
          legalForm: companyData.legalForm || '',
          districtCourt: companyData.districtCourt || '',

          // Kleinunternehmer-Status
          isSmallBusiness: companyData.kleinunternehmer === 'ja' || false,
        };
      }

      // Angebotsnummer generieren
      const number = await this.generateQuoteNumber(companyId);

      // CRITICAL FIX: Remove 'id' field from quoteData to prevent empty ID from being saved
      const { id, ...cleanQuoteData } = quoteData as any;

      const quotesRef = collection(db, 'companies', companyId, 'quotes');
      const payload: Record<string, any> = {
        ...cleanQuoteData, // Use cleaned data without ID
        ...companyEnrichment, // 🔥 Füge vollständige Company-Daten hinzu
        number,
        companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: Timestamp.fromDate(
          cleanQuoteData.date instanceof Date ? cleanQuoteData.date : new Date(cleanQuoteData.date)
        ),
        validUntil: Timestamp.fromDate(
          cleanQuoteData.validUntil instanceof Date
            ? cleanQuoteData.validUntil
            : new Date(cleanQuoteData.validUntil)
        ),
        deliveryDate: cleanQuoteData.deliveryDate
          ? Timestamp.fromDate(
              cleanQuoteData.deliveryDate instanceof Date
                ? cleanQuoteData.deliveryDate
                : new Date(cleanQuoteData.deliveryDate)
            )
          : null,
      };

      const cleanedPayload = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => value !== undefined && key !== 'id') // Also filter out any id field
      );

      const docRef = await addDoc(quotesRef, cleanedPayload);

      // Automatisch Aktivität in Kundenhistorie erstellen
      try {
        await this.createCustomerActivity(
          companyId,
          cleanQuoteData.customerId || cleanQuoteData.customerName,
          'document',
          `Angebot erstellt: ${number}`,
          `Ein neues Angebot über ${cleanQuoteData.total ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: cleanQuoteData.currency || 'EUR' }).format(cleanQuoteData.total) : ''} wurde erstellt.`,
          {
            quoteId: docRef.id,
            quoteNumber: number,
            amount: cleanQuoteData.total,
            currency: cleanQuoteData.currency,
          }
        );
      } catch (activityError) {
        console.warn('Could not create customer activity:', activityError);
        // Don't fail the quote creation if activity logging fails
      }

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
      // 🔥 Lade aktuelle Company-Daten bei jedem Update
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);

      let companyEnrichment = {};
      if (companySnap.exists()) {
        const companyData = companySnap.data();

        // Extrahiere Bank-Daten aus allen verfügbaren Quellen
        const bankDetails = companyData.bankDetails || companyData.step4 || companyData.step3 || {};

        companyEnrichment = {
          companyName: companyData.companyName || '',
          companyStreet: companyData.companyStreet || '',
          companyHouseNumber: companyData.companyHouseNumber || '',
          companyPostalCode: companyData.companyPostalCode || '',
          companyCity: companyData.companyCity || '',
          companyCountry: companyData.companyCountry || 'Deutschland',
          companyPhone: companyData.phoneNumber || companyData.companyPhoneNumber || '',
          companyEmail: companyData.email || companyData.contactEmail || '',
          companyWebsite: companyData.website || companyData.companyWebsite || '',
          companyTaxNumber: companyData.taxNumber || '',
          companyVatId: companyData.vatId || '',
          companyIban: bankDetails.iban || companyData.iban || '',
          companyBic: bankDetails.bic || companyData.bic || '',
          bankDetails: {
            iban: bankDetails.iban || companyData.iban || '',
            bic: bankDetails.bic || companyData.bic || '',
            bankName: bankDetails.bankName || companyData.bankName || '',
            accountHolder:
              bankDetails.accountHolder ||
              companyData.accountHolder ||
              companyData.companyName ||
              '',
          },
          companyRegister: companyData.companyRegister || companyData.registrationNumber || '',
          companyRegistrationNumber:
            companyData.companyRegister || companyData.registrationNumber || '',
          legalForm: companyData.legalForm || '',
          districtCourt: companyData.districtCourt || '',
          isSmallBusiness: companyData.kleinunternehmer === 'ja' || false,
        };
      }

      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);

      const updateData: any = {
        ...updates,
        ...companyEnrichment, // 🔥 Aktualisiere Company-Daten bei jedem Update
        updatedAt: serverTimestamp(),
      };

      // Datum-Felder konvertieren
      if (updates.date) updateData.date = Timestamp.fromDate(updates.date);
      if (updates.validUntil) updateData.validUntil = Timestamp.fromDate(updates.validUntil);
      if (updates.deliveryDate) updateData.deliveryDate = Timestamp.fromDate(updates.deliveryDate);
      if (updates.sentAt) updateData.sentAt = Timestamp.fromDate(updates.sentAt);
      if (updates.acceptedAt) updateData.acceptedAt = Timestamp.fromDate(updates.acceptedAt);
      if (updates.rejectedAt) updateData.rejectedAt = Timestamp.fromDate(updates.rejectedAt);
      if (updates.convertedAt) updateData.convertedAt = Timestamp.fromDate(updates.convertedAt);
      if (updates.cancelledAt) updateData.cancelledAt = Timestamp.fromDate(updates.cancelledAt);

      const cleaned = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined)
      );
      await updateDoc(quoteRef, cleaned);

      // Automatisch Aktivität in Kundenhistorie bei relevanten Updates erstellen
      try {
        if (updates.customerName || updates.customerId) {
          // Lade das vollständige Angebot für Details
          const quoteSnapshot = await getDoc(quoteRef);
          if (quoteSnapshot.exists()) {
            const quoteData = quoteSnapshot.data();

            await this.createCustomerActivity(
              companyId,
              updates.customerId ||
                updates.customerName ||
                quoteData.customerId ||
                quoteData.customerName,
              'document',
              `Angebot aktualisiert: ${quoteData.number}`,
              `Das Angebot wurde bearbeitet und aktualisiert.`,
              {
                quoteId: quoteId,
                quoteNumber: quoteData.number,
                updateType: 'modification',
              }
            );
          }
        }
      } catch (activityError) {
        console.warn('Could not create customer activity for quote update:', activityError);
        // Don't fail the quote update if activity logging fails
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Angebot löschen
   */
  static async deleteQuote(companyId: string, quoteId: string): Promise<void> {
    try {
      // Vor dem Löschen: Angebotsdaten für Aktivität speichern
      const quote = await this.getQuote(companyId, quoteId);

      // Evtl. bestehende Reservierungen freigeben
      if (quote && (quote.status === 'draft' || quote.status === 'sent')) {
        const inventoryItems = (quote.items || [])
          .filter(it => it.inventoryItemId && it.quantity > 0 && it.category !== 'discount')
          .map(it => ({ itemId: it.inventoryItemId as string, quantity: it.quantity }));
        if (inventoryItems.length > 0) {
          await InventoryService.releaseReservationForQuote(companyId, quoteId, inventoryItems);
        }
      }

      // Angebot löschen
      const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
      await deleteDoc(quoteRef);

      // Automatisch Aktivität in Kundenhistorie erstellen
      if (quote && (quote.customerId || quote.customerName)) {
        try {
          await this.createCustomerActivity(
            companyId,
            (quote.customerId || quote.customerName) as string,
            'system',
            `Angebot gelöscht: ${quote.number}`,
            `Das Angebot wurde aus dem System gelöscht.`,
            {
              quoteNumber: quote.number,
              amount: quote.total,
              currency: quote.currency,
              actionType: 'deleted',
            }
          );
        } catch (activityError) {
          console.warn('Could not create customer activity for quote deletion:', activityError);
        }
      }
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

      // Lade das Angebot für Kundenaktivität
      const quoteSnapshot = await getDoc(quoteRef);
      if (!quoteSnapshot.exists()) {
        throw new Error('Quote not found');
      }

      const quoteData = quoteSnapshot.data();

      await updateDoc(quoteRef, {
        status: 'sent',
        sentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Automatisch Aktivität in Kundenhistorie erstellen
      try {
        await this.createCustomerActivity(
          companyId,
          quoteData.customerId || quoteData.customerName,
          'email',
          `Angebot versendet: ${quoteData.number}`,
          `Das Angebot wurde per E-Mail an den Kunden versendet.`,
          {
            quoteId: quoteId,
            quoteNumber: quoteData.number,
            amount: quoteData.total,
            currency: quoteData.currency,
            actionType: 'sent',
          }
        );
      } catch (activityError) {
        console.warn('Could not create customer activity for quote sending:', activityError);
      }
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

      // Automatisch Aktivität in Kundenhistorie erstellen
      if (quote?.customerId || quote?.customerName) {
        try {
          await this.createCustomerActivity(
            companyId,
            (quote.customerId || quote.customerName) as string,
            'system',
            `Angebot angenommen: ${quote.number}`,
            `Das Angebot wurde vom Kunden angenommen und der Auftrag ist bestätigt.`,
            {
              quoteId: quoteId,
              quoteNumber: quote.number,
              amount: quote.total,
              currency: quote.currency,
              actionType: 'accepted',
            }
          );
        } catch (activityError) {
          console.warn('Could not create customer activity for quote acceptance:', activityError);
        }
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

      // Automatisch Aktivität in Kundenhistorie erstellen
      if (quote?.customerId || quote?.customerName) {
        try {
          const description = reason
            ? `Das Angebot wurde abgelehnt. Grund: ${reason}`
            : 'Das Angebot wurde vom Kunden abgelehnt.';

          await this.createCustomerActivity(
            companyId,
            (quote.customerId || quote.customerName) as string,
            'system',
            `Angebot abgelehnt: ${quote.number}`,
            description,
            {
              quoteId: quoteId,
              quoteNumber: quote.number,
              amount: quote.total,
              currency: quote.currency,
              actionType: 'rejected',
              rejectionReason: reason,
            }
          );
        } catch (activityError) {
          console.warn('Could not create customer activity for quote rejection:', activityError);
        }
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
      const result = await NumberSequenceService.getNextNumberForType(companyId, 'Angebot');
      return result.formattedNumber;
    } catch (error) {
      console.error('Fehler beim Generieren der Angebotsnummer:', error);
      // Fallback
      return `AG-${Date.now().toString().slice(-4)}`;
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
      const quotes = snapshot.docs.map(doc => {
        const data = doc.data();

        // CRITICAL FIX: Always use Firestore document ID, ignore any id field in data
        const quote = {
          ...data,
          id: doc.id, // ALWAYS override with Firestore document ID
          date: data.date?.toDate() || new Date(),
          validUntil: data.validUntil?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          deliveryDate: data.deliveryDate?.toDate(),
          sentAt: data.sentAt?.toDate(),
          acceptedAt: data.acceptedAt?.toDate(),
          rejectedAt: data.rejectedAt?.toDate(),
          convertedAt: data.convertedAt?.toDate(),
        } as Quote;

        // Force ID to be the document ID - this fixes existing data
        quote.id = doc.id;

        return quote;
      });

      callback(quotes);
    });
  }

  /**
   * Aktivität in der Kundenhistorie erstellen
   */
  static async createCustomerActivity(
    companyId: string,
    customerIdOrName: string,
    type: 'call' | 'email' | 'meeting' | 'document' | 'system' | 'invoice' | 'note',
    title: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Versuche zuerst den Kunden anhand der ID zu finden
      let customerId = customerIdOrName;

      // Falls customerIdOrName ein Name ist, suche die entsprechende Kunden-ID
      if (customerIdOrName && !customerIdOrName.includes('customer_')) {
        const customersRef = collection(db, 'companies', companyId, 'customers');
        const customerQuery = query(customersRef, where('name', '==', customerIdOrName));
        const customerSnapshot = await getDocs(customerQuery);

        if (!customerSnapshot.empty) {
          customerId = customerSnapshot.docs[0].id;
        } else {
          console.warn(`Customer not found for name: ${customerIdOrName}`);
          return; // Keine Aktivität erstellen, wenn Kunde nicht gefunden
        }
      }

      // Aktivität in der Kundenhistorie erstellen
      const activitiesRef = collection(
        db,
        'companies',
        companyId,
        'customers',
        customerId,
        'activities'
      );

      await addDoc(activitiesRef, {
        type,
        title,
        description,
        timestamp: serverTimestamp(),
        user: 'System', // Da es automatisch erstellt wird
        userId: 'system',
        metadata: metadata || {},
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Kundenaktivität:', error);
      throw error;
    }
  }
}
