'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseComponent } from '@/components/finance/ExpenseComponent';
import { ExpenseRecord } from '@/services/financeService';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Ausgaben laden
  const loadExpenses = async () => {
    try {
      setLoading(true);
      // Direkte Firestore-Abfrage für Ausgaben
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');
      
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('companyId', '==', uid),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(expensesQuery);
      const loadedExpenses: ExpenseRecord[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        loadedExpenses.push({
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

      setExpenses(loadedExpenses);
    } catch (error) {
      console.error('Fehler beim Laden der Ausgaben:', error);
      toast.error('Fehler beim Laden der Ausgaben');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid) {
      loadExpenses();
    }
  }, [uid, loadExpenses]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Ausgaben</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Geschäftsausgaben und Belege</p>
        </div>
        
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <span className="ml-3 text-gray-600">Lade Ausgaben...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Ausgaben</h1>
        <p className="text-gray-600 mt-1">Verwalten Sie Ihre Geschäftsausgaben und Belege</p>
      </div>

      <ExpenseComponent 
        expenses={expenses.map(e => ({
          id: e.id,
          title: e.description,
          amount: e.amount,
          category: e.category,
          date: e.date.toISOString().split('T')[0],
          description: e.description,
        }))}
      />
    </div>
  );
}
