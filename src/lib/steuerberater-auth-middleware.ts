// Middleware für Steuerberater API Sicherheit
import { NextRequest } from 'next/server';

// Dynamic Firebase imports to prevent build-time issues
let auth: any;
let db: any;

async function getFirebaseServices() {
  if (!auth || !db) {
    const firebaseModule = await import('@/firebase/server');
    auth = firebaseModule.auth;
    db = firebaseModule.db;
  }
  return { auth, db };
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email: string;
    role: string;
    companyId?: string;
  };
}

export class SteuerberaterAuthMiddleware {
  /**
   * Überprüft ob der Benutzer authentifiziert ist
   */
  static async authenticateUser(request: NextRequest): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const { auth, db } = await getFirebaseServices();

      const authHeader = request.headers.get('authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          success: false,
          error: 'Kein gültiger Authorization Header gefunden',
        };
      }

      const token = authHeader.split('Bearer ')[1];

      if (!token) {
        return {
          success: false,
          error: 'Kein Token gefunden',
        };
      }

      // Verify Firebase token
      const decodedToken = await auth.verifyIdToken(token);

      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();

      if (!userDoc.exists) {
        return {
          success: false,
          error: 'Benutzer nicht gefunden',
        };
      }

      const userData = userDoc.data();

      return {
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: userData?.role || 'user',
          companyId: userData?.companyId,
        },
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Token-Verifizierung fehlgeschlagen',
      };
    }
  }

  /**
   * Überprüft ob der Benutzer Zugriff auf Steuerberater-Funktionen hat
   */
  static async checkSteuerberaterAccess(
    user: any,
    requiredAction: 'read' | 'write' | 'admin'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { db } = await getFirebaseServices();

      // Check if user has company access
      if (!user.companyId) {
        return {
          success: false,
          error: 'Kein Firmenzugang gefunden',
        };
      }

      // Get company data
      const companyDoc = await db.collection('companies').doc(user.companyId).get();

      if (!companyDoc.exists) {
        return {
          success: false,
          error: 'Firma nicht gefunden',
        };
      }

      const companyData = companyDoc.data();

      // Check if company has steuerberater features enabled
      if (!companyData?.features?.steuerberater_portal) {
        return {
          success: false,
          error: 'Steuerberater-Portal nicht aktiviert',
        };
      }

      // Check user role and permissions
      const userRole = user.role;
      const permissions = {
        read: ['user', 'admin', 'manager', 'accountant'],
        write: ['admin', 'manager', 'accountant'],
        admin: ['admin'],
      };

      if (!permissions[requiredAction].includes(userRole)) {
        return {
          success: false,
          error: 'Unzureichende Berechtigung',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Access check error:', error);
      return {
        success: false,
        error: 'Berechtigungsprüfung fehlgeschlagen',
      };
    }
  }

  /**
   * Überprüft Zugriff auf spezifische Steuerberater-Einladung
   */
  static async checkInvitationAccess(
    user: any,
    invitationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { db } = await getFirebaseServices();

      const invitationDoc = await db
        .collection('steuerberater_invitations')
        .doc(invitationId)
        .get();

      if (!invitationDoc.exists) {
        return {
          success: false,
          error: 'Einladung nicht gefunden',
        };
      }

      const invitationData = invitationDoc.data();

      // Check if user's company matches invitation
      if (invitationData?.companyId !== user.companyId) {
        return {
          success: false,
          error: 'Kein Zugriff auf diese Einladung',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Invitation access check error:', error);
      return {
        success: false,
        error: 'Einladungsprüfung fehlgeschlagen',
      };
    }
  }

  /**
   * Rate Limiting für API-Aufrufe
   */
  static async checkRateLimit(
    userId: string,
    action: string,
    maxRequests: number = 10,
    windowMinutes: number = 60
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { db } = await getFirebaseServices();

      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

      // Query recent requests
      const recentRequests = await db
        .collection('api_rate_limits')
        .where('userId', '==', userId)
        .where('action', '==', action)
        .where('timestamp', '>=', windowStart)
        .get();

      if (recentRequests.size >= maxRequests) {
        return {
          success: false,
          error: `Rate limit erreicht. Maximal ${maxRequests} Anfragen pro ${windowMinutes} Minuten erlaubt.`,
        };
      }

      // Log this request
      await db.collection('api_rate_limits').add({
        userId,
        action,
        timestamp: now,
      });

      return { success: true };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Don't block on rate limit errors
      return { success: true };
    }
  }

  /**
   * Validiert und bereinigt Input-Parameter
   */
  static validateInput(
    data: any,
    rules: { [key: string]: any }
  ): {
    success: boolean;
    cleanData?: any;
    errors?: string[];
  } {
    const errors: string[] = [];
    const cleanData: any = {};

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];

      // Required check
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Feld '${field}' ist erforderlich`);
        continue;
      }

      // Skip validation if not required and empty
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rule.type && typeof value !== rule.type) {
        errors.push(`Feld '${field}' muss vom Typ '${rule.type}' sein`);
        continue;
      }

      // String length validation
      if (rule.type === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`Feld '${field}' muss mindestens ${rule.minLength} Zeichen haben`);
          continue;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`Feld '${field}' darf maximal ${rule.maxLength} Zeichen haben`);
          continue;
        }
      }

      // Email validation
      if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`Feld '${field}' muss eine gültige E-Mail-Adresse sein`);
        continue;
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`Feld '${field}' muss einer der folgenden Werte sein: ${rule.enum.join(', ')}`);
        continue;
      }

      // Sanitize string values
      if (typeof value === 'string') {
        cleanData[field] = value.trim();
      } else {
        cleanData[field] = value;
      }
    }

    return {
      success: errors.length === 0,
      cleanData: errors.length === 0 ? cleanData : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
