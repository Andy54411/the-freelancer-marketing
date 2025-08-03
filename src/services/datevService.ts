/**
 * DATEV Service - Produktionsreife Integration
 * Direkte API-Calls an DATEV für Buchhaltung, Dokumente und Steuerberater-Integration
 */

import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';
import { DatevTokenManager } from '@/lib/datev-token-manager';

// DATEV API Response Types
export interface DatevOrganization {
  id: string;
  name: string;
  type: 'client' | 'consultant';
  address: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  taxNumber?: string;
  vatId?: string;
  status: 'active' | 'inactive';
  consultantId?: string;
}

export interface DatevAccount {
  id: string;
  number: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface DatevTransaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  accountNumber: string;
  contraAccountNumber: string;
  vatCode?: string;
  vatAmount?: number;
  documentId?: string;
  status: 'draft' | 'posted' | 'reversed';
}

export interface DatevDocument {
  id: string;
  type: 'invoice' | 'receipt' | 'contract' | 'report';
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadDate: string;
  description?: string;
  transactionIds: string[];
  organizationId: string;
  downloadUrl: string;
}

export interface DatevExportJob {
  id: string;
  type: 'MOVEMENTS' | 'ACCOUNTS' | 'CUSTOMERS' | 'VENDORS';
  format: 'DATEV_ASCII' | 'DATEV_XML' | 'CSV';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  dateFrom: string;
  dateTo: string;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export class DatevService {
  private static baseUrl = getDatevConfig().baseUrl;

  /**
   * Make authenticated API call to DATEV
   */
  private static async makeApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Ensure token is valid
    const isAuthenticated = await DatevTokenManager.refreshTokenIfNeeded();
    if (!isAuthenticated) {
      throw new Error('DATEV authentication required');
    }

    const authHeader = DatevTokenManager.getAuthHeader();
    if (!authHeader) {
      throw new Error('No DATEV access token available');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DATEV API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get user organizations (including consultant info)
   */
  static async getOrganizations(): Promise<DatevOrganization[]> {
    try {
      const data = await this.makeApiCall<{ organizations: DatevOrganization[] }>(
        DATEV_ENDPOINTS.organizations
      );
      return data.organizations || [];
    } catch (error) {
      console.error('Error fetching DATEV organizations:', error);
      throw error;
    }
  }

  /**
   * Get current organization details
   */
  static async getCurrentOrganization(): Promise<DatevOrganization | null> {
    try {
      const orgId = DatevTokenManager.getCurrentOrganizationId();
      if (!orgId) return null;

      const organizations = await this.getOrganizations();
      return organizations.find(org => org.id === orgId) || null;
    } catch (error) {
      console.error('Error fetching current organization:', error);
      return null;
    }
  }

  /**
   * Get chart of accounts
   */
  static async getAccounts(organizationId?: string): Promise<DatevAccount[]> {
    try {
      const orgId = organizationId || DatevTokenManager.getCurrentOrganizationId();
      if (!orgId) throw new Error('No organization ID available');

      const data = await this.makeApiCall<{ accounts: DatevAccount[] }>(
        `${DATEV_ENDPOINTS.accounts}?organizationId=${orgId}`
      );
      return data.accounts || [];
    } catch (error) {
      console.error('Error fetching DATEV accounts:', error);
      throw error;
    }
  }

  /**
   * Get transactions for date range
   */
  static async getTransactions(
    dateFrom: string,
    dateTo: string,
    organizationId?: string
  ): Promise<DatevTransaction[]> {
    try {
      const orgId = organizationId || DatevTokenManager.getCurrentOrganizationId();
      if (!orgId) throw new Error('No organization ID available');

      const params = new URLSearchParams({
        organizationId: orgId,
        dateFrom,
        dateTo,
        limit: '1000',
      });

      const data = await this.makeApiCall<{ transactions: DatevTransaction[] }>(
        `${DATEV_ENDPOINTS.transactions}?${params}`
      );
      return data.transactions || [];
    } catch (error) {
      console.error('Error fetching DATEV transactions:', error);
      throw error;
    }
  }

  /**
   * Create new transaction
   */
  static async createTransaction(
    transaction: Omit<DatevTransaction, 'id' | 'status'>,
    organizationId?: string
  ): Promise<DatevTransaction> {
    try {
      const orgId = organizationId || DatevTokenManager.getCurrentOrganizationId();
      if (!orgId) throw new Error('No organization ID available');

      const data = await this.makeApiCall<DatevTransaction>(DATEV_ENDPOINTS.transactions, {
        method: 'POST',
        body: JSON.stringify({
          ...transaction,
          organizationId: orgId,
        }),
      });
      return data;
    } catch (error) {
      console.error('Error creating DATEV transaction:', error);
      throw error;
    }
  }

  /**
   * Upload document
   */
  static async uploadDocument(
    file: File,
    description?: string,
    organizationId?: string
  ): Promise<DatevDocument> {
    try {
      const orgId = organizationId || DatevTokenManager.getCurrentOrganizationId();
      if (!orgId) throw new Error('No organization ID available');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', orgId);
      if (description) {
        formData.append('description', description);
      }

      const authHeader = DatevTokenManager.getAuthHeader();
      if (!authHeader) {
        throw new Error('No DATEV access token available');
      }

      const response = await fetch(`${this.baseUrl}${DATEV_ENDPOINTS.documents}`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Document upload failed (${response.status}): ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error uploading document to DATEV:', error);
      throw error;
    }
  }

  /**
   * Get documents
   */
  static async getDocuments(organizationId?: string): Promise<DatevDocument[]> {
    try {
      const orgId = organizationId || DatevTokenManager.getCurrentOrganizationId();
      if (!orgId) throw new Error('No organization ID available');

      const data = await this.makeApiCall<{ documents: DatevDocument[] }>(
        `${DATEV_ENDPOINTS.documents}?organizationId=${orgId}`
      );
      return data.documents || [];
    } catch (error) {
      console.error('Error fetching DATEV documents:', error);
      throw error;
    }
  }

  /**
   * Create DATEV export job
   */
  static async createExportJob(
    type: 'MOVEMENTS' | 'ACCOUNTS' | 'CUSTOMERS' | 'VENDORS',
    format: 'DATEV_ASCII' | 'DATEV_XML' | 'CSV',
    dateFrom: string,
    dateTo: string,
    organizationId?: string
  ): Promise<DatevExportJob> {
    try {
      const orgId = organizationId || DatevTokenManager.getCurrentOrganizationId();
      if (!orgId) throw new Error('No organization ID available');

      const data = await this.makeApiCall<DatevExportJob>(DATEV_ENDPOINTS.export, {
        method: 'POST',
        body: JSON.stringify({
          type,
          format,
          dateFrom,
          dateTo,
          organizationId: orgId,
        }),
      });
      return data;
    } catch (error) {
      console.error('Error creating DATEV export job:', error);
      throw error;
    }
  }

  /**
   * Get export job status
   */
  static async getExportJob(jobId: string): Promise<DatevExportJob> {
    try {
      const data = await this.makeApiCall<DatevExportJob>(`${DATEV_ENDPOINTS.export}/${jobId}`);
      return data;
    } catch (error) {
      console.error('Error fetching DATEV export job:', error);
      throw error;
    }
  }

  /**
   * Import Taskilo invoice to DATEV
   */
  static async importInvoiceToDatev(
    invoice: {
      id: string;
      invoiceNumber: string;
      date: string;
      dueDate: string;
      customerName: string;
      amount: number;
      vatAmount: number;
      description: string;
    },
    organizationId?: string
  ): Promise<DatevTransaction> {
    try {
      // Convert Taskilo invoice to DATEV transaction
      const transaction = {
        date: invoice.date,
        amount: invoice.amount,
        currency: 'EUR',
        description: `Rechnung ${invoice.invoiceNumber} - ${invoice.customerName}`,
        reference: invoice.invoiceNumber,
        accountNumber: '8400', // Standard revenue account
        contraAccountNumber: '1200', // Standard receivables account
        vatCode: '1', // Standard VAT code for 19%
        vatAmount: invoice.vatAmount,
      };

      return await this.createTransaction(transaction, organizationId);
    } catch (error) {
      console.error('Error importing invoice to DATEV:', error);
      throw error;
    }
  }

  /**
   * Sync Taskilo payments with DATEV
   */
  static async syncPaymentToDatev(
    payment: {
      id: string;
      amount: number;
      date: string;
      reference: string;
      invoiceId: string;
    },
    organizationId?: string
  ): Promise<DatevTransaction> {
    try {
      const transaction = {
        date: payment.date,
        amount: payment.amount,
        currency: 'EUR',
        description: `Zahlung ${payment.reference}`,
        reference: payment.id,
        accountNumber: '1200', // Receivables account
        contraAccountNumber: '1000', // Bank account
        documentId: payment.invoiceId,
      };

      return await this.createTransaction(transaction, organizationId);
    } catch (error) {
      console.error('Error syncing payment to DATEV:', error);
      throw error;
    }
  }

  /**
   * Get authentication status
   */
  static isAuthenticated(): boolean {
    return DatevTokenManager.isUserAuthenticated();
  }

  /**
   * Clear authentication
   */
  static logout(): void {
    DatevTokenManager.clearUserToken();
  }
}
