// ✅ ERWEITERTE WHITE-LABEL GOOGLE ADS TYPES
// Umfassende Typen für vollständige Google Ads White-Label Integration

export interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'SUSPENDED' | 'UNKNOWN' | 'CANCELED';
  manager: boolean;
  testAccount: boolean;
  level?: number;
  linked?: boolean;
  linkedAt?: Date;
  accessLevel?: 'READ_ONLY' | 'STANDARD' | 'ADMIN';
  // 🎯 ERWEITERTE WHITE-LABEL FELDER
  descriptiveName?: string;
  finalUrlSuffix?: string;
  trackingUrlTemplate?: string;
  autoTaggingEnabled?: boolean;
  payPerConversionEligibilityFailureReasons?: string[];
  conversionTrackingId?: string;
  remarketing?: {
    googleAdsConversionCustomer?: string;
    googleAnalyticsProperty?: string;
  };
}

export interface GoogleAdsOAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  accessToken?: string;
  tokenExpiry?: Date;
  developerToken: string;
  managerCustomerId?: string;
  customerId?: string;
  // 🎯 ERWEITERTE SCOPES für White-Label
  scopes?: string[];
  userEmail?: string;
  userProfile?: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
  // Legacy für Backward Compatibility
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  developer_token?: string;
}

// 🎯 WHITE-LABEL KEYWORD MANAGEMENT
export interface TaskiloKeyword {
  id: string;
  text: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  cpc?: number;
  finalUrl?: string;
  adGroupId: string;
  campaignId: string;
  metrics: GoogleAdsMetrics;
  qualityScore?: number;
  firstPageCpc?: number;
  topOfPageCpc?: number;
  searchVolume?: number;
  competition?: 'LOW' | 'MEDIUM' | 'HIGH';
}

// 🎯 WHITE-LABEL AD GROUP MANAGEMENT
export interface TaskiloAdGroup {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  campaignId: string;
  type: 'SEARCH_STANDARD' | 'DISPLAY_STANDARD' | 'SHOPPING_PRODUCT_ADS' | 'VIDEO_TRUE_VIEW';
  cpcBid?: number;
  cpaBid?: number;
  targetCpm?: number;
  metrics: GoogleAdsMetrics;
  keywords: TaskiloKeyword[];
  ads: TaskiloAd[];
}

// 🎯 WHITE-LABEL AD MANAGEMENT
export interface TaskiloAd {
  id: string;
  adGroupId: string;
  campaignId: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  type: 'TEXT_AD' | 'EXPANDED_TEXT_AD' | 'RESPONSIVE_SEARCH_AD' | 'IMAGE_AD' | 'VIDEO_AD';
  finalUrls: string[];
  displayUrl?: string;
  headlines: string[];
  descriptions: string[];
  path1?: string;
  path2?: string;
  images?: {
    asset: string;
    width: number;
    height: number;
  }[];
  metrics: GoogleAdsMetrics;
  strength?: 'POOR' | 'AVERAGE' | 'GOOD' | 'EXCELLENT';
  responsiveSearchAd?: {
    headlines: { text: string; pinned_field?: string }[];
    descriptions: { text: string; pinned_field?: string }[];
  };
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost: number; // in whole currency units (not micros)
  conversions: number;
  conversionValue: number;
  ctr: number; // click-through rate as percentage
  cpc: number; // cost per click in currency units
  cpa: number; // cost per acquisition in currency units
  roas: number; // return on ad spend
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  // Legacy fields for backward compatibility
  costPerClick?: number;
  clickThroughRate?: number;
  conversionRate?: number;
  returnOnAdSpend?: number;
  costPerConversion?: number;
  averagePosition?: number;
  searchImpressionShare?: number;
  qualityScore?: number;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'UNKNOWN';
  type: string; // advertising_channel_type
  startDate: string;
  endDate?: string;
  budget: {
    amount: number; // in currency units
    currency: string;
    deliveryMethod: string;
    budgetId?: string;
    totalAmount?: number;
    period?: 'DAILY' | 'CUSTOM';
  };
  metrics: GoogleAdsMetrics;
  // 🎯 ERWEITERTE KAMPAGNEN-FEATURES für White-Label
  adGroups?: TaskiloAdGroup[];
  advertisingChannelType:
    | 'SEARCH'
    | 'DISPLAY'
    | 'SHOPPING'
    | 'VIDEO'
    | 'LOCAL'
    | 'SMART'
    | 'PERFORMANCE_MAX';
  biddingStrategy: {
    type:
      | 'MANUAL_CPC'
      | 'ENHANCED_CPC'
      | 'TARGET_CPA'
      | 'TARGET_ROAS'
      | 'MAXIMIZE_CLICKS'
      | 'MAXIMIZE_CONVERSIONS'
      | 'TARGET_IMPRESSION_SHARE'
      | 'TARGET_CPM';
    targetCpaMicros?: number;
    targetRoas?: number;
    targetImpressionShare?: number;
    targetCpmMicros?: number;
  };
  geoTargets: string[];
  languageTargets: string[];
  deviceTargets: ('DESKTOP' | 'MOBILE' | 'TABLET')[];
  // Targeting Optionen
  locationTargeting?: {
    included: string[];
    excluded: string[];
    radiusTargeting?: {
      latitude: number;
      longitude: number;
      radiusKm: number;
    }[];
  };
  demographicTargeting?: {
    ageRanges?: string[];
    genders?: string[];
    parentalStatus?: string[];
    householdIncome?: string[];
  };
  keywordThemes?: string[];
  negativeKeywords?: string[];
  // Performance Max specific
  assetGroups?: {
    id: string;
    name: string;
    headlines: string[];
    descriptions: string[];
    images: string[];
    videos?: string[];
    finalUrl: string;
  }[];
}

