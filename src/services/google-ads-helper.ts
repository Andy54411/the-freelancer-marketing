/**
 * Google Ads API Helper Functions
 * Bietet Utility-Funktionen für Google Ads Kampagnen-Management
 */

interface BiddingStrategy {
  type: 'TARGET_CPA' | 'TARGET_ROAS' | 'MANUAL_CPC' | 'MAXIMIZE_CLICKS' | 'MAXIMIZE_CONVERSIONS';
  value?: number;
}

/**
 * Konvertiert Bidding-Strategie in Google Ads API Format
 */
export function getBiddingStrategy(biddingStrategy: BiddingStrategy) {
  switch (biddingStrategy.type) {
    case 'TARGET_CPA':
      return {
        target_cpa: {
          target_cpa_micros: (biddingStrategy.value || 10) * 1000000, // In Mikros
        },
      };
    
    case 'TARGET_ROAS':
      return {
        target_roas: {
          target_roas: biddingStrategy.value || 4.0,
        },
      };
    
    case 'MAXIMIZE_CLICKS':
      return {
        maximize_clicks: {},
      };
    
    case 'MAXIMIZE_CONVERSIONS':
      return {
        maximize_conversions: {},
      };
    
    case 'MANUAL_CPC':
    default:
      return {
        manual_cpc: {
          enhanced_cpc_enabled: true,
        },
      };
  }
}

/**
 * Campaign Type Mapping für Google Ads API
 */
export const campaignTypeMapping = {
  SEARCH: 2,
  DISPLAY: 3,
  SHOPPING: 5,
  VIDEO: 6,
  PERFORMANCE_MAX: 13,
} as const;

/**
 * Status Mapping für Google Ads API
 */
export const statusMapping = {
  ENABLED: 2,
  PAUSED: 3,
  REMOVED: 4,
} as const;

/**
 * Match Type Mapping für Keywords
 */
export const matchTypeMapping = {
  BROAD: 3,
  PHRASE: 4,
  EXACT: 5,
} as const;

/**
 * Ad Group Type Mapping
 */
export const adGroupTypeMapping = {
  SEARCH_STANDARD: 2,
  DISPLAY_STANDARD: 3,
  SHOPPING_PRODUCT_ADS: 4,
  VIDEO_RESPONSIVE: 7,
} as const;