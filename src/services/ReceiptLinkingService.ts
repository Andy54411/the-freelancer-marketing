import {
  collection,
  addDoc,
  doc,
  getDocs,
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

  // 🎯 Storage-URL für hochgeladenen Beleg
  storageUrl?: string;
  fileName?: string;
  fileType?: string;

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

  // Differenz-Informationen
  amountDifference?: number;
  amountDifferenceReason?: string;

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
    storageUrl?: string,
    transactionId?: string,
    differenceReason?: string,
    differenceAmount?: number
  ): Promise<{
    success: boolean;
    receiptId?: string;
    linkedTransactionId?: string;
    error?: string;
  }> {
    try {
      // 1. Generiere Document Number
      const documentNumber = await this.generateReceiptNumber(companyId);

      // 🎯 Extrahiere Dateiinformationen aus Storage-URL
      let fileName: string | undefined;
      let fileType: string | undefined;

      if (storageUrl) {
        try {
          const urlParts = storageUrl.split('/');
          const fileNameWithParams = urlParts[urlParts.length - 1];
          fileName = fileNameWithParams.split('?')[0]; // Entferne Query-Parameter

          // Extrahiere Dateityp aus Dateiname
          const extension = fileName.split('.').pop()?.toLowerCase();
          if (extension) {
            const typeMap: Record<string, string> = {
              pdf: 'application/pdf',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              png: 'image/png',
            };
            fileType = typeMap[extension] || 'application/octet-stream';
          }
        } catch (error) {
          console.warn('⚠️ Fehler beim Extrahieren der Dateiinformationen:', error);
        }
      }

      // 2. Erstelle Receipt Document (nur definierte Werte setzen - Firestore erlaubt kein undefined)
      const receiptData: Omit<ReceiptDocument, 'id'> = {
        documentNumber,
        customerName: ocrData.vendor || 'Unbekannt',
        amount: ocrData.amount || 0,
        date: ocrData.date || new Date().toISOString().split('T')[0],
        type: 'beleg',
        currency: ocrData.currency || 'EUR',
        isStorno: false,

        // System Fields
        createdAt: Timestamp.now(),
        createdBy: userId,
      };

      // Nur optionale Felder hinzufügen, wenn sie definiert sind
      if (ocrData.category) receiptData.category = ocrData.category;
      if (ocrData.description || ocrData.title)
        receiptData.description = ocrData.description || ocrData.title;
      if (ocrData.vatAmount !== undefined) receiptData.vatAmount = ocrData.vatAmount;
      if (ocrData.netAmount !== undefined) receiptData.netAmount = ocrData.netAmount;
      if (ocrData.vatRate !== undefined) receiptData.vatRate = ocrData.vatRate;
      if (ocrData.costCenter) receiptData.costCenter = ocrData.costCenter;
      if (storageUrl) receiptData.storageUrl = storageUrl;
      if (fileName) receiptData.fileName = fileName;
      if (fileType) receiptData.fileType = fileType;
      if (ocrData.goBDCompliant !== undefined) receiptData.goBDCompliant = ocrData.goBDCompliant;
      if (ocrData.validationIssues) receiptData.validationIssues = ocrData.validationIssues;

      // OCR Metadata
      receiptData.ocrConfidence = 0.85;
      receiptData.ocrValidated = false;

      // 3. Speichere Receipt in expenses subcollection
      const expensesRef = collection(db, 'companies', companyId, 'expenses');
      const receiptDoc = await addDoc(expensesRef, receiptData);

      // 4. Verknüpfe mit Transaktion nur, wenn eine transactionId übergeben wurde
      let linkedTransactionId: string | null = null;

      if (transactionId) {
        // TODO: Lade echte Transaktionsdaten von FinAPI
        // Für jetzt: Erstelle Link mit übergebener TransactionId
        const linkResult = await this.createTransactionLink(
          companyId,
          transactionId,
          receiptDoc.id,
          receiptData as ReceiptDocument,
          {
            id: transactionId,
            accountId: '3112628', // Wird später aus echten Transaktionsdaten geladen
            name: receiptData.customerName,
            verwendungszweck: receiptData.documentNumber,
            buchungstag: receiptData.date,
            betrag: receiptData.amount,
          },
          userId,
          differenceReason,
          differenceAmount
        );

        if (linkResult.success) {
          linkedTransactionId = transactionId;
        }
      } else {
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
      // Lade bestehende Transaction Links um bereits verknüpfte zu überspringen
      const existingLinksRef = collection(db, 'companies', companyId, 'transaction_links');
      const existingLinksSnapshot = await getDocs(existingLinksRef);
      const linkedTransactionIds = new Set(
        existingLinksSnapshot.docs.map(doc => doc.data().transactionId)
      );

      // Simuliere Transaktions-Abfrage (In der Realität würde hier FinAPI abgefragt werden)
      // Für Demo-Zwecke: Erstelle automatisch einen Transaction Link falls ähnliche Daten vorhanden sind

      // Erstelle Demo-Verknüpfung für Test-Zwecke
      const demoTransactionId = `demo_${Date.now()}`;

      if (!linkedTransactionIds.has(demoTransactionId)) {
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
          userId,
          undefined, // Kein Differenzgrund bei automatischen Links
          undefined // Kein Differenzbetrag bei automatischen Links
        );

        if (linkResult.success) {
          return demoTransactionId;
        }
      }

      // Matching-Kriterien für zukünftige echte Implementation
      const _matchingCriteria = [
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
    userId: string,
    differenceReason?: string,
    differenceAmount?: number
  ): Promise<{ success: boolean; linkId?: string; error?: string }> {
    try {
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

        // Differenz-Informationen (falls vorhanden)
        amountDifference: differenceAmount,
        amountDifferenceReason: differenceReason,

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

  private static generateReceiptNumber(_companyId: string): Promise<string> {
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
