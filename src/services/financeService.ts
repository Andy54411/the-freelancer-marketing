import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, updateDoc, collection as fsCollection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';


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
  vatTotal: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
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

// Interface für Aufträge aus Firebase
export interface OrderRecord {
  id: string;
  selectedAnbieterId: string;
  customerFirebaseUid: string;
  totalAmountPaidByBuyer?: number; // in Cents
  jobCalculatedPriceInCents?: number; // in Cents
  status:
  'AKTIV' |
  'ABGESCHLOSSEN' |
  'STORNIERT' |
  'FEHLENDE DETAILS' |
  'IN BEARBEITUNG' |
  'zahlung_erhalten_clearing' |
  'abgelehnt_vom_anbieter' |
  'COMPLETED' |
  'BEZAHLT';
  createdAt: any; // Firebase Timestamp
  paidAt?: any; // Firebase Timestamp
  description?: string;
  selectedCategory?: string;
  selectedSubcategory?: string;
}

export class FinanceService {

  /**
   * Speichert finale PDF-Daten und PDF in Storage/Subcollection
   */
  static async saveFinalInvoiceWithPDF({
    companyId,
    invoiceId,
    actionType,
    pdfBlob,
    finalData,
    userId







  }: {companyId: string;invoiceId: string;actionType: string;pdfBlob: Blob;finalData: any;userId?: string;}) {
    // Validierung
    if (!companyId || !invoiceId) {
      console.error('saveFinalInvoiceWithPDF: companyId oder invoiceId fehlt!', { companyId, invoiceId });
      throw new Error('Ungültige Firestore-Referenz: companyId oder invoiceId fehlt!');
    }

    // 1. PDF in Storage hochladen
    // Pfad: invoices/{companyId}/{invoiceId}.pdf (ORIGINALES SYSTEM)
    const pdfPath = `invoices/${companyId}/${invoiceId}.pdf`;
    const pdfRef = ref(storage, pdfPath);


    await uploadBytes(pdfRef, pdfBlob);
    const pdfUrl = await getDownloadURL(pdfRef);



    // 2. Daten bereinigen (Entferne undefined, Funktionen, etc.)
    const cleanFinalData = JSON.parse(JSON.stringify(finalData, (key, value) => {
      // Entferne undefined, Funktionen, Symbols
      if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
        return null;
      }
      return value;
    }));

    // 3. Daten in Subcollection speichern
    const actionData = {
      ...cleanFinalData,
      pdfUrl,
      actionType,
      createdAt: serverTimestamp(), // ✅ FIX: Use serverTimestamp() for Firestore Rules
      userId: userId || null,
      companyId // Explizit hinzufügen für Security Rules
    };










    // Subcollection: companies/{companyId}/invoices/{invoiceId}/actions
    const actionsCol = fsCollection(db, 'companies', companyId, 'invoices', invoiceId, 'actions');

    try {
      const docRef = await addDoc(actionsCol, actionData);

    } catch (firestoreError) {
      console.error('❌ Firestore subcollection save failed:', firestoreError);
      // Continue - we still want to update the main invoice
    }

    // 4. *** KRITISCH *** PDF-URL AUCH in der Hauptrechnung speichern!
    try {
      const mainInvoiceRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
      await updateDoc(mainInvoiceRef, {
        pdfUrl: pdfUrl,
        lastPdfUpdate: serverTimestamp()
      });

    } catch (updateError) {
      console.error('❌ Failed to update main invoice with PDF URL:', updateError);
    }

