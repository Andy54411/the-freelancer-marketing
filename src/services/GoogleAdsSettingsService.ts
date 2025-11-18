import { db } from '@/firebase/clients';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

export interface GoogleAdsFilterSettings {
  campaignStatus: string;
  adGroupStatus: string;
  lastUpdated: Timestamp;
  updatedBy: string;
}

export class GoogleAdsSettingsService {
  /**
   * Speichert die Google Ads Filter-Einstellungen in der company subcollection
   */
  static async saveFilterSettings(
    companyId: string, 
    settings: Omit<GoogleAdsFilterSettings, 'lastUpdated' | 'updatedBy'>
  ): Promise<void> {
    try {
      const settingsDoc = doc(db, 'companies', companyId, 'advertising_connections', 'google-ads');
      
      // Aktuelle Daten abrufen um sie zu erweitern
      const currentDoc = await getDoc(settingsDoc);
      const currentData = currentDoc.exists() ? currentDoc.data() : {};
      
      // Filter-Einstellungen hinzufügen/aktualisieren
      const updatedData = {
        ...currentData,
        filterSettings: {
          campaignStatus: settings.campaignStatus,
          adGroupStatus: settings.adGroupStatus,
          lastUpdated: Timestamp.now(),
          updatedBy: 'user'
        }
      };
      
      await setDoc(settingsDoc, updatedData, { merge: true });
      
      console.log('Google Ads Filter-Einstellungen erfolgreich gespeichert:', {
        companyId,
        settings: updatedData.filterSettings
      });
      
    } catch (error) {
      console.error('Fehler beim Speichern der Google Ads Filter-Einstellungen:', error);
      throw new Error('Filter-Einstellungen konnten nicht gespeichert werden');
    }
  }

  /**
   * Lädt die gespeicherten Google Ads Filter-Einstellungen
   */
  static async loadFilterSettings(companyId: string): Promise<GoogleAdsFilterSettings | null> {
    try {
      const settingsDoc = doc(db, 'companies', companyId, 'advertising_connections', 'google-ads');
      const docSnap = await getDoc(settingsDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.filterSettings || null;
      }
      
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Google Ads Filter-Einstellungen:', error);
      return null;
    }
  }
}