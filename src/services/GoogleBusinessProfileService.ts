'use client';

import { db } from '@/firebase/clients';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

export interface GoogleBusinessLocation {
  id: string;
  name: string;
  languageCode?: string;
  storeCode?: string;
  address: {
    addressLines: string[];
    locality: string;
    administrativeArea?: string;
    postalCode: string;
    regionCode: string;
    languageCode?: string;
  };
  primaryPhone?: string;
  websiteUri?: string;
  regularHours?: any;
  specialHours?: any;
  serviceArea?: any;
  labels?: string[];
  categories?: {
    primaryCategory: {
      name: string;
      categoryId: string;
    };
    additionalCategories?: any[];
  };
  adWordsLocationExtensions?: any;
  latlng?: {
    latitude: number;
    longitude: number;
  };
  openInfo?: {
    status: 'OPEN' | 'CLOSED' | 'SPECIAL_HOURS';
    canReopen: boolean;
    openingDate?: string;
  };
  metadata?: {
    mapsUri: string;
    newReviewUri: string;
    duplicate: boolean;
    canDelete: boolean;
    canUpdate: boolean;
    canOperateHealthData: boolean;
    canModifyServiceList: boolean;
    canOperateLodgingData: boolean;
  };
  profile?: {
    description?: string;
  };
  relationshipData?: {
    parentChain?: string;
  };
  moreHours?: any[];
  serviceItems?: any[];
  verified?: boolean;
  verificationState?: 'VERIFIED' | 'UNVERIFIED' | 'VERIFICATION_REQUESTED' | 'PENDING_VERIFICATION';
}

export interface GoogleBusinessAccount {
  name: string;
  accountName: string;
  type: 'PERSONAL' | 'ORGANIZATION';
  state: {
    status: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED';
  };
  profilePhotoUrl?: string;
  accountNumber: string;
  permissionLevel: 'OWNER_LEVEL' | 'MEMBER_LEVEL';
  role: 'PRIMARY_OWNER' | 'OWNER' | 'MANAGER' | 'SITE_MANAGER';
}

export class GoogleBusinessProfileService {
  private static readonly GOOGLE_MY_BUSINESS_API_BASE =
    'https://mybusinessbusinessinformation.googleapis.com/v1';
  private static readonly GOOGLE_MY_BUSINESS_ACCOUNT_API =
    'https://mybusinessaccountmanagement.googleapis.com/v1';
  private static readonly GOOGLE_MY_BUSINESS_VERIFICATIONS_API =
    'https://mybusinessverifications.googleapis.com/v1';
  private static readonly BUSINESS_PROFILE_PERFORMANCE_API =
    'https://businessprofileperformance.googleapis.com/v1';

  /**
   * Initiiert den OAuth2 Flow für Google My Business API
   */
  static async initiateOAuthFlow(companyId: string): Promise<string> {
    try {
      const response = await fetch('/api/google-business/oauth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          scopes: [
            'https://www.googleapis.com/auth/business.manage',
            'https://www.googleapis.com/auth/plus.business.manage',
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get OAuth URL');
      }

      const data = await response.json();
      return data.authUrl;
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      throw error;
    }
  }

