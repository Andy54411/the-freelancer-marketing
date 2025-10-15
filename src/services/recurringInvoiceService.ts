'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

/**
 * RecurringInvoiceService
 * 
 * Service Layer für wiederkehrende Rechnungen
 * 
 * ARCHITEKTUR:
 * - Wiederkehrende Rechnungen werden als normale Rechnungen in invoices Subcollection gespeichert
 * - Pfad: companies/{companyId}/invoices/{invoiceId}
 * - Kennzeichnung durch: isRecurringTemplate = true
 * - Generierte Folgerechnungen haben: recurringParentId = {templateInvoiceId}
 * - Nummerkreislauf bleibt konsistent für alle Rechnungen (GoBD-konform)
 */

export interface RecurringInvoiceTemplate {
  // Basis-Rechnungsfelder (wie normale Rechnung)
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  
  // Rechnungsdaten
  title: string;
  items: RecurringInvoiceItem[];
  headTextHtml?: string;
  footerText?: string;
  notes?: string;
  paymentTerms?: string;
  currency: string;
  taxRate: number;
  taxRule: string;
  
  // Wiederkehrende Rechnungs-spezifische Felder
  isRecurringTemplate: true; // Kennzeichnung als Template
  recurringInterval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  recurringStartDate: string;
  recurringEndDate?: string | null;
  recurringNextExecutionDate: string;
  recurringAutoSendEmail: boolean;
  recurringEmailTemplateId?: string;
  recurringStatus: 'active' | 'paused' | 'completed';
  recurringTotalGenerated: number; // Anzahl generierter Rechnungen
  recurringLastGeneratedAt?: any;
  
  // Standard-Rechnungsfelder
  invoiceNumber?: string; // Template hat keine Nummer
  status: 'draft'; // Templates sind immer draft
  createdAt: any;
  updatedAt: any;
}

export interface RecurringInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
  taxRate?: number;
  discountPercent?: number;
}

export interface CreateRecurringInvoiceData {
  // Kundeninformationen
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  
  // Wiederkehrende Einstellungen
  interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string | null;
  autoSendEmail: boolean;
  emailTemplateId?: string;
  
  // Rechnungsdaten
  title: string;
  items: RecurringInvoiceItem[];
  headTextHtml?: string;
  footerText?: string;
  notes?: string;
  paymentTerms?: string;
  currency?: string;
  taxRate?: number;
  taxRule?: string;
}

/**
 * Interface für generierte Folgerechnungen
 * Diese Rechnungen haben alle Standard-Felder + Referenz zum Template
 */
export interface GeneratedRecurringInvoice {
  id: string;
  companyId: string;
  
  // Referenz zum Template
  recurringParentId: string; // ID des Template
  isGeneratedFromRecurring: true;
  
  // Normale Rechnungsfelder (aus InvoiceData)
  invoiceNumber: string; // Fortlaufende Nummer aus Nummerkreislauf
  number: string;
  sequentialNumber: number;
  
  // Kundendaten
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  
  // Datum
  date: string;
  issueDate: string;
  dueDate: string;
  
  // Status
  status: 'draft' | 'finalized' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  
  // Rechnungsdaten
  items: RecurringInvoiceItem[];
  amount: number;
  tax: number;
  total: number;
  
  // ... alle anderen Standard-Rechnungsfelder aus InvoiceData
  createdAt: Date;
  year: number;
}

