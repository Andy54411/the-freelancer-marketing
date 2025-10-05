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
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { NumberSequenceService } from './numberSequenceService';

export interface Supplier {
  id: string;
  supplierNumber: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxNumber?: string;
  vatId?: string;
  vatValidated?: boolean;
  isSupplier: true; // Immer true für Suppliers
  totalInvoices: number;
  totalAmount: number;
  createdAt: string;
  contactPersons?: Array<{
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  }>;
  companyId: string;
}

export class SupplierService {
  /**
   * Alle Lieferanten für eine Company abrufen
   */
  static async getSuppliers(companyId: string): Promise<Supplier[]> {
    try {
      // NEUE SUBCOLLECTION STRUKTUR - suppliers statt customers
      const suppliersRef = collection(db, 'companies', companyId, 'suppliers');
      const q = query(suppliersRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        const supplierNumber = data.supplierNumber || `LF-${doc.id.substring(0, 6).toUpperCase()}`;

        return {
          id: doc.id,
          supplierNumber,
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
          isSupplier: true,
          totalInvoices: data.totalInvoices || 0,
          totalAmount: data.totalAmount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          contactPersons: data.contactPersons || [],
          companyId: data.companyId || companyId,
        } as Supplier;
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lädt einen einzelnen Lieferanten
   */
  static async getSupplier(companyId: string, supplierId: string): Promise<Supplier | null> {
    try {
      const supplierDoc = await getDoc(doc(db, 'companies', companyId, 'suppliers', supplierId));

      if (!supplierDoc.exists()) {
        return null;
      }

      const data = supplierDoc.data();
      const supplierNumber = data.supplierNumber || `LF-${supplierDoc.id.substring(0, 6).toUpperCase()}`;

      return {
        id: supplierDoc.id,
        supplierNumber,
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
        isSupplier: true,
        totalInvoices: data.totalInvoices || 0,
        totalAmount: data.totalAmount || 0,
        createdAt: data.createdAt || new Date().toISOString(),
        contactPersons: data.contactPersons || [],
        companyId: companyId,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Lieferanten mit automatischer Nummernvergabe
   */
  static async addSupplier(
    companyId: string,
    supplierData: Omit<Supplier, 'id' | 'supplierNumber' | 'totalInvoices' | 'totalAmount' | 'createdAt' | 'companyId' | 'isSupplier'>
  ): Promise<string> {
    try {
      // Lieferantennummer mit NumberSequenceService generieren
      const supplierNumberResult = await NumberSequenceService.getNextNumberForType(companyId, 'Lieferant');
      
      const newSupplier = {
        ...supplierData,
        supplierNumber: supplierNumberResult.formattedNumber,
        isSupplier: true,
        totalInvoices: 0,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
      };

      // NEUE SUBCOLLECTION STRUKTUR
      const docRef = await addDoc(collection(db, 'companies', companyId, 'suppliers'), newSupplier);

      console.log(`✅ Lieferant erstellt: ${newSupplier.supplierNumber} (ID: ${docRef.id})`);
      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen des Lieferanten:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen Lieferanten
   */
  static async updateSupplier(
    companyId: string,
    supplierId: string,
    updates: Partial<Supplier>
  ): Promise<void> {
    try {
      const supplierRef = doc(db, 'companies', companyId, 'suppliers', supplierId);
      await updateDoc(supplierRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Löscht einen Lieferanten
   */
  static async deleteSupplier(companyId: string, supplierId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'suppliers', supplierId));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generiert die nächste Lieferantennummer
   */
  static async getNextSupplierNumber(companyId: string): Promise<string> {
    try {
      const result = await NumberSequenceService.getNextNumberForType(companyId, 'Lieferant');
      return result.formattedNumber;
    } catch (error) {
      console.error('Fehler beim Generieren der Lieferantennummer:', error);
      return `LF-${Date.now().toString().slice(-4)}`;
    }
  }

  /**
   * Sucht Lieferanten nach Name oder E-Mail
   */
  static async searchSuppliers(companyId: string, searchTerm: string): Promise<Supplier[]> {
    try {
      const suppliers = await this.getSuppliers(companyId);

      if (!searchTerm.trim()) {
        return suppliers;
      }

      const term = searchTerm.toLowerCase();
      return suppliers.filter(
        supplier =>
          supplier.name.toLowerCase().includes(term) ||
          supplier.email.toLowerCase().includes(term) ||
          supplier.supplierNumber.toLowerCase().includes(term)
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Abonniert Änderungen an Lieferanten (Real-time Updates)
   */
  static subscribeToSuppliers(
    companyId: string,
    callback: (suppliers: Supplier[]) => void
  ): () => void {
    const suppliersQuery = query(
      collection(db, 'companies', companyId, 'suppliers'),
      orderBy('name', 'asc')
    );

    return onSnapshot(suppliersQuery, snapshot => {
      const suppliers: Supplier[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const supplierNumber = data.supplierNumber || `LF-${doc.id.substring(0, 6).toUpperCase()}`;

        // Filter: Nur echte Lieferanten anzeigen
        if (supplierNumber.startsWith('LF-')) {
          const supplier: Supplier = {
            id: doc.id,
            supplierNumber,
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
            isSupplier: true,
            totalInvoices: data.totalInvoices || 0,
            totalAmount: data.totalAmount || 0,
            createdAt: data.createdAt || new Date().toISOString(),
            contactPersons: data.contactPersons || [],
            companyId: data.companyId || companyId,
          };
          suppliers.push(supplier);
        }
      });

      callback(suppliers);
    });
  }

  /**
   * Validiert Lieferantendaten
   */
  static validateSupplier(supplier: Partial<Supplier>): string[] {
    const errors: string[] = [];

    if (!supplier.name?.trim()) {
      errors.push('Lieferantenname ist erforderlich');
    }

    if (!supplier.email?.trim()) {
      errors.push('E-Mail-Adresse ist erforderlich');
    } else if (!/\S+@\S+\.\S+/.test(supplier.email)) {
      errors.push('Ungültige E-Mail-Adresse');
    }

    if (supplier.vatId && !/^[A-Z]{2}[A-Z0-9]+$/.test(supplier.vatId)) {
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
    excludeSupplierId?: string
  ): Promise<boolean> {
    try {
      const suppliers = await this.getSuppliers(companyId);
      return suppliers.some(
        supplier =>
          supplier.email.toLowerCase() === email.toLowerCase() && supplier.id !== excludeSupplierId
      );
    } catch (error) {
      return false;
    }
  }
}

export default SupplierService;