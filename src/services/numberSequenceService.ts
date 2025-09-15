'use client';

import { db } from '@/firebase/clients';
import { doc, getDoc, setDoc, runTransaction, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';

export interface NumberSequence {
  id: string;
  format: string;
  type: string;
  nextNumber: number;
  nextFormatted: string;
  canEdit: boolean;
  canDelete: boolean;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NumberSequenceTemplate {
  format: string;
  type: string;
  nextNumber: number;
  nextFormatted: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface NumberSequenceUpdate {
  format: string;
  nextNumber: number;
}

export class NumberSequenceService {
  /**
   * Lädt alle Nummerkreise für eine Company aus der zentralen numberSequences Collection
   */
  static async getNumberSequences(companyId: string): Promise<NumberSequence[]> {
    try {
      const q = query(
        collection(db, 'numberSequences'),
        where('companyId', '==', companyId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const sequences: NumberSequence[] = [];
        querySnapshot.forEach((doc) => {
          sequences.push({
            id: doc.id,
            ...doc.data()
          } as NumberSequence);
        });
        return sequences.sort((a, b) => a.type.localeCompare(b.type));
      }

      // Erstelle Default-Sequenzen wenn noch keine existieren
      const defaultSequences = await this.createDefaultSequences(companyId);
      return defaultSequences;
    } catch (error) {
      console.error('Fehler beim Laden der Nummerkreise:', error);
      return [];
    }
  }

  /**
   * Erstellt die Standard-Nummerkreise für eine neue Company in der numberSequences Collection
   */
  static async createDefaultSequences(companyId: string): Promise<NumberSequence[]> {
    const defaultTemplates = this.getDefaultSequenceTemplates();
    const createdSequences: NumberSequence[] = [];

    try {
      for (const template of defaultTemplates) {
        const sequenceData = {
          ...template,
          companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const docRef = await addDoc(collection(db, 'numberSequences'), sequenceData);
        
        createdSequences.push({
          ...sequenceData,
          id: docRef.id,
        });
      }
      
      return createdSequences.sort((a, b) => a.type.localeCompare(b.type));
    } catch (error) {
      console.error('Fehler beim Erstellen der Standard-Nummerkreise:', error);
      throw error;
    }
  }

  /**
   * Holt die nächste Nummer für einen bestimmten Typ (z.B. 'Rechnung')
   * und inkrementiert sie automatisch in der numberSequences Collection
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
      return await runTransaction(db, async (transaction) => {
        // Finde das spezifische Nummerkreis-Dokument für diesen Typ
        const q = query(
          collection(db, 'numberSequences'),
          where('companyId', '==', companyId),
          where('type', '==', type)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error(`Nummerkreis für Typ '${type}' nicht gefunden`);
        }

        const sequenceDoc = querySnapshot.docs[0];
        const sequenceData = sequenceDoc.data() as NumberSequence;
        const currentNumber = sequenceData.nextNumber;
        const format = sequenceData.format;

        // Formatiere die aktuelle Nummer
        const formattedNumber = this.formatNumber(currentNumber, format);

        // Inkrementiere die nächste Nummer
        const newNextNumber = currentNumber + 1;
        const docRef = doc(db, 'numberSequences', sequenceDoc.id);
        
        transaction.update(docRef, {
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
      console.error('Fehler beim Abrufen der nächsten Nummer:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen spezifischen Nummerkreis in der numberSequences Collection
   */
  static async updateNumberSequence(
    companyId: string,
    sequenceId: string,
    update: NumberSequenceUpdate
  ): Promise<void> {
    try {
      const docRef = doc(db, 'numberSequences', sequenceId);
      await updateDoc(docRef, {
        format: update.format,
        nextNumber: update.nextNumber,
        nextFormatted: this.formatNumber(update.nextNumber, update.format),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Nummerkreises:', error);
      throw error;
    }
  }

  /**
   * Formatiert eine Nummer basierend auf dem angegebenen Format
   */
  static formatNumber(number: number, format: string): string {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentDay = String(new Date().getDate()).padStart(2, '0');

    return format
      .replace(/%NUMBER/g, String(number))
      .replace(/%YEAR/g, String(currentYear))
      .replace(/%MONTH/g, currentMonth)
      .replace(/%DAY/g, currentDay);
  }

  /**
   * Erstellt die Standard-Nummerkreise basierend auf der bereitgestellten Liste
   */
  private static getDefaultSequenceTemplates(): NumberSequenceTemplate[] {
    return [
      {
        format: '%NUMBER',
        type: 'Kreditor',
        nextNumber: 70000,
        nextFormatted: '70000',
        canEdit: true,
        canDelete: false,
      },
      {
        format: '%NUMBER',
        type: 'Debitor',
        nextNumber: 10000,
        nextFormatted: '10000',
        canEdit: true,
        canDelete: false,
      },
      {
        format: '%NUMBER',
        type: 'Inventar',
        nextNumber: 1000,
        nextFormatted: '1000',
        canEdit: true,
        canDelete: false,
      },
      {
        format: '%NUMBER',
        type: 'Kontakt',
        nextNumber: 1000,
        nextFormatted: '1000',
        canEdit: true,
        canDelete: false,
      },
      {
        format: 'GU-%NUMBER',
        type: 'Gutschrift',
        nextNumber: 1000,
        nextFormatted: 'GU-1000',
        canEdit: true,
        canDelete: false,
      },
      {
        format: 'RE-%NUMBER',
        type: 'Rechnung',
        nextNumber: 1000,
        nextFormatted: 'RE-1000',
        canEdit: true,
        canDelete: false,
      },
      {
        format: 'AB-%NUMBER',
        type: 'Auftragsbestätigung',
        nextNumber: 1000,
        nextFormatted: 'AB-1000',
        canEdit: true,
        canDelete: false,
      },
      {
        format: 'AN-%NUMBER',
        type: 'Angebot',
        nextNumber: 1000,
        nextFormatted: 'AN-1000',
        canEdit: true,
        canDelete: false,
      },
      {
        format: 'LI-%NUMBER',
        type: 'Lieferschein',
        nextNumber: 1000,
        nextFormatted: 'LI-1000',
        canEdit: true,
        canDelete: false,
      },
      {
        format: '%NUMBER',
        type: 'Produkt',
        nextNumber: 1001,
        nextFormatted: '1001',
        canEdit: true,
        canDelete: false,
      },
    ];
  }
}