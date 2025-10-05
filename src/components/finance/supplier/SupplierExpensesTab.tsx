'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Receipt, FileText, CheckCircle } from 'lucide-react';

interface Expense {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  description: string;
  expenseNumber: string;
  status: 'paid' | 'pending' | 'overdue';
  createdAt: Date;
  dueDate: Date;
  category?: string;
}

interface SupplierExpensesTabProps {
  companyId: string;
}

export function SupplierExpensesTab({ companyId }: SupplierExpensesTabProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpenses();
  }, [companyId]);

  const loadExpenses = async () => {
    try {
      if (!companyId) return;

      const expensesQuery = query(
        collection(db, `companies/${companyId}/expenses`),
        where('supplierId', '!=', null),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(expensesQuery);
      const expensesData: Expense[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Convert Firestore timestamps
        let createdAtDate: Date;
        let dueDateObj: Date;
        
        try {
          createdAtDate = data.createdAt?.toDate() || new Date();
          dueDateObj = data.dueDate?.toDate() || new Date();
        } catch (error) {
          createdAtDate = new Date();
          dueDateObj = new Date();
        }

        expensesData.push({
          id: doc.id,
          supplierId: data.supplierId || '',
          supplierName: data.supplierName || 'Unbekannter Lieferant',
          amount: data.amount || 0,
          description: data.description || '',
          expenseNumber: data.expenseNumber || data.documentNumber || doc.id,
          status: data.status || 'pending',
          createdAt: createdAtDate,
          dueDate: dueDateObj,
          category: data.category,
        });
      });

      setExpenses(expensesData);
    } catch (error) {
      console.error('Fehler beim Laden der Ausgaben:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Bezahlt
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive">
            Überfällig
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Offen
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Ausgaben & Rechnungen</h3>
          <p className="text-sm text-gray-500">Alle Ausgaben und Rechnungen von Lieferanten</p>
        </div>
        <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Neue Ausgabe erfassen
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Ausgaben vorhanden</h3>
          <p>Erfassen Sie Ihre erste Lieferantenrechnung</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map(expense => (
            <div
              key={expense.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(expense.status)}
                    <span className="text-sm text-gray-500">Ausgabe</span>
                    <Badge variant="outline" className="text-xs">
                      {expense.expenseNumber}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-medium text-gray-900">{expense.supplierName}</h4>
                    <p className="text-sm text-gray-600">{expense.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Erstellt: {formatDate(expense.createdAt)}</span>
                      <span>Fällig: {formatDate(expense.dueDate)}</span>
                      {expense.category && <span>Kategorie: {expense.category}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="font-semibold text-lg text-gray-900 mb-1">
                    {formatCurrency(expense.amount)}
                  </div>
                  <Button variant="ghost" size="sm">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}