    // Gib die PDF-URL zurück
    return pdfUrl;
  }
  /**
   * Lädt alle Finanzstatistiken für ein Unternehmen
   */
  static async getFinanceStats(companyId: string): Promise<FinanceStats> {
    try {
      // Lade echte Auftragsdaten aus Firebase
      const [orders, invoices, payments, expenses] = await Promise.all([
      this.getCompanyOrders(companyId),
      this.getInvoices(companyId),
      this.getPayments(companyId),
      this.getExpenses(companyId)]
      );

      // 🔄 KOMBINATION: Berechne Gesamtumsatz aus BEIDEN Quellen

      // 1. Umsatz aus Aufträgen (auftraege collection)
      const ordersRevenue =
      orders.
      filter(
        (order) =>
        order.status === 'ABGESCHLOSSEN' ||
        order.status === 'COMPLETED' ||
        order.status === 'BEZAHLT' ||
        order.status === 'zahlung_erhalten_clearing'
      ).
      reduce((sum, order) => sum + (order.totalAmountPaidByBuyer || 0), 0) / 100; // Von Cent zu Euro

      // 2. Umsatz aus Rechnungen (invoices collection)
      const invoicesRevenue = invoices.
      filter((inv) => inv.status === 'paid').
      reduce((sum, inv) => sum + inv.total, 0);

      // 3. GESAMTUMSATZ = Aufträge + Rechnungen
      const totalRevenue = ordersRevenue + invoicesRevenue;

      // Berechne Ausgaben aus expense records und invoice system
      const expenseFromRecords = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalExpenses = expenseFromRecords;

      // Berechne ausstehende Rechnungen (aus invoice system)
      const outstandingInvoices = invoices.filter(
        (inv) => inv.status === 'sent' || inv.status === 'overdue'
      );
      const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + inv.total, 0);

      // Berechne Umsatz diesen Monat aus BEIDEN Quellen
      const currentMonth = new Date();
      currentMonth.setDate(1);

      // Diesen Monat: Aufträge
      const thisMonthOrdersRevenue =
      orders.
      filter((order) => {
        const paidDate = order.paidAt ? new Date(order.paidAt._seconds * 1000) : null;
        return (
          (order.status === 'ABGESCHLOSSEN' ||
          order.status === 'COMPLETED' ||
          order.status === 'BEZAHLT' ||
          order.status === 'zahlung_erhalten_clearing') &&
          paidDate &&
          paidDate >= currentMonth);

      }).
      reduce((sum, order) => sum + (order.totalAmountPaidByBuyer || 0), 0) / 100;

      // Diesen Monat: Rechnungen
      const thisMonthInvoicesRevenue = invoices.
      filter((inv) => inv.status === 'paid' && new Date(inv.issueDate) >= currentMonth).
      reduce((sum, inv) => sum + inv.total, 0);

      // Kombinierter Umsatz diesen Monat
      const thisMonthRevenue = thisMonthOrdersRevenue + thisMonthInvoicesRevenue;

      // Berechne MwSt. (19% vom Nettoumsatz)
      const vatTotal = totalRevenue * 0.19;

      // Berechne monatliche Daten für die letzten 12 Monate aus BEIDEN Quellen
      const monthlyData = this.calculateMonthlyDataFromBothSources(orders, invoices, expenses);

      const stats = {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        outstandingInvoices: outstandingInvoices.length,
        outstandingAmount,
        thisMonthRevenue,
        vatTotal,
        monthlyData,
        lastUpdate: new Date()
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lädt alle Rechnungen für ein Unternehmen
   */
  private static async getInvoices(companyId: string): Promise<InvoiceData[]> {
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(invoicesQuery);
    const invoices: InvoiceData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      invoices.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || new Date()
      } as InvoiceData);
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

      querySnapshot.forEach((doc) => {
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
          createdAt: data.createdAt?.toDate?.() || new Date()
        });
      });

      return payments;
    } catch (error) {
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

      querySnapshot.forEach((doc) => {
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
          createdAt: data.createdAt?.toDate?.() || new Date()
        });
      });

      return expenses;
    } catch (error) {
      return [];
    }
  }

  /**
   * Lädt alle Aufträge für ein Unternehmen aus der auftraege Collection
   */
  private static async getCompanyOrders(companyId: string): Promise<OrderRecord[]> {
    try {
      const ordersQuery = query(
        collection(db, 'auftraege'),
        where('selectedAnbieterId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(ordersQuery);
      const orders: OrderRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          selectedAnbieterId: data.selectedAnbieterId,
          customerFirebaseUid: data.customerFirebaseUid,
          totalAmountPaidByBuyer: data.totalAmountPaidByBuyer || 0,
          jobCalculatedPriceInCents: data.jobCalculatedPriceInCents || 0,
          status: data.status || 'FEHLENDE DETAILS',
          createdAt: data.createdAt,
          paidAt: data.paidAt,
          description: data.description,
          selectedCategory: data.selectedCategory,
          selectedSubcategory: data.selectedSubcategory
        });
      });

      return orders;
    } catch (error) {
      return [];
    }
  }

  /**
   * Berechnet monatliche Finanzstatistiken basierend auf echten Auftragsdaten
   */
  private static calculateMonthlyDataFromOrders(
  orders: OrderRecord[],
  expenses: ExpenseRecord[])
  : Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }> {
    const monthlyData: Array<{month: string;revenue: number;expenses: number;profit: number;}> = [];
    const today = new Date();

    // Generiere Daten für die letzten 12 Monate
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

      // Monatsnamen auf Deutsch
      const monthNames = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember'];


      const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

      // Umsatz für diesen Monat aus echten Aufträgen
      const monthRevenue =
      orders.
      filter((order) => {
        const paidDate = order.paidAt ? new Date(order.paidAt._seconds * 1000) : null;
        return (
          (order.status === 'ABGESCHLOSSEN' ||
          order.status === 'COMPLETED' ||
          order.status === 'BEZAHLT' ||
          order.status === 'zahlung_erhalten_clearing') &&
          paidDate &&
          paidDate >= date &&
          paidDate < nextMonth);

      }).
      reduce((sum, order) => sum + (order.totalAmountPaidByBuyer || 0), 0) / 100; // Cent zu Euro

      // Ausgaben für diesen Monat
      const monthExpenses = expenses.
      filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= date && expDate < nextMonth;
      }).
      reduce((sum, exp) => sum + exp.amount, 0);

      monthlyData.push({
        month: monthName,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses
      });
    }

    return monthlyData;
  }

  /**
   * Berechnet monatliche Finanzstatistiken aus BEIDEN Quellen: Aufträge UND Rechnungen
   */
  private static calculateMonthlyDataFromBothSources(
  orders: OrderRecord[],
  invoices: InvoiceData[],
  expenses: ExpenseRecord[])
  : Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }> {
    const monthlyData: Array<{month: string;revenue: number;expenses: number;profit: number;}> = [];
    const today = new Date();

    // Generiere Daten für die letzten 12 Monate
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

      // Monatsnamen auf Deutsch
      const monthNames = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember'];


      const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

      // 1. Umsatz aus Aufträgen für diesen Monat
      const monthOrdersRevenue =
      orders.
      filter((order) => {
        const paidDate = order.paidAt ? new Date(order.paidAt._seconds * 1000) : null;
        return (
          (order.status === 'ABGESCHLOSSEN' ||
          order.status === 'COMPLETED' ||
          order.status === 'BEZAHLT' ||
          order.status === 'zahlung_erhalten_clearing') &&
          paidDate &&
          paidDate >= date &&
          paidDate < nextMonth);

      }).
      reduce((sum, order) => sum + (order.totalAmountPaidByBuyer || 0), 0) / 100; // Cent zu Euro

      // 2. Umsatz aus Rechnungen für diesen Monat
      const monthInvoicesRevenue = invoices.
      filter((inv) => {
        const invDate = new Date(inv.issueDate);
        return inv.status === 'paid' && invDate >= date && invDate < nextMonth;
      }).
      reduce((sum, inv) => sum + inv.total, 0);

      // 3. Kombinierter Monatsumsatz
      const monthRevenue = monthOrdersRevenue + monthInvoicesRevenue;

      // Ausgaben für diesen Monat
      const monthExpenses = expenses.
      filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= date && expDate < nextMonth;
      }).
      reduce((sum, exp) => sum + exp.amount, 0);

      monthlyData.push({
        month: monthName,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses
      });
    }

    return monthlyData;
  }

  /**
   * Erstellt eine neue Zahlung
   */
  static async createPayment(payment: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { addDoc, Timestamp } = await import('firebase/firestore');

      await addDoc(collection(db, 'payments'), {
        ...payment,
        createdAt: Timestamp.now()
      });
    } catch (error) {
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
        createdAt: Timestamp.now()
      });
    } catch (error) {
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
      throw error;
    }
  }

  /**
   * Berechnet monatliche Finanzstatistiken für die letzten 12 Monate
   */
  private static calculateMonthlyData(
  invoices: InvoiceData[],
  expenses: ExpenseRecord[])
  : Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }> {
    const monthlyData: Array<{month: string;revenue: number;expenses: number;profit: number;}> = [];
    const today = new Date();

    // Generiere Daten für die letzten 12 Monate
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

      // Monatsnamen auf Deutsch
      const monthNames = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember'];


      const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

      // Umsatz für diesen Monat (nur bezahlte Rechnungen)
      const monthRevenue = invoices.
      filter((inv) => {
        const invDate = new Date(inv.issueDate);
        return inv.status === 'paid' && invDate >= date && invDate < nextMonth;
      }).
      reduce((sum, inv) => sum + inv.total, 0);

      // Ausgaben für diesen Monat
      const monthExpenses = expenses.
      filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= date && expDate < nextMonth;
      }).
      reduce((sum, exp) => sum + exp.amount, 0);

      monthlyData.push({
        month: monthName,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses
      });
    }

    return monthlyData;
  }
}