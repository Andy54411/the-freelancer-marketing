/**
 * DATEV Service - Produktionsreife Integration
 * Client-side service für DATEV-Integration
 * Server-side Funktionen sind in /lib/datev-server-utils.ts und API-Routen
 */

import { getDatevConfig, DATEV_ENDPOINTS, validateDatevConfig } from '@/lib/datev-config';
import { DatevTokenManager } from '@/lib/datev-token-manager';

// DATEV Sandbox URLs (unterschiedlich von Production!)
const DATEV_API_BASE =
  process.env.NODE_ENV === 'production' ? 'https://api.datev.de' : 'https://sandbox-api.datev.de';
const DATEV_AUTH_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://login.datev.de'
    : 'https://sandbox-login.datev.de';

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
  /**
   * Make API call to our backend API routes (bypasses CORS)
   * INCLUDES Firebase Authorization header for token authentication
   */
  private static async makeBackendApiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // Get Firebase Auth token for backend authentication
      let authToken: string | null = null;
      try {
        // Try to get Firebase Auth instance
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();

        if (auth.currentUser) {
          authToken = await auth.currentUser.getIdToken();
          console.log('🔑 [DATEV Service] Firebase auth token obtained for API call');
        } else {
          console.warn('⚠️ [DATEV Service] No authenticated Firebase user found');
        }
      } catch (authError) {
        console.error('❌ [DATEV Service] Failed to get Firebase auth token:', authError);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      // Add Authorization header if we have an auth token
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔑 [DATEV Service] Adding Authorization header to request');
      } else {
        console.warn('⚠️ [DATEV Service] Making request without Authorization header');
      }

      const response = await fetch(`/api/datev${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;

        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        // Handle specific DATEV backend errors
        if (response.status === 401) {
          throw new Error('DATEV authentication required - please re-authenticate');
        }

        if (response.status === 403) {
          throw new Error(
            `DATEV API access denied: ${errorData.error || 'Insufficient permissions'}`
          );
        }

        if (response.status === 429) {
          throw new Error('DATEV API rate limit exceeded - please try again later');
        }

        if (response.status >= 500) {
          throw new Error(
            `DATEV API server error (${response.status}): ${errorData.error || 'Internal server error'}`
          );
        }

        // General error with more context
        throw new Error(
          `DATEV API error (${response.status}): ${errorData.error || errorData.message || errorText}`
        );
      }

      const responseText = await response.text();
      if (!responseText.trim()) {
        return {} as T; // Return empty object for empty responses
      }

      return JSON.parse(responseText);
    } catch (error) {
      if (error instanceof Error) {
        console.error('DATEV backend API call failed:', {
          endpoint,
          error: error.message,
        });
        throw error;
      }

      throw new Error(`Unexpected error during DATEV API call: ${String(error)}`);
    }
  }

  /**
   * Get user organizations (including consultant info)
   */
  static async getOrganizations(): Promise<DatevOrganization[]> {
    try {
      const data = await this.makeBackendApiCall<{ organizations: DatevOrganization[] }>(
        '/organizations'
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
   * Get client accounts/data
   */
  static async getAccounts(): Promise<DatevAccount[]> {
    try {
      const data = await this.makeBackendApiCall<{ clients: any[] }>('/accounts');

      // Transform DATEV clients data to our Account interface
      const accounts: DatevAccount[] = (data.clients || []).map((client: any) => ({
        id: client.id || client.clientId,
        number: client.number || client.clientNumber,
        name: client.name || client.companyName,
        type: 'asset', // Default type, should be determined from client data
        balance: 0, // Not available in clients endpoint
        currency: 'EUR',
        isActive: client.status === 'active' || true,
      }));

      return accounts;
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
      // Note: This would need a dedicated backend route for transactions
      console.warn('getTransactions not yet implemented with backend routing');
      return [];
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
      // Note: This would need a dedicated backend route for transactions
      console.warn('createTransaction not yet implemented with backend routing');
      throw new Error('createTransaction not yet implemented');
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
      // Note: This would need a dedicated backend route for document upload
      console.warn('uploadDocument not yet implemented with backend routing');
      throw new Error('uploadDocument not yet implemented');
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
      // Note: This would need a dedicated backend route for documents
      console.warn('getDocuments not yet implemented with backend routing');
      return [];
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
      // Note: This would need a dedicated backend route for export jobs
      console.warn('createExportJob not yet implemented with backend routing');
      throw new Error('createExportJob not yet implemented');
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
      // Note: This would need a dedicated backend route for export jobs
      console.warn('getExportJob not yet implemented with backend routing');
      throw new Error('getExportJob not yet implemented');
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
      // Note: This requires createTransaction to be implemented
      console.warn('importInvoiceToDatev not yet fully implemented');
      throw new Error('importInvoiceToDatev requires transaction creation');
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
      // Note: This requires createTransaction to be implemented
      console.warn('syncPaymentToDatev not yet fully implemented');
      throw new Error('syncPaymentToDatev requires transaction creation');
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
