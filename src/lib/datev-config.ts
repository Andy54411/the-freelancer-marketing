/**
 * DATEV API Configuration
 * Manages DATEV OAuth and API settings
 */

export interface DatevConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

/**
 * Get DATEV configuration based on environment
 */
export function getDatevConfig(): DatevConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  // Only validate in runtime, not during build
  if (typeof window !== 'undefined' || process.env.NODE_ENV === 'development') {
    if (isProduction && !process.env.DATEV_CLIENT_ID) {
      throw new Error('DATEV_CLIENT_ID environment variable is required in production');
    }

    if (isProduction && !process.env.DATEV_CLIENT_SECRET) {
      throw new Error('DATEV_CLIENT_SECRET environment variable is required in production');
    }
  }

  return {
    clientId: process.env.DATEV_CLIENT_ID || '',
    clientSecret: process.env.DATEV_CLIENT_SECRET || '',
    redirectUri: isProduction
      ? 'https://taskilo.de/api/datev/callback'
      : 'http://localhost:3000/api/datev/callback',
    baseUrl: 'https://api.datev.de',
    authUrl: 'https://api.datev.de/platform/v1/oauth2/authorize',
    tokenUrl: 'https://api.datev.de/platform/v1/oauth2/token',
    scopes: ['accounting-data:read', 'accounting-data:write', 'organizations:read', 'user:read'],
  };
}

/**
 * Generate DATEV OAuth authorization URL
 */
export function generateDatevAuthUrl(state?: string): string {
  const config = getDatevConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state: state || crypto.randomUUID(),
  });

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * DATEV API Endpoints
 */
export const DATEV_ENDPOINTS = {
  // Organization & User
  userInfo: '/platform/v1/user',
  organizations: '/platform/v1/organizations',

  // Accounting Data
  accounts: '/accounting/v1/accounts',
  transactions: '/accounting/v1/transactions',
  documents: '/accounting/v1/documents',

  // Export & Import
  export: '/accounting/v1/export',
  import: '/accounting/v1/import',
} as const;
