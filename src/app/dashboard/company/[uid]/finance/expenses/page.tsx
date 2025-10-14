'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseComponent } from '@/components/finance/ExpenseComponent';
import { ImportXRechnungDialog } from '@/components/finance/ImportXRechnungDialog';
import { Button } from '@/components/ui/button';
import { FileDown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface ExpenseData {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  dueDate?: string; // 🎯 FÄLLIGKEITSDATUM hinzugefügt
  paymentTerms?: string; // 🎯 ZAHLUNGSBEDINGUNGEN hinzugefügt
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
  supplierId?: string; // 🔗 Lieferanten-Verknüpfung
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
  const [importDialogOpen, setImportDialogOpen] = useState(false); // 🎯 Import-Dialog State

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
          dueDate: expense.dueDate || '', // 🎯 FÄLLIGKEITSDATUM vom Backend
          paymentTerms: expense.paymentTerms || '', // 🎯 ZAHLUNGSBEDINGUNGEN vom Backend
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
          supplierId: expense.supplierId || '', // 🔗 Lieferanten-Verknüpfung
          receipt: expense.receipt || null,
          taxDeductible: expense.taxDeductible || false,
          createdAt: expense.createdAt ? new Date(expense.createdAt) : new Date(),
        }));

        setExpenses(formattedExpenses);
      } else {
        toast.error('Fehler beim Laden der Ausgaben: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
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
    <div className="space-y-6">
      {/* Header mit Buttons */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ausgaben</h1>
          <p className="text-gray-600 mt-1">Geschäftsausgaben verwalten und Belege verarbeiten</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            E-Rechnung importieren
          </Button>
          <Link href={`/dashboard/company/${uid}/finance/expenses/create`}>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ausgabe erfassen
            </Button>
          </Link>
        </div>
      </header>

      <ExpenseComponent
        companyId={uid}
        expenses={expenses}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
        onRefresh={loadExpenses}
      />

      {/* 📥 E-Rechnung Import Dialog */}
      <ImportXRechnungDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        companyId={uid}
        onSuccess={loadExpenses}
        defaultType="expense" // 🎯 Default: Ausgabe (da wir auf Expenses-Seite sind)
      />
    </div>
  );
}
