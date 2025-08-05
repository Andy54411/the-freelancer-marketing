/**
 * Banking Authentication Middleware
 * Verbindet User Authentication mit finAPI Banking Integration
 */

import { finapiUserAuthServer } from './finapi-user-auth-service-server';

interface BankingAuthResult {
  success: boolean;
  finapiUserId?: string;
  userToken?: string;
  error?: string;
}

/**
 * Erstellt oder holt finAPI User für Firebase User
 * @param firebaseUid Firebase User UID
 * @param userEmail User Email für finAPI User Creation
 */
export async function getOrCreateFinAPIUser(
  firebaseUid: string,
  userEmail: string
): Promise<BankingAuthResult> {
  try {
    console.log('🔐 Banking Auth Middleware: Creating/Getting finAPI user for:', firebaseUid);

    // Verwende Server-Side User Auth Service
    const finapiUser = await finapiUserAuthServer.getOrCreateFinAPIUser(firebaseUid, userEmail);

    if (finapiUser) {
      // Hole User Access Token
      const userToken = await finapiUserAuthServer.getUserAccessToken(firebaseUid);

      if (userToken) {
        return {
          success: true,
          finapiUserId: finapiUser.id,
          userToken: userToken,
        };
      } else {
        return {
          success: false,
          error: 'Failed to get user access token',
        };
      }
    } else {
      return {
        success: false,
        error: 'Failed to create or get finAPI user',
      };
    }
  } catch (error: any) {
    console.error('❌ Banking Auth Middleware Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown authentication error',
    };
  }
}

/**
 * Holt User Access Token für bestehenden finAPI User
 * @param firebaseUid Firebase User UID
 */
export async function getFinAPIUserToken(firebaseUid: string): Promise<string | null> {
  try {
    return await finapiUserAuthServer.getUserAccessToken(firebaseUid);
  } catch (error: any) {
    console.error('❌ Error getting finAPI user token:', error);
    return null;
  }
}

/**
 * Validiert ob User bereits finAPI Integration hat
 * @param firebaseUid Firebase User UID
 */
export async function validateFinAPIUserExists(firebaseUid: string): Promise<boolean> {
  try {
    const userToken = await getFinAPIUserToken(firebaseUid);
    return userToken !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Deaktiviert finAPI User (für Account-Löschung)
 * @param firebaseUid Firebase User UID
 */
export async function deactivateFinAPIUser(firebaseUid: string): Promise<boolean> {
  try {
    return await finapiUserAuthServer.deactivateFinAPIUser(firebaseUid);
  } catch (error: any) {
    console.error('❌ Error deactivating finAPI user:', error);
    return false;
  }
}
