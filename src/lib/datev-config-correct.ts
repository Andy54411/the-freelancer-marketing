/**
 * DATEV Korrekte OAuth2 OpenID Connect Konfiguration
 * Basiert auf der offiziellen DATEV Developer Documentation
 *
 * WICHTIG: Verwendet OpenID Connect Authorization Code Flow mit PKCE
 * statt Client Credentials Flow
 */

export interface DatevConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  discoveryEndpoint: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

/**
 * Get DATEV Configuration based on official documentation
 */
export function getDatevConfig(): DatevConfig {
  const clientId = process.env.DATEV_CLIENT_ID || '';
  const clientSecret = process.env.DATEV_CLIENT_SECRET || '';

  // Base URLs für Sandbox (nicht Production!)
  const baseUrl = 'https://login.datev.de/openidsandbox'; // Korrekte Sandbox URL

  return {
    clientId,
    clientSecret,
    redirectUri:
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/api/datev/callback'
        : 'https://taskilo.de/api/datev/callback',
    discoveryEndpoint: `${baseUrl}/.well-known/openid-configuration`,
    authUrl: `${baseUrl}/authorize`, // Wird durch Discovery überschrieben
    tokenUrl: `${baseUrl}/token`, // Wird durch Discovery überschrieben
    userInfoUrl: `${baseUrl}/userinfo`, // Wird durch Discovery überschrieben
    scopes: ['openid', 'profile', 'email'], // MUSS 'openid' enthalten!
  };
}

/**
 * Generate Authorization URL für DATEV OpenID Connect
 * mit PKCE (Proof Key for Code Exchange)
 */
export function generateDatevAuthUrl(companyId: string) {
  const config = getDatevConfig();

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Generate state and nonce (minimum 20 characters each)
  const state = `${companyId}:${generateRandomString(25)}`;
  const nonce = generateRandomString(30);

  // Build authorization URL with all required parameters
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scopes.join(' '));
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('enableWindowsSso', 'true'); // DATEV SSO

  return {
    authUrl: authUrl.toString(),
    state,
    nonce,
    codeVerifier,
  };
}

/**
 * Generate PKCE code verifier (43-128 characters)
 */
function generateCodeVerifier(): string {
  return generateRandomString(128);
}

/**
 * Generate PKCE code challenge from verifier
 */
function generateCodeChallenge(verifier: string): string {
  // In Node.js environment, use crypto
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }

  // Browser environment would use SubtleCrypto
  throw new Error('Browser PKCE generation not implemented - use server-side');
}

/**
 * Generate random string for state/nonce
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';

  if (typeof window === 'undefined') {
    // Node.js environment
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      result += charset[randomBytes[i] % charset.length];
    }
  } else {
    // Browser environment
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
  }

  return result;
}
