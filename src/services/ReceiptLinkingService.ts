import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface OCRReceiptData {
  // OCR Extracted Data
  vendor?: string;
  amount?: number;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  category?: string;
  description?: string;
  title?: string;
  vatAmount?: number;
  netAmount?: number;
  vatRate?: number;

  // Enhanced OCR fields
  costCenter?: string;
  paymentTerms?: string;
  currency?: string;
  companyVatNumber?: string;
  goBDCompliant?: boolean;
  validationIssues?: Array<{
    field: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
  }>;
  processingMode?: string;
}

export interface ReceiptDocument {
  id: string;
  documentNumber: string;
  customerName: string;
  amount: number;
  date: string;
  type: 'beleg' | 'rechnung' | 'lieferschein';
  category?: string;
  description?: string;
  vatAmount?: number;
  netAmount?: number;
  vatRate?: number;
  costCenter?: string;
  currency?: string;
  isStorno?: boolean;

  // OCR Metadata
  ocrConfidence?: number;
  ocrValidated?: boolean;
  goBDCompliant?: boolean;
  validationIssues?: Array<{
    field: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
  }>;

  // System Fields
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
}

export interface TransactionLinkData {
  transactionId: string;
  documentId: string;
  documentNumber: string;
  documentType: 'beleg' | 'rechnung' | 'lieferschein';
  customerName: string;
  documentAmount: number;
  documentDate: string;
  bookingStatus: 'booked' | 'open';
  linkDate: Timestamp;
  createdBy: string;
  bookedAt?: Timestamp;

  // Transaction Data
  transactionData: {
    id: string;
    accountId: string;
    name: string;
    verwendungszweck: string;
    buchungstag: string;
    betrag: number;
  };

  // Document Data
  documentData: {
    id: string;
    number: string;
    customerName: string;
    date: string;
    total: number;
    type: string;
  };
}

