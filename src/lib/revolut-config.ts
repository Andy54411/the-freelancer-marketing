// Revolut API Configuration - JWT Authentication
// https://developer.revolut.com/docs/business/business-api

export const REVOLUT_CONFIG = {
  // Revolut Business API Base URLs
  API_BASE_URL: process.env.REVOLUT_API_BASE_URL || 'https://b2b.revolut.com/api',
  SANDBOX_API_BASE_URL:
    process.env.REVOLUT_SANDBOX_API_BASE_URL || 'https://sandbox-b2b.revolut.com/api',

  // OAuth URLs (für zukünftige OAuth-Flows falls benötigt)
  OAUTH_BASE_URL: process.env.REVOLUT_OAUTH_BASE_URL || 'https://business.revolut.com/oauth',
  SANDBOX_OAUTH_BASE_URL:
    process.env.REVOLUT_SANDBOX_OAUTH_BASE_URL || 'https://sandbox-business.revolut.com/oauth',

  // Client ID (JWT-basierte Auth - kein Client Secret benötigt)
  CLIENT_ID: process.env.REVOLUT_CLIENT_ID,

  // Certificate Paths für JWT Signing
  PRIVATE_KEY_PATH: process.env.REVOLUT_PRIVATE_KEY_PATH,
  TRANSPORT_CERT_PATH: process.env.REVOLUT_TRANSPORT_CERT_PATH,
  SIGNING_CERT_PATH: process.env.REVOLUT_SIGNING_CERT_PATH,

  // Redirect URLs
  REDIRECT_URI: process.env.REVOLUT_REDIRECT_URI || 'https://taskilo.de/api/revolut/auth/callback',

  // API Scopes - Revolut Business API Permissions
  SCOPES: [
    'READ', // Read account information
    'WRITE', // Write permissions for payments
  ].join(' '),

  // Default Settings
  ENVIRONMENT: process.env.REVOLUT_ENVIRONMENT || 'sandbox', // 'production' | 'sandbox'
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000, // 5 minutes before expiry
  MAX_RETRY_ATTEMPTS: 3,
  REQUEST_TIMEOUT: 30000, // 30 seconds
};

export function getRevolutApiUrl(): string {
  return REVOLUT_CONFIG.ENVIRONMENT === 'production'
    ? REVOLUT_CONFIG.API_BASE_URL
    : REVOLUT_CONFIG.SANDBOX_API_BASE_URL;
}

export function getRevolutOAuthUrl(): string {
  return REVOLUT_CONFIG.ENVIRONMENT === 'production'
    ? REVOLUT_CONFIG.OAUTH_BASE_URL
    : REVOLUT_CONFIG.SANDBOX_OAUTH_BASE_URL;
}

export function getRevolutClientId(): string {
  return REVOLUT_CONFIG.CLIENT_ID || '';
}

export function getRevolutPrivateKeyPath(): string {
  return REVOLUT_CONFIG.PRIVATE_KEY_PATH || '';
}

// Revolut API Rate Limits
export const REVOLUT_RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 1000,
  REQUESTS_PER_HOUR: 10000,
  CONCURRENT_REQUESTS: 10,
};

// Add rate limits to main config
export const REVOLUT_CONFIG_WITH_LIMITS = {
  ...REVOLUT_CONFIG,
  REQUESTS_PER_MINUTE: REVOLUT_RATE_LIMITS.REQUESTS_PER_MINUTE,
  REQUESTS_PER_HOUR: REVOLUT_RATE_LIMITS.REQUESTS_PER_HOUR,
};

// Revolut Account Types
export const REVOLUT_ACCOUNT_TYPES = {
  CURRENT: 'current',
  SAVINGS: 'savings',
  CARD: 'card',
} as const;

// Revolut Transaction States
export const REVOLUT_TRANSACTION_STATES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  DECLINED: 'declined',
  FAILED: 'failed',
  REVERTED: 'reverted',
} as const;

// Revolut Currencies (häufigste für Deutschland)
export const REVOLUT_SUPPORTED_CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'BGN',
  'HRK',
  'DKK',
  'SEK',
  'NOK',
  'ISK',
  'CAD',
  'AUD',
  'NZD',
  'SGD',
  'HKD',
  'JPY',
] as const;

export type RevolutCurrency = (typeof REVOLUT_SUPPORTED_CURRENCIES)[number];
export type RevolutAccountType = (typeof REVOLUT_ACCOUNT_TYPES)[keyof typeof REVOLUT_ACCOUNT_TYPES];
export type RevolutTransactionState =
  (typeof REVOLUT_TRANSACTION_STATES)[keyof typeof REVOLUT_TRANSACTION_STATES];
