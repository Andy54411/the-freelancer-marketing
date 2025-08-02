'use client';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { InvoiceData, InvoiceNumbering, GermanInvoiceService } from '@/types/invoiceTypes';

export class FirestoreInvoiceService {
  /**
   * Generiert die nächste fortlaufende Rechnungsnummer mit Firestore-Transaction
   * Stellt sicher, dass Nummern nie doppelt vergeben werden
   */
  static async getNextInvoiceNumber(companyId: string): Promise<{
    sequentialNumber: number;
    formattedNumber: string;
  }> {
    const currentYear = new Date().getFullYear();
    const numberingDocId = `${companyId}_${currentYear}`;

    return await runTransaction(db, async transaction => {
      const numberingRef = doc(db, 'invoice_numbering', numberingDocId);
      const numberingDoc = await transaction.get(numberingRef);

      let nextNumber = 1;

      if (numberingDoc.exists()) {
        const data = numberingDoc.data() as InvoiceNumbering;
        nextNumber = data.nextNumber;
      }

      // Update der nächsten Nummer
      const newNumberingData: InvoiceNumbering = {
        companyId,
        year: currentYear,
        lastNumber: nextNumber,
        nextNumber: nextNumber + 1,
        updatedAt: new Date(),
      };

      transaction.set(numberingRef, newNumberingData);

      return {
        sequentialNumber: nextNumber,
        formattedNumber: GermanInvoiceService.formatInvoiceNumber(nextNumber, currentYear),
      };
    });
  }

  /**
   * Speichert eine Rechnung in Firestore
   */
  static async saveInvoice(invoice: InvoiceData): Promise<string> {
    try {
      const invoiceData = {
        ...invoice,
        createdAt: Timestamp.fromDate(invoice.createdAt),
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);

      console.log('Rechnung gespeichert mit ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Speichern der Rechnung:', error);
      throw error;
    }
  }

  /**
   * Lädt alle Rechnungen einer Firma
   */
  static async getInvoicesByCompany(companyId: string): Promise<InvoiceData[]> {
    try {
      const q = query(
        collection(db, 'invoices'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const invoices: InvoiceData[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const invoice: InvoiceData = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          stornoDate: data.stornoDate ? data.stornoDate.toDate() : undefined,
        } as InvoiceData;

        invoices.push(invoice);
      });

      return invoices;
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungen:', error);
      throw error;
    }
  }

