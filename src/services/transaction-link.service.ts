import { db } from '@/firebase/clients';
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc, query, where, orderBy, DocumentData, serverTimestamp, FieldValue } from 'firebase/firestore';

// Interface für Transaction Link (Client-Side)
export interface TransactionLink {
  id?: string;
  transactionId: string;
  documentId: string;
  documentType: 'beleg' | 'rechnung' | 'gutschrift';
  documentNumber: string;
  documentDate: string;
  documentAmount: number;
  customerName: string;
  linkDate: Date | string | FieldValue;
  createdBy: string;
  // Buchungsstatus
  bookingStatus: 'open' | 'booked';
  bookedAt?: Date | string | FieldValue;
  // Differenz-Informationen
  amountDifference?: number;
  amountDifferenceReason?: string;
  // Bidirektionale Referenzen
  transactionData: {
    id: string;
    name: string;
    verwendungszweck: string;
    buchungstag: string;
    betrag: number;
    accountId: string;
  };
  documentData: {
    id: string;
    type: string;
    number: string;
    customerName: string;
    total: number;
    date: string;
  };
}

export class TransactionLinkService {
  /**
   * Erstelle eine neue Transaction-Document Verknüpfung
   */
  static async createLink(
    companyId: string,
    transactionId: string,
    documentId: string,
    transactionData: any,
    documentData: any,
    userId: string
  ): Promise<{ success: boolean; linkId?: string; error?: string }> {
    try {
      console.log('🔄 TransactionLinkService.createLink called with:', {
        companyId,
        transactionId,
        documentId,
        userId,
        transactionData,
        documentData
      });

      if (!companyId || !transactionId || !documentId) {
        throw new Error('Company ID, Transaction ID und Document ID sind erforderlich');
      }

      // Eindeutige Link ID für bidirektionale Suche
      const linkId = `${transactionId}_${documentId}`;

      const transactionLink: Omit<TransactionLink, 'id'> = {
        transactionId,
        documentId,
        documentType: documentData.isStorno ? 'gutschrift' : 'rechnung',
        documentNumber: documentData.documentNumber || documentData.invoiceNumber || documentId,
        documentDate: documentData.date || documentData.issueDate || new Date().toISOString(),
        documentAmount: documentData.total || 0,
        customerName: documentData.customerName || 'Unbekannter Kunde',
        linkDate: serverTimestamp(),
        createdBy: userId,
        // Buchungsstatus - automatisch auf "gebucht" setzen bei Verknüpfung
        bookingStatus: 'booked',
        bookedAt: serverTimestamp(),
        // Differenz-Informationen speichern (nur wenn vorhanden)
        ...(documentData.amountDifference !== undefined && documentData.amountDifference !== null ? { amountDifference: documentData.amountDifference } : {}),
        ...(documentData.amountDifferenceReason ? { amountDifferenceReason: documentData.amountDifferenceReason } : {}),
        transactionData: {
          id: transactionData.id,
          name: transactionData.name || transactionData.counterpartName || '',
          verwendungszweck: transactionData.verwendungszweck || transactionData.purpose || '',
          buchungstag: transactionData.buchungstag || transactionData.bookingDate || '',
          betrag: transactionData.betrag || transactionData.amount || 0,
          accountId: transactionData.accountId || ''
        },
        documentData: {
          id: documentData.id,
          type: documentData.isStorno ? 'gutschrift' : 'rechnung',
          number: documentData.documentNumber || documentData.invoiceNumber || documentId,
          customerName: documentData.customerName || 'Unbekannter Kunde',
          total: documentData.total || 0,
          date: documentData.date || documentData.issueDate || new Date().toISOString()
        }
      };

      console.log('📝 Transaction Link Object:', transactionLink);
      console.log('📍 Firestore Path:', `companies/${companyId}/transaction_links/${linkId}`);

      // In Firestore Subcollection speichern
      const linkRef = doc(db, 'companies', companyId, 'transaction_links', linkId);
      console.log('🔥 About to save to Firestore...');
      
      await setDoc(linkRef, transactionLink);
      
      console.log(`✅ Transaction Link erfolgreich in Firestore gespeichert: ${linkId} für Unternehmen ${companyId}`);

      return {
        success: true,
        linkId
      };

    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Transaction Link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  /**
   * Hole alle Transaction Links für ein Unternehmen
   */
  static async getLinks(
    companyId: string,
    transactionId?: string,
    documentId?: string
  ): Promise<{ success: boolean; links?: TransactionLink[]; error?: string }> {
    try {
      if (!companyId) {
        throw new Error('Company ID ist erforderlich');
      }

      const linksCollection = collection(db, 'companies', companyId, 'transaction_links');
      let linksQuery = query(linksCollection, orderBy('linkDate', 'desc'));

      // Filter nach Transaction ID
      if (transactionId) {
        linksQuery = query(linksCollection, where('transactionId', '==', transactionId));
      }

      // Filter nach Document ID
      if (documentId) {
        linksQuery = query(linksCollection, where('documentId', '==', documentId));
      }

      const querySnapshot = await getDocs(linksQuery);
      const links: TransactionLink[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        links.push({
          id: doc.id,
          ...data
        } as TransactionLink);
      });

      console.log(`📊 ${links.length} Transaction Links geladen für Unternehmen ${companyId}`);

      return {
        success: true,
        links
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden der Transaction Links:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  /**
   * Prüfe ob Transaction bereits verknüpft ist
   */
  static async isTransactionLinked(
    companyId: string,
    transactionId: string
  ): Promise<{ isLinked: boolean; links?: TransactionLink[] }> {
    try {
      const result = await this.getLinks(companyId, transactionId);
      
      if (result.success && result.links) {
        return {
          isLinked: result.links.length > 0,
          links: result.links
        };
      }

      return { isLinked: false };
    } catch (error) {
      console.error('❌ Fehler beim Prüfen der Transaction Link:', error);
      return { isLinked: false };
    }
  }

  /**
   * Entferne Transaction Link
   */
  static async removeLink(
    companyId: string,
    transactionId: string,
    documentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!companyId || !transactionId || !documentId) {
        throw new Error('Company ID, Transaction ID und Document ID sind erforderlich');
      }

      const linkId = `${transactionId}_${documentId}`;
      const linkRef = doc(db, 'companies', companyId, 'transaction_links', linkId);
      
      await deleteDoc(linkRef);

      console.log(`✅ Transaction Link entfernt: ${linkId} für Unternehmen ${companyId}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Fehler beim Entfernen der Transaction Link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  /**
   * Hole alle Dokumente die mit einer Transaction verknüpft sind
   */
  static async getLinkedDocuments(
    companyId: string,
    transactionId: string
  ): Promise<{ success: boolean; documents?: any[]; error?: string }> {
    try {
      const result = await this.getLinks(companyId, transactionId);
      
      if (result.success && result.links) {
        const documents = result.links.map(link => ({
          id: link.documentId,
          type: link.documentType,
          number: link.documentNumber,
          customerName: link.customerName,
          amount: link.documentAmount,
          date: link.documentDate,
          linkDate: link.linkDate
        }));

        return {
          success: true,
          documents
        };
      }

      return {
        success: false,
        error: 'Keine verknüpften Dokumente gefunden'
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden der verknüpften Dokumente:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  /**
   * Hole alle Transaktionen die mit einem Dokument verknüpft sind
   */
  static async getLinkedTransactions(
    companyId: string,
    documentId: string
  ): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
    try {
      const result = await this.getLinks(companyId, undefined, documentId);
      
      if (result.success && result.links) {
        const transactions = result.links.map(link => ({
          id: link.transactionId,
          name: link.transactionData.name,
          verwendungszweck: link.transactionData.verwendungszweck,
          buchungstag: link.transactionData.buchungstag,
          betrag: link.transactionData.betrag,
          accountId: link.transactionData.accountId,
          linkDate: link.linkDate,
          bookingStatus: link.bookingStatus || 'booked'
        }));

        return {
          success: true,
          transactions
        };
      }

      return {
        success: false,
        error: 'Keine verknüpften Transaktionen gefunden'
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden der verknüpften Transaktionen:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  /**
   * Aktualisiere Buchungsstatus einer Transaction Link
   */
  static async updateBookingStatus(
    companyId: string,
    transactionId: string,
    documentId: string,
    bookingStatus: 'open' | 'booked'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!companyId || !transactionId || !documentId) {
        throw new Error('Company ID, Transaction ID und Document ID sind erforderlich');
      }

      const linkId = `${transactionId}_${documentId}`;
      const linkRef = doc(db, 'companies', companyId, 'transaction_links', linkId);
      
      const updateData: any = {
        bookingStatus,
        updatedAt: serverTimestamp()
      };

      if (bookingStatus === 'booked') {
        updateData.bookedAt = serverTimestamp();
      }

      await setDoc(linkRef, updateData, { merge: true });

      console.log(`✅ Buchungsstatus aktualisiert: ${linkId} → ${bookingStatus}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Buchungsstatus:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }
}