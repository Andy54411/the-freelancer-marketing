/**
 * EmployeeActivityLogService
 * 
 * Loggt alle Aktivitäten von Mitarbeitern, damit der Firmeninhaber
 * sehen kann, was seine Mitarbeiter machen.
 * 
 * Speicherort: /companies/{companyId}/employeeActivityLogs/{logId}
 */

import { db } from '@/firebase/clients';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

export interface EmployeeActivityLog {
  id?: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  action: EmployeeAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp?: Timestamp;
  createdAt?: Timestamp;
}

export type EmployeeAction = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'viewed'
  | 'sent'
  | 'downloaded'
  | 'uploaded'
  | 'approved'
  | 'rejected'
  | 'login'
  | 'logout';

export type EntityType =
  | 'invoice'
  | 'quote'
  | 'customer'
  | 'expense'
  | 'document'
  | 'order'
  | 'timeEntry'
  | 'calendar'
  | 'settings'
  | 'dashboard'
  | 'session'
  | 'shift';

export class EmployeeActivityLogService {
  /**
   * Loggt eine Mitarbeiteraktivität
   */
  static async log(
    companyId: string,
    employeeData: {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
    },
    action: EmployeeAction,
    entityType: EntityType,
    details: {
      entityId?: string;
      entityName?: string;
      description: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<string | null> {
    try {
      const logRef = collection(db, 'companies', companyId, 'employeeActivityLogs');
      
      const logEntry: Omit<EmployeeActivityLog, 'id'> = {
        employeeId: employeeData.employeeId,
        employeeName: employeeData.employeeName,
        employeeEmail: employeeData.employeeEmail,
        action,
        entityType,
        entityId: details.entityId,
        entityName: details.entityName,
        description: details.description,
        metadata: details.metadata,
        createdAt: serverTimestamp() as Timestamp,
      };

      const docRef = await addDoc(logRef, logEntry);
      return docRef.id;
    } catch (error) {
      console.error('[EmployeeActivityLogService] Error logging activity:', error);
      return null;
    }
  }

  /**
   * Holt die neuesten Aktivitäten für eine Company
   */
  static async getRecentActivities(
    companyId: string,
    maxResults: number = 50
  ): Promise<EmployeeActivityLog[]> {
    try {
      const logsRef = collection(db, 'companies', companyId, 'employeeActivityLogs');
      const logsQuery = query(
        logsRef,
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );

      const snapshot = await getDocs(logsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmployeeActivityLog));
    } catch (error) {
      console.error('[EmployeeActivityLogService] Error fetching activities:', error);
      return [];
    }
  }

  /**
   * Formatiert eine Aktivität für die Anzeige
   */
  static formatActivityDescription(log: EmployeeActivityLog): string {
    const actionLabels: Record<EmployeeAction, string> = {
      created: 'hat erstellt',
      updated: 'hat aktualisiert',
      deleted: 'hat gelöscht',
      viewed: 'hat angesehen',
      sent: 'hat gesendet',
      downloaded: 'hat heruntergeladen',
      uploaded: 'hat hochgeladen',
      approved: 'hat genehmigt',
      rejected: 'hat abgelehnt',
      login: 'hat sich angemeldet',
      logout: 'hat sich abgemeldet',
    };

    const entityLabels: Record<EntityType, string> = {
      invoice: 'Rechnung',
      quote: 'Angebot',
      customer: 'Kunde',
      expense: 'Ausgabe',
      document: 'Dokument',
      order: 'Auftrag',
      timeEntry: 'Zeiteintrag',
      calendar: 'Kalendereintrag',
      settings: 'Einstellungen',
      dashboard: 'Dashboard',
      session: 'Sitzung',
      shift: 'Schicht',
    };

    const action = actionLabels[log.action] || log.action;
    const entity = entityLabels[log.entityType] || log.entityType;
    
    if (log.entityName) {
      return `${log.employeeName} ${action} ${entity} "${log.entityName}"`;
    }
    
    return `${log.employeeName} ${action} ${entity}`;
  }

  /**
   * Helper: Loggt Login eines Mitarbeiters
   */
  static async logLogin(
    companyId: string,
    employeeData: {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
    }
  ): Promise<void> {
    await this.log(companyId, employeeData, 'login', 'session', {
      description: `${employeeData.employeeName} hat sich angemeldet`,
    });
  }

  /**
   * Helper: Loggt Rechnung erstellen
   */
  static async logInvoiceCreated(
    companyId: string,
    employeeData: {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
    },
    invoiceData: {
      invoiceId: string;
      invoiceNumber: string;
      customerName?: string;
      amount?: number;
    }
  ): Promise<void> {
    await this.log(companyId, employeeData, 'created', 'invoice', {
      entityId: invoiceData.invoiceId,
      entityName: invoiceData.invoiceNumber,
      description: `${employeeData.employeeName} hat Rechnung ${invoiceData.invoiceNumber} erstellt`,
      metadata: {
        customerName: invoiceData.customerName,
        amount: invoiceData.amount,
      },
    });
  }

  /**
   * Helper: Loggt Angebot erstellen
   */
  static async logQuoteCreated(
    companyId: string,
    employeeData: {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
    },
    quoteData: {
      quoteId: string;
      quoteNumber: string;
      customerName?: string;
      amount?: number;
    }
  ): Promise<void> {
    await this.log(companyId, employeeData, 'created', 'quote', {
      entityId: quoteData.quoteId,
      entityName: quoteData.quoteNumber,
      description: `${employeeData.employeeName} hat Angebot ${quoteData.quoteNumber} erstellt`,
      metadata: {
        customerName: quoteData.customerName,
        amount: quoteData.amount,
      },
    });
  }

  /**
   * Helper: Loggt Kunde erstellen
   */
  static async logCustomerCreated(
    companyId: string,
    employeeData: {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
    },
    customerData: {
      customerId: string;
      customerName: string;
    }
  ): Promise<void> {
    await this.log(companyId, employeeData, 'created', 'customer', {
      entityId: customerData.customerId,
      entityName: customerData.customerName,
      description: `${employeeData.employeeName} hat Kunde "${customerData.customerName}" erstellt`,
    });
  }
}
