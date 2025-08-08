'use client';

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { InvoiceData } from '@/types/invoiceTypes';

interface CustomerStats {
  totalAmount: number;
  totalInvoices: number;
}

/**
 * Berechnet die Kundenstatistiken basierend auf Rechnungen
 * @param companyId - Die Firmen-ID
 * @param customerName - Der Kundenname
 * @returns Promise mit den berechneten Statistiken
 */
export async function calculateCustomerStats(
  companyId: string,
  customerName: string
): Promise<CustomerStats> {
  try {
    // Lade alle Rechnungen für den Kunden
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('companyId', '==', companyId),
      where('customerName', '==', customerName)
    );

    const querySnapshot = await getDocs(invoicesQuery);
    const invoices: InvoiceData[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      invoices.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      } as InvoiceData);
    });

    // Nur finalisierte/gesendete Rechnungen für Umsatzberechnung
    const validInvoices = invoices.filter(
      invoice =>
        invoice.status === 'finalized' || invoice.status === 'sent' || invoice.status === 'paid'
    );

    const totalAmount = validInvoices.reduce((sum, invoice) => {
      // Berücksichtige Storno-Rechnungen (negative Beträge)
      const amount = invoice.isStorno ? -invoice.total : invoice.total;
      return sum + amount;
    }, 0);

    return {
      totalAmount,
      totalInvoices: validInvoices.length,
    };
  } catch (error) {
    console.error('Fehler beim Berechnen der Kundenstatistiken:', error);
    return { totalAmount: 0, totalInvoices: 0 };
  }
}

/**
 * Aktualisiert die Kundenstatistiken in der Datenbank
 * @param customerId - Die Kunden-ID
 * @param stats - Die neuen Statistiken
 * @param userId - Die User-ID für lastModifiedBy (optional)
 */
export async function updateCustomerStats(
  customerId: string,
  stats: CustomerStats,
  userId?: string
): Promise<void> {
  try {
    const customerRef = doc(db, 'customers', customerId);
    const updateData: any = {
      totalAmount: stats.totalAmount,
      totalInvoices: stats.totalInvoices,
      lastStatsUpdate: new Date(),
      updatedAt: serverTimestamp(),
    };

    // Nur lastModifiedBy setzen, wenn userId übergeben wurde
    if (userId) {
      updateData.lastModifiedBy = userId;
    }

    await updateDoc(customerRef, updateData);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Kundenstatistiken:', error);
    throw error;
  }
}

/**
 * Synchronisiert alle Kundenstatistiken für eine Firma
 * @param companyId - Die Firmen-ID
 */
export async function syncAllCustomerStats(companyId: string): Promise<void> {
  try {
    // Lade alle Kunden der Firma
    const customersQuery = query(collection(db, 'customers'), where('companyId', '==', companyId));

    const customersSnapshot = await getDocs(customersQuery);

    // Aktualisiere jeden Kunden
    const updates = customersSnapshot.docs.map(async customerDoc => {
      const customerData = customerDoc.data();
      const stats = await calculateCustomerStats(companyId, customerData.name);
      await updateCustomerStats(customerDoc.id, stats);
      return { customerId: customerDoc.id, stats };
    });

    await Promise.all(updates);
    console.log(`✅ Kundenstatistiken für ${updates.length} Kunden aktualisiert`);
  } catch (error) {
    console.error('Fehler beim Synchronisieren aller Kundenstatistiken:', error);
    throw error;
  }
}
