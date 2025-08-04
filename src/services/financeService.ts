'use client';

import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { InvoiceData } from '@/types/invoiceTypes';

export interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  thisMonthRevenue: number;
  lastUpdate: Date;
}

export interface PaymentRecord {
  id: string;
  companyId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: Date;
  invoiceId?: string;
  method?: 'bank_transfer' | 'credit_card' | 'cash' | 'paypal';
  reference?: string;
  createdAt: Date;
}

export interface ExpenseRecord {
  id: string;
  companyId: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  receipt?: string;
  taxDeductible: boolean;
  createdAt: Date;
}

export class FinanceService {
  /**
   * Lädt alle Finanzstatistiken für ein Unternehmen
   */
  static async getFinanceStats(companyId: string): Promise<FinanceStats> {
    try {
      console.log('🔄 FinanceService: Lade Finanzstatistiken für Company:', companyId);

      const [invoices, payments, expenses] = await Promise.all([
        this.getInvoices(companyId),
        this.getPayments(companyId),
        this.getExpenses(companyId),
      ]);

      console.log('📊 FinanceService: Geladene Daten:', {
        invoicesCount: invoices.length,
        paymentsCount: payments.length,
        expensesCount: expenses.length,
        invoices: invoices.map(inv => ({ id: inv.id, status: inv.status, total: inv.total })),
      });

      // Berechne Umsatz aus bezahlten Rechnungen
      const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);

      // Berechne Ausgaben
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Berechne ausstehende Rechnungen
      const outstandingInvoices = invoices.filter(
        inv => inv.status === 'sent' || inv.status === 'overdue'
      );

      const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + inv.total, 0);

      // Berechne Umsatz diesen Monat
      const currentMonth = new Date();
      currentMonth.setDate(1);

      const thisMonthRevenue = invoices
        .filter(inv => inv.status === 'paid' && new Date(inv.issueDate) >= currentMonth)
        .reduce((sum, inv) => sum + inv.total, 0);

      const stats = {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        outstandingInvoices: outstandingInvoices.length,
        outstandingAmount,
        thisMonthRevenue,
        lastUpdate: new Date(),
      };

      console.log('💰 FinanceService: Berechnete Statistiken:', stats);
      return stats;
    } catch (error) {
      console.error('Fehler beim Laden der Finanzstatistiken:', error);
      throw error;
    }
  }

  /**
   * Lädt alle Rechnungen für ein Unternehmen
   */
  private static async getInvoices(companyId: string): Promise<InvoiceData[]> {
    console.log('📄 FinanceService: Lade Rechnungen für Company:', companyId);

    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
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

    console.log('✅ FinanceService: Rechnungen geladen:', {
      count: invoices.length,
      invoices: invoices.map(inv => ({
        id: inv.id,
        status: inv.status,
        total: inv.total,
        invoiceNumber: inv.invoiceNumber,
      })),
    });

    return invoices;
  }

  /**
   * Lädt alle Zahlungen für ein Unternehmen
   */
  private static async getPayments(companyId: string): Promise<PaymentRecord[]> {
    try {
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('companyId', '==', companyId),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(paymentsQuery);
      const payments: PaymentRecord[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          companyId: data.companyId,
          amount: data.amount || 0,
          type: data.type || 'income',
          category: data.category || '',
          description: data.description || '',
          date: data.date?.toDate?.() || new Date(),
          invoiceId: data.invoiceId,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        });
      });

      return payments;
    } catch (error) {
      console.error('Fehler beim Laden der Zahlungen:', error);
      return [];
    }
  }

  /**
   * Lädt alle Ausgaben für ein Unternehmen
   */
  private static async getExpenses(companyId: string): Promise<ExpenseRecord[]> {
    try {
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('companyId', '==', companyId),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(expensesQuery);
      const expenses: ExpenseRecord[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        expenses.push({
          id: doc.id,
          companyId: data.companyId,
          amount: data.amount || 0,
          category: data.category || '',
          description: data.description || '',
          date: data.date?.toDate?.() || new Date(),
          receipt: data.receipt,
          taxDeductible: data.taxDeductible || false,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        });
      });

      return expenses;
    } catch (error) {
      console.error('Fehler beim Laden der Ausgaben:', error);
      return [];
    }
  }

  /**
   * Erstellt eine neue Zahlung
   */
  static async createPayment(payment: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { addDoc, Timestamp } = await import('firebase/firestore');

      await addDoc(collection(db, 'payments'), {
        ...payment,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Zahlung:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue Ausgabe
   */
  static async createExpense(expense: Omit<ExpenseRecord, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { addDoc, Timestamp } = await import('firebase/firestore');

      await addDoc(collection(db, 'expenses'), {
        ...expense,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Ausgabe:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine Zahlung
   */
  static async updatePayment(id: string, updates: Partial<PaymentRecord>): Promise<void> {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');

      await updateDoc(doc(db, 'payments', id), updates);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Zahlung:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine Ausgabe
   */
  static async updateExpense(id: string, updates: Partial<ExpenseRecord>): Promise<void> {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');

      await updateDoc(doc(db, 'expenses', id), updates);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Ausgabe:', error);
      throw error;
    }
  }

  /**
   * Löscht eine Zahlung
   */
  static async deletePayment(id: string): Promise<void> {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');

      await deleteDoc(doc(db, 'payments', id));
    } catch (error) {
      console.error('Fehler beim Löschen der Zahlung:', error);
      throw error;
    }
  }

  /**
   * Löscht eine Ausgabe
   */
  static async deleteExpense(id: string): Promise<void> {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');

      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      console.error('Fehler beim Löschen der Ausgabe:', error);
      throw error;
    }
  }
}
