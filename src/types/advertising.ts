// 🎯 TASKILO MULTI-PLATFORM ADVERTISING TYPES
// Einheitliche Types für alle Advertising-Plattformen

export type AdvertisingPlatform = 'google-ads' | 'linkedin' | 'meta' | 'taboola' | 'outbrain';

export interface PlatformCredentials {
  platform: AdvertisingPlatform;
  isConnected: boolean;
  lastSync?: string;
  credentials?: {
    // Google Ads
    accessToken?: string;
    refreshToken?: string;
    customerId?: string;

    // LinkedIn
    linkedinAccessToken?: string;
    linkedinAccountId?: string;

    // Meta
    metaAccessToken?: string;
    metaAdAccountId?: string;

    // Taboola
    taboolaApiKey?: string;
    taboolaAccountId?: string;

    // Outbrain
    outbrainApiKey?: string;
    outbrainAccountId?: string;
  };
  config?: Record<string, any>;
}

export interface UnifiedCampaign {
  id: string;
  name: string;
  platform: AdvertisingPlatform;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'DRAFT';
  type: string;
  startDate: string;
  endDate?: string;
  budget: {
    amount: number;
    currency: string;
    period: 'DAILY' | 'LIFETIME';
    spent?: number;
    remaining?: number;
  };
  targeting: {
    locations?: string[];
    demographics?: {
      ageMin?: number;
      ageMax?: number;
      genders?: string[];
    };
    interests?: string[];
    keywords?: string[];
    placements?: string[];
  };
  creative: {
    headlines?: string[];
    descriptions?: string[];
    images?: string[];
    videos?: string[];
    callToAction?: string;
    landingUrl?: string;
  };
  metrics: UnifiedMetrics;
  platformSpecific?: Record<string, any>;
}

export interface UnifiedMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  reach?: number;
  frequency?: number;
  engagement?: number;
  videoViews?: number;
  socialActions?: number;
}

export interface UnifiedAnalytics {
  summary: UnifiedMetrics;
  platformBreakdown: {
    platform: AdvertisingPlatform;
    metrics: UnifiedMetrics;
    campaignCount: number;
    isActive: boolean;
  }[];
  dailyData: {
    date: string;
    platform: AdvertisingPlatform;
    metrics: UnifiedMetrics;
  }[];
  insights: {
    bestPerformingPlatform: AdvertisingPlatform;
    worstPerformingPlatform: AdvertisingPlatform;
    totalBudgetUtilization: number;
    averageRoas: number;
    recommendations: string[];
  };
}

export interface PlatformConnection {
  platform: AdvertisingPlatform;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastConnected?: string;
  error?: string;
  accountInfo?: {
    id: string;
    name: string;
    currency: string;
    timezone: string;
  };
}

export interface MultiPlatformApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    platform?: AdvertisingPlatform;
    details?: any;
  };
}

// Platform-spezifische Erweiterungen
export interface GoogleAdsExtensions {
  adGroups?: Array<{
    id: string;
    name: string;
    keywords: string[];
  }>;
  extensions?: {
    sitelinks?: string[];
    callouts?: string[];
  };
}

export interface LinkedInExtensions {
  targetingCriteria?: {
    jobTitles?: string[];
    companies?: string[];
    skills?: string[];
    industries?: string[];
  };
  leadGenForms?: {
    formId: string;
    formName: string;
  }[];
}

export interface MetaExtensions {
  placements?: ('facebook' | 'instagram' | 'messenger' | 'audience_network')[];
  optimization?: {
    objective: string;
    optimizationGoal: string;
    bidStrategy: string;
  };
  audience?: {
    customAudiences?: string[];
    lookalikes?: string[];
  };
}

export interface TaboolaExtensions {
  contentCategories?: string[];
  excludedPublishers?: string[];
  biddingModel?: 'CPC' | 'CPM' | 'CPA';
}

export interface OutbrainExtensions {
  sections?: string[];
  interests?: string[];
  deviceTargeting?: ('desktop' | 'mobile' | 'tablet')[];
}
