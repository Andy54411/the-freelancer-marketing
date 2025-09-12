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

export class CustomerService {
  
  /**
   * Alle Kunden für eine Company abrufen
   */
  static async getCustomers(companyId: string): Promise<Customer[]> {
    try {
      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('companyId', '==', companyId), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const customerNumber = data.customerNumber || `KD-${doc.id.substring(0, 6).toUpperCase()}`;

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
      console.error('Error loading customers:', error);
      throw error;
    }
  }

  /**
   * Lädt einen einzelnen Kunden
   */
  static async getCustomer(companyId: string, customerId: string): Promise<Customer | null> {
    try {
      const customerDoc = await getDoc(doc(db, 'customers', customerId));
      
      if (!customerDoc.exists()) {
        return null;
      }

      const data = customerDoc.data();
      const customerNumber = data.customerNumber || `KD-${customerDoc.id.substring(0, 6).toUpperCase()}`;

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
        companyId: data.companyId || companyId,
      };
    } catch (error) {
      console.error('❌ Error loading customer:', error);
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Kunden
   */
  static async createCustomer(
    companyId: string,
    customerData: Omit<Customer, 'id' | 'totalInvoices' | 'totalAmount' | 'createdAt' | 'companyId'>
  ): Promise<string> {
    try {
      const newCustomer = {
        ...customerData,
        companyId,
        totalInvoices: 0,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'customers'), newCustomer);
      console.log('✅ Customer created with ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen Kunden
   */
  static async updateCustomer(companyId: string, customerId: string, updates: Partial<Customer>): Promise<void> {
    try {
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      
      console.log('✅ Customer updated:', customerId);
    } catch (error) {
      console.error('❌ Error updating customer:', error);
      throw error;
    }
  }

  /**
   * Löscht einen Kunden
   */
  static async deleteCustomer(companyId: string, customerId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      console.log('✅ Customer deleted:', customerId);
    } catch (error) {
      console.error('❌ Error deleting customer:', error);
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
      return customers.filter(customer => 
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.customerNumber.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('❌ Error searching customers:', error);
      throw error;
    }
  }

  /**
   * Generiert die nächste Kundennummer
   */
  static async getNextCustomerNumber(companyId: string): Promise<string> {
    try {
      const customers = await this.getCustomers(companyId);
      
      // Finde die höchste Kundennummer
      let maxNumber = 0;
      customers.forEach(customer => {
        const match = customer.customerNumber.match(/KD-(\d+)/);
        if (match) {
          const number = parseInt(match[1]);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `KD-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('❌ Error generating customer number:', error);
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
    const customersQuery = query(
      collection(db, 'customers'),
      where('companyId', '==', companyId),
      orderBy('name', 'asc')
    );

    return onSnapshot(customersQuery, (snapshot) => {
      const customers: Customer[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const customerNumber = data.customerNumber || `KD-${doc.id.substring(0, 6).toUpperCase()}`;

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
  static async isEmailTaken(companyId: string, email: string, excludeCustomerId?: string): Promise<boolean> {
    try {
      const customers = await this.getCustomers(companyId);
      return customers.some(customer => 
        customer.email.toLowerCase() === email.toLowerCase() && 
        customer.id !== excludeCustomerId
      );
    } catch (error) {
      console.error('❌ Error checking email:', error);
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
        'Erstellt am'
      ];

      const csvRows = [
        headers.join(','),
        ...customers.map(customer => [
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
          new Date(customer.createdAt).toLocaleDateString('de-DE')
        ].join(','))
      ];

      return csvRows.join('\n');
    } catch (error) {
      console.error('❌ Error exporting customers:', error);
      throw error;
    }
  }
}

export default CustomerService;