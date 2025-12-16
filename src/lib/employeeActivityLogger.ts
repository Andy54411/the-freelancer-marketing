/**
 * Client-Helper für Mitarbeiter-Aktivitätslogging
 * Ruft die API auf, um Aktivitäten zu loggen
 */

import { auth } from '@/firebase/clients';

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

interface LogActivityParams {
  action: EmployeeAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Loggt eine Mitarbeiteraktivität über die API
 * Sollte nur von Mitarbeitern aufgerufen werden
 */
export async function logEmployeeActivity(params: LogActivityParams): Promise<boolean> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    const token = await currentUser.getIdToken();
    
    const response = await fetch('/api/employee/activity-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[EmployeeActivityLogger] Error:', error);
    return false;
  }
}

/**
 * Helper: Loggt Mitarbeiter-Login
 */
export async function logEmployeeLogin(): Promise<void> {
  await logEmployeeActivity({
    action: 'login',
    entityType: 'session',
    description: 'Mitarbeiter hat sich angemeldet',
  });
}

/**
 * Helper: Loggt Rechnung erstellen
 */
export async function logInvoiceCreated(
  invoiceId: string,
  invoiceNumber: string,
  customerName?: string,
  amount?: number
): Promise<void> {
  await logEmployeeActivity({
    action: 'created',
    entityType: 'invoice',
    entityId: invoiceId,
    entityName: invoiceNumber,
    description: `Rechnung ${invoiceNumber} erstellt`,
    metadata: { customerName, amount },
  });
}

/**
 * Helper: Loggt Angebot erstellen
 */
export async function logQuoteCreated(
  quoteId: string,
  quoteNumber: string,
  customerName?: string,
  amount?: number
): Promise<void> {
  await logEmployeeActivity({
    action: 'created',
    entityType: 'quote',
    entityId: quoteId,
    entityName: quoteNumber,
    description: `Angebot ${quoteNumber} erstellt`,
    metadata: { customerName, amount },
  });
}

/**
 * Helper: Loggt Kunde erstellen
 */
export async function logCustomerCreated(
  customerId: string,
  customerName: string
): Promise<void> {
  await logEmployeeActivity({
    action: 'created',
    entityType: 'customer',
    entityId: customerId,
    entityName: customerName,
    description: `Kunde "${customerName}" erstellt`,
  });
}

/**
 * Helper: Loggt Dokument hochgeladen
 */
export async function logDocumentUploaded(
  documentId: string,
  documentName: string
): Promise<void> {
  await logEmployeeActivity({
    action: 'uploaded',
    entityType: 'document',
    entityId: documentId,
    entityName: documentName,
    description: `Dokument "${documentName}" hochgeladen`,
  });
}

/**
 * Helper: Loggt Schicht erstellt
 */
export async function logShiftCreated(
  shiftId: string,
  employeeName: string,
  date: string,
  shiftType?: string
): Promise<void> {
  await logEmployeeActivity({
    action: 'created',
    entityType: 'shift',
    entityId: shiftId,
    entityName: `${employeeName} - ${date}`,
    description: `Schicht für ${employeeName} am ${date} erstellt${shiftType ? ` (${shiftType})` : ''}`,
    metadata: { employeeName, date, shiftType },
  });
}

/**
 * Helper: Loggt Schicht aktualisiert
 */
export async function logShiftUpdated(
  shiftId: string,
  employeeName: string,
  date: string,
  shiftType?: string
): Promise<void> {
  await logEmployeeActivity({
    action: 'updated',
    entityType: 'shift',
    entityId: shiftId,
    entityName: `${employeeName} - ${date}`,
    description: `Schicht für ${employeeName} am ${date} aktualisiert${shiftType ? ` (${shiftType})` : ''}`,
    metadata: { employeeName, date, shiftType },
  });
}

/**
 * Helper: Loggt Schicht gelöscht
 */
export async function logShiftDeleted(
  shiftId: string,
  employeeName: string,
  date: string
): Promise<void> {
  await logEmployeeActivity({
    action: 'deleted',
    entityType: 'shift',
    entityId: shiftId,
    entityName: `${employeeName} - ${date}`,
    description: `Schicht für ${employeeName} am ${date} gelöscht`,
    metadata: { employeeName, date },
  });
}