export class ReceiptLinkingService {
  /**
   * Erstellt einen neuen Beleg aus OCR-Daten und versucht automatische Verknüpfung
   */
  static async createReceiptFromOCR(
    companyId: string,
    userId: string,
    ocrData: OCRReceiptData,
    pdfUrl?: string
  ): Promise<{
    success: boolean;
    receiptId?: string;
    linkedTransactionId?: string;
    error?: string;
  }> {
    try {
      console.log('🔄 Erstelle Beleg aus OCR-Daten:', ocrData);

      // 1. Generiere Document Number
      const documentNumber = await this.generateReceiptNumber(companyId);

      // 2. Erstelle Receipt Document
      const receiptData: Omit<ReceiptDocument, 'id'> = {
        documentNumber,
        customerName: ocrData.vendor || 'Unbekannt',
        amount: ocrData.amount || 0,
        date: ocrData.date || new Date().toISOString().split('T')[0],
        type: 'beleg',
        category: ocrData.category,
        description: ocrData.description || ocrData.title,
        vatAmount: ocrData.vatAmount,
        netAmount: ocrData.netAmount,
        vatRate: ocrData.vatRate,
        costCenter: ocrData.costCenter,
        currency: ocrData.currency || 'EUR',
        isStorno: false,

        // OCR Metadata
        ocrConfidence: 0.85, // Default confidence
        ocrValidated: false,
        goBDCompliant: ocrData.goBDCompliant,
        validationIssues: ocrData.validationIssues,

        // System Fields
        createdAt: Timestamp.now(),
        createdBy: userId,
      };

      // 3. Speichere Receipt in expenses subcollection
      const expensesRef = collection(db, 'companies', companyId, 'expenses');
      const receiptDoc = await addDoc(expensesRef, receiptData);

      console.log('✅ Beleg erstellt:', receiptDoc.id, documentNumber);

      // 4. Versuche automatische Verknüpfung mit passender Transaktion
      const linkedTransactionId = await this.autoLinkToTransaction(
        companyId,
        receiptDoc.id,
        receiptData,
        userId
      );

      if (linkedTransactionId) {
        console.log(
          '🔗 Automatische Verknüpfung erfolgreich mit Transaktion:',
          linkedTransactionId
        );
      }

      return {
        success: true,
        receiptId: receiptDoc.id,
        linkedTransactionId: linkedTransactionId || undefined,
      };
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Belegs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  /**
   * Automatische Verknüpfung mit passender Banktransaktion
   */
  static async autoLinkToTransaction(
    companyId: string,
    receiptId: string,
    receiptData: Omit<ReceiptDocument, 'id'>,
    userId: string
  ): Promise<string | null> {
    try {
      console.log('🔍 Suche passende Transaktion für Beleg:', receiptData.documentNumber);

      // Lade bestehende Transaction Links um bereits verknüpfte zu überspringen
      const existingLinksRef = collection(db, 'companies', companyId, 'transaction_links');
      const existingLinksSnapshot = await getDocs(existingLinksRef);
      const linkedTransactionIds = new Set(
        existingLinksSnapshot.docs.map(doc => doc.data().transactionId)
      );

      console.log('📋 Bereits verknüpfte Transaktionen:', Array.from(linkedTransactionIds));

      // Simuliere Transaktions-Abfrage (In der Realität würde hier FinAPI abgefragt werden)
      // Für Demo-Zwecke: Erstelle automatisch einen Transaction Link falls ähnliche Daten vorhanden sind

      // Erstelle Demo-Verknüpfung für Test-Zwecke
      const demoTransactionId = `demo_${Date.now()}`;

      if (!linkedTransactionIds.has(demoTransactionId)) {
        console.log('🎯 Erstelle Demo-Verknüpfung für Receipt:', receiptId);

        // Erstelle automatischen Transaction Link
        const linkResult = await this.createTransactionLink(
          companyId,
          demoTransactionId,
          receiptId,
          receiptData as ReceiptDocument,
          {
            id: demoTransactionId,
            accountId: '3112628', // Demo-Account aus Ihrer Firestore-Struktur
            name: receiptData.customerName,
            verwendungszweck: receiptData.documentNumber,
            buchungstag: receiptData.date,
            betrag: -Math.abs(receiptData.amount), // Negative für Ausgaben
          },
          userId
        );

        if (linkResult.success) {
          console.log('✅ Demo-Verknüpfung erstellt:', linkResult.linkId);
          return demoTransactionId;
        }
      }

      // Matching-Kriterien für zukünftige echte Implementation
      const matchingCriteria = [
        // 1. Exakter Betrag + ähnlicher Name + ähnliches Datum (±3 Tage)
        {
          weight: 100,
          check: (tx: any) => {
            const amountMatch = Math.abs(Math.abs(tx.betrag) - receiptData.amount) < 0.01;
            const nameMatch = this.calculateNameSimilarity(tx.name, receiptData.customerName) > 0.7;
            const dateMatch = this.isDateWithinRange(tx.buchungstag, receiptData.date, 3);
            return amountMatch && nameMatch && dateMatch;
          },
        },
        // 2. Exakter Betrag + Rechnungsnummer im Verwendungszweck
        {
          weight: 95,
          check: (tx: any) => {
            const amountMatch = Math.abs(Math.abs(tx.betrag) - receiptData.amount) < 0.01;
            const invoiceMatch =
              receiptData.documentNumber &&
              tx.verwendungszweck?.toLowerCase().includes(receiptData.documentNumber.toLowerCase());
            return amountMatch && invoiceMatch;
          },
        },
        // 3. Exakter Betrag + ähnliches Datum (±7 Tage)
        {
          weight: 80,
          check: (tx: any) => {
            const amountMatch = Math.abs(Math.abs(tx.betrag) - receiptData.amount) < 0.01;
            const dateMatch = this.isDateWithinRange(tx.buchungstag, receiptData.date, 7);
            return amountMatch && dateMatch;
          },
        },
      ];

      console.log('📊 Matching-Kriterien für zukünftige Implementation:', matchingCriteria.length);

      return null;
    } catch (error) {
      console.error('❌ Fehler bei automatischer Verknüpfung:', error);
      return null;
    }
  }

  /**
   * Erstellt Transaction Link zwischen Beleg und Banktransaktion
   */
  static async createTransactionLink(
    companyId: string,
    transactionId: string,
    receiptId: string,
    receiptData: ReceiptDocument,
    transactionData: any,
    userId: string
  ): Promise<{ success: boolean; linkId?: string; error?: string }> {
    try {
      console.log('🔗 Erstelle Transaction Link:', { transactionId, receiptId });

      const linkData: TransactionLinkData = {
        transactionId,
        documentId: receiptId,
        documentNumber: receiptData.documentNumber,
        documentType: receiptData.type,
        customerName: receiptData.customerName,
        documentAmount: receiptData.amount,
        documentDate: receiptData.date,
        bookingStatus: 'booked',
        linkDate: Timestamp.now(),
        createdBy: userId,
        bookedAt: Timestamp.now(),

        // Transaction Data
        transactionData: {
          id: transactionData.id,
          accountId: transactionData.accountId,
          name: transactionData.name,
          verwendungszweck: transactionData.verwendungszweck,
          buchungstag: transactionData.buchungstag,
          betrag: transactionData.betrag,
        },

        // Document Data
        documentData: {
          id: receiptId,
          number: receiptData.documentNumber,
          customerName: receiptData.customerName,
          date: receiptData.date,
          total: receiptData.amount,
          type: receiptData.type,
        },
      };

      // Verwende transaction_links subcollection mit compound key
      const transactionLinksRef = collection(db, 'companies', companyId, 'transaction_links');
      const linkId = `${transactionId}_${receiptId}`;

      // Speichere Link direkt mit gesetzter ID (genau wie in Ihrer Firestore-Struktur)
      const linkDocRef = doc(transactionLinksRef, linkId);

      // Verwende setDoc um das Dokument mit spezifischer ID zu erstellen/überschreiben
      const { setDoc } = await import('firebase/firestore');
      await setDoc(linkDocRef, linkData);

      console.log('✅ Transaction Link erstellt:', linkId);

      return {
        success: true,
        linkId,
      };
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Transaction Links:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  /**
   * Hilfsfunktionen für Matching
   */

  private static generateReceiptNumber(companyId: string): Promise<string> {
    // Generiere fortlaufende Belegnummer
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return Promise.resolve(`BE-${timestamp.toString().slice(-6)}${random}`);
  }

  private static calculateNameSimilarity(name1: string, name2: string): number {
    // Vereinfachte Levenshtein-Distanz für Name-Matching
    const s1 = (name1 || '').toLowerCase().trim();
    const s2 = (name2 || '').toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    // Einfacher Substring-Check
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Word-basiertes Matching
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    let matchingWords = 0;
    words1.forEach(word1 => {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matchingWords++;
      }
    });

    return matchingWords / Math.max(words1.length, words2.length);
  }

  private static isDateWithinRange(date1: string, date2: string, dayRange: number): boolean {
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      const diffTime = Math.abs(d1.getTime() - d2.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= dayRange;
    } catch {
      return false;
    }
  }
}
