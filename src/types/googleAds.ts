// ✅ PHASE 1: Google Ads TypeScript Types
// Umfassende Typen-Definitionen für Google Ads API Integration

export interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  customerId: string;
  managerAccount?: boolean;
  testAccount: boolean;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'SUSPENDED';
  linked: boolean;
  linkedAt?: Date;
  accessLevel: 'READ_ONLY' | 'STANDARD' | 'ADMIN';
}

export interface GoogleAdsOAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  tokenExpiry?: Date;
  developerToken: string;
  managerCustomerId?: string;
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost: number; // in micros
  conversions: number;
  conversionValue: number;
  costPerClick: number;
  clickThroughRate: number;
  conversionRate: number;
  returnOnAdSpend: number;
  costPerConversion: number;
  averagePosition?: number;
  searchImpressionShare?: number;
  qualityScore?: number;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  advertisingChannelType:
    | 'SEARCH'
    | 'DISPLAY'
    | 'SHOPPING'
    | 'VIDEO'
    | 'LOCAL'
    | 'SMART'
    | 'PERFORMANCE_MAX';
  budget: {
    id: string;
    name: string;
    amountMicros: number;
    deliveryMethod: 'STANDARD' | 'ACCELERATED';
    totalAmountMicros?: number;
    period?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  };
  biddingStrategy: {
    type:
      | 'MANUAL_CPC'
      | 'ENHANCED_CPC'
      | 'TARGET_CPA'
      | 'TARGET_ROAS'
      | 'MAXIMIZE_CLICKS'
      | 'MAXIMIZE_CONVERSIONS';
    targetCpaMicros?: number;
    targetRoas?: number;
  };
  startDate: string;
  endDate?: string;
  metrics: GoogleAdsMetrics;
  geoTargets?: string[];
  languageTargets?: string[];
  deviceTargets?: ('DESKTOP' | 'MOBILE' | 'TABLET')[];
}

export interface GoogleAdsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    nextPageToken?: string;
    totalResults?: number;
  };
}

export interface GoogleAdsTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

export interface GoogleAdsCustomerResponse {
  customers: GoogleAdsAccount[];
}

export interface GoogleAdsCampaignResponse {
  campaigns: GoogleAdsCampaign[];
}

export interface GoogleAdsError {
  type: 'AUTHENTICATION' | 'QUOTA_EXCEEDED' | 'INVALID_REQUEST' | 'SERVER_ERROR' | 'NETWORK_ERROR';
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

export type GoogleAdsServiceStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'SYNCING'
  | 'SETUP_REQUIRED';

export interface GoogleAdsConnectionStatus {
  status: GoogleAdsServiceStatus;
  lastSync?: Date;
  error?: GoogleAdsError;
  accountsConnected: number;
  accounts?: GoogleAdsAccount[];
  quotaUsage: {
    daily: {
      used: number;
      limit: number;
    };
    monthly: {
      used: number;
      limit: number;
    };
  };
}

// Taskilo-specific Integration Types
export interface TaskiloGoogleAdsIntegration {
  companyId: string;
  accountConfig: GoogleAdsOAuthConfig;
  linkedAccounts: GoogleAdsAccount[];
  lastSync: Date;
  syncFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
  billingIntegration: {
    stripeEnabled: boolean;
    datevEnabled: boolean;
    autoInvoicing: boolean;
    costCenterMapping: Record<string, string>;
  };
}
