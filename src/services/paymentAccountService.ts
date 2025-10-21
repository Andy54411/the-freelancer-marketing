import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface PaymentAccount {
  id: string;
  name: string;
  iban: string;
  bic: string;
  bankName: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT';
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export class PaymentAccountService {
  /**
   * Get all payment accounts for a company
   */
  static async getPaymentAccounts(companyId: string): Promise<PaymentAccount[]> {
    try {
      const accountsRef = collection(db, 'companies', companyId, 'paymentAccounts');
      const q = query(accountsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          iban: data.iban,
          bic: data.bic,
          bankName: data.bankName,
          type: data.type,
          active: data.active ?? true,
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.createdAt,
          updatedAt:
            data.updatedAt instanceof Timestamp
              ? data.updatedAt.toDate().toISOString()
              : data.updatedAt,
        };
      });
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
      return [];
    }
  }

  /**
   * Create a new payment account
   */
  static async createPaymentAccount(
    companyId: string,
    account: Omit<PaymentAccount, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const accountsRef = collection(db, 'companies', companyId, 'paymentAccounts');
      const docRef = await addDoc(accountsRef, {
        ...account,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating payment account:', error);
      throw error;
    }
  }

  /**
   * Update an existing payment account
   */
  static async updatePaymentAccount(
    companyId: string,
    accountId: string,
    updates: Partial<Omit<PaymentAccount, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const accountRef = doc(db, 'companies', companyId, 'paymentAccounts', accountId);
      await updateDoc(accountRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating payment account:', error);
      throw error;
    }
  }

  /**
   * Delete a payment account
   */
  static async deletePaymentAccount(companyId: string, accountId: string): Promise<void> {
    try {
      const accountRef = doc(db, 'companies', companyId, 'paymentAccounts', accountId);
      await deleteDoc(accountRef);
    } catch (error) {
      console.error('Error deleting payment account:', error);
      throw error;
    }
  }

  /**
   * Toggle active status of a payment account
   */
  static async toggleActive(companyId: string, accountId: string, active: boolean): Promise<void> {
    try {
      await this.updatePaymentAccount(companyId, accountId, { active });
    } catch (error) {
      console.error('Error toggling payment account status:', error);
      throw error;
    }
  }

  /**
   * Create default payment accounts (Kasse and Basiskonto) for new companies
   */
  static async createDefaultAccounts(companyId: string): Promise<void> {
    try {
      const accountsRef = collection(db, 'companies', companyId, 'paymentAccounts');

      // Check if default accounts already exist
      const snapshot = await getDocs(accountsRef);
      if (!snapshot.empty) {
        console.log('Payment accounts already exist for company:', companyId);
        return;
      }

      // Create "Kasse" (Cash Register)
      await addDoc(accountsRef, {
        name: 'Kasse',
        iban: '',
        bic: '',
        bankName: 'Bargeld',
        type: 'CHECKING',
        active: true,
        isDefault: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create "Basiskonto" (Basic Account)
      await addDoc(accountsRef, {
        name: 'Basiskonto',
        iban: '',
        bic: '',
        bankName: 'Standard Bankkonto',
        type: 'CHECKING',
        active: true,
        isDefault: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('Default payment accounts created for company:', companyId);
    } catch (error) {
      console.error('Error creating default payment accounts:', error);
      throw error;
    }
  }
}
