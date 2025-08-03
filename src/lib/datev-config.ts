/**
 * DATEV API Configuration with PKCE Support
 * Manages DATEV OAuth and API settings according to official DATEV documentation
 */

import crypto from 'crypto';

export interface DatevConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  revokeUrl: string;
  scopes: string[];
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * Generate PKCE code verifier and challenge as required by DATEV
 * DATEV requires code_challenge_method = "S256"
 */
export function generatePKCEChallenge(): PKCEChallenge {
  // Generate code_verifier (43-128 characters, URL-safe)
  const codeVerifier = crypto.randomBytes(96).toString('base64url').substring(0, 128);

  // Generate code_challenge using SHA256
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Generate secure state parameter (minimum 20 characters as required by DATEV)
 */
export function generateState(companyId?: string): string {
  const randomPart = crypto.randomBytes(16).toString('hex'); // 32 chars
  const timestamp = Date.now().toString();

  if (companyId) {
    return `company:${companyId}:${timestamp}:${randomPart}`;
  }

  return `state:${timestamp}:${randomPart}`;
}

/**
 * Generate secure nonce parameter (minimum 20 characters as required by DATEV)
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex'); // 32 chars
}

/**
 * Get DATEV configuration based on environment
 */
export function getDatevConfig(): DatevConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  // DATEV Sandbox vs Production URLs
  const clientId = process.env.DATEV_CLIENT_ID || '';
  const isSandbox = clientId === '6111ad8e8cae82d1a805950f2ae4adc4';

  // Base URLs according to DATEV documentation
  const baseUrl = isSandbox ? 'https://sandbox-api.datev.de' : 'https://api.datev.de';
  const authBaseUrl = isSandbox
    ? 'https://login.datev.de/openidsandbox'
    : 'https://login.datev.de/openid';

  return {
    clientId,
    clientSecret: process.env.DATEV_CLIENT_SECRET || '',
    redirectUri: isProduction
      ? 'https://taskilo.de/api/datev/callback'
      : 'http://localhost:3000/api/datev/callback',
    baseUrl,
    authUrl: `${authBaseUrl}/auth`,
    tokenUrl: `${authBaseUrl}/token`,
    userInfoUrl: `${authBaseUrl}/userinfo`,
    revokeUrl: `${authBaseUrl}/revoke`,
    // DATEV required scopes - must include 'openid'
    scopes: [
      'openid',
      'profile',
      'email',
      'accounting-data:read',
      'accounting-data:write',
      'organizations:read',
      'user:read',
    ],
  };
}

/**
 * Validate DATEV configuration - only call when DATEV is actually being used
 */
export function validateDatevConfig(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !process.env.DATEV_CLIENT_ID) {
    throw new Error('DATEV_CLIENT_ID environment variable is required in production');
  }

  if (isProduction && !process.env.DATEV_CLIENT_SECRET) {
    throw new Error('DATEV_CLIENT_SECRET environment variable is required in production');
  }
}

/**
 * Generate DATEV OAuth authorization URL with PKCE
 * According to DATEV OpenID Connect Authorization Code Flow with PKCE
 */
export function generateDatevAuthUrl(companyId?: string): {
  authUrl: string;
  codeVerifier: string;
  state: string;
  nonce: string;
} {
  validateDatevConfig();
  const config = getDatevConfig();

  // Generate PKCE challenge
  const pkce = generatePKCEChallenge();

  // Generate state and nonce
  const state = generateState(companyId);
  const nonce = generateNonce();

  // Build authorization URL according to DATEV requirements
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state: state,
    nonce: nonce,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
    // DATEV specific: Enable Windows SSO
    enableWindowsSso: 'true',
  });

  const authUrl = `${config.authUrl}?${params.toString()}`;

  // Return both URL and PKCE data that needs to be stored
  return {
    authUrl,
    codeVerifier: pkce.codeVerifier,
    state,
    nonce,
  };
}

/**
 * DATEV API Endpoints according to official documentation
 */
export const DATEV_ENDPOINTS = {
  // Organization & User (OpenID Connect)
  userInfo: '/userinfo',
  organizations: '/platform/v1/organizations',

  // Accounting Data API
  clients: '/accounting/v1/clients',
  accounts: '/accounting/v1/accounts',
  transactions: '/accounting/v1/transactions',
  documents: '/accounting/v1/documents',

  // Export & Import
  export: '/accounting/v1/export',
  import: '/accounting/v1/import',

  // OAuth Token Management
  token: '/token',
  revoke: '/revoke',
} as const;
