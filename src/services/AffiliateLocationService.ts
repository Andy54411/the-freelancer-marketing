import { db } from '@/firebase/clients';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

export interface AffiliateLocationSelection {
  id: string;
  companyId: string;
  campaignId?: string;
  selectedChains: {
    chainId: string;
    chainName: string;
    placeId: string;
    countryId: string;
    countryName: string;
    countryCode: string;
    locationCount: number;
    category: string;
  }[];
  totalLocations: number;
  countries: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class AffiliateLocationService {
  /**
   * Speichert die ausgewählten Affiliate-Standorte
   */
  static async saveAffiliateSelection(
    companyId: string,
    selectedItems: any[],
    campaignId?: string
  ): Promise<string> {
    try {
      const selectionId = `${companyId}_${Date.now()}`;
      const totalLocations = selectedItems.reduce((sum, item) => sum + item.locationCount, 0);
      const countries = [...new Set(selectedItems.map(item => item.countryName))];

      const affiliateSelection: AffiliateLocationSelection = {
        id: selectionId,
        companyId,
        campaignId,
        selectedChains: selectedItems.map(item => ({
          chainId: item.chainId!,
          chainName: item.chainName!,
          placeId: item.placeId!,
          countryId: item.countryId,
          countryName: item.countryName,
          countryCode: item.countryCode || 'XX',
          locationCount: item.locationCount,
          category: item.category || 'retail',
        })),
        totalLocations,
        countries,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Speichere in Company-Subcollection
      await setDoc(
        doc(db, 'companies', companyId, 'affiliateSelections', selectionId),
        affiliateSelection
      );

      console.log('✅ Affiliate-Standorte erfolgreich gespeichert:', selectionId);
      return selectionId;
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Affiliate-Standorte:', error);
      throw error;
    }
  }

  /**
   * Lädt gespeicherte Affiliate-Standorte
   */
  static async getAffiliateSelection(
    companyId: string,
    selectionId: string
  ): Promise<AffiliateLocationSelection | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'affiliateSelections', selectionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as AffiliateLocationSelection;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Affiliate-Standorte:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine Affiliate-Auswahl mit Kampagnen-ID
   */
  static async updateCampaignId(
    companyId: string,
    selectionId: string,
    campaignId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId, 'affiliateSelections', selectionId);
      await updateDoc(docRef, {
        campaignId,
        updatedAt: Timestamp.now(),
      });

      console.log('✅ Kampagnen-ID erfolgreich aktualisiert:', { selectionId, campaignId });
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Kampagnen-ID:', error);
      throw error;
    }
  }

  /**
   * Konvertiert Affiliate-Auswahl zu Google Ads Location Extensions Format
   */
  static convertToGoogleAdsFormat(selection: AffiliateLocationSelection) {
    return {
      locationExtensions: selection.selectedChains.map(chain => ({
        placeId: chain.placeId,
        businessName: chain.chainName,
        countryCode: chain.countryCode,
        estimatedLocationCount: chain.locationCount,
        category: chain.category,
      })),
      targetingCriteria: {
        countries: selection.countries,
        totalReach: selection.totalLocations,
        chainTypes: [...new Set(selection.selectedChains.map(c => c.category))],
      },
    };
  }

  /**
   * Erstellt eine Zusammenfassung für die UI
   */
  static createSummary(selectedItems: any[]): {
    totalLocations: number;
    countries: string[];
    chainsByCountry: { [country: string]: string[] };
    topChains: { name: string; locations: number }[];
  } {
    const totalLocations = selectedItems.reduce((sum, item) => sum + item.locationCount, 0);
    const countries = [...new Set(selectedItems.map(item => item.countryName))];

    const chainsByCountry: { [country: string]: string[] } = {};
    selectedItems.forEach(item => {
      if (!chainsByCountry[item.countryName]) {
        chainsByCountry[item.countryName] = [];
      }
      chainsByCountry[item.countryName].push(item.chainName!);
    });

    const topChains = selectedItems
      .sort((a, b) => b.locationCount - a.locationCount)
      .slice(0, 5)
      .map(item => ({
        name: item.chainName!,
        locations: item.locationCount,
      }));

    return {
      totalLocations,
      countries,
      chainsByCountry,
      topChains,
    };
  }
}