// 🎯 WHITE-LABEL BUDGET MANAGEMENT
export interface TaskiloBudget {
  id: string;
  name: string;
  amount: number;
  currency: string;
  deliveryMethod: 'STANDARD' | 'ACCELERATED';
  period: 'DAILY' | 'MONTHLY' | 'TOTAL';
  status: 'ENABLED' | 'REMOVED';
  totalAmount?: number;
  sharedBudgets?: string[];
  campaigns: string[]; // Campaign IDs using this budget
}

// 🎯 WHITE-LABEL AUDIENCE MANAGEMENT
export interface TaskiloAudience {
  id: string;
  name: string;
  type: 'CUSTOM' | 'AFFINITY' | 'IN_MARKET' | 'SIMILAR' | 'REMARKETING';
  size?: number;
  description?: string;
  membershipDurationDays?: number;
  rules?: {
    url?: string;
    parameter?: string;
    operator?: string;
    value?: string;
  }[];
}

export interface GoogleAdsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    isProductionAccount?: boolean; // Flag für Production Account Fehler
  };
  pagination?: {
    nextPageToken?: string;
    totalResults?: number;
  };
}

/**
 * ✅ PHASE 2: Campaign Response Type
 */
export interface GoogleAdsCampaignResponse {
  campaigns: GoogleAdsCampaign[];
  totalCampaigns: number;
  customerId: string;
  // Legacy fields
  totalCount?: number;
  hasMore?: boolean;
  nextPageToken?: string;
}

/**
 * 🚀 PHASE 2: Campaign Creation Request
 */
export interface CreateCampaignRequest {
  name: string;
  budgetAmountMicros: number;
  advertisingChannelType: string;
  biddingStrategyType: string;
  startDate?: string;
  endDate?: string;
  geoTargets?: string[];
  languageTargets?: string[];
  deviceTargets?: ('DESKTOP' | 'MOBILE' | 'TABLET')[];
}

/**
 * 🚀 PHASE 2: Campaign Update Request
 */
export interface UpdateCampaignRequest {
  name?: string;
  status?: 'ENABLED' | 'PAUSED';
  budgetAmountMicros?: number;
  endDate?: string;
}

/**
 * 🚀 PHASE 2: Performance Report Request
 */
export interface PerformanceReportRequest {
  customerId: string;
  campaignIds?: string[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: string[];
  dimensions?: string[];
  filters?: Array<{
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS';
    value: string;
  }>;
}

/**
 * 🚀 PHASE 2: Automation Rule
 */
export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: {
    type: 'METRIC_THRESHOLD' | 'TIME_BASED' | 'PERFORMANCE_DROP';
    conditions: Array<{
      metric: string;
      operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS';
      value: number;
      period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    }>;
  };
  actions: Array<{
    type: 'PAUSE_CAMPAIGN' | 'ADJUST_BUDGET' | 'MODIFY_BID' | 'SEND_ALERT';
    parameters: {
      [key: string]: any;
    };
  }>;
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

export interface GoogleAdsTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

export interface GoogleAdsCustomerResponse {
  customer: GoogleAdsAccount;
  accessible: boolean;
  // Legacy format
  customers?: GoogleAdsAccount[];
}

export interface GoogleAdsError {
  type:
    | 'AUTHENTICATION'
    | 'QUOTA_EXCEEDED'
    | 'INVALID_REQUEST'
    | 'SERVER_ERROR'
    | 'NETWORK_ERROR'
    | 'API_ERROR'
    | 'NOT_FOUND'
    | 'CONNECTION_ERROR'
    | 'AUTHENTICATION_ERROR';
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
  isProductionAccount?: boolean; // NEW: Flag für Production Account Fehler
  details?: any;
  // Legacy für Backward Compatibility
  details?: any;
}

export type GoogleAdsLegacyServiceStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'SYNCING'
  | 'SETUP_REQUIRED';

export interface GoogleAdsConnectionStatus {
  connected: boolean;
  hasValidTokens: boolean;
  hasCustomerAccess: boolean;
  customerId?: string;
  customerName?: string;
  lastChecked: string;
  error?: GoogleAdsError;
}

// Legacy status type for backward compatibility
export interface GoogleAdsLegacyConnectionStatus {
  status: GoogleAdsLegacyServiceStatus;
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

export interface GoogleAdsServiceStatus {
  configured: boolean;
  errors: string[];
  lastChecked: string;
  version: string;
  clientLibrary: boolean;
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
