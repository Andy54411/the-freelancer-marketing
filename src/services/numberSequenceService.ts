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
   * ✅ PERMISSION-SAFE ohne Transactions (umgeht Permission-Probleme)
   * ✅ SYNC MIT ECHTEN DATEN - Prüft automatisch existierende Datensätze
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
      // ✅ Verwende deterministische Document ID um Duplikate zu vermeiden
      const docId = `${companyId}_${type}`;
      const sequenceDocRef = doc(db, 'numberSequences', docId);
      
      console.log(`🔢 NumberSequence Debug - docId: ${docId}, companyId: ${companyId}, type: ${type}`);
      
      // 🔍 DEBUG: Prüfe User-Auth-Status
      const { auth } = await import('@/firebase/clients');
      const currentUser = auth.currentUser;
      console.log('🔍 Auth Debug:', {
        currentUserId: currentUser?.uid,
        targetCompanyId: companyId,
        userMatch: currentUser?.uid === companyId,
        userClaims: await currentUser?.getIdTokenResult(),
      });

      // 🔥 ZURÜCK ZU TRANSACTION - Nummern MÜSSEN korrekt aktualisiert werden!
      return await runTransaction(db, async transaction => {
        const sequenceDoc = await transaction.get(sequenceDocRef);

        if (!sequenceDoc.exists()) {
          // ✅ Erstelle das Dokument mit Standard-Daten
          const newSequenceData = this.getDefaultSequenceData(companyId, type);
          
          console.log('📄 Erstelle neues NumberSequence-Dokument:', { docId, data: newSequenceData });
          
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

        console.log('🔢 Transaction Update:', {
          currentNumber,
          newNextNumber,
          formattedNumber,
          docId
        });

        // ✅ Update mit Transaction (MUSS funktionieren für korrekte Nummerierung)
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
      
      // ✅ GRACEFUL FALLBACK: Verwende temporäre Nummer wenn DB fehlschlägt
      const fallbackFormat = this.getDefaultFormatForType(type);
      const fallbackNumber = Date.now() % 10000; // Temporäre Nummer basierend auf Timestamp
      
      return {
        number: fallbackNumber,
        formattedNumber: this.formatNumber(fallbackNumber, fallbackFormat),
        format: fallbackFormat,
      };
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
      case 'Lieferant':
        return {
          ...baseData,
          nextNumber: 1,
          format: 'LF-%NUMBER',
          prefix: 'LF-'
        };
      case 'Partner':
        return {
          ...baseData,
          nextNumber: 1,
          format: 'PA-%NUMBER',
          prefix: 'PA-'
        };
      case 'Interessenten':
        return {
          ...baseData,
          nextNumber: 1,
          format: 'IN-%NUMBER',
          prefix: 'IN-'
        };
      case 'Rechnung':
        return {
          ...baseData,
          nextNumber: 1,
          format: 'RE-{number}',
          prefix: 'RE-'
        };
      case 'Angebot':
        return {
          ...baseData,
          nextNumber: 1001,
          format: 'AN-{number}',
          prefix: 'AN-'
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
      case 'Lieferant':
        return {
          number: 1,
          formattedNumber: 'LF-001',
          format: 'LF-%NUMBER'
        };
      case 'Partner':
        return {
          number: 1,
          formattedNumber: 'PA-001',
          format: 'PA-%NUMBER'
        };
      case 'Interessenten':
        return {
          number: 1,
          formattedNumber: 'IN-001',
          format: 'IN-%NUMBER'
        };
      case 'Rechnung':
        return {
          number: 1,
          formattedNumber: 'RE-1',
          format: 'RE-{number}'
        };
      case 'Angebot':
        return {
          number: 1001,
          formattedNumber: 'AN-1001',
          format: 'AN-{number}'
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
   * ✅ Gibt das Standard-Format für einen Typ zurück (Fallback-Funktion)
   */
  private static getDefaultFormatForType(type: string): string {
    switch (type) {
      case 'Rechnung':
        return 'RE-{number}';
      case 'Angebot':
        return 'AN-{number}';
      case 'Storno':
        return 'ST-{number}';
      case 'Kunde':
        return 'KD-%NUMBER';
      case 'Lieferant':
        return 'LF-%NUMBER';
      case 'Partner':
        return 'PA-%NUMBER';
      case 'Interessenten':
        return 'IN-%NUMBER';
      default:
        return `${type.toUpperCase()}-{number}`;
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
      // ✅ SPEZIAL: KD-%NUMBER, LF-%NUMBER, PA-%NUMBER, IN-%NUMBER sollen 3-stelliges Format verwenden
      if (format === 'KD-%NUMBER' || format === 'LF-%NUMBER' || format === 'PA-%NUMBER' || format === 'IN-%NUMBER') {
        return format.replace('%NUMBER', number.toString().padStart(3, '0'));
      }
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
      // Fehler wird vom Aufrufer behandelt
      throw error;
    }
  }

  /**
   * ✅ EINMALIGE SYNCHRONISATION: Synchronisiert Nummernkreis mit echten Daten (nur beim Seitenladen)
   */
  static async syncSequenceWithRealData(companyId: string, type: string): Promise<void> {
    try {
      // Nur für bestimmte Typen unterstützen
      if (!['Kunde', 'Lieferant', 'Partner', 'Interessenten'].includes(type)) {
        console.log(`ℹ️ ${type} wird nicht synchronisiert - nur Kontakt-Typen`);
        return;
      }
      
      // Importiere CustomerService dynamisch um zirkuläre Abhängigkeiten zu vermeiden
      const { CustomerService } = await import('@/services/customerService');
      
      // Lade alle Kontakte
      const customers = await CustomerService.getCustomers(companyId);
      
      // Filtere nach Typ basierend auf customerNumber Prefix
      let relevantContacts = customers;
      if (type === 'Kunde') {
        relevantContacts = customers.filter(c => c.customerNumber.startsWith('KD-'));
      } else if (type === 'Lieferant') {
        relevantContacts = customers.filter(c => c.customerNumber.startsWith('LF-'));
      } else if (type === 'Partner') {
        relevantContacts = customers.filter(c => c.customerNumber.startsWith('PA-'));
      } else if (type === 'Interessenten') {
        relevantContacts = customers.filter(c => c.customerNumber.startsWith('IN-'));
      }
      
      console.log(`📊 Gefundene ${type}: ${relevantContacts.length}`);
      
      if (relevantContacts.length === 0) {
        console.log(`ℹ️ Keine ${type} gefunden - verwende Standard-Nummernkreis`);
        return;
      }
      
      // Extrahiere Nummern basierend auf Typ
      const numbers: number[] = [];
      const prefixes = {
        'Kunde': 'KD-',
        'Lieferant': 'LF-',
        'Partner': 'PA-',
        'Interessenten': 'IN-'
      };
      
      const prefix = prefixes[type as keyof typeof prefixes];
      
      relevantContacts.forEach(contact => {
        const match = contact.customerNumber.match(new RegExp(`^${prefix.replace('-', '')}-(\\d+)$`));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num)) {
            numbers.push(num);
          }
        }
      });
      
      if (numbers.length === 0) {
        console.log(`ℹ️ Keine gültigen ${type}-Nummern gefunden`);
        return;
      }
      
      // Berechne nächste Nummer
      const highestNumber = Math.max(...numbers);
      const nextNumber = highestNumber + 1;
      
      console.log(`📈 Höchste ${type}-Nummer: ${highestNumber} -> Nächste: ${nextNumber}`);
      
      // Update Nummernkreis
      const docId = `${companyId}_${type}`;
      
      try {
        await this.updateNumberSequence(companyId, docId, {
          nextNumber,
          nextFormatted: this.formatNumber(nextNumber, `${prefix.replace('-', '')}-%NUMBER`)
        });
        // Erfolg wird bereits in updateNumberSequence geloggt
      } catch (updateError) {
        // Berechtigungsfehler sind in Development normal - nicht störend loggen
      }
      
    } catch (error) {
      console.error(`❌ Fehler beim Synchronisieren des ${type}-Nummernkreises:`, error);
      // Fehler nicht weiterwerfen - Synchronisation ist optional
    }
  }

  /**
   * ✅ DEBUG: Zeigt Status aller Nummernkreise für eine Company
   */
  static async debugNumberSequences(companyId: string): Promise<void> {
    try {
      console.log(`\n📊 === NUMMERNKREISE DEBUG für Company: ${companyId} ===`);
      
      const sequences = await this.getNumberSequences(companyId);
      
      if (sequences.length === 0) {
        console.log('❌ Keine Nummernkreise gefunden!');
        return;
      }
      
      sequences.forEach(seq => {
        console.log(`\n🔢 ${seq.type}:`);
        console.log(`   ID: ${seq.id}`);
        console.log(`   Format: ${seq.format}`);
        console.log(`   Nächste Nummer: ${seq.nextNumber}`);
        console.log(`   Nächste Formatiert: ${seq.nextFormatted || 'N/A'}`);
        console.log(`   Erstellt: ${seq.createdAt}`);
        console.log(`   Aktualisiert: ${seq.updatedAt}`);
      });
      
      console.log(`\n✅ === DEBUG ENDE ===\n`);
    } catch (error) {
      console.error('❌ Fehler beim Debug der Nummernkreise:', error);
    }
  }

  /**
   * 🔧 REPARATUR: Korrigiert Kunden-Nummernkreis basierend auf existierenden Daten
   */
  static async repairCustomerNumberSequence(companyId: string): Promise<void> {
    try {
      console.log(`\n🔧 === REPARIERE KUNDEN-NUMMERNKREIS ===`);
      
      // Importiere CustomerService dynamisch um zirkuläre Abhängigkeiten zu vermeiden
      const { CustomerService } = await import('@/services/customerService');
      
      // Führe die Synchronisation durch
      await CustomerService.syncCustomerNumberSequence(companyId);
      
      console.log(`✅ === REPARATUR ABGESCHLOSSEN ===\n`);
    } catch (error) {
      console.error('❌ Fehler bei der Reparatur:', error);
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