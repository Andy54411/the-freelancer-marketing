/**
 * Hook für überfällige Rechnungen und Benachrichtigungen
 */

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  dueDate: string;
  daysPastDue: number;
}

export const useOverdueInvoices = (companyId: string) => {
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchOverdueInvoices = async () => {
      setLoading(true);
      setError(null);

      try {
        const invoicesQuery = query(
          collection(db, 'invoices'),
          where('companyId', '==', companyId),
          where('status', 'in', ['sent', 'overdue']),
          orderBy('dueDate', 'asc')
        );

        const snapshot = await getDocs(invoicesQuery);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdue: OverdueInvoice[] = [];

        snapshot.forEach(doc => {
          const data = doc.data();
          const dueDate = new Date(data.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          // Prüfen ob die Rechnung überfällig ist
          if (dueDate < today) {
            const timeDiff = today.getTime() - dueDate.getTime();
            const daysPastDue = Math.ceil(timeDiff / (1000 * 3600 * 24));

            overdue.push({
              id: doc.id,
              invoiceNumber: data.invoiceNumber || data.number || '',
              customerName: data.customerName || '',
              total: data.total || 0,
              dueDate: data.dueDate,
              daysPastDue,
            });
          }
        });

        console.log('[useOverdueInvoices] Gefundene überfällige Rechnungen:', overdue);
        setOverdueInvoices(overdue);
      } catch (err: any) {
        console.error('Fehler beim Laden der überfälligen Rechnungen:', err);
        setError(err.message || 'Fehler beim Laden der überfälligen Rechnungen');
      } finally {
        setLoading(false);
      }
    };

    fetchOverdueInvoices();
  }, [companyId]);

  return {
    overdueInvoices,
    loading,
    error,
    hasOverdueInvoices: overdueInvoices.length > 0,
    overdueCount: overdueInvoices.length,
  };
};
