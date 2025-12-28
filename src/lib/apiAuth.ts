/**
 * Server-Side API Authentication Helper
 * 
 * Zentrale Authentifizierungs-Utility für alle API-Routes.
 * Stellt sicher, dass nur autorisierte Benutzer auf geschützte Endpoints zugreifen können.
 * 
 * DATENSCHUTZ: Implementiert das Prinzip der minimalen Rechte
 * AUDIT: Alle Auth-Versuche werden geloggt
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/firebase/server';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthResult {
  success: true;
  userId: string;
  token: DecodedIdToken;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

export type AuthResponse = AuthResult | AuthError;

/**
 * Verifiziert das Firebase ID Token aus dem Authorization Header
 * 
 * @param request - NextRequest object
 * @returns AuthResult bei Erfolg, AuthError bei Fehler
 * 
 * Verwendung:
 * ```typescript
 * const authResult = await verifyApiAuth(request);
 * if (!authResult.success) {
 *   return NextResponse.json({ error: authResult.error }, { status: authResult.status });
 * }
 * const userId = authResult.userId;
 * ```
 */
export async function verifyApiAuth(request: NextRequest): Promise<AuthResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    
    // Prüfe ob Authorization Header vorhanden
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[API Auth] Missing or invalid Authorization header', {
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: 'Authorization header missing or invalid',
        status: 401,
      };
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return {
        success: false,
        error: 'Token missing from Authorization header',
        status: 401,
      };
    }

    // Prüfe ob Firebase Auth initialisiert ist
    if (!auth) {
      console.error('[API Auth] Firebase Auth not initialized');
      return {
        success: false,
        error: 'Authentication service unavailable',
        status: 503,
      };
    }

    // Verifiziere Token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Audit Log für erfolgreiche Authentifizierung
    console.log('[API Auth] Successfully authenticated', {
      userId: decodedToken.uid,
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      userId: decodedToken.uid,
      token: decodedToken,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Audit Log für fehlgeschlagene Authentifizierung
    console.warn('[API Auth] Authentication failed', {
      error: errorMessage,
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: 'Invalid or expired token',
      status: 401,
    };
  }
}

/**
 * Prüft ob der authentifizierte User auf eine Company zugreifen darf
 * 
 * @param userId - User ID aus dem Token
 * @param companyId - Company ID aus der URL
 * @returns true wenn autorisiert
 * 
 * Regeln:
 * - User darf auf eigene Company zugreifen (userId === companyId)
 * - Mitarbeiter dürfen auf ihre Company zugreifen (TODO: Token-Claims prüfen)
 */
export function isAuthorizedForCompany(userId: string, companyId: string, token?: DecodedIdToken): boolean {
  // Owner hat Zugriff
  if (userId === companyId) {
    return true;
  }
  
  // Mitarbeiter-Check über Custom Claims
  if (token?.role === 'mitarbeiter' && token?.companyId === companyId) {
    return true;
  }
  
  // Support/Admin hat Zugriff auf alle Companies
  if (token?.role === 'master' || token?.role === 'support') {
    return true;
  }
  
  return false;
}

/**
 * Kombinierte Auth + Company-Autorisierung
 * 
 * Verwendung in API Routes:
 * ```typescript
 * const authResult = await verifyCompanyAccess(request, uid);
 * if (!authResult.success) {
 *   return NextResponse.json({ error: authResult.error }, { status: authResult.status });
 * }
 * ```
 */
export async function verifyCompanyAccess(
  request: NextRequest, 
  companyId: string
): Promise<AuthResponse> {
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.success) {
    return authResult;
  }
  
  if (!isAuthorizedForCompany(authResult.userId, companyId, authResult.token)) {
    console.warn('[API Auth] Unauthorized company access attempt', {
      userId: authResult.userId,
      targetCompanyId: companyId,
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });
    
    return {
      success: false,
      error: 'Not authorized to access this company',
      status: 403,
    };
  }
  
  return authResult;
}

/**
 * Helper für einfache Auth-Error-Response
 */
export function authErrorResponse(authResult: AuthError): NextResponse {
  return NextResponse.json(
    { 
      success: false, 
      error: authResult.error,
      timestamp: new Date().toISOString(),
    }, 
    { status: authResult.status }
  );
}