export class RecurringInvoiceService {
  /**
   * Alle wiederkehrenden Rechnungen (Templates) einer Firma abrufen
   * Lädt aus der invoices Subcollection, gefiltert nach isRecurringTemplate = true
   */
  static async getRecurringInvoices(
    companyId: string,
    statusFilter?: 'active' | 'paused' | 'completed'
  ): Promise<RecurringInvoiceTemplate[]> {
    try {
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      
      // Query für wiederkehrende Templates
      let q = query(
        invoicesRef,
        where('isRecurringTemplate', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      if (statusFilter) {
        q = query(
          invoicesRef,
          where('isRecurringTemplate', '==', true),
          where('recurringStatus', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as RecurringInvoiceTemplate));
    } catch (error) {
      console.error('[RecurringInvoiceService] Error getting recurring invoices:', error);
      throw error;
    }
  }

  /**
   * Einzelne wiederkehrende Rechnung (Template) abrufen
   */
  static async getRecurringInvoiceById(
    companyId: string,
    templateId: string
  ): Promise<RecurringInvoiceTemplate | null> {
    try {
      const invoiceRef = doc(db, 'companies', companyId, 'invoices', templateId);
      const invoiceDoc = await getDoc(invoiceRef);
      
      if (!invoiceDoc.exists()) {
        return null;
      }
      
      const data = invoiceDoc.data();
      
      // Prüfen ob es wirklich ein Template ist
      if (!data.isRecurringTemplate) {
        return null;
      }
      
      return {
        id: invoiceDoc.id,
        ...data,
      } as RecurringInvoiceTemplate;
    } catch (error) {
      console.error('[RecurringInvoiceService] Error getting recurring invoice:', error);
      throw error;
    }
  }

  /**
   * Neue wiederkehrende Rechnung (Template) erstellen
   * Speichert als normale Rechnung mit isRecurringTemplate = true
   */
  static async createRecurringInvoice(
    companyId: string,
    data: CreateRecurringInvoiceData
  ): Promise<string> {
    try {
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      
      const templateData = {
        companyId,
        ...data,
        
        // Wiederkehrende Rechnungs-Felder
        isRecurringTemplate: true,
        recurringInterval: data.interval,
        recurringStartDate: data.startDate,
        recurringEndDate: data.endDate,
        recurringNextExecutionDate: data.startDate,
        recurringAutoSendEmail: data.autoSendEmail,
        recurringEmailTemplateId: data.emailTemplateId,
        recurringStatus: 'active',
        recurringTotalGenerated: 0,
        recurringLastGeneratedAt: null,
        
        // Standard-Rechnungsfelder
        status: 'draft', // Templates sind immer draft
        invoiceNumber: undefined, // Templates haben keine Nummer
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(invoicesRef, templateData);
      
      return docRef.id;
    } catch (error) {
      console.error('[RecurringInvoiceService] Error creating recurring invoice:', error);
      throw error;
    }
  }

  /**
   * Wiederkehrende Rechnung (Template) aktualisieren
   */
  static async updateRecurringInvoice(
    companyId: string,
    templateId: string,
    updates: Partial<CreateRecurringInvoiceData>
  ): Promise<void> {
    try {
      const invoiceRef = doc(db, 'companies', companyId, 'invoices', templateId);
      
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      // Map frontend fields to recurring fields
      if (updates.interval) {
        updateData.recurringInterval = updates.interval;
      }
      if (updates.startDate) {
        updateData.recurringStartDate = updates.startDate;
      }
      if (updates.endDate !== undefined) {
        updateData.recurringEndDate = updates.endDate;
      }
      if (updates.autoSendEmail !== undefined) {
        updateData.recurringAutoSendEmail = updates.autoSendEmail;
      }
      if (updates.emailTemplateId !== undefined) {
        updateData.recurringEmailTemplateId = updates.emailTemplateId;
      }
      
      await updateDoc(invoiceRef, updateData);
    } catch (error) {
      console.error('[RecurringInvoiceService] Error updating recurring invoice:', error);
      throw error;
    }
  }

  /**
   * Status der wiederkehrenden Rechnung ändern
   */
  static async updateRecurringInvoiceStatus(
    companyId: string,
    templateId: string,
    status: 'active' | 'paused' | 'completed'
  ): Promise<void> {
    try {
      const invoiceRef = doc(db, 'companies', companyId, 'invoices', templateId);
      
      await updateDoc(invoiceRef, {
        recurringStatus: status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[RecurringInvoiceService] Error updating status:', error);
      throw error;
    }
  }

  /**
   * Wiederkehrende Rechnung löschen (Soft Delete)
   */
  static async deleteRecurringInvoice(
    companyId: string,
    templateId: string
  ): Promise<void> {
    try {
      const invoiceRef = doc(db, 'companies', companyId, 'invoices', templateId);
      
      // Soft delete - Status auf completed setzen
      await updateDoc(invoiceRef, {
        recurringStatus: 'completed',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[RecurringInvoiceService] Error deleting recurring invoice:', error);
      throw error;
    }
  }

  /**
   * Wiederkehrende Rechnung komplett löschen (Hard Delete)
   * WARNUNG: Nur für Admin-Zwecke, GoBD-Konflikt möglich!
   */
  static async hardDeleteRecurringInvoice(
    companyId: string,
    templateId: string
  ): Promise<void> {
    try {
      const invoiceRef = doc(db, 'companies', companyId, 'invoices', templateId);
      await deleteDoc(invoiceRef);
    } catch (error) {
      console.error('[RecurringInvoiceService] Error hard deleting recurring invoice:', error);
      throw error;
    }
  }

  /**
   * Wiederkehrende Rechnungen (Templates) nach Kunde abrufen
   */
  static async getRecurringInvoicesByCustomer(
    companyId: string,
    customerId: string
  ): Promise<RecurringInvoiceTemplate[]> {
    try {
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      
      const q = query(
        invoicesRef,
        where('isRecurringTemplate', '==', true),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as RecurringInvoiceTemplate));
    } catch (error) {
      console.error('[RecurringInvoiceService] Error getting recurring invoices by customer:', error);
      throw error;
    }
  }

  /**
   * Alle generierten Rechnungen eines Templates abrufen
   * Lädt Folgerechnungen mit recurringParentId = templateId
   */
  static async getGeneratedInvoicesFromTemplate(
    companyId: string,
    templateId: string
  ): Promise<any[]> {
    try {
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      
      const q = query(
        invoicesRef,
        where('recurringParentId', '==', templateId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('[RecurringInvoiceService] Error getting generated invoices:', error);
      throw error;
    }
  }

  /**
   * Statistiken für wiederkehrende Rechnungen abrufen
   */
  static async getRecurringInvoiceStats(companyId: string): Promise<{
    total: number;
    active: number;
    paused: number;
    completed: number;
  }> {
    try {
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      
      const q = query(
        invoicesRef,
        where('isRecurringTemplate', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const templates = snapshot.docs.map(doc => doc.data() as RecurringInvoiceTemplate);
      
      return {
        total: templates.length,
        active: templates.filter(t => t.recurringStatus === 'active').length,
        paused: templates.filter(t => t.recurringStatus === 'paused').length,
        completed: templates.filter(t => t.recurringStatus === 'completed').length,
      };
    } catch (error) {
      console.error('[RecurringInvoiceService] Error getting stats:', error);
      throw error;
    }
  }
}
