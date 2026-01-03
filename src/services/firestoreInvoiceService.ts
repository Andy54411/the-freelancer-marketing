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
  serverTimestamp,
  limit,
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

      const finalResult = {
        sequentialNumber: result.number,
        formattedNumber: result.formattedNumber,
      };

      return finalResult;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('❌ Fehler beim Generieren der Rechnungsnummer:', {
        error,
        errorMessage,
        errorStack,
        companyId,
      });

      // Fallback auf das alte System falls NumberSequence nicht gefunden wird
      const fallbackResult = await this.getNextInvoiceNumberFallback(companyId);

      return fallbackResult;
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
   * Generiert die nächste fortlaufende Storno-Nummer
   * Format: ST-XXXX
   */
  static async getNextStornoNumber(companyId: string): Promise<{
    sequentialNumber: number;
    formattedNumber: string;
  }> {
    try {
      // Nutze den NumberSequenceService für die Storno-Nummerierung
      const result = await NumberSequenceService.getNextNumberForType(companyId, 'Storno');

      return {
        sequentialNumber: result.number,
        formattedNumber: result.formattedNumber, // Should be "ST-XXXX" format
      };
    } catch (error) {
      console.error('Fehler beim Generieren der Storno-Nummer:', error);

      // Fallback: Generiere Storno-Nummer manuell
      return await this.getNextStornoNumberFallback(companyId);
    }
  }

  /**
   * Fallback-Methode für Storno-Nummerierung
   */
  static async getNextStornoNumberFallback(companyId: string): Promise<{
    sequentialNumber: number;
    formattedNumber: string;
  }> {
    const currentYear = new Date().getFullYear();

    try {
      return await runTransaction(db, async transaction => {
        const stornoNumberingRef = doc(db, 'companies', companyId, 'settings', 'stornoNumbering');
        const stornoNumberingDoc = await transaction.get(stornoNumberingRef);

        let nextNumber = 1;

        if (stornoNumberingDoc.exists()) {
          const data = stornoNumberingDoc.data();
          if (data.year === currentYear) {
            nextNumber = data.nextNumber || 1;
          }
        }

        const newStornoNumberingData = {
          companyId,
          year: currentYear,
          lastNumber: nextNumber,
          nextNumber: nextNumber + 1,
          updatedAt: new Date(),
        };

        transaction.set(stornoNumberingRef, newStornoNumberingData);

        return {
          sequentialNumber: nextNumber,
          formattedNumber: `ST-${String(nextNumber).padStart(4, '0')}`,
        };
      });
    } catch (error) {
      console.error('Fallback-Storno-Nummerierung fehlgeschlagen:', error);

      // Letzter Fallback
      const fallbackNumber = Date.now() % 1000;
      return {
        sequentialNumber: fallbackNumber,
        formattedNumber: `ST-${String(fallbackNumber).padStart(4, '0')}`,
      };
    }
  }

  /**
   * Erstelle ein neues Dokument in Firestore
   */
  static async createDocument(docRef: any, data: any): Promise<void> {
    await setDoc(docRef, data);
  }

  /**
   * Hilfsfunktion: Findet Kunden-ID anhand des Kundennamens oder der E-Mail
   */
  static async findCustomerIdByNameOrEmail(
    companyId: string,
    customerName?: string,
    customerEmail?: string
  ): Promise<string | null> {
    try {
      if (!customerName && !customerEmail) {
        console.warn('⚠️ Weder Kundenname noch E-Mail angegeben');
        return null;
      }

      const customersRef = collection(db, 'companies', companyId, 'customers');
      let customerQuery;

      // Suche zuerst nach Name, dann nach E-Mail
      if (customerName) {
        customerQuery = query(customersRef, where('name', '==', customerName), limit(1));
        const snapshot = await getDocs(customerQuery);
        if (!snapshot.empty) {
          return snapshot.docs[0].id;
        }
      }

      if (customerEmail) {
        customerQuery = query(customersRef, where('email', '==', customerEmail), limit(1));
        const snapshot = await getDocs(customerQuery);
        if (!snapshot.empty) {
          return snapshot.docs[0].id;
        }
      }

      console.warn(`⚠️ Kunde nicht gefunden: Name=${customerName}, Email=${customerEmail}`);
      return null;
    } catch (error) {
      console.error('❌ Fehler bei der Kundensuche:', error);
      return null;
    }
  }

  /**
   * Erstellt automatisch eine Kundenaktivität für rechnungsbezogene Aktionen
   * @param companyId - Die Firmen-ID
   * @param customerNameOrId - Entweder die Kunden-ID oder der Kundenname (wird automatisch aufgelöst)
   * @param customerEmail - Optional: E-Mail für bessere Suche
   * @param type - Art der Aktivität
   * @param title - Titel der Aktivität
   * @param description - Beschreibung der Aktivität
   * @param metadata - Zusätzliche Metadaten
   */
  static async createCustomerActivity(
    companyId: string,
    customerNameOrId: string,
    type: 'user' | 'system' | 'invoice',
    title: string,
    description: string,
    metadata?: any,
    customerEmail?: string
  ): Promise<void> {
    try {
      let customerId: string;

      // Prüfe ob es bereits eine ID ist (Firebase IDs sind meist 20 Zeichen lang)
      if (customerNameOrId.length > 15 && !customerNameOrId.includes(' ')) {
        customerId = customerNameOrId;
      } else {
        // Suche Kunden-ID anhand des Namens oder der E-Mail
        const foundCustomerId = await this.findCustomerIdByNameOrEmail(
          companyId,
          customerNameOrId,
          customerEmail
        );

        if (!foundCustomerId) {
          console.warn(`⚠️ Kunde nicht gefunden für Aktivität: ${customerNameOrId}`);
          return; // Aktivität nicht erstellen wenn Kunde nicht existiert
        }

        customerId = foundCustomerId;
      }

      const activityData = {
        type: type,
        title: title,
        description: description,
        timestamp: serverTimestamp(),
        user: ['system', 'invoice'].includes(type) ? 'System' : undefined,
        userId: ['system', 'invoice'].includes(type) ? 'system' : undefined,
        metadata: metadata || {},
      };

      const activitiesRef = collection(
        db,
        'companies',
        companyId,
        'customers',
        customerId,
        'activities'
      );
      await addDoc(activitiesRef, activityData);
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Kundenaktivität:', error);
      // Nicht werfen - Aktivitäten sind nicht kritisch für den Hauptvorgang
    }
  }

  /**
   * Speichert eine Rechnung in Firestore - SUBCOLLECTION companies/{companyId}/invoices
   */
  static async saveInvoice(invoice: InvoiceData): Promise<string> {
    try {
      // 🔥 Lade vollständige Company-Daten für PDF-Generierung
      const companyRef = doc(db, 'companies', invoice.companyId);
      const companySnap = await getDoc(companyRef);

      let companyEnrichment = {};
      if (companySnap.exists()) {
        const companyData = companySnap.data();

        // Extrahiere Bank-Daten aus allen verfügbaren Quellen (wie placeholderSystem.ts)
        const bankDetails = companyData.bankDetails || companyData.step4 || companyData.step3 || {};

        companyEnrichment = {
          // Company Basis-Daten
          companyName: companyData.companyName || invoice.companyName || '',
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
          isSmallBusiness:
            companyData.kleinunternehmer === 'ja' || invoice.isSmallBusiness || false,
        };
      }

      // Rekursive Funktion zum Entfernen aller undefined Werte
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) {
          return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
        }
        if (typeof obj === 'object') {
          const cleaned: any = {};
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (value !== undefined) {
              cleaned[key] = removeUndefined(value);
            }
          });
          return cleaned;
        }
        return obj;
      };

      const invoiceData = {
        ...invoice,
        ...companyEnrichment, // 🔥 Füge vollständige Company-Daten hinzu
        createdAt: Timestamp.fromDate(invoice.createdAt || new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      // Entferne alle undefined Felder
      const cleanedData = removeUndefined(invoiceData);

      // CRITICAL: Save to subcollection companies/{companyId}/invoices
      const docRef = await addDoc(
        collection(db, 'companies', invoice.companyId, 'invoices'),
        cleanedData
      );

      // Automatisch Aktivität in Kundenhistorie erstellen
      const customerName = invoice.customer?.name || invoice.customerName;
      const customerEmail = invoice.customer?.email || invoice.customerEmail;
      if (customerName) {
        try {
          await this.createCustomerActivity(
            invoice.companyId,
            customerName,
            'invoice',
            `Rechnung erstellt: ${invoice.invoiceNumber}`,
            `Eine neue Rechnung wurde erstellt und im System gespeichert.`,
            {
              invoiceId: docRef.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.total,
              currency: 'EUR',
              actionType: 'created',
            },
            customerEmail // Pass email for better customer lookup
          );
        } catch (activityError) {
          console.error(
            '❌ Could not create customer activity for invoice creation:',
            activityError
          );
        }
      } else {
        console.warn('⚠️ No customer name found for invoice activity creation:', {
          invoiceCustomer: invoice.customer,
          invoiceCustomerName: invoice.customerName,
        });
      }

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
      const q = query(
        collection(db, 'companies', companyId, 'invoices'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const invoices: InvoiceData[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();

        // Debug: Log first invoice to check data structure
        if (invoices.length === 0) {
        }

        const invoice = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          stornoDate: data.stornoDate?.toDate ? data.stornoDate.toDate() : data.stornoDate,
          // Ensure numeric fields are numbers
          amount: typeof data.amount === 'number' ? data.amount : 0,
          total: typeof data.total === 'number' ? data.total : 0,
          tax: typeof data.tax === 'number' ? data.tax : 0,
          vatRate: typeof data.vatRate === 'number' ? data.vatRate : 19,
        };

        invoices.push(invoice as any);
      });

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
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt instanceof Date
              ? data.createdAt
              : new Date(),
          stornoDate: data.stornoDate?.toDate
            ? data.stornoDate.toDate()
            : data.stornoDate instanceof Date
              ? data.stornoDate
              : undefined,
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
          taxRule: data.taxRule || data.taxRuleType, // Beide Felder speichern fuer Kompatibilitaet
          taxRuleType: data.taxRuleType || data.taxRule,
          taxRuleLabel: data.taxRuleLabel,
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
          // E-Invoice Daten
          eInvoiceData: data.eInvoiceData,
          eInvoice: data.eInvoice,
          // 🔥 GoBD LOCK STATUS - KRITISCH FÜR UI!
          gobdStatus: data.gobdStatus,
          isLocked: data.isLocked,
          lockedAt: data.lockedAt?.toDate ? data.lockedAt.toDate() : data.lockedAt,
          lockedBy: data.lockedBy,
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

      // Automatisch Aktivität in Kundenhistorie erstellen für wichtige Statusänderungen
      if (['sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
        try {
          // Lade Rechnungsdaten für Kundeninformationen
          const invoice = await this.getInvoiceById(companyId, invoiceId);
          if (invoice && (invoice.customer?.name || invoice.customerName)) {
            const statusTexts = {
              sent: 'Rechnung versendet',
              paid: 'Rechnung bezahlt',
              overdue: 'Rechnung überfällig',
              cancelled: 'Rechnung storniert',
            };

            const statusDescriptions = {
              sent: 'Die Rechnung wurde an den Kunden versendet.',
              paid: 'Die Zahlung für diese Rechnung wurde erhalten.',
              overdue: 'Die Rechnung ist überfällig und eine Mahnung könnte erforderlich sein.',
              cancelled: 'Die Rechnung wurde storniert oder zurückgezogen.',
            };

            const customerName = (invoice.customer?.name || invoice.customerName) as string;
            const customerEmail = invoice.customer?.email || invoice.customerEmail;

            await this.createCustomerActivity(
              companyId,
              customerName,
              'system',
              `${statusTexts[status as keyof typeof statusTexts]}: ${invoice.invoiceNumber}`,
              statusDescriptions[status as keyof typeof statusDescriptions],
              {
                invoiceId: invoiceId,
                invoiceNumber: invoice.invoiceNumber,
                amount: invoice.total,
                currency: 'EUR',
                actionType: status,
                previousStatus: invoice.status,
              },
              customerEmail
            );
          }
        } catch (activityError) {
          console.warn(
            'Could not create customer activity for invoice status update:',
            activityError
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualisiert eine komplette Rechnung
   */
  static async updateInvoice(invoiceId: string, invoice: Partial<InvoiceData>): Promise<void> {
    try {
      // 🔥 Lade aktuelle Company-Daten bei jedem Update
      if (!invoice.companyId) {
        throw new Error('CompanyId is required for updating invoice');
      }

      const companyRef = doc(db, 'companies', invoice.companyId);
      const companySnap = await getDoc(companyRef);

      let companyEnrichment = {};
      if (companySnap.exists()) {
        const companyData = companySnap.data();

        // Extrahiere Bank-Daten aus allen verfügbaren Quellen
        const bankDetails = companyData.bankDetails || companyData.step4 || companyData.step3 || {};

        companyEnrichment = {
          companyName: companyData.companyName || invoice.companyName || '',
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
          isSmallBusiness:
            companyData.kleinunternehmer === 'ja' || invoice.isSmallBusiness || false,
        };
      }

      // Update the invoice data with timestamp
      const invoiceData = {
        ...invoice,
        ...companyEnrichment, // 🔥 Aktualisiere Company-Daten bei jedem Update
        updatedAt: Timestamp.fromDate(new Date()),
      };

      // Remove undefined values and convert Date objects
      const cleanInvoiceData = JSON.parse(
        JSON.stringify(invoiceData, (key, value) => {
          return value === undefined ? null : value;
        })
      );

      // Restore Date objects as Timestamps
      if (cleanInvoiceData.createdAt) {
        cleanInvoiceData.createdAt = Timestamp.fromDate(new Date(cleanInvoiceData.createdAt));
      }
      cleanInvoiceData.updatedAt = Timestamp.fromDate(new Date());

      // CRITICAL: Update in subcollection companies/{companyId}/invoices
      const docRef = doc(db, 'companies', invoice.companyId, 'invoices', invoiceId);
      await updateDoc(docRef, cleanInvoiceData);

      // Automatisch Aktivität in Kundenhistorie erstellen
      if (invoice.customer?.name || invoice.customerName) {
        try {
          const customerName = (invoice.customer?.name || invoice.customerName) as string;
          const customerEmail = invoice.customer?.email || invoice.customerEmail;

          await this.createCustomerActivity(
            invoice.companyId,
            customerName,
            'system',
            `Rechnung aktualisiert: ${invoice.invoiceNumber}`,
            `Die Rechnung wurde bearbeitet und die Änderungen wurden gespeichert.`,
            {
              invoiceId: invoiceId,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.total,
              currency: 'EUR',
              actionType: 'updated',
            },
            customerEmail
          );
        } catch (activityError) {
          console.warn('Could not create customer activity for invoice update:', activityError);
        }
      }
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
      // Lade die ursprüngliche Rechnung
      const originalInvoice = await this.getInvoiceById(companyId, originalInvoiceId);
      if (!originalInvoice) {
        console.error('❌ Original invoice not found:', { companyId, originalInvoiceId });
        throw new Error('Ursprüngliche Rechnung nicht gefunden');
      }

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

      const { sequentialNumber, formattedNumber } = await this.getNextInvoiceNumber(
        originalInvoice.companyId
      );

      // Erstelle Storno-Rechnung

      const stornoInvoice = GermanInvoiceService.createStornoInvoice(
        originalInvoice,
        stornoReason,
        stornoBy,
        sequentialNumber
      );

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
          subtotal:
            typeof (stornoInvoice as any).subtotal === 'number'
              ? (stornoInvoice as any).subtotal
              : 0,
          currency: (stornoInvoice as any).currency || 'EUR',

          // Items Array (gesichert mit Validierung)
          items: Array.isArray(stornoInvoice.items)
            ? stornoInvoice.items.map((item: any) => ({
                id: item.id || '',
                description: item.description || '',
                quantity: typeof item.quantity === 'number' ? item.quantity : 0,
                unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
                total: typeof item.total === 'number' ? item.total : 0,
                unit: item.unit || 'Stk.',
                taxRate:
                  typeof item.taxRate === 'number' ? item.taxRate : stornoInvoice.vatRate || 19,
                discount: typeof item.discount === 'number' ? item.discount : 0,
                discountPercent:
                  typeof item.discountPercent === 'number' ? item.discountPercent : 0,
                category: item.category || '',
              }))
            : [],

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
          bankDetails: stornoInvoice.bankDetails
            ? {
                iban: stornoInvoice.bankDetails.iban || '',
                bic: stornoInvoice.bankDetails.bic || '',
                accountHolder: stornoInvoice.bankDetails.accountHolder || '',
                bankName: stornoInvoice.bankDetails.bankName || '',
              }
            : {
                iban: '',
                bic: '',
                accountHolder: '',
                bankName: '',
              },

          // Storno-spezifische Felder
          status: 'storno',
          isStorno: true,
          originalInvoiceId: originalInvoiceId || '',
          stornoReason: stornoReason || '',
          stornoBy: stornoBy || '',

          // Metadaten
          companyId: companyId || '',
          year:
            typeof stornoInvoice.year === 'number' ? stornoInvoice.year : new Date().getFullYear(),

          // Firestore Timestamps
          createdAt: stornoInvoice.createdAt
            ? Timestamp.fromDate(new Date(stornoInvoice.createdAt))
            : Timestamp.now(),
          stornoDate: stornoInvoice.stornoDate
            ? Timestamp.fromDate(new Date(stornoInvoice.stornoDate))
            : Timestamp.now(),
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

        const stornoDocRef = doc(collection(db, 'companies', companyId, 'invoices'));

        transaction.set(stornoDocRef, cleanedStornoData);

        // Markiere die ursprüngliche Rechnung als storniert
        const originalDocRef = doc(db, 'companies', companyId, 'invoices', originalInvoiceId);

        transaction.update(originalDocRef, {
          status: 'cancelled',
          updatedAt: Timestamp.now(),
        });

        const result = {
          ...stornoInvoice,
          id: stornoDocRef.id,
        };

        // Automatisch Aktivität in Kundenhistorie erstellen nach erfolgreichem Storno
        try {
          if (originalInvoice.customer?.name || originalInvoice.customerName) {
            const customerName = (originalInvoice.customer?.name ||
              originalInvoice.customerName) as string;
            const customerEmail = originalInvoice.customer?.email || originalInvoice.customerEmail;

            await this.createCustomerActivity(
              companyId,
              customerName,
              'system',
              `Storno-Rechnung erstellt: ${result.invoiceNumber}`,
              `Für die ursprüngliche Rechnung ${originalInvoice.invoiceNumber} wurde eine Storno-Rechnung erstellt. Grund: ${stornoReason}`,
              {
                invoiceId: stornoDocRef.id,
                invoiceNumber: result.invoiceNumber,
                originalInvoiceId: originalInvoiceId,
                originalInvoiceNumber: originalInvoice.invoiceNumber,
                amount: result.total,
                currency: 'EUR',
                actionType: 'storno',
                stornoReason: stornoReason,
              },
              customerEmail
            );
          }
        } catch (activityError) {
          console.warn('Could not create customer activity for storno invoice:', activityError);
        }

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

      // Automatisch Aktivität in Kundenhistorie erstellen
      if (invoice.customer?.name || invoice.customerName) {
        try {
          const customerName = (invoice.customer?.name || invoice.customerName) as string;
          const customerEmail = invoice.customer?.email || invoice.customerEmail;

          await this.createCustomerActivity(
            companyId,
            customerName,
            'system',
            `Rechnung gelöscht: ${invoice.invoiceNumber}`,
            `Die Rechnung wurde aus dem System entfernt.`,
            {
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.total,
              currency: 'EUR',
              actionType: 'deleted',
            },
            customerEmail
          );
        } catch (activityError) {
          console.warn('Could not create customer activity for invoice deletion:', activityError);
        }
      }
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

  /**
   * Lädt eine einzelne Stornorechnung aus der Subcollection companies/{companyId}/stornoRechnungen
   */
  static async getStornoById(companyId: string, stornoId: string): Promise<InvoiceData | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'stornoRechnungen', stornoId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Explizite Transformation für Stornorechnung
        const stornoInvoice = {
          id: docSnap.id,
          companyId: data.companyId,
          customerName: data.customerName,
          customerAddress: data.customerAddress,
          items: data.items,
          total: data.total,
          status: data.status,
          invoiceNumber: data.invoiceNumber || data.stornoNumber,
          number: data.number || data.stornoNumber,
          stornoNumber: data.stornoNumber,
          sequentialNumber: data.sequentialNumber,
          date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
          issueDate: data.issueDate,
          dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : data.dueDate,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt instanceof Date
              ? data.createdAt
              : new Date(),
          stornoCreatedAt: data.stornoCreatedAt?.toDate
            ? data.stornoCreatedAt.toDate()
            : data.stornoCreatedAt instanceof Date
              ? data.stornoCreatedAt
              : undefined,
          description: data.description,
          customerEmail: data.customerEmail,
          companyName: data.companyName,
          companyAddress: data.companyAddress,
          companyEmail: data.companyEmail,
          companyPhone: data.companyPhone,
          companyWebsite: data.companyWebsite,
          amount: data.amount || 0,
          tax: data.tax || 0,
          vatRate: data.vatRate || 19,
          isSmallBusiness: data.isSmallBusiness || false,
          paymentTerms: data.paymentTerms,
          tags: data.tags || [],

          // Storno-spezifische Felder
          originalInvoiceId: data.originalInvoiceId,
          originalInvoiceNumber: data.originalInvoiceNumber,
          documentType: data.documentType || 'storno',
          isStorno: true,
          title: data.title,
        };

        return stornoInvoice as unknown as InvoiceData;
      }

      return null;
    } catch (error) {
      console.error('Error loading storno invoice:', error);
      throw error;
    }
  }

  /**
   * Lädt alle Stornorechnungen einer Firma
   */
  static async getStornosByCompany(companyId: string): Promise<InvoiceData[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'stornoRechnungen'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const stornoInvoices: InvoiceData[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();

        const stornoInvoice = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          stornoCreatedAt: data.stornoCreatedAt?.toDate
            ? data.stornoCreatedAt.toDate()
            : data.stornoCreatedAt,
          // Ensure numeric fields are numbers
          amount: typeof data.amount === 'number' ? data.amount : 0,
          total: typeof data.total === 'number' ? data.total : 0,
          tax: typeof data.tax === 'number' ? data.tax : 0,
          vatRate: typeof data.vatRate === 'number' ? data.vatRate : 19,
          // Storno-spezifische Flags
          isStorno: true,
          documentType: 'storno',
        };

        stornoInvoices.push(stornoInvoice as any);
      });

      return stornoInvoices;
    } catch (error) {
      console.error('Error loading storno invoices:', error);
      throw error;
    }
  }
}
