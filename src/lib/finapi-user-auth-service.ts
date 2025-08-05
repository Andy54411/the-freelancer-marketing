import { finapiService, FinAPISDKService, createFinAPIService } from './finapi-sdk-service';
import { auth, db } from '@/firebase/clients';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { User } from 'finapi-client';

interface UserAuthData {
  finapiUserId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'created' | 'active' | 'inactive';
}

export class FinAPIUserAuthService {
  private static instance: FinAPIUserAuthService;
  private finapiService: FinAPISDKService;

  private constructor() {
    this.finapiService = createFinAPIService('sandbox');
  }

  public static getInstance(): FinAPIUserAuthService {
    if (!FinAPIUserAuthService.instance) {
      FinAPIUserAuthService.instance = new FinAPIUserAuthService();
    }
    return FinAPIUserAuthService.instance;
  }

  /**
   * Holt oder erstellt einen finAPI User für den aktuellen Firebase User
   */
  async getOrCreateFinAPIUser(firebaseUid: string, userEmail: string): Promise<User | null> {
    try {
      // 1. Prüfe ob User bereits in Firestore existiert
      const userDocRef = doc(db, 'finapi_users', firebaseUid);
      const userDoc = await getDoc(userDocRef);

      const userId = `taskilo_${firebaseUid}`;
      const password = this.generateSecurePassword();

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserAuthData;

        try {
          // Versuche User Token zu holen (prüft ob User existiert)
          const userToken = await this.finapiService.getUserToken(userData.finapiUserId, password);
          if (userToken) {
            console.log('✅ Existing finAPI user found:', userData.finapiUserId);

            // Update last access
            await updateDoc(userDocRef, {
              updatedAt: Timestamp.now(),
              status: 'active',
            });

            return {
              id: userData.finapiUserId,
              password: password,
              email: userEmail,
              isAutoUpdateEnabled: true,
            } as User;
          }
        } catch (error) {
          console.log('⚠️ finAPI user not found, creating new one...');
        }
      }

      // 2. Erstelle neuen finAPI User
      const { user, userToken } = await this.finapiService.getOrCreateUser(
        userId,
        password,
        userEmail
      );

      if (!user) {
        throw new Error('Failed to create finAPI user');
      }

      // 3. Speichere User-Daten in Firestore
      const authData: UserAuthData = {
        finapiUserId: user.id,
        accessToken: userToken,
        tokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 Stunden
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'active',
      };

      await setDoc(userDocRef, authData);

      console.log('✅ finAPI user created and stored:', user.id);
      return user;
    } catch (error) {
      console.error('❌ Error in getOrCreateFinAPIUser:', error);
      return null;
    }
  }

  /**
   * Generiert ein sicheres Passwort für finAPI User
   */
  private generateSecurePassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  /**
   * Erstellt User-spezifischen Access Token für finAPI Requests
   */
  async getUserAccessToken(firebaseUid: string): Promise<string | null> {
    try {
      const userDocRef = doc(db, 'finapi_users', firebaseUid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error('❌ No finAPI user found for Firebase UID:', firebaseUid);
        return null;
      }

      const userData = userDoc.data() as UserAuthData;

      // Prüfe ob Token noch gültig ist
      if (userData.accessToken && userData.tokenExpiresAt) {
        const now = Date.now();
        if (now < userData.tokenExpiresAt) {
          return userData.accessToken;
        }
      }

      // Token abgelaufen oder nicht vorhanden - erstelle neuen
      const password = this.generateSecurePassword(); // In production sollte das gespeichert werden
      const newToken = await this.finapiService.getUserToken(userData.finapiUserId, password);

      if (newToken) {
        // Update Firestore mit neuem Token
        await updateDoc(userDocRef, {
          accessToken: newToken,
          tokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 Stunden
          updatedAt: Timestamp.now(),
          status: 'active',
        });

        return newToken;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting user access token:', error);
      return null;
    }
  }

  /**
   * Markiert finAPI User als inaktiv (anstatt zu löschen)
   */
  async deactivateFinAPIUser(firebaseUid: string): Promise<boolean> {
    try {
      const userDocRef = doc(db, 'finapi_users', firebaseUid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Markiere als inaktiv anstatt zu löschen
        await updateDoc(userDocRef, {
          status: 'inactive',
          updatedAt: Timestamp.now(),
        });

        console.log('✅ finAPI user deactivated for Firebase UID:', firebaseUid);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error deactivating finAPI user:', error);
      return false;
    }
  }

  /**
   * Prüft den Status eines finAPI Users
   */
  async getUserStatus(firebaseUid: string): Promise<UserAuthData | null> {
    try {
      const userDocRef = doc(db, 'finapi_users', firebaseUid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data() as UserAuthData;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting user status:', error);
      return null;
    }
  }
}

// Export Singleton Instance
export const finapiUserAuth = FinAPIUserAuthService.getInstance();
