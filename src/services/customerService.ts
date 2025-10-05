'use client';

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Customer } from '@/components/finance/AddCustomerModal';
import { NumberSequenceService } from '@/services/numberSequenceService';

export class CustomerService {
  /**
   * Alle Kunden für eine Company abrufen
   */
  static async getCustomers(companyId: string): Promise<Customer[]> {
    try {
      // NEUE SUBCOLLECTION STRUKTUR
      const customersRef = collection(db, 'companies', companyId, 'customers');
      const q = query(customersRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        // ✅ NEUE: Verwende NumberSequenceService für konsistente Kundennummern
        const customerNumber = data.customerNumber || 'KD-PENDING';

        return {
          id: doc.id,
          customerNumber,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          street: data.street || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          country: data.country || 'Deutschland',
          taxNumber: data.taxNumber || '',
          vatId: data.vatId || '',
          vatValidated: data.vatValidated || false,
          isSupplier: data.isSupplier || false,
          totalInvoices: data.totalInvoices || 0,
          totalAmount: data.totalAmount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          contactPersons: data.contactPersons || [],
          companyId: data.companyId || companyId,
        } as Customer;
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lädt einen einzelnen Kunden
   */
  static async getCustomer(companyId: string, customerId: string): Promise<Customer | null> {
    try {
      // NEUE SUBCOLLECTION STRUKTUR
      const customerDoc = await getDoc(doc(db, 'companies', companyId, 'customers', customerId));

      if (!customerDoc.exists()) {
        return null;
      }

      const data = customerDoc.data();
      // ✅ NEUE: Verwende NumberSequenceService für konsistente Kundennummern  
      const customerNumber = data.customerNumber || 'KD-PENDING';

      return {
        id: customerDoc.id,
        customerNumber,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        street: data.street || '',
        city: data.city || '',
        postalCode: data.postalCode || '',
        country: data.country || 'Deutschland',
        taxNumber: data.taxNumber || '',
        vatId: data.vatId || '',
        vatValidated: data.vatValidated || false,
        isSupplier: data.isSupplier || false,
        totalInvoices: data.totalInvoices || 0,
        totalAmount: data.totalAmount || 0,
        createdAt: data.createdAt || new Date().toISOString(),
        contactPersons: data.contactPersons || [],
        companyId: companyId, // Setze explizit die companyId
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Kunden
   */
  static async addCustomer(
    companyId: string,
    customerData: Omit<Customer, 'id' | 'totalInvoices' | 'totalAmount' | 'createdAt' | 'companyId'>
  ): Promise<string> {
    try {
      // ✅ NEUE: Generiere Kundennummer mit NumberSequenceService (race-condition-safe)
      const customerNumberResult = await NumberSequenceService.getNextNumberForType(companyId, 'Kunde');
      
      const newCustomer = {
        ...customerData,
        customerNumber: customerNumberResult.formattedNumber,
        totalInvoices: 0,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
      };

      // NEUE SUBCOLLECTION STRUKTUR
      const docRef = await addDoc(collection(db, 'companies', companyId, 'customers'), newCustomer);

      console.log(`✅ Kunde erstellt: ${newCustomer.customerNumber} (ID: ${docRef.id})`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Kunden:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen Kunden
   */
  static async updateCustomer(
    companyId: string,
    customerId: string,
    updates: Partial<Customer>
  ): Promise<void> {
    try {
      // NEUE SUBCOLLECTION STRUKTUR
      const customerRef = doc(db, 'companies', companyId, 'customers', customerId);
      await updateDoc(customerRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Löscht einen Kunden
   */
  static async deleteCustomer(companyId: string, customerId: string): Promise<void> {
    try {
      // NEUE SUBCOLLECTION STRUKTUR
      await deleteDoc(doc(db, 'companies', companyId, 'customers', customerId));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sucht Kunden nach Name oder E-Mail
   */
  static async searchCustomers(companyId: string, searchTerm: string): Promise<Customer[]> {
    try {
      const customers = await this.getCustomers(companyId);

      if (!searchTerm.trim()) {
        return customers;
      }

      const term = searchTerm.toLowerCase();
      return customers.filter(
        customer =>
          customer.name.toLowerCase().includes(term) ||
          customer.email.toLowerCase().includes(term) ||
          customer.customerNumber.toLowerCase().includes(term)
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * ✅ NEUE: Generiert die nächste Kundennummer mit NumberSequenceService (race-condition-safe)
   */
  static async getNextCustomerNumber(companyId: string): Promise<string> {
    try {
      const result = await NumberSequenceService.getNextNumberForType(companyId, 'Kunde');
      return result.formattedNumber;
    } catch (error) {
      console.error('❌ Fehler beim Generieren der Kundennummer:', error);
      // Fallback nur im Notfall
      return `KD-${Date.now().toString().slice(-4)}`;
    }
  }

  /**
   * Abonniert Änderungen an Kunden (Real-time Updates)
   */
  static subscribeToCustomers(
    companyId: string,
    callback: (customers: Customer[]) => void
  ): () => void {
    // NEUE SUBCOLLECTION STRUKTUR
    const customersQuery = query(
      collection(db, 'companies', companyId, 'customers'),
      orderBy('name', 'asc')
    );

    return onSnapshot(customersQuery, snapshot => {
      const customers: Customer[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        // ✅ NEUE: Verwende NumberSequenceService für konsistente Kundennummern
        const customerNumber = data.customerNumber || 'KD-PENDING';

        // Filter: Nur echte Kunden anzeigen
        if (customerNumber.startsWith('KD-')) {
          const customer: Customer = {
            id: doc.id,
            customerNumber,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            street: data.street || '',
            city: data.city || '',
            postalCode: data.postalCode || '',
            country: data.country || 'Deutschland',
            taxNumber: data.taxNumber || '',
            vatId: data.vatId || '',
            vatValidated: data.vatValidated || false,
            isSupplier: data.isSupplier || false,
            totalInvoices: data.totalInvoices || 0,
            totalAmount: data.totalAmount || 0,
            createdAt: data.createdAt || new Date().toISOString(),
            contactPersons: data.contactPersons || [],
            companyId: data.companyId || companyId,
          };
          customers.push(customer);
        }
      });

      callback(customers);
    });
  }

  /**
   * Validiert Kundendaten
   */
  static validateCustomer(customer: Partial<Customer>): string[] {
    const errors: string[] = [];

    if (!customer.name?.trim()) {
      errors.push('Kundenname ist erforderlich');
    }

    if (!customer.email?.trim()) {
      errors.push('E-Mail-Adresse ist erforderlich');
    } else if (!/\S+@\S+\.\S+/.test(customer.email)) {
      errors.push('Ungültige E-Mail-Adresse');
    }

    if (customer.vatId && !/^[A-Z]{2}[A-Z0-9]+$/.test(customer.vatId)) {
      errors.push('Ungültige USt-IdNr. Format');
    }

    return errors;
  }

  /**
   * Prüft ob eine E-Mail bereits verwendet wird
   */
  static async isEmailTaken(
    companyId: string,
    email: string,
    excludeCustomerId?: string
  ): Promise<boolean> {
    try {
      const customers = await this.getCustomers(companyId);
      return customers.some(
        customer =>
          customer.email.toLowerCase() === email.toLowerCase() && customer.id !== excludeCustomerId
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Exportiert Kunden als CSV
   */
  static async exportCustomersCSV(companyId: string): Promise<string> {
    try {
      const customers = await this.getCustomers(companyId);

      const headers = [
        'Kundennummer',
        'Name',
        'E-Mail',
        'Telefon',
        'Adresse',
        'Strasse',
        'Stadt',
        'PLZ',
        'Land',
        'Steuernummer',
        'USt-IdNr',
        'Anzahl Rechnungen',
        'Gesamtumsatz',
        'Erstellt am',
      ];

      const csvRows = [
        headers.join(','),
        ...customers.map(customer =>
          [
            customer.customerNumber,
            `"${customer.name}"`,
            customer.email,
            customer.phone || '',
            `"${customer.address}"`,
            `"${customer.street || ''}"`,
            `"${customer.city || ''}"`,
            customer.postalCode || '',
            customer.country || '',
            customer.taxNumber || '',
            customer.vatId || '',
            customer.totalInvoices.toString(),
            customer.totalAmount.toFixed(2),
            new Date(customer.createdAt).toLocaleDateString('de-DE'),
          ].join(',')
        ),
      ];

      return csvRows.join('\n');
    } catch (error) {
      throw error;
    }
  }
}

export default CustomerService;
