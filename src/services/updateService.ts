'use client';

import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  where,
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { UpdateNotification, UserUpdateStatus, CreateUpdateRequest } from '@/types/updates';

export class UpdateService {
  /**
   * Alle Updates abrufen (nach Release-Datum sortiert)
   */
  static async getAllUpdates(): Promise<UpdateNotification[]> {
    try {
      const updatesRef = collection(db, 'updates');
      const q = query(updatesRef, orderBy('releaseDate', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        releaseDate: doc.data().releaseDate?.toDate?.()?.toISOString() || doc.data().releaseDate,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      })) as UpdateNotification[];
    } catch (error) {
      console.error('Fehler beim Laden der Updates:', error);
      throw error;
    }
  }

  /**
   * Neueste Updates abrufen (limitiert)
   */
  static async getLatestUpdates(limitCount: number = 5): Promise<UpdateNotification[]> {
    try {
      const updatesRef = collection(db, 'updates');
      const q = query(updatesRef, orderBy('releaseDate', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        releaseDate: doc.data().releaseDate?.toDate?.()?.toISOString() || doc.data().releaseDate,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      })) as UpdateNotification[];
    } catch (error) {
      console.error('Fehler beim Laden der neuesten Updates:', error);
      throw error;
    }
  }

  /**
   * Ungesehene Updates für einen User abrufen
   */
  static async getUnseenUpdates(userId: string): Promise<UpdateNotification[]> {
    try {
      const userStatus = await this.getUserUpdateStatus(userId);
      const allUpdates = await this.getAllUpdates();

      // Filtere Updates, die nach der letzten gesehenen Version veröffentlicht wurden
      // und nicht verworfen wurden
      return allUpdates.filter(
        update =>
          !userStatus.seenUpdates.includes(update.id) &&
          !(userStatus.dismissedUpdates || []).includes(update.id) &&
          new Date(update.releaseDate) > new Date(userStatus.lastChecked)
      );
    } catch (error) {
      console.error('Fehler beim Laden ungesehener Updates:', error);
      throw error;
    }
  }

  /**
   * User Update Status abrufen (funktioniert für beide: users und companies)
   */
  static async getUserUpdateStatus(userId: string): Promise<UserUpdateStatus> {
    try {
      // Zuerst versuchen, den Status zu laden
      const statusDoc = await getDoc(doc(db, 'userUpdateStatus', userId));

      if (statusDoc.exists()) {
        const data = statusDoc.data();
        return {
          userId,
          lastSeenVersion: data.lastSeenVersion || '0.0.0',
          seenUpdates: data.seenUpdates || [],
          dismissedUpdates: data.dismissedUpdates || [],
          lastChecked: data.lastChecked?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      }

      // Prüfe, ob es ein User oder Company ist
      const isCompany = await this.isCompanyUser(userId);
      console.log(`🔍 User ${userId} ist ${isCompany ? 'Company' : 'User'}`);

      // Erstelle neuen Status, wenn keiner existiert - mit altem Datum für neue Updates
      const defaultStatus: UserUpdateStatus = {
        userId,
        lastSeenVersion: '0.0.0',
        seenUpdates: [],
        dismissedUpdates: [],
        lastChecked: new Date('2024-01-01').toISOString(), // Altes Datum, damit alle neuen Updates angezeigt werden
      };

      await setDoc(doc(db, 'userUpdateStatus', userId), {
        ...defaultStatus,
        lastChecked: serverTimestamp(),
        userType: isCompany ? 'company' : 'user', // Speichere den Typ für Debug-Zwecke
      });

      return defaultStatus;
    } catch (error) {
      console.error('Fehler beim Laden des User Status:', error);
      throw error;
    }
  }

  /**
   * Prüfe, ob eine UID zu einer Company gehört
   */
  private static async isCompanyUser(userId: string): Promise<boolean> {
    try {
      // Prüfe zuerst, ob ein Company-Dokument existiert
      const companyDoc = await getDoc(doc(db, 'companies', userId));
      if (companyDoc.exists()) {
        return true;
      }

      // Fallback: Prüfe User-Dokument auf user_type
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.user_type === 'firma';
      }

      return false;
    } catch (error) {
      console.error('Fehler beim Prüfen des User-Typs:', error);
      return false;
    }
  }

  /**
   * Update als gesehen markieren
   */
  static async markUpdateAsSeen(userId: string, updateId: string, version: string): Promise<void> {
    try {
      const statusRef = doc(db, 'userUpdateStatus', userId);
      const currentStatus = await this.getUserUpdateStatus(userId);

      // Validiere version Parameter - verwende aktuelle lastSeenVersion als Fallback
      const validVersion = version || currentStatus.lastSeenVersion || '0.0.0';

      await updateDoc(statusRef, {
        lastSeenVersion: validVersion,
        seenUpdates: [...new Set([...currentStatus.seenUpdates, updateId])],
        lastChecked: serverTimestamp(),
      });
    } catch (error) {
      console.error('Fehler beim Markieren des Updates:', error);
      throw error;
    }
  }

  /**
   * Alle Updates als gesehen markieren
   */
  static async markAllUpdatesAsSeen(userId: string): Promise<void> {
    try {
      const allUpdates = await this.getAllUpdates();
      const latestVersion = allUpdates[0]?.version || '0.0.0';
      const allUpdateIds = allUpdates.map(update => update.id);

      const statusRef = doc(db, 'userUpdateStatus', userId);
      await updateDoc(statusRef, {
        lastSeenVersion: latestVersion,
        seenUpdates: allUpdateIds,
        lastChecked: serverTimestamp(),
      });
    } catch (error) {
      console.error('Fehler beim Markieren aller Updates:', error);
      throw error;
    }
  }

  /**
   * Update verwerfen (wird nicht mehr als Notification angezeigt)
   */
  static async dismissUpdate(userId: string, updateId: string, version: string): Promise<void> {
    try {
      const statusRef = doc(db, 'userUpdateStatus', userId);
      const currentStatus = await this.getUserUpdateStatus(userId);

      await updateDoc(statusRef, {
        dismissedUpdates: [...new Set([...(currentStatus.dismissedUpdates || []), updateId])],
        lastChecked: serverTimestamp(),
      });
    } catch (error) {
      console.error('Fehler beim Verwerfen des Updates:', error);
      throw error;
    }
  }

  /**
   * Neues Update erstellen (nur für Admins/Entwickler)
   */
  static async createUpdate(updateData: CreateUpdateRequest, createdBy: string): Promise<string> {
    try {
      const newUpdate = {
        ...updateData,
        releaseDate: serverTimestamp(),
        createdBy,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'updates'), newUpdate);
      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen des Updates:', error);
      throw error;
    }
  }

  /**
   * Update bearbeiten (nur für Admins/Entwickler)
   */
  static async updateUpdate(
    updateId: string,
    updateData: Partial<UpdateNotification>
  ): Promise<void> {
    try {
      const updateRef = doc(db, 'updates', updateId);
      await updateDoc(updateRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Fehler beim Bearbeiten des Updates:', error);
      throw error;
    }
  }

  /**
   * Real-time Updates abonnieren
   */
  static subscribeToUpdates(callback: (updates: UpdateNotification[]) => void): Unsubscribe {
    const updatesRef = collection(db, 'updates');
    const q = query(updatesRef, orderBy('releaseDate', 'desc'));

    return onSnapshot(q, snapshot => {
      const updates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        releaseDate: doc.data().releaseDate?.toDate?.()?.toISOString() || doc.data().releaseDate,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      })) as UpdateNotification[];

      callback(updates);
    });
  }

  /**
   * Updates nach Kategorie filtern
   */
  static async getUpdatesByCategory(category: string): Promise<UpdateNotification[]> {
    try {
      const updatesRef = collection(db, 'updates');
      const q = query(
        updatesRef,
        where('category', '==', category),
        orderBy('releaseDate', 'desc')
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        releaseDate: doc.data().releaseDate?.toDate?.()?.toISOString() || doc.data().releaseDate,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      })) as UpdateNotification[];
    } catch (error) {
      console.error('Fehler beim Filtern der Updates:', error);
      throw error;
    }
  }

  /**
   * Anzahl ungesehener Updates für einen User
   */
  static async getUnseenUpdateCount(userId: string): Promise<number> {
    try {
      const unseenUpdates = await this.getUnseenUpdates(userId);
      return unseenUpdates.length;
    } catch (error) {
      console.error('Fehler beim Zählen ungesehener Updates:', error);
      return 0;
    }
  }
}

export default UpdateService;
