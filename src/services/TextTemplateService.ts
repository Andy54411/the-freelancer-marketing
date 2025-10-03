import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { TextTemplate, DEFAULT_TEXT_TEMPLATES } from '@/types/textTemplates';

export class TextTemplateService {
  private static readonly COLLECTION_NAME = 'textTemplates';

  /**
   * Erstellt eine neue Textvorlage
   */
  static async createTextTemplate(
    templateData: Omit<TextTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TextTemplate> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...templateData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Wenn als Standard festgelegt, andere Templates desselben Typs auf nicht-Standard setzen
      if (templateData.isDefault) {
        await this.updateOtherDefaultTemplates(
          templateData.companyId,
          templateData.objectType,
          templateData.textType,
          docRef.id
        );
      }

      // Zurückgeben des erstellten Templates
      return {
        id: docRef.id,
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Fehler beim Erstellen der Textvorlage:', error);
      throw new Error('Fehler beim Erstellen der Textvorlage');
    }
  }

  /**
   * Aktualisiert eine bestehende Textvorlage
   */
  static async updateTextTemplate(
    templateId: string,
    templateData: Partial<Omit<TextTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const templateRef = doc(db, this.COLLECTION_NAME, templateId);

      await updateDoc(templateRef, {
        ...templateData,
        updatedAt: serverTimestamp(),
      });

      // Wenn als Standard festgelegt, andere Templates desselben Typs auf nicht-Standard setzen
      if (
        templateData.isDefault &&
        templateData.companyId &&
        templateData.objectType &&
        templateData.textType
      ) {
        await this.updateOtherDefaultTemplates(
          templateData.companyId,
          templateData.objectType,
          templateData.textType,
          templateId
        );
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Textvorlage:', error);
      throw new Error('Fehler beim Aktualisieren der Textvorlage');
    }
  }

  /**
   * Löscht eine Textvorlage
   */
  static async deleteTextTemplate(templateId: string): Promise<void> {
    try {
      const templateRef = doc(db, this.COLLECTION_NAME, templateId);
      await deleteDoc(templateRef);
    } catch (error) {
      console.error('Fehler beim Löschen der Textvorlage:', error);
      throw new Error('Fehler beim Löschen der Textvorlage');
    }
  }

