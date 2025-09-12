'use client';

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface Customer {
  id: string;
  customerNumber: string;
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
  totalInvoices: number;
  totalAmount: number;
  createdAt: string;
  contactPersons?: any[];
  companyId: string;
}

/**
 * Normalize customer name for fuzzy matching
 */
export const normalizeCustomerName = (name: string): string => {
  if (!name) return '';

  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Fuzzy match customer names
 */
export const fuzzyMatchCustomer = (
  searchName: string,
  existingCustomers: Customer[]
): Customer | null => {
  if (!searchName) return null;

  const normalizedSearch = normalizeCustomerName(searchName);

  for (const customer of existingCustomers) {
    const normalizedCustomer = normalizeCustomerName(customer.name);

    // Exact match
    if (normalizedCustomer === normalizedSearch) {
      return customer;
    }

    // Partial match (search name contains customer name or vice versa)
    if (
      normalizedSearch.includes(normalizedCustomer) ||
      normalizedCustomer.includes(normalizedSearch)
    ) {
      // Only match if significant overlap (avoid false positives)
      const overlapRatio =
        Math.min(normalizedSearch.length, normalizedCustomer.length) /
        Math.max(normalizedSearch.length, normalizedCustomer.length);
      if (overlapRatio > 0.6) {
        return customer;
      }
    }
  }

  return null;
};

/**
 * Generate next customer number
 */
export const generateNextCustomerNumber = (existingCustomers: Customer[]): string => {
  if (existingCustomers.length === 0) {
    return 'KD-001';
  }

  const numbers = existingCustomers
    .map(c => c.customerNumber)
    .filter(num => num.startsWith('KD-'))
    .map(num => parseInt(num.replace('KD-', ''), 10))
    .filter(num => !isNaN(num));

  const highestNumber = Math.max(...numbers, 0);
  return `KD-${String(highestNumber + 1).padStart(3, '0')}`;
};

/**
 * Load all customers for a company
 */
export const loadCustomers = async (companyId: string): Promise<Customer[]> => {
  const customersQuery = query(
    collection(db, 'customers'),
    where('companyId', '==', companyId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(customersQuery);
  const customers: Customer[] = [];

  querySnapshot.forEach(doc => {
    const data = doc.data();
    customers.push({
      id: doc.id,
      customerNumber: data.customerNumber || 'KD-000',
      name: data.name || '',
      email: data.email || '',
      phone: data.phone,
      address: data.address || '',
      street: data.street || '',
      city: data.city || '',
      postalCode: data.postalCode || '',
      country: data.country || '',
      taxNumber: data.taxNumber,
      vatId: data.vatId,
      vatValidated: data.vatValidated || false,
      totalInvoices: data.totalInvoices || 0,
      totalAmount: data.totalAmount || 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      contactPersons: data.contactPersons || [],
      companyId: data.companyId || companyId,
    });
  });

  return customers;
};

/**
 * Find existing customer or create new one (like supplier system)
 * AUTOMATIC CUSTOMER CREATION when creating invoices
 */
export const findOrCreateCustomer = async (
  customerName: string,
  companyId: string,
  userUid: string
): Promise<Customer> => {
  try {
    // Load all existing customers
    const existingCustomers = await loadCustomers(companyId);

    // Try to find existing customer with fuzzy matching
    const existingCustomer = fuzzyMatchCustomer(customerName, existingCustomers);

    if (existingCustomer) {
      return existingCustomer;
    }

    // Customer doesn't exist, create new one

    const newCustomerData = {
      customerNumber: generateNextCustomerNumber(existingCustomers),
      name: customerName.trim(),
      email: '', // Will be empty initially
      phone: '',
      address: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Deutschland',
      taxNumber: '',
      vatId: '',
      vatValidated: false,
      totalInvoices: 0,
      totalAmount: 0,
      contactPersons: [],
      companyId,
      createdAt: serverTimestamp(),
      createdBy: userUid,
      lastModifiedBy: userUid,
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'customers'), newCustomerData);

    const newCustomer: Customer = {
      id: docRef.id,
      customerNumber: newCustomerData.customerNumber,
      name: customerName.trim(),
      email: '',
      phone: '',
      address: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Deutschland',
      taxNumber: '',
      vatId: '',
      vatValidated: false,
      totalInvoices: 0,
      totalAmount: 0,
      contactPersons: [],
      companyId,
      createdAt: new Date().toISOString(),
    };

    return newCustomer;
  } catch (error) {
    throw error;
  }
};
