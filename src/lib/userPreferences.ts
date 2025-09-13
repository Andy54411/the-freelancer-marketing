// User Preferences Service für Template-Integration
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { InvoiceTemplate, AVAILABLE_TEMPLATES } from '@/components/finance/InvoiceTemplates';
import {
  DeliveryNoteTemplate,
  AVAILABLE_DELIVERY_NOTE_TEMPLATES,
} from '@/components/finance/delivery-note-templates';

export interface UserPreferences {
  preferredInvoiceTemplate: InvoiceTemplate | null; // null bedeutet: User muss auswählen
  preferredDeliveryNoteTemplate: DeliveryNoteTemplate | null; // null bedeutet: User muss auswählen
  preferredQuoteTemplate: string | null; // Angebots-Template
  preferredLanguage?: string;
  preferredCurrency?: string;
}

/**
 * Holt das Default-Template aus der Company-Einstellungen
 * Gibt null zurück wenn kein Template gesetzt ist - dann soll User auswählen
 */
export async function getCompanyDefaultTemplate(
  companyId: string
): Promise<InvoiceTemplate | null> {
  try {
    const companyRef = doc(db, 'companies', companyId);
    const companySnap = await getDoc(companyRef);

    if (companySnap.exists()) {
      const companyData = companySnap.data();
      return companyData.defaultInvoiceTemplate || null; // null wenn nicht gesetzt
    }

    return null; // User muss Template auswählen
  } catch (error) {
    return null; // User muss Template auswählen
  }
}

export class UserPreferencesService {
  private static readonly COLLECTION = 'userPreferences';

  /**
   * Lädt User-Preferences für einen Benutzer
   */
  static async getUserPreferences(userId: string, companyId?: string): Promise<UserPreferences> {
    try {
      const docRef = doc(db, this.COLLECTION, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          preferredInvoiceTemplate: data.preferredInvoiceTemplate || null, // null wenn nicht gesetzt
          preferredDeliveryNoteTemplate: data.preferredDeliveryNoteTemplate || null, // null wenn nicht gesetzt
          preferredQuoteTemplate: data.preferredQuoteTemplate || null, // null wenn nicht gesetzt
          preferredLanguage: data.preferredLanguage || 'de',
          preferredCurrency: data.preferredCurrency || 'EUR',
        };
      }

      // Default Preferences wenn keine gefunden - hole Company Default falls verfügbar
      const defaultTemplate = companyId ? await getCompanyDefaultTemplate(companyId) : null; // null bedeutet: User muss Template auswählen

      return {
        preferredInvoiceTemplate: defaultTemplate, // kann null sein
        preferredDeliveryNoteTemplate: null, // User muss Template auswählen
        preferredQuoteTemplate: null, // User muss Template auswählen
        preferredLanguage: 'de',
        preferredCurrency: 'EUR',
      };
    } catch (error) {
      const fallbackTemplate = AVAILABLE_TEMPLATES[0]?.id as InvoiceTemplate;
      return {
        preferredInvoiceTemplate: fallbackTemplate,
        preferredDeliveryNoteTemplate: 'german-standard', // Default
        preferredQuoteTemplate: 'german-standard', // Default
        preferredLanguage: 'de',
        preferredCurrency: 'EUR',
      };
    }
  }

  /**
   * Speichert User-Preferences für einen Benutzer
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, userId);
      await setDoc(
        docRef,
        {
          ...preferences,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      throw new Error('User-Preferences konnten nicht gespeichert werden');
    }
  }

  /**
   * Holt nur das bevorzugte Template
   * Gibt null zurück wenn kein Template ausgewählt ist - dann soll Modal erscheinen
   */
  static async getPreferredTemplate(
    userId: string,
    companyId?: string
  ): Promise<InvoiceTemplate | null> {
    const preferences = await this.getUserPreferences(userId, companyId);
    return preferences.preferredInvoiceTemplate; // kann null sein
  }

  /**
   * Holt nur das bevorzugte Delivery Note Template
   * Gibt null zurück wenn kein Template ausgewählt ist - dann soll Modal erscheinen
   */
  static async getPreferredDeliveryNoteTemplate(
    userId: string,
    companyId?: string
  ): Promise<DeliveryNoteTemplate | null> {
    const preferences = await this.getUserPreferences(userId, companyId);
    return preferences.preferredDeliveryNoteTemplate; // kann null sein
  }
}