  /**
   * Lädt eine einzelne Rechnung
   */
  static async getInvoiceById(invoiceId: string): Promise<InvoiceData | null> {
    try {
      const docRef = doc(db, 'invoices', invoiceId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt.toDate(),
          stornoDate: data.stornoDate ? data.stornoDate.toDate() : undefined,
        } as InvoiceData;
      }

      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Rechnung:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert den Status einer Rechnung
   */
  static async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceData['status']
  ): Promise<void> {
    try {
      const docRef = doc(db, 'invoices', invoiceId);
      await updateDoc(docRef, { status });

      console.log('Rechnungsstatus aktualisiert:', invoiceId, status);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine Storno-Rechnung und verknüpft sie mit der Original-Rechnung
   */
  static async createAndSaveStornoInvoice(
    originalInvoiceId: string,
    stornoReason: string,
    stornoBy: string
  ): Promise<InvoiceData> {
    try {
      // Lade die ursprüngliche Rechnung
      const originalInvoice = await this.getInvoiceById(originalInvoiceId);
      if (!originalInvoice) {
        throw new Error('Ursprüngliche Rechnung nicht gefunden');
      }

      // Prüfe, ob die Rechnung storniert werden kann
      if (!['sent', 'paid'].includes(originalInvoice.status) || originalInvoice.isStorno) {
        throw new Error('Diese Rechnung kann nicht storniert werden');
      }

      // Generiere neue Rechnungsnummer für Storno
      const { sequentialNumber } = await this.getNextInvoiceNumber(originalInvoice.companyId);

      // Erstelle Storno-Rechnung
      const stornoInvoice = GermanInvoiceService.createStornoInvoice(
        originalInvoice,
        stornoReason,
        stornoBy,
        sequentialNumber
      );

      // Speichere Storno-Rechnung in Transaction
      return await runTransaction(db, async transaction => {
        // Speichere die Storno-Rechnung
        const stornoData = {
          ...stornoInvoice,
          createdAt: Timestamp.fromDate(stornoInvoice.createdAt),
          stornoDate: Timestamp.fromDate(stornoInvoice.stornoDate),
        };

        const stornoDocRef = doc(collection(db, 'invoices'));
        transaction.set(stornoDocRef, stornoData);

        // Markiere die ursprüngliche Rechnung als storniert
        const originalDocRef = doc(db, 'invoices', originalInvoiceId);
        transaction.update(originalDocRef, {
          status: 'cancelled',
        });

        return {
          ...stornoInvoice,
          id: stornoDocRef.id,
        };
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Storno-Rechnung:', error);
      throw error;
    }
  }

  /**
   * Sucht Rechnungen nach verschiedenen Kriterien
   */
  static async searchInvoices(
    companyId: string,
    searchParams: {
      status?: InvoiceData['status'];
      customerName?: string;
      dateFrom?: Date;
      dateTo?: Date;
      isStorno?: boolean;
    }
  ): Promise<InvoiceData[]> {
    try {
      let q = query(collection(db, 'invoices'), where('companyId', '==', companyId));

      if (searchParams.status) {
        q = query(q, where('status', '==', searchParams.status));
      }

      if (searchParams.isStorno !== undefined) {
        q = query(q, where('isStorno', '==', searchParams.isStorno));
      }

      if (searchParams.dateFrom) {
        q = query(q, where('createdAt', '>=', Timestamp.fromDate(searchParams.dateFrom)));
      }

      if (searchParams.dateTo) {
        q = query(q, where('createdAt', '<=', Timestamp.fromDate(searchParams.dateTo)));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const invoices: InvoiceData[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const invoice: InvoiceData = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          stornoDate: data.stornoDate ? data.stornoDate.toDate() : undefined,
        } as InvoiceData;

        // Filtere nach Kundenname (client-seitig, da Firestore case-sensitive ist)
        if (searchParams.customerName) {
          const customerNameLower = searchParams.customerName.toLowerCase();
          if (!invoice.customerName.toLowerCase().includes(customerNameLower)) {
            return;
          }
        }

        invoices.push(invoice);
      });

      return invoices;
    } catch (error) {
      console.error('Fehler beim Suchen von Rechnungen:', error);
      throw error;
    }
  }

  /**
   * Löscht eine Rechnung (nur Entwürfe)
   */
  static async deleteInvoice(invoiceId: string): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        throw new Error('Rechnung nicht gefunden');
      }

      if (invoice.status !== 'draft') {
        throw new Error('Nur Entwürfe können gelöscht werden');
      }

      const docRef = doc(db, 'invoices', invoiceId);
      await setDoc(docRef, { deleted: true }, { merge: true });

      console.log('Rechnung gelöscht:', invoiceId);
    } catch (error) {
      console.error('Fehler beim Löschen der Rechnung:', error);
      throw error;
    }
  }

  /**
   * Holt Statistiken für das Dashboard
   */
  static async getInvoiceStats(companyId: string): Promise<{
    totalInvoices: number;
    draftInvoices: number;
    sentInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    stornoInvoices: number;
    totalRevenue: number;
    pendingRevenue: number;
  }> {
    try {
      const invoices = await this.getInvoicesByCompany(companyId);

      const stats = {
        totalInvoices: invoices.length,
        draftInvoices: 0,
        sentInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0,
        stornoInvoices: 0,
        totalRevenue: 0,
        pendingRevenue: 0,
      };

      invoices.forEach(invoice => {
        // Status-Zählung
        switch (invoice.status) {
          case 'draft':
            stats.draftInvoices++;
            break;
          case 'sent':
            stats.sentInvoices++;
            stats.pendingRevenue += invoice.total;
            break;
          case 'paid':
            stats.paidInvoices++;
            stats.totalRevenue += invoice.total;
            break;
          case 'overdue':
            stats.overdueInvoices++;
            stats.pendingRevenue += invoice.total;
            break;
          case 'storno':
            stats.stornoInvoices++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
      throw error;
    }
  }
}
