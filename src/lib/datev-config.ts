/**
 * DATEV API Configuration with Official Sandbox Support
 * Based on DATEV Developer Portal specifications
 *
 * Sandbox Environment:
 * - Consultant Number: 455148
 * - Client Numbers: 1-6 (Client 1 has full Rechnungsdatenservice permissions)
 * - OIDC Discovery: https://login.datev.de/openidsandbox/.well-known/openid-configuration
 */

import crypto from 'crypto';

export interface DatevConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBaseUrl: string;
  baseUrl: string; // Alias für apiBaseUrl für Rückwärtskompatibilität
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  revokeUrl: string;
  checkSessionUrl: string;
  endSessionUrl: string;
  jwksUrl: string;
  scopes: string[];
  responseTypes: string[];
  codeChallengeMethod: string;
  // Sandbox specific data
  consultantNumber?: string;
  defaultClientId?: string;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * DATEV Sandbox Test Configuration
 * Official test credentials and endpoints from DATEV Developer Portal
 */
export const DATEV_SANDBOX_CONFIG = {
  consultantNumber: '455148',
  clientNumbers: ['1', '2', '3', '4', '5', '6'],
  // Client 1 has full Rechnungsdatenservice 1.0 permissions
  fullyAuthorizedClient: '455148-1',
  // OIDC Discovery Endpoint
  oidcDiscoveryUrl: 'https://login.datev.de/openidsandbox/.well-known/openid-configuration',
  // Official sandbox endpoints
  endpoints: {
    authorization: 'https://login.datev.de/openidsandbox/authorize',
    token: 'https://sandbox-api.datev.de/token',
    userinfo: 'https://sandbox-api.datev.de/userinfo',
    revocation: 'https://sandbox-api.datev.de/revoke',
    apiBase: 'https://sandbox-api.datev.de/platform-sandbox',
  },
} as const;

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
 * Get DATEV configuration with official sandbox support
 * Uses DATEV Developer Portal specifications and test credentials
 */
export function getDatevConfig(): DatevConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const clientId = process.env.DATEV_CLIENT_ID || '';

  // Check if using official sandbox credentials
  const isSandbox = clientId === '6111ad8e8cae82d1a805950f2ae4adc4';

  if (isProduction && !isSandbox) {
    // Production configuration
    return {
      clientId,
      clientSecret: process.env.DATEV_CLIENT_SECRET || '',
      redirectUri: 'https://taskilo.de/api/datev/callback',
      apiBaseUrl: 'https://api.datev.de',
      baseUrl: 'https://api.datev.de', // Alias für apiBaseUrl
      authUrl: 'https://login.datev.de/openid/authorize',
      tokenUrl: 'https://api.datev.de/token',
      userInfoUrl: 'https://api.datev.de/userinfo',
      revokeUrl: 'https://api.datev.de/revoke',
      checkSessionUrl: 'https://api.datev.de/checksession',
      endSessionUrl: 'https://api.datev.de/endsession',
      jwksUrl: 'https://api.datev.de/certs',
      scopes: ['openid', 'profile', 'account_id', 'email'],
      responseTypes: ['code', 'id_token', 'id_token token', 'code id_token'],
      codeChallengeMethod: 'S256',
    };
  } else {
    // Sandbox configuration with official test credentials
    return {
      clientId,
      clientSecret: process.env.DATEV_CLIENT_SECRET || '',
      redirectUri: isProduction
        ? 'https://taskilo.de/api/datev/callback'
        : 'http://localhost:3000/api/datev/callback',
      apiBaseUrl: DATEV_SANDBOX_CONFIG.endpoints.apiBase,
      baseUrl: DATEV_SANDBOX_CONFIG.endpoints.apiBase, // Alias für apiBaseUrl
      authUrl: DATEV_SANDBOX_CONFIG.endpoints.authorization,
      tokenUrl: DATEV_SANDBOX_CONFIG.endpoints.token,
      userInfoUrl: DATEV_SANDBOX_CONFIG.endpoints.userinfo,
      revokeUrl: DATEV_SANDBOX_CONFIG.endpoints.revocation,
      checkSessionUrl: 'https://sandbox-api.datev.de/checksession',
      endSessionUrl: 'https://sandbox-api.datev.de/endsession',
      jwksUrl: 'https://sandbox-api.datev.de/certs',
      // Sandbox specific scopes and test credentials
      scopes: ['openid', 'profile', 'account_id', 'email'],
      responseTypes: ['code', 'id_token', 'id_token token', 'code id_token'],
      codeChallengeMethod: 'S256',
      consultantNumber: DATEV_SANDBOX_CONFIG.consultantNumber,
      defaultClientId: DATEV_SANDBOX_CONFIG.fullyAuthorizedClient,
    };
  }
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
 * DATEV API Endpoints for Sandbox Testing
 * Based on official DATEV Developer Portal documentation
 */
export const DATEV_ENDPOINTS = {
  // OpenID Connect & User Management
  userInfo: '/userinfo',
  organizations: '/platform/v1/organizations',
  clients: '/platform/v1/clients', // For client permission verification

  // Rechnungsdatenservice 1.0 (use client 455148-1 for full permissions)
  invoiceData: '/rechnungsdatenservice/v1.0',

  // Accounting APIs (your subscribed products)
  accounting: {
    clients: '/master-data/v3/master-clients',
    extfFiles: '/accounting/v2.0/extf-files',
    documents: '/accounting/v2.0/documents',
    dxsoJobs: '/accounting/v2.0/dxso-jobs',
  },

  // Cash Register Import (v2.6.0)
  cashRegister: {
    import: '/cashregister/v2.6.0/import',
    formats: '/cashregister/v2.6.0/formats',
    status: '/cashregister/v2.6.0/import/{id}/status',
  },

  // OAuth Token Management
  token: '/token',
  revoke: '/revoke',
} as const;

/**
 * Helper function to generate sandbox client identifier
 * For testing with DATEV consultant 455148 and clients 1-6
 */
export function generateSandboxClientId(clientNumber: string = '1'): string {
  const consultantNumber = DATEV_SANDBOX_CONFIG.consultantNumber;
  const validClients = DATEV_SANDBOX_CONFIG.clientNumbers;

  if (!validClients.includes(clientNumber as any)) {
    console.warn(`Invalid client number ${clientNumber}. Using client 1 (fully authorized).`);
    clientNumber = '1';
  }

  return `${consultantNumber}-${clientNumber}`;
}

/**
 * Validate client permissions for Rechnungsdatenservice
 * Only client 455148-1 has full permissions in sandbox
 */
export function validateSandboxClientPermissions(clientId: string): {
  hasFullPermissions: boolean;
  isValidClient: boolean;
  recommendedClient: string;
} {
  const isFullyAuthorized = clientId === DATEV_SANDBOX_CONFIG.fullyAuthorizedClient;
  const isValidFormat = /^455148-[1-6]$/.test(clientId);

  return {
    hasFullPermissions: isFullyAuthorized,
    isValidClient: isValidFormat,
    recommendedClient: DATEV_SANDBOX_CONFIG.fullyAuthorizedClient,
  };
}
