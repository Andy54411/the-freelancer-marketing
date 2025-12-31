// Admin Approval Middleware - Blockiert nicht freigegebene Firmen
import { db } from '@/firebase/server';

export interface AdminApprovalResult {
  isApproved: boolean;
  companyData?: any;
  error?: string;
  errorCode?: string;
}

/**
 * Überprüft, ob eine Firma von einem Admin freigegeben wurde
 * Blockiert kritische Business-Aktionen für nicht freigegebene Firmen
 */
export async function checkAdminApproval(companyId: string): Promise<AdminApprovalResult> {
  try {
    if (!db) {
      return {
        isApproved: false,
        error: 'Datenbank nicht verfügbar',
        errorCode: 'DATABASE_NOT_AVAILABLE',
      };
    }

    if (!companyId) {
      return {
        isApproved: false,
        error: 'Firmen-ID ist erforderlich',
        errorCode: 'MISSING_COMPANY_ID',
      };
    }

    // Lade Firmendaten aus Firebase
    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      return {
        isApproved: false,
        error: 'Firma nicht gefunden',
        errorCode: 'COMPANY_NOT_FOUND',
      };
    }

    const companyData = companyDoc.data();

    // KRITISCH: Check für gesperrte Accounts (höchste Priorität)
    if (companyData?.accountSuspended === true) {
      return {
        isApproved: false,
        companyData,
        error:
          'Ihr Account wurde gesperrt. Kontaktieren Sie den Support für weitere Informationen.',
        errorCode: 'ACCOUNT_SUSPENDED',
      };
    }

    // Check für Legacy-Firmen (Grandfathering)
    // Firmen die vor der Implementierung existierten sind automatisch approved
    const createdAt = companyData?.createdAt?.toDate?.() || new Date();
    const approvalSystemImplementationDate = new Date('2025-08-30'); // Heute

    if (createdAt < approvalSystemImplementationDate) {
      // Legacy-Firma: Automatisch approved
      return {
        isApproved: true,
        companyData,
        errorCode: 'LEGACY_APPROVED',
      };
    }

    // Check für explizite Admin-Freigabe
    if (companyData?.adminApproved === true) {
      return {
        isApproved: true,
        companyData,
        errorCode: 'ADMIN_APPROVED',
      };
    }

    // Check für Approval-Status
    if (companyData?.approvalStatus === 'approved') {
      return {
        isApproved: true,
        companyData,
        errorCode: 'STATUS_APPROVED',
      };
    }

    // Nicht freigegeben
    return {
      isApproved: false,
      companyData,
      error: 'Firma noch nicht von Admin freigegeben. Bitte warten Sie auf die Freigabe.',
      errorCode: 'PENDING_ADMIN_APPROVAL',
    };
  } catch (error) {
    return {
      isApproved: false,
      error: 'Fehler bei der Überprüfung der Admin-Freigabe',
      errorCode: 'APPROVAL_CHECK_ERROR',
    };
  }
}

/**
 * Standard-Antwort für nicht freigegebene Firmen
 */
export function createApprovalErrorResponse(result: AdminApprovalResult, status: number = 403) {
  return {
    error: result.error || 'Firma nicht freigegeben',
    errorCode: result.errorCode,
    message: 'Diese Aktion erfordert eine Admin-Freigabe.',
    details: {
      companyId: result.companyData?.id,
      approvalStatus: result.companyData?.approvalStatus || 'pending',
      adminApproved: result.companyData?.adminApproved || false,
    },
    nextSteps: [
      'Vervollständigen Sie alle Onboarding-Schritte',
      'Laden Sie alle erforderlichen Dokumente hoch',
      'Warten Sie auf die Admin-Freigabe',
      'Kontaktieren Sie den Support bei Fragen',
    ],
  };
}

/**
 * Blockierte Aktionen für nicht freigegebene Firmen
 */
export const BLOCKED_ACTIONS = {
  // Quote/Angebot Operationen
  QUOTE_RESPOND: 'Angebote beantworten',
  QUOTE_CREATE: 'Angebote erstellen',
  QUOTE_ACCEPT_PAYMENT: 'Zahlungen für Angebote annehmen',

  // Auftrag Operationen
  ORDER_ACCEPT: 'Aufträge annehmen',
  ORDER_CREATE: 'Aufträge erstellen',
  ORDER_MANAGE: 'Aufträge verwalten',

  // Payment Operationen
  PAYOUT_REQUEST: 'Auszahlungen beantragen',
  PAYMENT_RECEIVE: 'Zahlungen empfangen',
  STRIPE_OPERATIONS: 'Stripe-Operationen',

  // Public Visibility
  PUBLIC_PROFILE: 'Öffentliches Profil',
  SEARCH_VISIBILITY: 'Sichtbarkeit in Suche',
  BOOKING_ACCEPTANCE: 'Buchungen annehmen',

  // Business Operationen
  CUSTOMER_COMMUNICATION: 'Kundenkommunikation',
  SERVICE_DELIVERY: 'Service-Erbringung',
  INVOICE_CREATION: 'Rechnungserstellung',
};

/**
 * Erlaubte Aktionen für nicht freigegebene Firmen
 */
export const ALLOWED_ACTIONS = {
  PROFILE_EDIT: 'Profil bearbeiten',
  SETTINGS_MANAGE: 'Einstellungen verwalten',
  DOCUMENTS_UPLOAD: 'Dokumente hochladen',
  ONBOARDING_COMPLETE: 'Onboarding abschließen',
  SUPPORT_CONTACT: 'Support kontaktieren',
  ACCOUNT_VIEW: 'Account anzeigen',
};
