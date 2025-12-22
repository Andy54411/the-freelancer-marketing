/**
 * Admin Authentication Service
 * 
 * Firebase Admin SDK-basierte Admin-Authentifizierung
 * Ersetzt AWS DynamoDB Integration
 */

import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// Admin User Schema
export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  passwordHash: z.string(),
  role: z.enum(['master-admin', 'admin', 'support-admin', 'finance-admin', 'marketing-admin']),
  departments: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  lastLogin: z.date().optional(),
  loginCount: z.number().default(0),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);
const JWT_EXPIRATION = '24h';

// Collection path
const COLLECTION_PATH = 'adminUsers';

export class AdminAuthService {
  
  /**
   * Login mit E-Mail und Passwort
   */
  static async login(email: string, password: string): Promise<{
    success: boolean;
    token?: string;
    user?: Omit<AdminUser, 'passwordHash'>;
    error?: string;
  }> {
    try {
      if (!db) {
        return { success: false, error: 'Datenbank nicht verfuegbar' };
      }
      
      // Admin-User in Firestore suchen (Admin SDK Syntax)
      const snapshot = await db.collection(COLLECTION_PATH)
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return { success: false, error: 'Ungueltige Anmeldedaten' };
      }
      
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      
      // Pruefen ob User aktiv ist
      if (!userData.isActive) {
        return { success: false, error: 'Konto ist deaktiviert' };
      }
      
      // Passwort pruefen
      let passwordValid = false;
      
      if (userData.passwordHash) {
        // Gehashtes Passwort pruefen
        passwordValid = await bcrypt.compare(password, userData.passwordHash);
      } else {
        // Fallback fuer initiale Einrichtung (nur erste Anmeldung)
        // Master-Admin kann sich mit dem Initialpasswort anmelden
        const initialPasswords = ['taskilo2024', 'admin123'];
        passwordValid = initialPasswords.includes(password) && userData.role === 'master-admin';
        
        // Bei erfolgreicher Anmeldung Passwort hashen und speichern
        if (passwordValid) {
          const hashedPassword = await bcrypt.hash(password, 12);
          await db.collection(COLLECTION_PATH).doc(userDoc.id).update({
            passwordHash: hashedPassword,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
      
      if (!passwordValid) {
        return { success: false, error: 'Ungueltige Anmeldedaten' };
      }
      
      // Login-Statistik aktualisieren
      await db.collection(COLLECTION_PATH).doc(userDoc.id).update({
        lastLogin: FieldValue.serverTimestamp(),
        loginCount: (userData.loginCount || 0) + 1,
      });
      
      // JWT Token erstellen
      const token = await new SignJWT({
        sub: userDoc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        permissions: userData.permissions || [],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRATION)
        .sign(JWT_SECRET_BYTES);
      
      // User ohne Passwort-Hash zurueckgeben
      const user: Omit<AdminUser, 'passwordHash'> = {
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        departments: userData.departments || [],
        isActive: userData.isActive,
        permissions: userData.permissions || [],
        loginCount: (userData.loginCount || 0) + 1,
        phone: userData.phone,
        notes: userData.notes,
      };
      
      return { success: true, token, user };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: `Login fehlgeschlagen: ${errorMessage}` };
    }
  }
  
  /**
   * JWT Token verifizieren
   */
  static async verifyToken(token: string): Promise<{
    valid: boolean;
    payload?: {
      sub: string;
      email: string;
      name: string;
      role: string;
      permissions: string[];
    };
    error?: string;
  }> {
    try {
      if (!db) {
        return { valid: false, error: 'Datenbank nicht verfuegbar' };
      }
      
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      
      // User in Firestore pruefen (noch aktiv?)
      const userDoc = await db.collection(COLLECTION_PATH).doc(payload.sub as string).get();
      
      if (!userDoc.exists) {
        return { valid: false, error: 'Benutzer nicht gefunden' };
      }
      
      const userData = userDoc.data();
      
      if (!userData?.isActive) {
        return { valid: false, error: 'Konto ist deaktiviert' };
      }
      
      return {
        valid: true,
        payload: {
          sub: payload.sub as string,
          email: payload.email as string,
          name: payload.name as string,
          role: payload.role as string,
          permissions: (payload.permissions as string[]) || [],
        },
      };
    } catch {
      return { valid: false, error: 'Ungueltiger oder abgelaufener Token' };
    }
  }

  /**
   * Verify admin from NextRequest - Convenience method
   */
  static async verifyFromRequest(request: import('next/server').NextRequest): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  } | null> {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get('taskilo-admin-token')?.value;

      if (!token) {
        return null;
      }

      const result = await this.verifyToken(token);

      if (!result.valid || !result.payload) {
        return null;
      }

      return {
        id: result.payload.sub,
        email: result.payload.email,
        name: result.payload.name,
        role: result.payload.role,
        permissions: result.payload.permissions,
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Admin-User erstellen
   */
  static async createAdminUser(data: {
    email: string;
    name: string;
    password: string;
    role: AdminUser['role'];
    departments?: string[];
    permissions?: string[];
    phone?: string;
    notes?: string;
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      if (!db) {
        return { success: false, error: 'Datenbank nicht verfuegbar' };
      }
      
      // Pruefen ob E-Mail bereits existiert
      const existing = await db.collection(COLLECTION_PATH)
        .where('email', '==', data.email.toLowerCase())
        .limit(1)
        .get();
      
      if (!existing.empty) {
        return { success: false, error: 'E-Mail-Adresse wird bereits verwendet' };
      }
      
      // Passwort hashen
      const passwordHash = await bcrypt.hash(data.password, 12);
      
      // User-ID generieren
      const userId = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // User erstellen
      const userData: Record<string, unknown> = {
        id: userId,
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        role: data.role,
        departments: data.departments || [],
        permissions: data.permissions || [],
        isActive: true,
        loginCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      if (data.phone) {
        userData.phone = data.phone;
      }
      
      if (data.notes) {
        userData.notes = data.notes;
      }
      
      await db.collection(COLLECTION_PATH).doc(userId).set(userData);
      
      return { success: true, userId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: `Erstellen fehlgeschlagen: ${errorMessage}` };
    }
  }
  
  /**
   * Passwort aendern
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!db) {
        return { success: false, error: 'Datenbank nicht verfuegbar' };
      }
      
      const userDoc = await db.collection(COLLECTION_PATH).doc(userId).get();
      
      if (!userDoc.exists) {
        return { success: false, error: 'Benutzer nicht gefunden' };
      }
      
      const userData = userDoc.data();
      
      if (!userData) {
        return { success: false, error: 'Benutzer nicht gefunden' };
      }
      
      // Aktuelles Passwort pruefen
      const passwordValid = await bcrypt.compare(currentPassword, userData.passwordHash);
      
      if (!passwordValid) {
        return { success: false, error: 'Aktuelles Passwort ist falsch' };
      }
      
      // Neues Passwort hashen und speichern
      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      
      await db.collection(COLLECTION_PATH).doc(userId).update({
        passwordHash: newPasswordHash,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: `Passwort aendern fehlgeschlagen: ${errorMessage}` };
    }
  }
  
  /**
   * Alle Admin-Users abrufen
   */
  static async getAllAdminUsers(): Promise<Omit<AdminUser, 'passwordHash'>[]> {
    if (!db) {
      return [];
    }
    
    const snapshot = await db.collection(COLLECTION_PATH).get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        name: data.name,
        role: data.role,
        departments: data.departments || [],
        isActive: data.isActive,
        permissions: data.permissions || [],
        loginCount: data.loginCount || 0,
        lastLogin: data.lastLogin?.toDate?.(),
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.(),
        phone: data.phone,
        notes: data.notes,
      };
    });
  }
  
  /**
   * Admin-User deaktivieren/aktivieren
   */
  static async toggleUserStatus(userId: string): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
    try {
      if (!db) {
        return { success: false, error: 'Datenbank nicht verfuegbar' };
      }
      
      const userDoc = await db.collection(COLLECTION_PATH).doc(userId).get();
      
      if (!userDoc.exists) {
        return { success: false, error: 'Benutzer nicht gefunden' };
      }
      
      const userData = userDoc.data();
      const currentStatus = userData?.isActive;
      const newStatus = !currentStatus;
      
      await db.collection(COLLECTION_PATH).doc(userId).update({
        isActive: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return { success: true, isActive: newStatus };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * Initialen Master-Admin erstellen (nur wenn keine Admins existieren)
   */
  static async initializeMasterAdmin(): Promise<{ success: boolean; created: boolean; error?: string }> {
    try {
      if (!db) {
        return { success: false, created: false, error: 'Datenbank nicht verfuegbar' };
      }
      
      const snapshot = await db.collection(COLLECTION_PATH).limit(1).get();
      
      if (!snapshot.empty) {
        return { success: true, created: false };
      }
      
      // Master-Admin erstellen
      const result = await this.createAdminUser({
        email: 'andy.staudinger@taskilo.de',
        name: 'Andy Staudinger',
        password: 'taskilo2024',
        role: 'master-admin',
        departments: ['Management', 'Technical'],
        permissions: ['all'],
        notes: 'System Administrator und Gruender',
      });
      
      if (!result.success) {
        return { success: false, created: false, error: result.error };
      }
      
      return { success: true, created: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return { success: false, created: false, error: errorMessage };
    }
  }
}
