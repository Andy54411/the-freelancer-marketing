/**
 * DATEV API Client
 * Provides access to all DATEV sandbox APIs based on official documentation
 * APIs: cashregister:import, master-data:master-clients, accounting:extf-files,
 *       accounting:dxso-jobs, accounting:documents
 * Enhanced with multi-source authentication (cookies, Firestore, etc.)
 */

import { getDatevConfig } from './datev-config';
import { DatevTokenManager } from '@/lib/datev-token-manager';
import { db } from '@/firebase/server';

export interface DatevApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface DatevTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class DatevApiClient {
  private config;
  private accessToken: string | null = null;

  constructor() {
    this.config = getDatevConfig();
  }

  /**
   * Get authentication header with fallback to multiple token sources
   */
  static async getAuthHeader(request: Request, companyId?: string): Promise<string | null> {
    // Try cookie-based token first
    let authHeader = DatevTokenManager.getServerAuthHeader(request);

    if (authHeader) {
      return authHeader;
    }

    // Try to extract company ID from URL if not provided
    if (!companyId) {
      const url = new URL(request.url);
      companyId =
        url.searchParams.get('companyId') ||
        request.headers.get('x-company-id') ||
        url.pathname.split('/').find((segment, index, array) => array[index - 1] === 'company');
    }

    // If we have a company ID, try Firestore
    if (companyId) {
      try {
        const tokenDoc = await db
          .collection('users')
          .doc(companyId)
          .collection('datev')
          .doc('tokens')
          .get();

        if (tokenDoc.exists) {
          const tokenData = tokenDoc.data();
          const expiresAt = tokenData?.expires_at?.toDate?.() || new Date(tokenData?.expires_at);

          // Check if token is still valid (with 5-minute buffer)
          if (expiresAt && expiresAt.getTime() > Date.now() + 300000 && tokenData) {
            authHeader = `${tokenData.token_type || 'Bearer'} ${tokenData.access_token}`;

            return authHeader;
          } else {
          }
        }
      } catch (firestoreError) {}
    }

    return null;
  }

  /**
   * Make authenticated API call to DATEV
   */
  static async makeApiCall(
    endpoint: string,
    options: RequestInit,
    request: Request,
    companyId?: string
  ): Promise<Response> {
    const authHeader = await this.getAuthHeader(request, companyId);

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'DATEV authentication required - please re-authenticate',
          requiresAuth: true,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Merge auth header with existing headers
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
      Authorization: authHeader,
    };

    return fetch(endpoint, {
      ...options,
      headers,
    });
  }

  /**
   * Set access token for API calls
   */
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Make authenticated request to DATEV API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<DatevApiResponse<T>> {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'no_access_token',
        message: 'Access token is required for DATEV API calls',
      };
    }

    try {
      const url = `${this.config.apiBaseUrl}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'api_error',
          message: data.error_description || `API request failed with status ${response.status}`,
          status: response.status,
          data,
        };
      }

      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: 'network_error',
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get user profile information
   */
  async getUserInfo(): Promise<DatevApiResponse> {
    return this.makeRequest('/userinfo');
  }

  /**
   * Cashregister Import API v2.6.0
   * Import cash register data into DATEV
   */
  async importCashRegisterData(data: any): Promise<DatevApiResponse> {
    return this.makeRequest('/cashregister/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get available cashregister import formats
   */
  async getCashRegisterFormats(): Promise<DatevApiResponse> {
    return this.makeRequest('/cashregister/import/formats');
  }

  /**
   * Master Data: Master Clients API v3
   * Manage client master data
   */
  async getMasterClients(filters?: any): Promise<DatevApiResponse> {
    const queryParams = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return this.makeRequest(`/master-data/master-clients${queryParams}`);
  }

  /**
   * Create new master client
   */
  async createMasterClient(clientData: any): Promise<DatevApiResponse> {
    return this.makeRequest('/master-data/master-clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  /**
   * Update master client
   */
  async updateMasterClient(clientId: string, clientData: any): Promise<DatevApiResponse> {
    return this.makeRequest(`/master-data/master-clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  }

  /**
   * Get specific master client
   */
  async getMasterClient(clientId: string): Promise<DatevApiResponse> {
    return this.makeRequest(`/master-data/master-clients/${clientId}`);
  }

  /**
   * Accounting: EXTF Files API v2.0
   * Handle DATEV EXTF (export/import) files
   */
  async getExtfFiles(filters?: any): Promise<DatevApiResponse> {
    const queryParams = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return this.makeRequest(`/accounting/extf-files${queryParams}`);
  }

  /**
   * Upload EXTF file
   */
  async uploadExtfFile(fileData: FormData): Promise<DatevApiResponse> {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'no_access_token',
        message: 'Access token is required',
      };
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/accounting/extf-files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: fileData,
      });

      const data = await response.json();

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: 'upload_error',
        message: `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get specific EXTF file
   */
  async getExtfFile(fileId: string): Promise<DatevApiResponse> {
    return this.makeRequest(`/accounting/extf-files/${fileId}`);
  }

  /**
   * Accounting: DXSO Jobs API v2.0
   * Manage DATEV export/import jobs
   */
  async getDxsoJobs(filters?: any): Promise<DatevApiResponse> {
    const queryParams = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return this.makeRequest(`/accounting/dxso-jobs${queryParams}`);
  }

  /**
   * Create new DXSO job
   */
  async createDxsoJob(jobData: any): Promise<DatevApiResponse> {
    return this.makeRequest('/accounting/dxso-jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  /**
   * Get specific DXSO job status
   */
  async getDxsoJob(jobId: string): Promise<DatevApiResponse> {
    return this.makeRequest(`/accounting/dxso-jobs/${jobId}`);
  }

  /**
   * Cancel DXSO job
   */
  async cancelDxsoJob(jobId: string): Promise<DatevApiResponse> {
    return this.makeRequest(`/accounting/dxso-jobs/${jobId}/cancel`, {
      method: 'POST',
    });
  }

  /**
   * Accounting: Documents API v2.0
   * Manage accounting documents
   */
  async getDocuments(filters?: any): Promise<DatevApiResponse> {
    const queryParams = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return this.makeRequest(`/accounting/documents${queryParams}`);
  }

  /**
   * Upload accounting document
   */
  async uploadDocument(documentData: FormData): Promise<DatevApiResponse> {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'no_access_token',
        message: 'Access token is required',
      };
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/accounting/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: documentData,
      });

      const data = await response.json();

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: 'upload_error',
        message: `Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get specific document
   */
  async getDocument(documentId: string): Promise<DatevApiResponse> {
    return this.makeRequest(`/accounting/documents/${documentId}`);
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId: string, metadata: any): Promise<DatevApiResponse> {
    return this.makeRequest(`/accounting/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify(metadata),
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<DatevApiResponse> {
    return this.makeRequest(`/accounting/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Revoke access token
   */
  async revokeToken(): Promise<DatevApiResponse> {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'no_access_token',
        message: 'No access token to revoke',
      };
    }

    try {
      const response = await fetch(this.config.revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: new URLSearchParams({
          token: this.accessToken,
          token_type_hint: 'access_token',
        }),
      });

      return {
        success: response.ok,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: 'revoke_error',
        message: `Token revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Create new DATEV API client instance
 */
export function createDatevApiClient(accessToken?: string): DatevApiClient {
  const client = new DatevApiClient();
  if (accessToken) {
    client.setAccessToken(accessToken);
  }
  return client;
}