  /**
   * Verarbeitet den OAuth Callback und speichert die Tokens
   */
  static async handleOAuthCallback(companyId: string, code: string, state: string): Promise<void> {
    try {
      const response = await fetch('/api/google-business/oauth-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId, code, state }),
      });

      if (!response.ok) {
        throw new Error('Failed to handle OAuth callback');
      }

      const data = await response.json();

      // Tokens in Firestore speichern
      await setDoc(doc(db, 'companies', companyId, 'integrations', 'google-business'), {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: data.scope,
        connectedAt: new Date(),
        isConnected: true,
      });
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      throw error;
    }
  }

  /**
   * Überprüft ob Google Business Profile verbunden ist
   */
  static async isConnected(companyId: string): Promise<boolean> {
    try {
      const integrationDoc = await getDoc(
        doc(db, 'companies', companyId, 'integrations', 'google-business')
      );

      if (!integrationDoc.exists()) {
        return false;
      }

      const data = integrationDoc.data();
      const now = new Date();
      const expiresAt = data.expiresAt?.toDate();

      return data.isConnected && (!expiresAt || expiresAt > now);
    } catch (error) {
      console.error('Error checking connection status:', error);
      return false;
    }
  }

  /**
   * Holt einen gültigen Access Token (erneuert bei Bedarf)
   */
  private static async getValidAccessToken(companyId: string): Promise<string> {
    const integrationDoc = await getDoc(
      doc(db, 'companies', companyId, 'integrations', 'google-business')
    );

    if (!integrationDoc.exists()) {
      throw new Error('Google Business Profile not connected');
    }

    const data = integrationDoc.data();
    console.log('🔍 Integration data:', data);

    const now = new Date();
    const expiresAt = data.expires_at;

    // Token noch gültig (expires_at ist bereits ein Date-Objekt)
    if (expiresAt && expiresAt > now) {
      console.log('✅ Using existing valid token');
      return data.access_token;
    }

    // Token erneuern
    try {
      const response = await fetch('/api/google-business/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          refreshToken: data.refresh_token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const newTokenData = await response.json();

      // Neue Tokens speichern
      await updateDoc(doc(db, 'companies', companyId, 'integrations', 'google-business'), {
        access_token: newTokenData.access_token,
        expires_at: new Date(Date.now() + newTokenData.expires_in * 1000),
        updated_at: new Date(),
      });

      return newTokenData.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Lädt alle Google Business Accounts für das Unternehmen
   */
  static async getBusinessAccounts(companyId: string): Promise<GoogleBusinessAccount[]> {
    try {
      console.log('🔑 Getting access token for company:', companyId);
      const accessToken = await this.getValidAccessToken(companyId);

      console.log('📞 Calling Google My Business API...');
      const response = await fetch(`${this.GOOGLE_MY_BUSINESS_ACCOUNT_API}/accounts`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(
          `Failed to fetch business accounts: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log('📦 Raw API Response:', data);

      const accounts = data.accounts || [];
      console.log('✅ Parsed accounts:', accounts);

      return accounts;
    } catch (error) {
      console.error('❌ Error fetching business accounts:', error);
      throw error;
    }
  }

  /**
   * Lädt alle Standorte für einen Business Account
   */
  static async getBusinessLocations(
    companyId: string,
    accountName: string
  ): Promise<GoogleBusinessLocation[]> {
    try {
      const accessToken = await this.getValidAccessToken(companyId);

      const response = await fetch(`${this.GOOGLE_MY_BUSINESS_API_BASE}/${accountName}/locations`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch business locations: ${response.statusText}`);
      }

      const data = await response.json();
      return data.locations || [];
    } catch (error) {
      console.error('Error fetching business locations:', error);
      throw error;
    }
  }

  /**
   * Speichert ausgewählte Standorte für die Kampagne
   */
  static async saveSelectedLocations(
    companyId: string,
    campaignId: string,
    locationIds: string[]
  ): Promise<void> {
    try {
      await setDoc(
        doc(db, 'companies', companyId, 'campaigns', campaignId),
        {
          googleBusinessLocations: locationIds,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving selected locations:', error);
      throw error;
    }
  }

  /**
   * Trennt die Google Business Profile Verbindung
   */
  static async disconnect(companyId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'companies', companyId, 'integrations', 'google-business'), {
        isConnected: false,
        disconnectedAt: new Date(),
      });
    } catch (error) {
      console.error('Error disconnecting Google Business Profile:', error);
      throw error;
    }
  }

  /**
   * Holt gespeicherte Verbindungsinformationen
   */
  static async getConnectionInfo(companyId: string): Promise<any> {
    try {
      const integrationDoc = await getDoc(
        doc(db, 'companies', companyId, 'integrations', 'google-business')
      );

      if (!integrationDoc.exists()) {
        return null;
      }

      const data = integrationDoc.data();
      return {
        isConnected: data.isConnected,
        connectedAt: data.connectedAt?.toDate(),
        scope: data.scope,
        // Keine sensiblen Daten zurückgeben
      };
    } catch (error) {
      console.error('Error fetching connection info:', error);
      return null;
    }
  }
}
