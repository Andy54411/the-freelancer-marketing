// User Preferences Service für Template-Integration
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { InvoiceTemplate, DEFAULT_INVOICE_TEMPLATE } from '@/components/finance/InvoiceTemplates';

export interface UserPreferences {
  preferredInvoiceTemplate: InvoiceTemplate;
  preferredLanguage?: string;
  preferredCurrency?: string;
}

export class UserPreferencesService {
  private static readonly COLLECTION = 'userPreferences';

  /**
   * Lädt User-Preferences für einen Benutzer
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const docRef = doc(db, this.COLLECTION, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          preferredInvoiceTemplate: data.preferredInvoiceTemplate || DEFAULT_INVOICE_TEMPLATE,
          preferredLanguage: data.preferredLanguage || 'de',
          preferredCurrency: data.preferredCurrency || 'EUR',
        };
      }

      // Default Preferences wenn keine gefunden
      return {
        preferredInvoiceTemplate: DEFAULT_INVOICE_TEMPLATE,
        preferredLanguage: 'de',
        preferredCurrency: 'EUR',
      };
    } catch (error) {

      return {
        preferredInvoiceTemplate: DEFAULT_INVOICE_TEMPLATE,
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
   */
  static async getPreferredTemplate(userId: string): Promise<InvoiceTemplate> {
    const preferences = await this.getUserPreferences(userId);
    return preferences.preferredInvoiceTemplate;
  }
}
