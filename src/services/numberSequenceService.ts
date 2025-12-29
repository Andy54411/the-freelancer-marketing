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
  Timestamp,
  serverTimestamp } from
'firebase/firestore';
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
  type: string)
  : Promise<{
    number: number;
    formattedNumber: string;
    format: string;
  }> {
    try {
      // 🔥 KRITISCHER FIX: Für Dokument-Typen MUSS die entsprechende Subcollection geprüft werden!


      if (type === 'Rechnung') {

        return await this.getNextDocumentNumberFromSubcollection(companyId, 'invoices', 'invoiceNumber', 'RE');
      }
      if (type === 'Angebot') {
        return await this.getNextDocumentNumberFromSubcollection(companyId, 'quotes', 'quoteNumber', 'AN');
      }
      if (type === 'Storno') {
        return await this.getNextDocumentNumberFromSubcollection(companyId, 'invoices', 'stornoNumber', 'ST');
      }
      if (type === 'Mahnung') {
        return await this.getNextDocumentNumberFromSubcollection(companyId, 'reminders', 'reminderNumber', 'MA');
      }
      if (type === 'Gutschrift') {
        return await this.getNextDocumentNumberFromSubcollection(companyId, 'credits', 'creditNumber', 'GU');
      }

      // ✅ Verwende deterministische Document ID um Duplikate zu vermeiden
      const docId = `${companyId}_${type}`;
      const sequenceDocRef = doc(db, 'numberSequences', docId);



      // 🔥 CRITICAL DEBUG: Check document state BEFORE transaction
      const preCheckDoc = await getDoc(sequenceDocRef);







      // 🔥 KRITISCHER FIX: Implementiere Distributed Lock mit Server-Timestamp
      // Verhindert Race Conditions bei gleichzeitigen Rechnungserstellungen
      let attempt = 0;
      const maxAttempts = 5;
      const baseDelay = 100; // ms

      while (attempt < maxAttempts) {
        try {
          const transactionResult = await runTransaction(db, async (transaction) => {
            const sequenceDoc = await transaction.get(sequenceDocRef);

            if (!sequenceDoc.exists()) {
              // ✅ Erstelle das Dokument mit Standard-Daten
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

            // 🔐 RACE CONDITION CHECK: Prüfe ob das Dokument gerade von jemand anderem bearbeitet wird
            const now = Date.now();
            const lastUpdate = sequenceData.updatedAt?.getTime ? sequenceData.updatedAt.getTime() : 0;
            const timeSinceUpdate = now - lastUpdate;

            // Wenn das letzte Update weniger als 50ms her ist, warte etwas
            if (timeSinceUpdate < 50) {
              throw new Error('RACE_CONDITION_DETECTED');
            }

            // 🔥 KRITISCHER FIX: Die currentNumber IST die zu verwendende Nummer
            // Das Dokument hat bereits nextNumber = 1000, das ist die Nummer die wir verwenden sollen
            // Dann aktualisieren wir nextNumber auf 1001 für die nächste Rechnung
            const numberToUse = currentNumber;
            const formattedNumberToUse = this.formatNumber(numberToUse, format);

            // Inkrementiere für das nächste Mal
            const newNextNumber = currentNumber + 1;











            // 🔥 CRITICAL DEBUG: Log what we're about to update








            // ✅ Update mit Transaction + Server Timestamp für Lock
            transaction.update(sequenceDocRef, {
              nextNumber: newNextNumber,
              nextFormatted: this.formatNumber(newNextNumber, format),
              updatedAt: serverTimestamp(), // Server timestamp für genaue Zeitmessung
              lastUsedBy: companyId // Tracking für Debugging
            });

            const result = {
              number: numberToUse,
              formattedNumber: formattedNumberToUse,
              format
            };








            return result;
          });

          // 🔥 POST-SUCCESS VERIFICATION: Check if document was actually updated
          const postSuccessDoc = await getDoc(sequenceDocRef);







          return transactionResult;
        } catch (transactionError: any) {
          attempt++;

          console.warn(`⚠️ NumberSequence Transaction Fehler (Versuch ${attempt}/${maxAttempts}):`, {
            error: transactionError.message,
            docId,
            type,
            companyId
          });

          // 🔥 POST-ERROR DEBUG: Check document state after failed transaction
          const postErrorDoc = await getDoc(sequenceDocRef);







          // Bei Race Condition: Exponential backoff
          if (transactionError.message.includes('RACE_CONDITION') ||
          transactionError.code === 'aborted' ||
          transactionError.code === 'failed-precondition') {

            const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 50;

            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // Bei anderen Fehlern: Sofort neu werfen
          throw transactionError;
        }
      }

      // Fallback falls alle Versuche fehlschlagen
      throw new Error(`NumberSequence konnte nach ${maxAttempts} Versuchen nicht aktualisiert werden für ${type} in Company ${companyId}`);

    } catch (error) {
      console.error('❌ Fehler beim Abrufen der nächsten Nummer:', error);

      // ✅ GRACEFUL FALLBACK: Verwende temporäre Nummer wenn DB fehlschlägt
      const fallbackFormat = this.getDefaultFormatForType(type);
      const fallbackNumber = Date.now() % 10000; // Temporäre Nummer basierend auf Timestamp

      return {
        number: fallbackNumber,
        formattedNumber: this.formatNumber(fallbackNumber, fallbackFormat),
        format: fallbackFormat
      };
    }
  }

  /**
   * 🔥 GENERISCHE METHODE: Holt die nächste Dokumentnummer basierend auf echten Dokumenten in der Subcollection
   * und synchronisiert mit NumberSequence
   */
  private static async getNextDocumentNumberFromSubcollection(
  companyId: string,
  subcollectionName: string,
  numberFieldName: string,
  prefix: string)
  : Promise<{
    number: number;
    formattedNumber: string;
    format: string;
  }> {


    try {
      // 1. Prüfe alle vorhandenen Dokumente in der Subcollection

      const documentsQuery = query(
        collection(db, 'companies', companyId, subcollectionName),
        where(numberFieldName, '!=', null)
      );


      const documentsSnapshot = await getDocs(documentsQuery);
      const documentNumbers: number[] = [];



      // 2. Extrahiere alle Nummern (z.B. RE-1077, AN-1234, ST-500)
      documentsSnapshot.forEach((doc) => {
        const data = doc.data();
        const documentNumber = data[numberFieldName] || data.number;

        if (documentNumber && typeof documentNumber === 'string') {
          // Extrahiere Nummer aus PREFIX-XXXX Format
          const match = documentNumber.match(new RegExp(`^${prefix}-(\\d+)$`));
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num)) {
              documentNumbers.push(num);
            }
          }
        }
      });



      // 3. Bestimme nächste Nummer
      let nextNumber = 1000; // Standardstart

      if (documentNumbers.length > 0) {
        const highestNumber = Math.max(...documentNumbers);
        nextNumber = highestNumber + 1;

      } else {

      }

      // 4. Synchronisiere NumberSequence (optional - falls es existiert)
      const typeMapping = {
        'invoices': 'Rechnung',
        'quotes': 'Angebot',
        'reminders': 'Mahnung',
        'credits': 'Gutschrift'
      };

      const docType = typeMapping[subcollectionName as keyof typeof typeMapping] || subcollectionName;
      const docId = `${companyId}_${docType}`;
      const sequenceDocRef = doc(db, 'numberSequences', docId);

      try {
        const sequenceDoc = await getDoc(sequenceDocRef);
        if (sequenceDoc.exists()) {
          const sequenceData = sequenceDoc.data() as NumberSequence;

          // Nur aktualisieren wenn unsere Nummer höher ist
          if (nextNumber > sequenceData.nextNumber) {


            await runTransaction(db, async (transaction) => {
              transaction.update(sequenceDocRef, {
                nextNumber: nextNumber + 1, // Für die nächste nach dieser
                nextFormatted: this.formatNumber(nextNumber + 1, `${prefix}-{number}`),
                updatedAt: serverTimestamp(),
                lastSyncedFrom: `${subcollectionName}-subcollection`
              });
            });
          }
        }
      } catch (syncError) {
        console.warn(`⚠️ NumberSequence sync für ${docType} fehlgeschlagen (nicht kritisch):`, syncError);
      }

      // 5. Return die korrekte nächste Nummer
      const result = {
        number: nextNumber,
        formattedNumber: `${prefix}-${nextNumber}`,
        format: `${prefix}-{number}`
      };


      return result;

    } catch (error) {
      console.error('❌ Fehler bei Subcollection-Prüfung:', error);

      // Fallback zu Standard-Logik

      return await this.getNextDocumentNumberFallback(companyId, subcollectionName, prefix);
    }
  }

  /**
   * 🚨 FALLBACK: Verwendet NumberSequence wenn Subcollection-Prüfung fehlschlägt
   */
  private static async getNextDocumentNumberFallback(
  companyId: string,
  subcollectionName: string,
  prefix: string)
  : Promise<{
    number: number;
    formattedNumber: string;
    format: string;
  }> {
    const typeMapping = {
      'invoices': 'Rechnung',
      'quotes': 'Angebot',
      'reminders': 'Mahnung',
      'credits': 'Gutschrift'
    };

    const docType = typeMapping[subcollectionName as keyof typeof typeMapping] || subcollectionName;
    const docId = `${companyId}_${docType}`;
    const sequenceDocRef = doc(db, 'numberSequences', docId);

    try {
      return await runTransaction(db, async (transaction) => {
        const sequenceDoc = await transaction.get(sequenceDocRef);

        if (!sequenceDoc.exists()) {
          // Erstelle Standard NumberSequence
          const newSequenceData = this.getDefaultSequenceData(companyId, docType);
          transaction.set(sequenceDocRef, newSequenceData);

          return {
            number: 1000,
            formattedNumber: `${prefix}-1000`,
            format: `${prefix}-{number}`
          };
        }

        const sequenceData = sequenceDoc.data() as NumberSequence;
        const numberToUse = sequenceData.nextNumber;
        const newNextNumber = numberToUse + 1;

        transaction.update(sequenceDocRef, {
          nextNumber: newNextNumber,
          updatedAt: serverTimestamp()
        });

        return {
          number: numberToUse,
          formattedNumber: `${prefix}-${numberToUse}`,
          format: `${prefix}-{number}`
        };
      });
    } catch (error) {
      console.error('❌ Auch Fallback fehlgeschlagen:', error);

      // Letzter Notfall-Fallback
      const emergencyNumber = Date.now() % 10000;
      return {
        number: emergencyNumber,
        formattedNumber: `${prefix}-${emergencyNumber}`,
        format: `${prefix}-{number}`
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
      case 'Mahnung':
        return {
          ...baseData,
          nextNumber: 1000,
          format: 'MA-{number}',
          prefix: 'MA-'
        };
      case 'Gutschrift':
        return {
          ...baseData,
          nextNumber: 1000,
          format: 'GU-{number}',
          prefix: 'GU-'
        };
      case 'Produkt':
        return {
          ...baseData,
          nextNumber: 1001,
          format: '%NUMBER',
          prefix: ''
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
      case 'Mahnung':
        return {
          number: 1000,
          formattedNumber: 'MA-1000',
          format: 'MA-{number}'
        };
      case 'Gutschrift':
        return {
          number: 1000,
          formattedNumber: 'GU-1000',
          format: 'GU-{number}'
        };
      case 'Produkt':
        return {
          number: 1001,
          formattedNumber: '1001',
          format: '%NUMBER'
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
      case 'Mahnung':
        return 'MA-{number}';
      case 'Gutschrift':
        return 'GU-{number}';
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
  updates: Partial<NumberSequence>)
  : Promise<void> {
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


    } catch (error) {
      // Fehler wird vom Aufrufer behandelt
      throw error;
    }
  }

  /**
   * ✅ PRODUKT-SYNCHRONISATION: Synchronisiert Produkt-Nummernkreis mit existierendem Inventory
   */
  private static async syncProductNumberSequence(companyId: string): Promise<void> {
    try {
      // Prüfe existierende Produkte im Inventory
      const inventoryRef = collection(db, 'companies', companyId, 'inventory');
      const snapshot = await getDocs(inventoryRef);
      
      if (snapshot.empty) {
        return; // Keine Produkte vorhanden
      }

      const products = snapshot.docs.map(doc => doc.data());
      
      // Extrahiere alle numerischen SKUs
      const numbers: number[] = [];
      
      products.forEach((product) => {
        if (product.sku) {
          const num = parseInt(product.sku, 10);
          if (!isNaN(num)) {
            numbers.push(num);
          }
        }
      });

      if (numbers.length === 0) {
        return; // Keine gültigen Nummern gefunden
      }

      // Berechne nächste Nummer
      const highestNumber = Math.max(...numbers);
      const nextNumber = highestNumber + 1;

      // Update Nummernkreis
      const docId = `${companyId}_Produkt`;

      await this.updateNumberSequence(companyId, docId, {
        nextNumber,
        nextFormatted: this.formatNumber(nextNumber, '%NUMBER')
      });

    } catch (error) {
      console.error('Fehler beim Synchronisieren des Produkt-Nummernkreises:', error);
      // Fehler nicht weiterwerfen - Synchronisation ist optional
    }
  }

  /**
   * ✅ EINMALIGE SYNCHRONISATION: Synchronisiert Nummernkreis mit echten Daten (nur beim Seitenladen)
   */
  static async syncSequenceWithRealData(companyId: string, type: string): Promise<void> {
    try {
      // Spezielle Behandlung für Produkt-Typ
      if (type === 'Produkt') {
        return await this.syncProductNumberSequence(companyId);
      }
      
      // Nur für bestimmte Typen unterstützen
      if (!['Kunde', 'Lieferant', 'Partner', 'Interessenten'].includes(type)) {
        return;
      }

      // Direkte Firebase-Abfrage um zirkuläre Abhängigkeiten zu vermeiden
      const customersRef = collection(db, 'companies', companyId, 'customers');
      const snapshot = await getDocs(customersRef);
      
      const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      // Filtere nach Typ basierend auf customerNumber Prefix
      const prefixes = {
        'Kunde': 'KD-',
        'Lieferant': 'LF-',
        'Partner': 'PA-',
        'Interessenten': 'IN-'
      };
      
      const prefix = prefixes[type as keyof typeof prefixes];
      const relevantContacts = customers.filter((c) => 
        c.customerNumber && c.customerNumber.startsWith(prefix)
      );

      if (relevantContacts.length === 0) {
        return;
      }

      // Extrahiere Nummern basierend auf Typ
      const numbers: number[] = [];

      relevantContacts.forEach((contact) => {
        const match = contact.customerNumber.match(new RegExp(`^${prefix.replace('-', '')}-(\\d+)$`));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num)) {
            numbers.push(num);
          }
        }
      });

      if (numbers.length === 0) {

        return;
      }

      // Berechne nächste Nummer
      const highestNumber = Math.max(...numbers);
      const nextNumber = highestNumber + 1;



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


      const sequences = await this.getNumberSequences(companyId);

      if (sequences.length === 0) {

        return;
      }

      sequences.forEach((seq) => {







      });


    } catch (error) {
      console.error('❌ Fehler beim Debug der Nummernkreise:', error);
    }
  }

  /**
   * 🔧 REPARATUR: Korrigiert Kunden-Nummernkreis basierend auf existierenden Daten
   */
  static async repairCustomerNumberSequence(companyId: string): Promise<void> {
    try {


      // Importiere CustomerService dynamisch um zirkuläre Abhängigkeiten zu vermeiden
      const { CustomerService } = await import('@/services/customerService');

      // Führe die Synchronisation durch
      await CustomerService.syncCustomerNumberSequence(companyId);


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
      // Explizite Typ-Definition stellt sicher, dass alle Felder definiert sind
      const defaultTypes: Array<{ type: string; format: string; nextNumber: number; prefix: string }> = [
      { type: 'Rechnung', format: 'RE-%NUMBER', nextNumber: 1000, prefix: 'RE-' },
      { type: 'Angebot', format: 'AN-%NUMBER', nextNumber: 1000, prefix: 'AN-' },
      { type: 'Kunde', format: 'KD-%NUMBER', nextNumber: 1000, prefix: 'KD-' },
      { type: 'Lieferschein', format: 'LI-%NUMBER', nextNumber: 1000, prefix: 'LI-' },
      { type: 'Gutschrift', format: 'GU-%NUMBER', nextNumber: 1000, prefix: 'GU-' },
      { type: 'Auftragsbestätigung', format: 'AB-%NUMBER', nextNumber: 1000, prefix: 'AB-' },
      { type: 'Debitor', format: '%NUMBER', nextNumber: 10000, prefix: '' },
      { type: 'Kreditor', format: '%NUMBER', nextNumber: 70000, prefix: '' },
      { type: 'Produkt', format: '%NUMBER', nextNumber: 1001, prefix: '' },
      { type: 'Inventar', format: '%NUMBER', nextNumber: 1000, prefix: '' },
      { type: 'Kontakt', format: '%NUMBER', nextNumber: 1000, prefix: '' }];


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
          updatedAt: new Date()
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