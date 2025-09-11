/**
 * Lieferschein Service - sevdesk Lieferschein-Management
 * Erstellt, verwaltet und versendet Lieferscheine mit automatischer Rechnungskonvertierung
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { DeliveryNoteTemplate } from '@/components/finance/delivery-note-templates/types';

export interface DeliveryNote {
  id: string;
  deliveryNoteNumber: string;
  date: string;
  deliveryDate: string;
  customerName: string;
  customerAddress: string;
  customerEmail?: string;
  customerId?: string;
  companyId?: string;
  orderNumber?: string;
  customerOrderNumber?: string; // Kunden-Bestellnummer
  sequentialNumber?: number; // Fortlaufende Nummer
  items: DeliveryNoteItem[];
  notes?: string;
  specialInstructions?: string; // Besondere Anweisungen
  shippingMethod?: string; // Versandmethode
  status: 'draft' | 'sent' | 'delivered' | 'cancelled' | 'invoiced';
  showPrices?: boolean;
  subtotal?: number;
  tax?: number;
  total?: number;
  vatRate?: number;
  template?: DeliveryNoteTemplate | null;
  // E-Mail-Tracking Felder
  emailSent?: boolean;
  emailSentAt?: string;
  emailSentTo?: string;
  lastEmailId?: string;
  // Versand-Tracking Felder
  sentAt?: Date;
  deliveredAt?: Date;
  invoicedAt?: Date;
  trackingNumber?: string;
  invoiceId?: string;
  // Warehouse Integration
  warehouseUpdated?: boolean;
  stockValidated?: boolean;
  // Erstellungsinfo
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DeliveryNoteItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;

  // Optional für Preisanzeige
  unitPrice?: number;
  total?: number;

  // Lagerbestand
  stockReduced: boolean;
  warehouseLocation?: string;
  serialNumbers?: string[];

  // Zusatzinfos
  notes?: string;
}

export interface DeliveryNoteLayoutTemplate {
  id: string;
  name: string;
  companyId: string;

  // Template-Design
  layout: 'standard' | 'modern' | 'compact';
  showPrices: boolean;
  showItemNumbers: boolean;
  includeTerms: boolean;

  // Standard-Texte
  headerText?: string;
  footerText?: string;
  termsText?: string;
  deliveryTerms?: string;

  // Firmen-Branding
  logoPosition: 'left' | 'right' | 'center';
  primaryColor?: string;
  fontSize: 'small' | 'medium' | 'large';

  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryNoteSettings {
  companyId: string;

  // Nummerierung
  numberPrefix: string;
  nextNumber: number;
  numberFormat: string; // z.B. "LS-{YYYY}-{####}"

  // Automatisierung
  autoSendEmail: boolean;
  autoUpdateStock: boolean;
  autoCreateInvoice: boolean;

  // Standard-Werte
  defaultTemplate: string;
  defaultShippingMethod: string;
  defaultDeliveryTerms: string;

  // E-Mail
  emailSubject: string;
  emailTemplate: string;

  createdAt: Date;
  updatedAt: Date;
}

export class DeliveryNoteService {
  private static readonly COLLECTION = 'deliveryNotes';
  private static readonly TEMPLATES_COLLECTION = 'deliveryNoteTemplates';
  private static readonly SETTINGS_COLLECTION = 'deliveryNoteSettings';

  /**
   * Erstellt einen neuen Lieferschein
   */
  static async createDeliveryNote(
    noteData: Omit<DeliveryNote, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log('📋 Creating delivery note for company:', noteData.companyId);

      // Sequenznummer generieren - Mit Fallback für fehlende Settings
      let settings: DeliveryNoteSettings | null = null;
      let sequentialNumber = 1;
      let deliveryNoteNumber = '';

      try {
        settings = await this.getSettings(noteData.companyId || '');
        sequentialNumber = settings?.nextNumber || 1;
        deliveryNoteNumber = this.generateDeliveryNoteNumber(settings, sequentialNumber);
      } catch (settingsError) {
        console.warn('⚠️ Could not load settings, using defaults:', settingsError);
        // Fallback: Einfache Nummerierung ohne Settings
        const timestamp = Date.now();
        deliveryNoteNumber = `LS-${timestamp}`;
        sequentialNumber = 1;
      }

      console.log('📋 Generated delivery note number:', deliveryNoteNumber);

      const collectionRef = collection(db, this.COLLECTION);
      const docRef = await addDoc(collectionRef, {
        ...noteData,
        deliveryNoteNumber,
        sequentialNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ Delivery note created successfully with ID:', docRef.id);

      // Nächste Nummer aktualisieren - Nur wenn Settings verfügbar sind
      if (settings && noteData.companyId) {
        try {
          await this.updateSettings(noteData.companyId, {
            ...settings,
            nextNumber: sequentialNumber + 1,
          });
        } catch (updateError) {
          console.warn('⚠️ Could not update settings, continuing anyway:', updateError);
        }
      }

      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating delivery note:', error);
      if (error instanceof Error) {
        throw error; // Re-throw original error to preserve error details
      }
      throw new Error('Lieferschein konnte nicht erstellt werden');
    }
  }

  /**
   * Aktualisiert einen Lieferschein
   */
  static async updateDeliveryNote(id: string, updates: Partial<DeliveryNote>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      throw new Error('Lieferschein konnte nicht aktualisiert werden');
    }
  }

  /**
   * Löscht einen Lieferschein
   */
  static async deleteDeliveryNote(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION, id));
    } catch (error) {
      throw new Error('Lieferschein konnte nicht gelöscht werden');
    }
  }

  /**
   * Lädt alle Lieferscheine für ein Unternehmen
   */
  static async getDeliveryNotesByCompany(companyId: string): Promise<DeliveryNote[]> {
    try {
      console.log('📋 Loading delivery notes for company:', companyId);

      // Erste Variante: Mit orderBy - falls Index vorhanden
      try {
        const q = query(
          collection(db, this.COLLECTION),
          where('companyId', '==', companyId),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        console.log('📋 Delivery notes found (with orderBy):', querySnapshot.docs.length);

        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          sentAt: doc.data().sentAt?.toDate(),
          deliveredAt: doc.data().deliveredAt?.toDate(),
          invoicedAt: doc.data().invoicedAt?.toDate(),
        })) as DeliveryNote[];
      } catch (indexError) {
        console.log('📋 OrderBy failed, trying without index:', indexError);

        // Fallback: Ohne orderBy
        const q = query(collection(db, this.COLLECTION), where('companyId', '==', companyId));

        const querySnapshot = await getDocs(q);
        console.log('📋 Delivery notes found (without orderBy):', querySnapshot.docs.length);

        const deliveryNotes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          sentAt: doc.data().sentAt?.toDate(),
          deliveredAt: doc.data().deliveredAt?.toDate(),
          invoicedAt: doc.data().invoicedAt?.toDate(),
        })) as DeliveryNote[];

        // Manuell nach createdAt sortieren
        return deliveryNotes.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (error) {
      console.error('❌ Error loading delivery notes:', error);
      throw new Error('Lieferscheine konnten nicht geladen werden');
    }
  }

  /**
   * Lädt einen spezifischen Lieferschein
   */
  static async getDeliveryNote(id: string): Promise<DeliveryNote | null> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          sentAt: data.sentAt?.toDate(),
          deliveredAt: data.deliveredAt?.toDate(),
          invoicedAt: data.invoicedAt?.toDate(),
        } as DeliveryNote;
      }

      return null;
    } catch (error) {
      throw new Error('Lieferschein konnte nicht geladen werden');
    }
  }

  /**
   * Markiert Lieferschein als versendet
   */
  static async markAsSent(id: string, trackingNumber?: string): Promise<void> {
    try {
      const updates: Partial<DeliveryNote> = {
        status: 'sent',
        sentAt: new Date(),
      };

      if (trackingNumber) {
        updates.trackingNumber = trackingNumber;
      }

      await this.updateDeliveryNote(id, updates);
    } catch (error) {
      throw new Error('Status konnte nicht aktualisiert werden');
    }
  }

  /**
   * Markiert Lieferschein als zugestellt
   */
  static async markAsDelivered(id: string): Promise<void> {
    try {
      await this.updateDeliveryNote(id, {
        status: 'delivered',
        deliveredAt: new Date(),
      });
    } catch (error) {
      throw new Error('Status konnte nicht aktualisiert werden');
    }
  }

  /**
   * Erstellt Rechnung aus Lieferschein
   */
  static async createInvoiceFromDeliveryNote(deliveryNoteId: string): Promise<string> {
    try {
      const deliveryNote = await this.getDeliveryNote(deliveryNoteId);
      if (!deliveryNote) {
        throw new Error('Lieferschein nicht gefunden');
      }

      // Hier würde die Rechnung erstellt werden
      // Integration mit InvoiceService
      const invoiceData = {
        companyId: deliveryNote.companyId,
        customerId: deliveryNote.customerId,
        customerName: deliveryNote.customerName,
        customerEmail: deliveryNote.customerEmail,
        customerAddress: deliveryNote.customerAddress,
        items: deliveryNote.items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          total: item.total || 0,
        })),
        orderNumber: deliveryNote.orderNumber,
        deliveryNoteId: deliveryNoteId,
        notes: `Rechnung zu Lieferschein ${deliveryNote.deliveryNoteNumber}`,
      };

      // TODO: Integration mit Invoice Service
      const invoiceId = 'generated-invoice-id';

      // Lieferschein als fakturiert markieren
      await this.updateDeliveryNote(deliveryNoteId, {
        status: 'invoiced',
        invoiceId,
        invoicedAt: new Date(),
      });

      return invoiceId;
    } catch (error) {
      throw new Error('Rechnung konnte nicht erstellt werden');
    }
  }

  /**
   * Aktualisiert Lagerbestände basierend auf Lieferschein
   */
  static async updateInventoryFromDeliveryNote(deliveryNoteId: string): Promise<void> {
    try {
      const deliveryNote = await this.getDeliveryNote(deliveryNoteId);
      if (!deliveryNote || deliveryNote.warehouseUpdated) {
        return;
      }

      // TODO: Integration mit Inventory Service
      for (const item of deliveryNote.items) {
        if (item.productId && !item.stockReduced) {
          // Bestand reduzieren
          // await InventoryService.reduceStock(item.productId, item.quantity);
        }
      }

      // Als aktualisiert markieren
      await this.updateDeliveryNote(deliveryNoteId, {
        warehouseUpdated: true,
        items: deliveryNote.items.map(item => ({
          ...item,
          stockReduced: true,
        })),
      });
    } catch (error) {
      throw new Error('Lagerbestand konnte nicht aktualisiert werden');
    }
  }

  /**
   * Generiert Lieferschein-Nummer
   */
  private static generateDeliveryNoteNumber(
    settings: DeliveryNoteSettings | null,
    sequentialNumber: number
  ): string {
    if (!settings) {
      return `LS-${sequentialNumber.toString().padStart(4, '0')}`;
    }

    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const number = sequentialNumber.toString().padStart(4, '0');

    return settings.numberFormat
      .replace('{PREFIX}', settings.numberPrefix)
      .replace('{YYYY}', year.toString())
      .replace('{MM}', month)
      .replace('{####}', number);
  }

  /**
   * Lädt Einstellungen für Lieferscheine
   */
  static async getSettings(companyId: string): Promise<DeliveryNoteSettings | null> {
    try {
      const q = query(
        collection(db, this.SETTINGS_COLLECTION),
        where('companyId', '==', companyId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('📋 No delivery note settings found, using defaults for company:', companyId);
        return null;
      }

      const doc = querySnapshot.docs[0];
      const settings = {
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as DeliveryNoteSettings;

      console.log('📋 Delivery note settings loaded successfully for company:', companyId);
      return settings;
    } catch (error) {
      console.error('📋 Error loading delivery note settings:', error);
      // Bei Berechtigungsfehlern oder anderen Problemen null zurückgeben
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as any;
        if (firebaseError.code === 'permission-denied') {
          console.warn('📋 Permission denied for delivery note settings, using defaults');
        }
      }
      return null;
    }
  }

  /**
   * Speichert oder aktualisiert Einstellungen
   */
  static async updateSettings(
    companyId: string,
    settings: Partial<DeliveryNoteSettings>
  ): Promise<void> {
    try {
      const q = query(
        collection(db, this.SETTINGS_COLLECTION),
        where('companyId', '==', companyId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Neue Einstellungen erstellen
        await addDoc(collection(db, this.SETTINGS_COLLECTION), {
          companyId,
          numberPrefix: 'LS',
          nextNumber: 1,
          numberFormat: '{PREFIX}-{YYYY}-{####}',
          autoSendEmail: false,
          autoUpdateStock: true,
          autoCreateInvoice: false,
          defaultTemplate: 'standard',
          defaultShippingMethod: 'standard',
          defaultDeliveryTerms: 'Lieferung frei Haus',
          emailSubject: 'Ihr Lieferschein {NUMBER}',
          emailTemplate: 'Anbei erhalten Sie Ihren Lieferschein.',
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Bestehende Einstellungen aktualisieren
        const docRef = doc(db, this.SETTINGS_COLLECTION, querySnapshot.docs[0].id);
        await updateDoc(docRef, {
          ...settings,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      throw new Error('Einstellungen konnten nicht gespeichert werden');
    }
  }

  /**
   * Lädt alle Templates für ein Unternehmen
   */
  static async getTemplates(companyId: string): Promise<DeliveryNoteLayoutTemplate[]> {
    try {
      const q = query(
        collection(db, this.TEMPLATES_COLLECTION),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as DeliveryNoteLayoutTemplate[];
    } catch (error) {
      throw new Error('Templates konnten nicht geladen werden');
    }
  }

  /**
   * Statistiken für Dashboard
   */
  static async getDeliveryNoteStats(companyId: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    pending: number;
    thisMonth: number;
  }> {
    try {
      const deliveryNotes = await this.getDeliveryNotesByCompany(companyId);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      return {
        total: deliveryNotes.length,
        sent: deliveryNotes.filter(dn => dn.status === 'sent').length,
        delivered: deliveryNotes.filter(dn => dn.status === 'delivered').length,
        pending: deliveryNotes.filter(dn => ['draft', 'sent'].includes(dn.status)).length,
        thisMonth: deliveryNotes.filter(dn => {
          const dnDate = new Date(dn.date);
          return dnDate.getMonth() === currentMonth && dnDate.getFullYear() === currentYear;
        }).length,
      };
    } catch (error) {
      return { total: 0, sent: 0, delivered: 0, pending: 0, thisMonth: 0 };
    }
  }
}
