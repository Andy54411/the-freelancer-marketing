import { FinAPISDKService, createFinAPIService, FinAPIUser } from './finapi-sdk-service';
import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

// Lokaler User-Typ mit password für Rückgabe-Kompatibilität
interface User extends FinAPIUser {
  password: string;
}

interface UserAuthData {
  finapiUserId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  status: 'created' | 'active' | 'inactive';
}

export class FinAPIUserAuthServiceServer {
  private static instance: FinAPIUserAuthServiceServer;
  private finapiService: FinAPISDKService;

  private constructor() {
    this.finapiService = createFinAPIService('sandbox');
  }

  public static getInstance(): FinAPIUserAuthServiceServer {
    if (!FinAPIUserAuthServiceServer.instance) {
      FinAPIUserAuthServiceServer.instance = new FinAPIUserAuthServiceServer();
    }
    return FinAPIUserAuthServiceServer.instance;
  }

  /**
   * Holt oder erstellt einen finAPI User für den aktuellen Firebase User
   */
  async getOrCreateFinAPIUser(firebaseUid: string, userEmail: string): Promise<User | null> {
    try {
      // 1. Prüfe ob User bereits in Firestore existiert
      const userDocRef = db.collection('finapi_users').doc(firebaseUid);
      const userDoc = await userDocRef.get();

      const userId = `taskilo_${firebaseUid}`;
      const password = this.generateSecurePassword();

      if (userDoc.exists) {
        const userData = userDoc.data() as UserAuthData;

        try {
          // Versuche User Token zu holen (prüft ob User existiert)
          const userToken = await this.finapiService.getUserToken(userData.finapiUserId, password);
          if (userToken) {
            // Update last access
            await userDocRef.update({
              updatedAt: new Date(),
              status: 'active',
            });

            return {
              id: userData.finapiUserId,
              password: password,
              email: userEmail,
              isAutoUpdateEnabled: true,
            } as User;
          }
        } catch (error) {}
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
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
        status: 'active',
      };

      await userDocRef.set(authData);

      return {
        ...user,
        password: password,
      } as User;
    } catch (error) {
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
      const userDocRef = db.collection('finapi_users').doc(firebaseUid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
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
        await userDocRef.update({
          accessToken: newToken,
          tokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 Stunden
          updatedAt: new Date(),
          status: 'active',
        });

        return newToken;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Markiert finAPI User als inaktiv (anstatt zu löschen)
   */
  async deactivateFinAPIUser(firebaseUid: string): Promise<boolean> {
    try {
      const userDocRef = db.collection('finapi_users').doc(firebaseUid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        // Markiere als inaktiv anstatt zu löschen
        await userDocRef.update({
          status: 'inactive',
          updatedAt: new Date(),
        });

        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Prüft den Status eines finAPI Users
   */
  async getUserStatus(firebaseUid: string): Promise<UserAuthData | null> {
    try {
      const userDocRef = db.collection('finapi_users').doc(firebaseUid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        return userDoc.data() as UserAuthData;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

// Export Singleton Instance
export const finapiUserAuthServer = FinAPIUserAuthServiceServer.getInstance();
