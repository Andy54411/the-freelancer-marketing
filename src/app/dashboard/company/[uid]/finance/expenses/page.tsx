'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseComponent } from '@/components/finance/ExpenseComponent';
import { toast } from 'sonner';

interface ExpenseData {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  vendor?: string;
  invoiceNumber?: string;
  vatAmount?: number;
  netAmount?: number;
  vatRate?: number;
  companyName?: string;
  companyAddress?: string;
  companyVatNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  receipt?: {
    fileName: string;
    downloadURL: string;
    uploadDate: string;
  };
  taxDeductible?: boolean;
  createdAt?: Date;
}

export default function ExpensesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);

  // Ausgaben von API laden
  const loadExpenses = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/expenses?companyId=${uid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.expenses) {
        // Konvertiere API-Daten zu Component-Format
        const formattedExpenses: ExpenseData[] = result.expenses.map((expense: any) => ({
          id: expense.id,
          title: expense.title || expense.description || 'Ausgabe',
          amount: expense.amount || 0,
          category: expense.category || 'Sonstiges',
          date: expense.date || new Date().toISOString().split('T')[0],
          description: expense.description || '',
          vendor: expense.vendor || '',
          invoiceNumber: expense.invoiceNumber || '',
          vatAmount: expense.vatAmount || null,
          netAmount: expense.netAmount || null,
          vatRate: expense.vatRate || null,
          companyName: expense.companyName || '',
          companyAddress: expense.companyAddress || '',
          companyVatNumber: expense.companyVatNumber || '',
          contactEmail: expense.contactEmail || '',
          contactPhone: expense.contactPhone || '',
          receipt: expense.receipt || null,
          taxDeductible: expense.taxDeductible || false,
          createdAt: expense.createdAt ? new Date(expense.createdAt) : new Date(),
        }));

        setExpenses(formattedExpenses);
        console.log('Loaded expenses from API:', formattedExpenses.length);
      } else {
        console.error('API response error:', result);
        toast.error('Fehler beim Laden der Ausgaben: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Fehler beim Laden der Ausgaben');
    } finally {
      setLoading(false);
    }
  };

  // Neue Ausgabe speichern
  const handleSaveExpense = async (expenseData: any) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...expenseData,
          companyId: uid,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success('Ausgabe erfolgreich gespeichert');
        // Ausgaben neu laden
        await loadExpenses();
        return true;
      } else {
        toast.error('Fehler beim Speichern: ' + (result.error || 'Unbekannter Fehler'));
        return false;
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Fehler beim Speichern der Ausgabe');
      return false;
    }
  };

  // Ausgabe löschen
  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/expenses?id=${expenseId}&companyId=${uid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success('Ausgabe erfolgreich gelöscht');
        // Ausgaben neu laden
        await loadExpenses();
        return true;
      } else {
        toast.error('Fehler beim Löschen: ' + (result.error || 'Unbekannter Fehler'));
        return false;
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Fehler beim Löschen der Ausgabe');
      return false;
    }
  };

  useEffect(() => {
    if (uid && user) {
      loadExpenses();
    }
  }, [uid, user]);

  // Autorisierung prüfen
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <span className="ml-3 text-gray-600">Lade Ausgaben...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <ExpenseComponent
            companyId={uid}
            expenses={expenses}
            onSave={handleSaveExpense}
            onDelete={handleDeleteExpense}
            onRefresh={loadExpenses}
          />
        </div>
      </div>
    </div>
  );
}