  /**
   * Lädt alle Textvorlagen für ein Unternehmen
   */
  static async getTextTemplates(companyId: string): Promise<TextTemplate[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return this.mapQuerySnapshotToTemplates(querySnapshot);
    } catch (error) {
      console.error('Fehler beim Laden der Textvorlagen:', error);
      throw new Error('Fehler beim Laden der Textvorlagen');
    }
  }

  /**
   * Lädt Textvorlagen nach Typ gefiltert
   */
  static async getTextTemplatesByType(
    companyId: string,
    objectType: TextTemplate['objectType'],
    textType?: TextTemplate['textType']
  ): Promise<TextTemplate[]> {
    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('companyId', '==', companyId),
        where('objectType', '==', objectType),
        orderBy('createdAt', 'desc')
      );

      if (textType) {
        q = query(
          collection(db, this.COLLECTION_NAME),
          where('companyId', '==', companyId),
          where('objectType', '==', objectType),
          where('textType', '==', textType),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return this.mapQuerySnapshotToTemplates(querySnapshot);
    } catch (error) {
      console.error('Fehler beim Laden der gefilterten Textvorlagen:', error);
      throw new Error('Fehler beim Laden der gefilterten Textvorlagen');
    }
  }

  /**
   * Lädt die Standard-Textvorlage für einen bestimmten Typ
   */
  static async getDefaultTextTemplate(
    companyId: string,
    objectType: TextTemplate['objectType'],
    textType: TextTemplate['textType']
  ): Promise<TextTemplate | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('companyId', '==', companyId),
        where('objectType', '==', objectType),
        where('textType', '==', textType),
        where('isDefault', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const templates = this.mapQuerySnapshotToTemplates(querySnapshot);

      return templates.length > 0 ? templates[0] : null;
    } catch (error) {
      console.error('Fehler beim Laden der Standard-Textvorlage:', error);
      return null;
    }
  }

  /**
   * Erstellt Standard-Textvorlagen für ein neues Unternehmen
   */
  static async createDefaultTemplates(companyId: string, userId: string): Promise<void> {
    try {
      const promises = DEFAULT_TEXT_TEMPLATES.map(template =>
        this.createTextTemplate({
          ...template,
          companyId,
          createdBy: userId,
        })
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Fehler beim Erstellen der Standard-Textvorlagen:', error);
      throw new Error('Fehler beim Erstellen der Standard-Textvorlagen');
    }
  }

  /**
   * Ersetzt Platzhalter in einem Text mit echten Werten
   */
  static replacePlaceholders(
    text: string,
    data: any,
    companySettings?: any,
    language: string = 'de'
  ): string {
    let result = text;

    // Formatierungsfunktionen
    const formatCurrency = (value?: number) =>
      typeof value === 'number'
        ? new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: data.currency || 'EUR',
          }).format(value)
        : '';

    const formatDate = (date?: Date | string) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('de-DE');
    };

    const getFullSalutation = () => {
      const salutations = {
        de: {
          formal: 'Sehr geehrte Damen und Herren',
          personal: (name: string) => `Sehr geehrte/r ${name}`,
        },
        en: {
          formal: 'Dear Sir or Madam',
          personal: (name: string) => `Dear ${name}`,
        },
        fr: {
          formal: 'Mesdames et Messieurs',
          personal: (name: string) => `Cher/Chère ${name}`,
        },
      };

      const langSalutations =
        salutations[language as keyof typeof salutations] || salutations['de'];

      if (data.customerName) {
        if (
          data.customerName.includes('GmbH') ||
          data.customerName.includes('AG') ||
          data.customerName.includes('Ltd') ||
          data.customerName.includes('Inc')
        ) {
          return langSalutations.formal;
        }
        return langSalutations.personal(data.customerName);
      }
      return langSalutations.formal;
    };

    // Platzhalter-Mapping
    const placeholderMap: Record<string, string> = {
      // Kunde
      '[%KUNDENNAME%]': data.customerName || '',
      '[%VOLLEANREDE%]': getFullSalutation(),
      '[%KUNDENNUMMER%]': data.customerNumber || '',
      '[%EMAIL%]': data.customerEmail || '',
      '[%STRASSE%]': data.customerAddress?.street || '',
      '[%PLZ%]': data.customerAddress?.zipCode || '',
      '[%ORT%]': data.customerAddress?.city || '',

      // Finanzen
      '[%BETRAG%]': formatCurrency(data.total),
      '[%WAEHRUNG%]': data.currency || 'EUR',
      '[%ANGEBOTSNUMMER%]': data.quoteNumber || '',
      '[%RECHNUNGSNUMMER%]': data.invoiceNumber || '',
      '[%ZAHLUNGSZIEL%]': formatDate(data.paymentDue),
      '[%ZAHLDATUM%]': formatDate(data.paymentDate),
      '[%NETTOBETRAG%]': formatCurrency(data.subtotal),
      '[%STEUERBETRAG%]': formatCurrency(data.taxAmount),

      // Unternehmen
      '[%KONTAKTPERSON%]': companySettings?.contactPerson || '',
      '[%FIRMENNAME%]': companySettings?.name || '',
      '[%TELEFON%]': companySettings?.contactInfo?.phone || '',
      '[%FIRMEN_EMAIL%]': companySettings?.contactInfo?.email || '',
      '[%WEBSITE%]': companySettings?.contactInfo?.website || '',
      '[%USTIDNR%]': companySettings?.vatId || '',
      '[%HANDELSREGISTER%]': companySettings?.commercialRegister || '',

      // Datum
      '[%DATUM%]': formatDate(new Date()),
      '[%ANGEBOTSDATUM%]': formatDate(data.createdAt),
      '[%GUELTIG_BIS%]': formatDate(data.validUntil),
    };

    // Alle Platzhalter ersetzen
    Object.entries(placeholderMap).forEach(([placeholder, value]) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        value
      );
    });

    return result;
  }

  /**
   * Setzt andere Standard-Templates auf nicht-Standard
   */
  private static async updateOtherDefaultTemplates(
    companyId: string,
    objectType: TextTemplate['objectType'],
    textType: TextTemplate['textType'],
    excludeTemplateId: string
  ): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('companyId', '==', companyId),
        where('objectType', '==', objectType),
        where('textType', '==', textType),
        where('isDefault', '==', true)
      );

      const querySnapshot = await getDocs(q);

      const updatePromises = querySnapshot.docs
        .filter(doc => doc.id !== excludeTemplateId)
        .map(doc =>
          updateDoc(doc.ref, {
            isDefault: false,
            updatedAt: serverTimestamp(),
          })
        );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Fehler beim Aktualisieren anderer Standard-Templates:', error);
    }
  }

  /**
   * Konvertiert QuerySnapshot zu TextTemplate Array
   */
  private static mapQuerySnapshotToTemplates(
    querySnapshot: QuerySnapshot<DocumentData>
  ): TextTemplate[] {
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        category: data.category,
        objectType: data.objectType,
        textType: data.textType,
        text: data.text,
        isDefault: data.isDefault,
        isPrivate: data.isPrivate,
        companyId: data.companyId,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as TextTemplate;
    });
  }

  /**
   * Erstellt Standard-Templates für ein Unternehmen (falls noch keine vorhanden)
   */
  static async createDefaultTemplatesIfNeeded(companyId: string, userId: string): Promise<void> {
    try {
      // Prüfen ob bereits Templates vorhanden sind
      const existingTemplates = await this.getTextTemplates(companyId);

      if (existingTemplates.length > 0) {
        return; // Templates bereits vorhanden
      }

      // Standard-Templates importieren
      const importPromises = DEFAULT_TEXT_TEMPLATES.map(template =>
        this.createTextTemplate({
          ...template,
          companyId,
          createdBy: userId,
        })
      );

      await Promise.all(importPromises);
    } catch (error) {
      console.error('Fehler beim Erstellen der Standard-Templates:', error);
      // Fehler nicht weiterwerfen, da dies optional ist
    }
  }
}
