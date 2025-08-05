/**
 * DATEV User Authentication Service
 * Konkrete Implementierung der DATEV Auth Middleware für Firebase Integration
 * Ähnlich dem finAPI User Auth Pattern
 */

import { db } from '@/firebase/clients';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface DatevTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  organizationId?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

interface DatevUserConfig {
  datefUserId?: string;
  organizationId?: string;
  isActive: boolean;
  lastAuthAt?: number;
  authMethod: 'oauth' | 'manual';
  permissions: string[];
}

/**
 * Erstellt oder aktualisiert DATEV User Configuration in Firestore
 * @param firebaseUserId Firebase User UID
 * @param config DATEV User Configuration
 */
export async function getOrCreateDatevUser(
  firebaseUserId: string,
  config?: Partial<DatevUserConfig>
): Promise<{ success: boolean; datefUserId?: string; error?: string }> {
  try {
    console.log('🔐 Creating/updating DATEV user for Firebase UID:', firebaseUserId);

    const userRef = doc(db, 'users', firebaseUserId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error('❌ Firebase user not found:', firebaseUserId);
      return { success: false, error: 'Firebase user not found' };
    }

    const userData = userDoc.data();
    let datefUserId = userData.datefUserId;

    if (!datefUserId) {
      // Generate DATEV user ID if not exists
      datefUserId = generateDatefUserId(firebaseUserId);
      console.log('🆕 Generated new DATEV user ID:', datefUserId);
    }

    // Update user document with DATEV configuration
    const datefConfig: DatevUserConfig = {
      datefUserId,
      isActive: config?.isActive ?? true,
      authMethod: config?.authMethod ?? 'oauth',
      permissions: config?.permissions ?? ['read', 'write'],
      lastAuthAt: Date.now(),
      ...config,
    };

    await updateDoc(userRef, {
      datefUserId,
      datefConfig,
      updatedAt: Date.now(),
    });

    console.log('✅ DATEV user configuration updated successfully');
    return { success: true, datefUserId };
  } catch (error: any) {
    console.error('❌ Error creating/updating DATEV user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Holt DATEV Access Token für User aus Firestore
 * @param firebaseUserId Firebase User UID
 */
export async function getDatevUserToken(
  firebaseUserId: string
): Promise<{ success: boolean; token?: DatevTokenData; error?: string }> {
  try {
    console.log('🔍 Getting DATEV token for user:', firebaseUserId);

    const tokenRef = doc(db, 'datev_tokens', firebaseUserId);
    const tokenDoc = await getDoc(tokenRef);

    if (!tokenDoc.exists()) {
      console.log('ℹ️ No DATEV token found for user:', firebaseUserId);
      return { success: false, error: 'No token found' };
    }

    const tokenData = tokenDoc.data() as DatevTokenData;

    // Check if token is expired
    if (tokenData.expiresAt && Date.now() >= tokenData.expiresAt) {
      console.log('⚠️ DATEV token expired for user:', firebaseUserId);
      return { success: false, error: 'Token expired' };
    }

    console.log('✅ Valid DATEV token found');
    return { success: true, token: tokenData };
  } catch (error: any) {
    console.error('❌ Error getting DATEV token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Speichert DATEV Token in Firestore
 * @param firebaseUserId Firebase User UID
 * @param tokenData Token Information
 */
export async function storeDatevUserToken(
  firebaseUserId: string,
  tokenData: Omit<DatevTokenData, 'userId' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('💾 Storing DATEV token for user:', firebaseUserId);

    const tokenRef = doc(db, 'datev_tokens', firebaseUserId);
    const now = Date.now();

    const fullTokenData: DatevTokenData = {
      ...tokenData,
      userId: firebaseUserId,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(tokenRef, fullTokenData);

    console.log('✅ DATEV token stored successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error storing DATEV token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Überprüft ob DATEV User existiert und autorisiert ist
 * @param firebaseUserId Firebase User UID
 */
export async function validateDatevUserExists(
  firebaseUserId: string
): Promise<{ exists: boolean; isActive: boolean; datefUserId?: string; error?: string }> {
  try {
    console.log('🔍 Validating DATEV user existence:', firebaseUserId);

    const userRef = doc(db, 'users', firebaseUserId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { exists: false, isActive: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const datefConfig = userData.datefConfig as DatevUserConfig;

    if (!datefConfig || !userData.datefUserId) {
      console.log('ℹ️ DATEV configuration not found for user');
      return { exists: false, isActive: false };
    }

    console.log('✅ DATEV user validated:', {
      exists: true,
      isActive: datefConfig.isActive,
      datefUserId: userData.datefUserId,
    });

    return {
      exists: true,
      isActive: datefConfig.isActive,
      datefUserId: userData.datefUserId,
    };
  } catch (error: any) {
    console.error('❌ Error validating DATEV user:', error);
    return { exists: false, isActive: false, error: error.message };
  }
}

/**
 * Entfernt DATEV Token (für Logout)
 * @param firebaseUserId Firebase User UID
 */
export async function revokeDatevUserToken(
  firebaseUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Revoking DATEV token for user:', firebaseUserId);

    const tokenRef = doc(db, 'datev_tokens', firebaseUserId);

    // Set token as expired rather than deleting for audit purposes
    await updateDoc(tokenRef, {
      expiresAt: Date.now() - 1000, // Set to past date
      revokedAt: Date.now(),
      isRevoked: true,
    });

    console.log('✅ DATEV token revoked successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error revoking DATEV token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * DATEV OAuth Callback Handler
 * Verarbeitet Authorization Code und tauscht gegen Access Token
 * @param code Authorization Code von DATEV
 * @param state OAuth State Parameter
 * @param firebaseUserId Firebase User UID
 */
export async function handleDatevOAuthCallback(
  code: string,
  state: string,
  firebaseUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Processing DATEV OAuth callback for user:', firebaseUserId);

    // Validate state parameter
    if (!validateOAuthState(state, firebaseUserId)) {
      return { success: false, error: 'Invalid OAuth state parameter' };
    }

    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code);

    if (!tokenData.success) {
      return { success: false, error: tokenData.error };
    }

    // Store token in Firestore
    const storeResult = await storeDatevUserToken(firebaseUserId, {
      accessToken: tokenData.accessToken!,
      refreshToken: tokenData.refreshToken!,
      expiresAt: tokenData.expiresAt!,
      tokenType: tokenData.tokenType || 'Bearer',
      organizationId: tokenData.organizationId,
    });

    if (!storeResult.success) {
      return { success: false, error: storeResult.error };
    }

    // Update user configuration
    await getOrCreateDatevUser(firebaseUserId, {
      isActive: true,
      lastAuthAt: Date.now(),
      organizationId: tokenData.organizationId,
    });

    console.log('✅ DATEV OAuth callback processed successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error processing DATEV OAuth callback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Startet DATEV OAuth 2.0 Flow für User Authentication
 * @param userId User identifier
 * @param redirectUri Callback URL nach erfolgreicher Authentifizierung
 */
export async function initiateDatevAuthFlow(
  userId: string,
  redirectUri?: string
): Promise<{ authUrl: string; state: string }> {
  console.log('🔄 Initiating DATEV OAuth flow for user:', userId);

  // Generate secure state parameter
  const state = generateSecureState(userId);

  // Store state for verification
  storeAuthState(state, userId);

  // Build DATEV OAuth authorization URL
  const config = await getDatevConfig();
  const authUrl = new URL(config.authUrl || 'https://api.datev.de/oauth2/authorize');

  authUrl.searchParams.set('client_id', config.clientId || process.env.DATEV_CLIENT_ID || '');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set(
    'redirect_uri',
    redirectUri || config.redirectUri || '/api/datev/callback'
  );
  authUrl.searchParams.set('scope', 'read write');
  authUrl.searchParams.set('state', state);

  return {
    authUrl: authUrl.toString(),
    state,
  };
}

// Helper functions
function generateDatefUserId(firebaseUserId: string): string {
  return `datev_${firebaseUserId}_${Date.now()}`;
}

function validateOAuthState(state: string, userId: string): boolean {
  // Implement state validation logic
  return true; // Simplified for now
}

async function exchangeCodeForToken(code: string): Promise<any> {
  // Implement OAuth code exchange
  return { success: false, error: 'Not implemented yet' };
}

function generateSecureState(userId: string): string {
  return Buffer.from(`${userId}_${Date.now()}_${Math.random()}`).toString('base64');
}

function storeAuthState(state: string, userId: string): void {
  // Store state for OAuth flow verification
  console.log('Storing auth state for user:', userId, 'state:', state);
}

async function getDatevConfig(): Promise<any> {
  // Get DATEV configuration
  return {
    authUrl: 'https://api.datev.de/oauth2/authorize',
    tokenUrl: 'https://api.datev.de/oauth2/token',
    clientId: process.env.DATEV_CLIENT_ID,
    clientSecret: process.env.DATEV_CLIENT_SECRET,
    redirectUri: '/api/datev/callback',
  };
}

export { type DatevTokenData, type DatevUserConfig };
