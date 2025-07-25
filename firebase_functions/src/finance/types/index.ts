// firebase_functions/src/finance/types/index.ts

// Re-export aller Finance-Types für einfache Imports

// Invoice Types
export * from './invoice.types';

// Customer Types  
export * from './customer.types';

// Expense Types
export * from './expense.types';

// Payment Types (expliziter Re-export um PaymentMethod Konflikt zu vermeiden)
export {
  PaymentStatus,
  PaymentType,
  PaymentMethod as PaymentPaymentMethod,
  PaymentBankDetails,
  PaymentGatewayData,
  PaymentReconciliation,
  PaymentData,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  ProcessPaymentRequest,
  PaymentSearchFilters,
  PaymentListResponse,
  PaymentStatistics
} from './payment.types';

// Sync Types
export * from './sync.types';

// Extended features
export * from './banking.types';
export * from './recurring.types';
export * from './email.types';
export * from './document.types';
export * from './reporting.types';

// Gemeinsame Base Types
export interface BaseEntity {
  id: string;
  companyId: string;
  createdAt: import('firebase-admin/firestore').Timestamp;
  updatedAt: import('firebase-admin/firestore').Timestamp;
  createdBy: string;
  lastModifiedBy: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BaseListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Error Types
export interface FinanceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: import('firebase-admin/firestore').Timestamp;
}

export interface ValidationError extends FinanceError {
  field: string;
  value: any;
  constraint: string;
}

// Audit Trail
export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  userId: string;
  timestamp: import('firebase-admin/firestore').Timestamp;
  metadata?: Record<string, any>;
}

// Berechtigungen
export type FinancePermission = 
  | 'FINANCE_READ'           // Lesen
  | 'FINANCE_WRITE'          // Schreiben
  | 'FINANCE_DELETE'         // Löschen
  | 'FINANCE_APPROVE'        // Freigeben
  | 'FINANCE_ADMIN'          // Administration
  | 'INVOICE_CREATE'         // Rechnungen erstellen
  | 'INVOICE_SEND'           // Rechnungen versenden
  | 'EXPENSE_APPROVE'        // Ausgaben freigeben
  | 'PAYMENT_PROCESS'        // Zahlungen verarbeiten
  | 'SYNC_MANAGE';           // Synchronisation verwalten

export interface UserPermissions {
  userId: string;
  companyId: string;
  permissions: FinancePermission[];
  restrictions?: {
    maxInvoiceAmount?: number;  // Maximaler Rechnungsbetrag
    maxExpenseAmount?: number;  // Maximaler Ausgabenbetrag
    approvalRequired?: boolean; // Freigabe erforderlich
    departments?: string[];     // Abteilungs-Einschränkungen
  };
}
