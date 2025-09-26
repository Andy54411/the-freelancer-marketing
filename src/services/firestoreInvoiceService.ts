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
import { NumberSequenceService } from './numberSequenceService';

export class FirestoreInvoiceService {
  /**
   * Generiert die nächste fortlaufende Rechnungsnummer mit NumberSequenceService
   * Nutzt die konfigurierten Nummerkreise aus dem Accounting-Bereich
   */
  static async getNextInvoiceNumber(companyId: string): Promise<{
    sequentialNumber: number;
    formattedNumber: string;
  }> {
    try {
      // Nutze den NumberSequenceService für die Rechnungsnummerierung
      const result = await NumberSequenceService.getNextNumberForType(companyId, 'Rechnung');
      
      return {
        sequentialNumber: result.number,
        formattedNumber: result.formattedNumber,
      };
    } catch (error) {
      console.error('Fehler beim Generieren der Rechnungsnummer:', error);

      // Fallback auf das alte System falls NumberSequence nicht gefunden wird
      return await this.getNextInvoiceNumberFallback(companyId);
    }
  }

  /**
   * Fallback-Methode für Rechnungsnummerierung (alte Implementierung)
   * Wird verwendet wenn der NumberSequenceService fehlschlägt
   */
  static async getNextInvoiceNumberFallback(companyId: string): Promise<{
    sequentialNumber: number;
    formattedNumber: string;
  }> {
    const currentYear = new Date().getFullYear();
    const numberingDocId = `${companyId}_${currentYear}`;

    try {
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
    } catch (error) {
      console.error('Fallback-Rechnungsnummerierung fehlgeschlagen:', error);

      // Letzter Fallback: Generiere eine Nummer basierend auf Timestamp
      const fallbackNumber = Date.now() % 1000;

      return {
        sequentialNumber: fallbackNumber,
        formattedNumber: GermanInvoiceService.formatInvoiceNumber(fallbackNumber, currentYear),
      };
    }
  }

