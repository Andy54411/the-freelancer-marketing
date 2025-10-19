import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import COMPLETE_DATEV_ACCOUNTS from '@/data/complete-datev-accounts';

export interface BookingAccount {
  id: string;
  number: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';
  automaticBooking: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BookingAccountData {
  number: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';
  automaticBooking: boolean;
}

export class BookingAccountService {
  /**
   * Lädt alle Buchungskonten für eine Company
   * Kombiniert Firestore-Konten mit DATEV-Standard-Konten
   */
  static async getBookingAccounts(companyUid: string): Promise<BookingAccount[]> {
    try {
      // 1. Lade benutzerdefinierte Buchungskonten aus Firestore
      const bookingAccountsRef = collection(db, 'companies', companyUid, 'bookingAccounts');
      const q = query(bookingAccountsRef, orderBy('number', 'asc'));
      const querySnapshot = await getDocs(q);

      const customBookingAccounts: BookingAccount[] = [];
      querySnapshot.forEach(doc => {
        customBookingAccounts.push({
          id: doc.id,
          ...doc.data(),
        } as BookingAccount);
      });

      // 2. Konvertiere DATEV-Konten zu BookingAccount Format
      const datevAccounts: BookingAccount[] = COMPLETE_DATEV_ACCOUNTS.map(account => ({
        id: `datev-${account.number}`,
        number: account.number,
        name: account.name,
        type: account.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE',
        automaticBooking: false,
      }));

      // 3. Kombiniere beide Listen und entferne Duplikate
      const allAccounts = [...customBookingAccounts];
      const existingNumbers = new Set(customBookingAccounts.map(acc => acc.number));

      // Füge DATEV-Konten hinzu, die nicht bereits als benutzerdefinierte Konten existieren
      datevAccounts.forEach(datevAccount => {
        if (!existingNumbers.has(datevAccount.number)) {
          allAccounts.push(datevAccount);
        }
      });

      // 4. Sortiere nach Kontonummer
      return allAccounts.sort((a, b) => a.number.localeCompare(b.number));
    } catch (error) {
      console.error('Fehler beim Laden der Buchungskonten:', error);
      throw error;
    }
  }

  /**
   * Erstellt ein neues Buchungskonto
   */
  static async createBookingAccount(
    companyUid: string,
    accountData: BookingAccountData
  ): Promise<BookingAccount> {
    try {
      const bookingAccountsRef = collection(db, 'companies', companyUid, 'bookingAccounts');

      const newAccountData = {
        ...accountData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(bookingAccountsRef, newAccountData);

      return {
        id: docRef.id,
        ...newAccountData,
      } as BookingAccount;
    } catch (error) {
      console.error('Fehler beim Erstellen des Buchungskontos:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert ein existierendes Buchungskonto
   */
  static async updateBookingAccount(
    companyUid: string,
    accountId: string,
    updates: Partial<BookingAccountData>
  ): Promise<void> {
    try {
      const accountRef = doc(db, 'companies', companyUid, 'bookingAccounts', accountId);

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(accountRef, updateData);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Buchungskontos:', error);
      throw error;
    }
  }

  /**
   * Löscht ein Buchungskonto
   */
  static async deleteBookingAccount(companyUid: string, accountId: string): Promise<void> {
    try {
      const accountRef = doc(db, 'companies', companyUid, 'bookingAccounts', accountId);
      await deleteDoc(accountRef);
    } catch (error) {
      console.error('Fehler beim Löschen des Buchungskontos:', error);
      throw error;
    }
  }

  /**
   * Erstellt Standard-Buchungskonten für eine neue Company
   */
  static async createDefaultBookingAccounts(companyUid: string): Promise<BookingAccount[]> {
    const defaultAccounts: BookingAccountData[] = [];

    try {
      const createdAccounts: BookingAccount[] = [];

      for (const accountData of defaultAccounts) {
        const account = await this.createBookingAccount(companyUid, accountData);
        createdAccounts.push(account);
      }

      return createdAccounts;
    } catch (error) {
      console.error('Fehler beim Erstellen der Standard-Buchungskonten:', error);
      throw error;
    }
  }

  /**
   * Prüft ob ein Buchungskonto mit der Nummer bereits existiert
   */
  static async accountNumberExists(
    companyUid: string,
    accountNumber: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const accounts = await this.getBookingAccounts(companyUid);
      return accounts.some(account => account.number === accountNumber && account.id !== excludeId);
    } catch (error) {
      console.error('Fehler beim Prüfen der Kontonummer:', error);
      return false;
    }
  }

  /**
   * Löscht alle Buchungskonten einer Company (für Cleanup/Reset)
   */
  static async deleteAllBookingAccounts(companyUid: string): Promise<void> {
    try {
      const accounts = await this.getBookingAccounts(companyUid);
      const deletePromises = accounts.map(account =>
        this.deleteBookingAccount(companyUid, account.id)
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Fehler beim Löschen aller Buchungskonten:', error);
      throw error;
    }
  }
}
