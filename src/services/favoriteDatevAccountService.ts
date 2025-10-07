// Service für DATEV-Favoriten-Management
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy,
  serverTimestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface FavoriteDatevAccount {
  id: string;
  code: string;
  name: string;
  category: string;
  addedAt: any; // Firestore Timestamp
  lastUsed?: any; // Firestore Timestamp
  usageCount?: number;
}

export class FavoriteDatevAccountService {
  /**
   * Fügt ein DATEV-Konto zu den Favoriten hinzu
   */
  static async addToFavorites(
    companyId: string, 
    accountCode: string, 
    accountName: string, 
    category: string
  ): Promise<void> {
    try {
      const favoriteRef = doc(db, 'companies', companyId, 'bookingAccounts', accountCode);
      
      await setDoc(favoriteRef, {
        id: `datev-${accountCode}`,
        code: accountCode,
        name: accountName,
        category: category,
        addedAt: serverTimestamp(),
        usageCount: 1
      });
      
      console.log(`✅ DATEV-Konto ${accountCode} zu Favoriten hinzugefügt`);
    } catch (error) {
      console.error('❌ Fehler beim Hinzufügen zu Favoriten:', error);
      throw error;
    }
  }

  /**
   * Entfernt ein DATEV-Konto aus den Favoriten
   */
  static async removeFromFavorites(companyId: string, accountCode: string): Promise<void> {
    try {
      const favoriteRef = doc(db, 'companies', companyId, 'bookingAccounts', accountCode);
      await deleteDoc(favoriteRef);
      
      console.log(`✅ DATEV-Konto ${accountCode} aus Favoriten entfernt`);
    } catch (error) {
      console.error('❌ Fehler beim Entfernen aus Favoriten:', error);
      throw error;
    }
  }

  /**
   * Lädt alle Favoriten-DATEV-Konten einer Company
   */
  static async getFavorites(companyId: string): Promise<FavoriteDatevAccount[]> {
    try {
      const favoritesRef = collection(db, 'companies', companyId, 'bookingAccounts');
      const q = query(favoritesRef, orderBy('lastUsed', 'desc'), orderBy('usageCount', 'desc'));
      
      const snapshot = await getDocs(q);
      
      const favorites: FavoriteDatevAccount[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        favorites.push({
          id: data.id,
          code: data.code,
          name: data.name,
          category: data.category,
          addedAt: data.addedAt,
          lastUsed: data.lastUsed,
          usageCount: data.usageCount || 0
        });
      });
      
      console.log(`✅ ${favorites.length} Favoriten-DATEV-Konten geladen`);
      return favorites;
    } catch (error) {
      console.error('❌ Fehler beim Laden der Favoriten:', error);
      return [];
    }
  }

  /**
   * Prüft ob ein DATEV-Konto in den Favoriten ist
   */
  static async isFavorite(companyId: string, accountCode: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites(companyId);
      return favorites.some(fav => fav.code === accountCode);
    } catch (error) {
      console.error('❌ Fehler beim Prüfen der Favoriten:', error);
      return false;
    }
  }

  /**
   * Aktualisiert die Nutzungsstatistiken eines Favoriten
   */
  static async updateUsageStats(companyId: string, accountCode: string): Promise<void> {
    try {
      const favoriteRef = doc(db, 'companies', companyId, 'bookingAccounts', accountCode);
      
      // Erhöhe usageCount und aktualisiere lastUsed
      await setDoc(favoriteRef, {
        lastUsed: serverTimestamp(),
        usageCount: (await this.getFavorites(companyId))
          .find(fav => fav.code === accountCode)?.usageCount || 0 + 1
      }, { merge: true });
      
      console.log(`✅ Nutzungsstatistiken für ${accountCode} aktualisiert`);
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Nutzungsstatistiken:', error);
    }
  }

  /**
   * Gibt die Top 5 meist genutzten Favoriten zurück
   */
  static async getTopFavorites(companyId: string, limit: number = 5): Promise<FavoriteDatevAccount[]> {
    try {
      const favorites = await this.getFavorites(companyId);
      return favorites
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Top-Favoriten:', error);
      return [];
    }
  }
}