  /**
   * Speichert eine Rechnung in Firestore - SUBCOLLECTION companies/{companyId}/invoices
   */
  static async saveInvoice(invoice: InvoiceData): Promise<string> {
    try {
      console.log('🚨 SAVING TO SUBCOLLECTION: companies/' + invoice.companyId + '/invoices');
      
      const invoiceData = {
        ...invoice,
        createdAt: Timestamp.fromDate(invoice.createdAt),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      // CRITICAL: Save to subcollection companies/{companyId}/invoices
      const docRef = await addDoc(
        collection(db, 'companies', invoice.companyId, 'invoices'), 
        invoiceData
      );

      console.log('✅ INVOICE SAVED TO SUBCOLLECTION WITH ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ CRITICAL ERROR saving to subcollection:', error);
      throw error;
    }
  }

  /**
   * Lädt alle Rechnungen einer Firma - FROM SUBCOLLECTION companies/{companyId}/invoices
   */
  static async getInvoicesByCompany(companyId: string): Promise<InvoiceData[]> {
    try {
      console.log('🔍 LOADING FROM SUBCOLLECTION: companies/' + companyId + '/invoices');
      
      const q = query(
        collection(db, 'companies', companyId, 'invoices'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const invoices: InvoiceData[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const invoice = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          stornoDate: data.stornoDate?.toDate ? data.stornoDate.toDate() : data.stornoDate,
        };

        invoices.push(invoice as any);
      });

      console.log('✅ LOADED', invoices.length, 'INVOICES FROM SUBCOLLECTION');
      return invoices;
    } catch (error) {
      console.error('❌ ERROR loading from subcollection:', error);
      throw error;
    }
  }

  /**
   * Lädt eine einzelne Rechnung aus der Subcollection
   */
  static async getInvoiceById(companyId: string, invoiceId: string): Promise<InvoiceData | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Explizite Transformation, um die Datenintegrität sicherzustellen
        // und die Typkonsistenz mit InvoiceData zu gewährleisten.
        const invoice = {
          id: docSnap.id,
          companyId: data.companyId,
          customerName: data.customerName,
          customerAddress: data.customerAddress,
          items: data.items,
          total: data.total,
          status: data.status,
          invoiceNumber: data.invoiceNumber,
          number: data.number,
          sequentialNumber: data.sequentialNumber,
          date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
          issueDate: data.issueDate,
          dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : data.dueDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt instanceof Date ? data.createdAt : new Date()),
          stornoDate: data.stornoDate?.toDate ? data.stornoDate.toDate() : (data.stornoDate instanceof Date ? data.stornoDate : undefined),
          description: data.description,
          customerEmail: data.customerEmail,
          companyName: data.companyName,
          companyAddress: data.companyAddress,
          companyEmail: data.companyEmail,
          companyPhone: data.companyPhone,
          companyWebsite: data.companyWebsite,
          companyLogo: data.companyLogo,
          companyVatId: data.companyVatId,
          companyTaxNumber: data.companyTaxNumber,
          isSmallBusiness: data.isSmallBusiness,
          vatRate: data.vatRate,
          priceInput: data.priceInput,
          amount: data.amount,
          tax: data.tax,
          year: data.year,
          taxRuleType: data.taxRuleType,
          // Das Template-Feld wird bewusst ignoriert, da es global aus dem User-Profil geladen wird
          isStorno: data.isStorno || false,
          originalInvoiceId: data.originalInvoiceId,
          stornoReason: data.stornoReason,
          stornoBy: data.stornoBy,
          notes: data.notes,
          paymentTerms: data.paymentTerms,
          bankDetails: data.bankDetails,
          footerText: data.footerText,
          headTextHtml: data.headTextHtml,
          title: data.title,
          documentNumber: data.documentNumber,
          customerNumber: data.customerNumber,
          customerOrderNumber: data.customerOrderNumber,
          internalContactPerson: data.internalContactPerson,
          customerFirstName: data.customerFirstName,
          customerLastName: data.customerLastName,
          customerPhone: data.customerPhone,
          deliveryDate: data.deliveryDate,
          deliveryDateType: data.deliveryDateType,
          deliveryTerms: data.deliveryTerms,
          currency: data.currency,
        } as InvoiceData;
        return invoice;
      }

      return null;
    } catch (error) {

      throw error;
    }
  }

  /**
   * Aktualisiert den Status einer Rechnung
   */
  static async updateInvoiceStatus(
    companyId: string,
    invoiceId: string,
    status: InvoiceData['status']
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
      await updateDoc(docRef, { status });

    } catch (error) {

      throw error;
    }
  }

  /**
   * Aktualisiert eine komplette Rechnung
   */
  static async updateInvoice(
    invoiceId: string,
    invoice: Partial<InvoiceData>
  ): Promise<void> {
    try {
      console.log('🚨 UPDATING INVOICE IN SUBCOLLECTION:', invoiceId);
      
      // Update the invoice data with timestamp
      const invoiceData = {
        ...invoice,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      // Remove undefined values and convert Date objects
      const cleanInvoiceData = JSON.parse(JSON.stringify(invoiceData, (key, value) => {
        return value === undefined ? null : value;
      }));

      // Restore Date objects as Timestamps
      if (cleanInvoiceData.createdAt) {
        cleanInvoiceData.createdAt = Timestamp.fromDate(new Date(cleanInvoiceData.createdAt));
      }
      cleanInvoiceData.updatedAt = Timestamp.fromDate(new Date());

      // CRITICAL: Update in subcollection companies/{companyId}/invoices
      if (!invoice.companyId) {
        throw new Error('CompanyId is required for updating invoice');
      }

      const docRef = doc(db, 'companies', invoice.companyId, 'invoices', invoiceId);
      await updateDoc(docRef, cleanInvoiceData);

      console.log('✅ INVOICE UPDATED IN SUBCOLLECTION:', invoiceId);
    } catch (error) {
      console.error('❌ CRITICAL ERROR updating invoice in subcollection:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine Storno-Rechnung und verknüpft sie mit der Original-Rechnung
   * TODO: Diese Methode muss aktualisiert werden, um companyId als Parameter zu akzeptieren
   */
  static async createAndSaveStornoInvoice(
    companyId: string,
    originalInvoiceId: string,
    stornoReason: string,
    stornoBy: string
  ): Promise<InvoiceData> {
    try {
      console.log('🔄 Starting storno creation:', { companyId, originalInvoiceId, stornoReason, stornoBy });
      
      // Lade die ursprüngliche Rechnung
      const originalInvoice = await this.getInvoiceById(companyId, originalInvoiceId);
      if (!originalInvoice) {
        console.error('❌ Original invoice not found:', { companyId, originalInvoiceId });
        throw new Error('Ursprüngliche Rechnung nicht gefunden');
      }
      
      console.log('✅ Original invoice loaded:', { 
        id: originalInvoice.id, 
        status: originalInvoice.status, 
        isStorno: originalInvoice.isStorno,
        invoiceNumber: originalInvoice.invoiceNumber 
      });

      // Prüfe, ob die Rechnung storniert werden kann
      if (originalInvoice.isStorno) {
        throw new Error('Eine Stornorechnung kann nicht erneut storniert werden');
      }
      
      if (originalInvoice.status === 'cancelled') {
        throw new Error('Eine bereits stornierte Rechnung kann nicht erneut storniert werden');
      }

      // Alle Status außer 'cancelled' und bereits stornierte Rechnungen können storniert werden
      // Das schließt 'draft', 'sent', 'paid', 'overdue' ein

      // Generiere neue Rechnungsnummer für Storno
      console.log('🔢 Generating new invoice number for storno...');
      const { sequentialNumber, formattedNumber } = await this.getNextInvoiceNumber(originalInvoice.companyId);
      console.log('✅ New invoice number generated:', { sequentialNumber, formattedNumber });

      // Erstelle Storno-Rechnung
      console.log('📝 Creating storno invoice with GermanInvoiceService...');
      const stornoInvoice = GermanInvoiceService.createStornoInvoice(
        originalInvoice,
        stornoReason,
        stornoBy,
        sequentialNumber
      );
      console.log('✅ Storno invoice created:', {
        id: stornoInvoice.id,
        invoiceNumber: stornoInvoice.invoiceNumber,
        status: stornoInvoice.status,
        total: stornoInvoice.total,
        isStorno: stornoInvoice.isStorno
      });

      // Speichere Storno-Rechnung in Transaction
      return await runTransaction(db, async transaction => {
        // Speichere die Storno-Rechnung in der Subcollection
        // Erstelle eine komplett saubere Datenstruktur ohne undefined Werte
        // Alle Felder werden explizit definiert, um undefined zu vermeiden
        const stornoData: any = {
          // Grundlegende Identifikation
          id: stornoInvoice.id || '',
          number: stornoInvoice.number || '',
          invoiceNumber: stornoInvoice.invoiceNumber || '',
          sequentialNumber: stornoInvoice.sequentialNumber || 0,
          
          // Datum-Informationen (alle als Strings)
          date: stornoInvoice.date || new Date().toISOString().split('T')[0],
          issueDate: stornoInvoice.issueDate || new Date().toISOString().split('T')[0],
          dueDate: stornoInvoice.dueDate || new Date().toISOString().split('T')[0],
          
          // Kundendaten (gesichert)
          customerName: stornoInvoice.customerName || '',
          customerEmail: stornoInvoice.customerEmail || '',
          customerAddress: stornoInvoice.customerAddress || '',
          customerOrderNumber: stornoInvoice.customerOrderNumber || '',
          
          // Rechnungsbeschreibung
          description: stornoInvoice.description || '',
          title: stornoInvoice.title || '',
          documentNumber: stornoInvoice.documentNumber || '',
          notes: stornoInvoice.notes || '',
          
          // Unternehmensdaten (aus Original übernommen)
          companyName: stornoInvoice.companyName || '',
          companyAddress: stornoInvoice.companyAddress || '',
          companyEmail: stornoInvoice.companyEmail || '',
          companyPhone: stornoInvoice.companyPhone || '',
          companyWebsite: stornoInvoice.companyWebsite || '',
          companyLogo: stornoInvoice.companyLogo || '',
          companyVatId: stornoInvoice.companyVatId || '',
          companyTaxNumber: stornoInvoice.companyTaxNumber || '',
          companyRegister: stornoInvoice.companyRegister || '',
          profilePictureURL: stornoInvoice.profilePictureURL || '',
          
          // Steuereinstellungen
          isSmallBusiness: stornoInvoice.isSmallBusiness === true,
          vatRate: typeof stornoInvoice.vatRate === 'number' ? stornoInvoice.vatRate : 19,
          priceInput: stornoInvoice.priceInput || 'netto',
          taxRule: (stornoInvoice as any).taxRule || 'DE_TAXABLE',
          taxRuleLabel: (stornoInvoice as any).taxRuleLabel || '',
          
          // Finanzielle Daten (negative Werte für Storno)
          amount: typeof stornoInvoice.amount === 'number' ? stornoInvoice.amount : 0,
          tax: typeof stornoInvoice.tax === 'number' ? stornoInvoice.tax : 0,
          total: typeof stornoInvoice.total === 'number' ? stornoInvoice.total : 0,
          subtotal: typeof (stornoInvoice as any).subtotal === 'number' ? (stornoInvoice as any).subtotal : 0,
          currency: (stornoInvoice as any).currency || 'EUR',
          
          // Items Array (gesichert mit Validierung)
          items: Array.isArray(stornoInvoice.items) ? stornoInvoice.items.map((item: any) => ({
            id: item.id || '',
            description: item.description || '',
            quantity: typeof item.quantity === 'number' ? item.quantity : 0,
            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
            total: typeof item.total === 'number' ? item.total : 0,
            unit: item.unit || 'Stk.',
            taxRate: typeof item.taxRate === 'number' ? item.taxRate : (stornoInvoice.vatRate || 19),
            discount: typeof item.discount === 'number' ? item.discount : 0,
            discountPercent: typeof item.discountPercent === 'number' ? item.discountPercent : 0,
            category: item.category || ''
          })) : [],
          
          // Zahlungs- und Lieferbedingungen
          paymentTerms: stornoInvoice.paymentTerms || '',
          deliveryTerms: stornoInvoice.deliveryTerms || '',
          deliveryDate: (stornoInvoice as any).deliveryDate || '',
          serviceDate: (stornoInvoice as any).serviceDate || '',
          validUntil: (stornoInvoice as any).validUntil || '',
          reference: (stornoInvoice as any).reference || '',
          
          // Text-Felder
          headTextHtml: stornoInvoice.headTextHtml || '',
          footerText: stornoInvoice.footerText || '',
          projectTitle: stornoInvoice.projectTitle || '',
          contactPersonName: stornoInvoice.contactPersonName || '',
          
          // Bankdaten (sicher kopiert)
          bankDetails: stornoInvoice.bankDetails ? {
            iban: stornoInvoice.bankDetails.iban || '',
            bic: stornoInvoice.bankDetails.bic || '',
            accountHolder: stornoInvoice.bankDetails.accountHolder || '',
            bankName: stornoInvoice.bankDetails.bankName || ''
          } : {
            iban: '',
            bic: '',
            accountHolder: '',
            bankName: ''
          },
          
          // Storno-spezifische Felder
          status: 'storno',
          isStorno: true,
          originalInvoiceId: originalInvoiceId || '',
          stornoReason: stornoReason || '',
          stornoBy: stornoBy || '',
          
          // Metadaten
          companyId: companyId || '',
          year: typeof stornoInvoice.year === 'number' ? stornoInvoice.year : new Date().getFullYear(),
          
          // Firestore Timestamps
          createdAt: stornoInvoice.createdAt ? Timestamp.fromDate(new Date(stornoInvoice.createdAt)) : Timestamp.now(),
          stornoDate: stornoInvoice.stornoDate ? Timestamp.fromDate(new Date(stornoInvoice.stornoDate)) : Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Rekursive Funktion zum Entfernen aller undefined Werte
        const removeUndefinedRecursive = (obj: any): any => {
          if (obj === null || obj === undefined) return null;
          
          if (Array.isArray(obj)) {
            return obj.map(item => removeUndefinedRecursive(item));
          }
          
          if (typeof obj === 'object') {
            const cleaned: any = {};
            Object.keys(obj).forEach(key => {
              const value = obj[key];
              if (value !== undefined) {
                cleaned[key] = removeUndefinedRecursive(value);
              } else {
                console.warn(`⚠️ Removing undefined field: ${key}`);
              }
            });
            return cleaned;
          }
          
          return obj;
        };

        // Bereinige alle undefined Werte rekursiv
        const cleanedStornoData = removeUndefinedRecursive(stornoData);

        // Debug-Log für problematische Felder
        console.log('🔍 Storno data validation check:', {
          originalKeys: Object.keys(stornoData).length,
          cleanedKeys: Object.keys(cleanedStornoData).length,
          hasUndefinedValues: JSON.stringify(cleanedStornoData).includes('undefined'),
          sampleFields: {
            id: typeof cleanedStornoData.id,
            invoiceNumber: typeof cleanedStornoData.invoiceNumber,
            items: Array.isArray(cleanedStornoData.items) ? `array[${cleanedStornoData.items.length}]` : typeof cleanedStornoData.items,
            bankDetails: typeof cleanedStornoData.bankDetails
          }
        });

        const stornoDocRef = doc(collection(db, 'companies', companyId, 'invoices'));
        console.log('💾 Saving storno invoice to Firestore...', { path: stornoDocRef.path });
        transaction.set(stornoDocRef, cleanedStornoData);

        // Markiere die ursprüngliche Rechnung als storniert
        const originalDocRef = doc(db, 'companies', companyId, 'invoices', originalInvoiceId);
        console.log('🔄 Updating original invoice status to cancelled...', { path: originalDocRef.path });
        transaction.update(originalDocRef, {
          status: 'cancelled',
          updatedAt: Timestamp.now(),
        });

        const result = {
          ...stornoInvoice,
          id: stornoDocRef.id,
        };
        
        console.log('✅ Transaction completed successfully. Storno invoice created:', {
          stornoId: stornoDocRef.id,
          originalId: originalInvoiceId,
          stornoNumber: result.invoiceNumber
        });
        
        return result;
      });
    } catch (error) {

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

      throw error;
    }
  }

  /**
   * Löscht eine Rechnung (nur Entwürfe)
   */
  static async deleteInvoice(companyId: string, invoiceId: string): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(companyId, invoiceId);
      if (!invoice) {
        throw new Error('Rechnung nicht gefunden');
      }

      if (invoice.status !== 'draft') {
        throw new Error('Nur Entwürfe können gelöscht werden');
      }

      const docRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
      await setDoc(docRef, { deleted: true }, { merge: true });

    } catch (error) {

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

      throw error;
    }
  }
}
