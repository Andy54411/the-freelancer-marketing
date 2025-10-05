import { 
  doc, 
  getDoc, 
  setDoc, 
  runTransaction, 
  collection, 
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface NumberSequence {
  id?: string;
  companyId: string;
  type: string;
  format: string;
  nextNumber: number;
  nextFormatted?: string;
  prefix?: string;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NumberSequenceService {
  /**
   * Holt die nächste Nummer für einen bestimmten Typ (z.B. 'Rechnung', 'Kunde', 'Storno')
   * und inkrementiert sie automatisch in der numberSequences Collection
   * 
   * ✅ RACE-CONDITION-SAFE mit deterministischen Document IDs
   */
  static async getNextNumberForType(
    companyId: string,
    type: string
  ): Promise<{
    number: number;
    formattedNumber: string;
    format: string;
  }> {
    try {
      return await runTransaction(db, async transaction => {
        // ✅ Verwende deterministische Document ID um Duplikate zu vermeiden
        const docId = `${companyId}_${type}`;
        const sequenceDocRef = doc(db, 'numberSequences', docId);

        // ✅ Direkte Dokumentenreferenz statt Query (verhindert Race Conditions)
        const sequenceDoc = await transaction.get(sequenceDocRef);

        if (!sequenceDoc.exists()) {
          // ✅ Erstelle das Dokument mit deterministischer ID
          const newSequenceData = this.getDefaultSequenceData(companyId, type);
          
          // Setze das neue Dokument
          transaction.set(sequenceDocRef, newSequenceData);
          
          // Return erste Nummer
          return this.getFirstNumberForType(type, newSequenceData.format);
        }

        // ✅ Verwende das existierende Dokument direkt
        const sequenceData = sequenceDoc.data() as NumberSequence;
        const currentNumber = sequenceData.nextNumber;
        const format = sequenceData.format;

        // Formatiere die aktuelle Nummer
        const formattedNumber = this.formatNumber(currentNumber, format);

        // Inkrementiere die nächste Nummer
        const newNextNumber = currentNumber + 1;

        // ✅ Update mit deterministischer Document Reference
        transaction.update(sequenceDocRef, {
          nextNumber: newNextNumber,
          nextFormatted: this.formatNumber(newNextNumber, format),
          updatedAt: new Date(),
        });

        return {
          number: currentNumber,
          formattedNumber,
          format,
        };
      });
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der nächsten Nummer:', error);
      throw error;
    }
  }

  /**
   * ✅ Gibt Default-Daten für neue Nummerkreise zurück
   */
  private static getDefaultSequenceData(companyId: string, type: string): NumberSequence {
    const baseData = {
      companyId,
      type,
      canEdit: true,
      canDelete: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    switch (type) {
      case 'Storno':
        return {
          ...baseData,
          nextNumber: 1,
          format: 'ST-{number}',
          prefix: 'ST-'
        };
      case 'Kunde':
        return {
          ...baseData,
          nextNumber: 1001,
          format: 'KD-%NUMBER',
          prefix: 'KD-'
        };
      case 'Rechnung':
        return {
          ...baseData,
          nextNumber: 1,
          format: 'RE-{number}',
          prefix: 'RE-'
        };
      default:
        throw new Error(`Unbekannter Nummerkreis-Typ: ${type}`);
    }
  }

  /**
   * ✅ Gibt erste Nummer für neuen Nummerkreis zurück
   */
  private static getFirstNumberForType(type: string, format: string): {
    number: number;
    formattedNumber: string;
    format: string;
  } {
    switch (type) {
      case 'Storno':
        return {
          number: 1,
          formattedNumber: 'ST-1',
          format: 'ST-{number}'
        };
      case 'Kunde':
        return {
          number: 1000,
          formattedNumber: 'AUTO-GENERATED',
          format: 'KD-%NUMBER'
        };
      case 'Rechnung':
        return {
          number: 1,
          formattedNumber: 'RE-1',
          format: 'RE-{number}'
        };
      default:
        return {
          number: 1,
          formattedNumber: this.formatNumber(1, format),
          format
        };
    }
  }

  /**
   * Formatiert eine Nummer basierend auf dem gegebenen Format
   */
  static formatNumber(number: number, format: string): string {
    if (!format) {
      return number.toString();
    }

    // Handle %NUMBER format replacement
    if (format.includes('%NUMBER')) {
      return format.replace('%NUMBER', number.toString());
    }

    // Handle {number} format (z.B. "ST-{number}" -> "ST-1")
    if (format.includes('{number}')) {
      return format.replace('{number}', number.toString());
    }

    // Handle {number:3} format mit Padding
    const paddingMatch = format.match(/\{number:(\d+)\}/);
    if (paddingMatch) {
      const padding = parseInt(paddingMatch[1]);
      const paddedNumber = number.toString().padStart(padding, '0');
      return format.replace(/\{number:\d+\}/, paddedNumber);
    }

    // Default: einfach anhängen
    return `${format}${number}`;
  }

  /**
   * Holt alle Nummerkreise für eine Company
   */
  static async getNumberSequences(companyId: string): Promise<NumberSequence[]> {
    try {
      const q = query(
        collection(db, 'numberSequences'),
        where('companyId', '==', companyId)
      );
      
      const querySnapshot = await getDocs(q);
      const sequences: NumberSequence[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sequences.push({
          id: doc.id,
          companyId: data.companyId,
          type: data.type,
          format: data.format,
          nextNumber: data.nextNumber,
          nextFormatted: data.nextFormatted || this.formatNumber(data.nextNumber, data.format),
          prefix: data.prefix,
          canEdit: data.canEdit ?? true,
          canDelete: data.canDelete ?? false,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        });
      });
      
      return sequences.sort((a, b) => a.type.localeCompare(b.type));
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Nummerkreise:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen spezifischen Nummerkreis
   */
  static async updateNumberSequence(
    companyId: string,
    sequenceId: string,
    updates: Partial<NumberSequence>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'numberSequences', sequenceId);
      
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Wenn nextNumber aktualisiert wird, auch nextFormatted berechnen
      if (updates.nextNumber !== undefined && updates.format) {
        updateData.nextFormatted = this.formatNumber(updates.nextNumber, updates.format);
      }
      
      await updateDoc(docRef, updateData);
      
      console.log(`✅ Nummerkreis ${sequenceId} erfolgreich aktualisiert`);
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Nummerkreises:', error);
      throw error;
    }
  }

  /**
   * Erstellt Standard-Nummerkreise für eine neue Company
   */
  static async createDefaultSequences(companyId: string): Promise<NumberSequence[]> {
    try {
      const defaultTypes = [
        { type: 'Rechnung', format: 'RE-%NUMBER', nextNumber: 1000, prefix: 'RE-' },
        { type: 'Angebot', format: 'AN-%NUMBER', nextNumber: 1000, prefix: 'AN-' },
        { type: 'Kunde', format: 'KD-%NUMBER', nextNumber: 1000, prefix: 'KD-' },
        { type: 'Lieferschein', format: 'LI-%NUMBER', nextNumber: 1000, prefix: 'LI-' },
        { type: 'Gutschrift', format: 'GU-%NUMBER', nextNumber: 1000, prefix: 'GU-' },
        { type: 'Auftragsbestätigung', format: 'AB-%NUMBER', nextNumber: 1000, prefix: 'AB-' },
        { type: 'Debitor', format: '%NUMBER', nextNumber: 10000 },
        { type: 'Kreditor', format: '%NUMBER', nextNumber: 70000 },
        { type: 'Produkt', format: '%NUMBER', nextNumber: 1001 },
        { type: 'Inventar', format: '%NUMBER', nextNumber: 1000 },
        { type: 'Kontakt', format: '%NUMBER', nextNumber: 1000 }
      ];

      const createdSequences: NumberSequence[] = [];

      for (const template of defaultTypes) {
        const docId = `${companyId}_${template.type}`;
        const docRef = doc(db, 'numberSequences', docId);
        
        // Prüfe ob bereits existiert
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists()) {
          const data = existingDoc.data();
          createdSequences.push({
            id: docId,
            companyId: data.companyId,
            type: data.type,
            format: data.format,
            nextNumber: data.nextNumber,
            nextFormatted: data.nextFormatted || this.formatNumber(data.nextNumber, data.format),
            prefix: data.prefix,
            canEdit: data.canEdit ?? true,
            canDelete: data.canDelete ?? false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
          });
          continue;
        }

        const sequenceData: NumberSequence = {
          id: docId,
          companyId,
          type: template.type,
          format: template.format,
          nextNumber: template.nextNumber,
          nextFormatted: this.formatNumber(template.nextNumber, template.format),
          prefix: template.prefix,
          canEdit: true,
          canDelete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(docRef, sequenceData);
        createdSequences.push(sequenceData);
      }

      return createdSequences.sort((a, b) => a.type.localeCompare(b.type));
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Standard-Nummerkreise:', error);
      throw error;
    }
  }
}