'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentComponent } from '@/components/finance/PaymentComponent';
import { FinanceService, PaymentRecord } from '@/services/financeService';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
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

  // Zahlungen laden
  const loadPayments = async () => {
    try {
      setLoading(true);
      // Da FinanceService private Methoden für Zahlungen hat, 
      // erstellen wir hier eine direkte Firestore-Abfrage
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');
      
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('companyId', '==', uid),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(paymentsQuery);
      const loadedPayments: PaymentRecord[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        loadedPayments.push({
          id: doc.id,
          companyId: data.companyId,
          amount: data.amount || 0,
          type: data.type || 'income',
          category: data.category || '',
          description: data.description || '',
          date: data.date?.toDate?.() || new Date(),
          invoiceId: data.invoiceId,
          method: data.method || 'bank_transfer',
          reference: data.reference || '',
          createdAt: data.createdAt?.toDate?.() || new Date(),
        });
      });

      setPayments(loadedPayments);
    } catch (error) {
      console.error('Fehler beim Laden der Zahlungen:', error);
      toast.error('Fehler beim Laden der Zahlungen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid) {
      loadPayments();
    }
  }, [uid]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Zahlungen</h1>
          <p className="text-gray-600 mt-1">
            Übersicht über eingegangene Zahlungen und Transaktionen
          </p>
        </div>
        
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <span className="ml-3 text-gray-600">Lade Zahlungen...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Zahlungen</h1>
        <p className="text-gray-600 mt-1">
          Übersicht über eingegangene Zahlungen und Transaktionen
        </p>
      </div>

      <PaymentComponent 
        payments={payments
          .filter(p => p.invoiceId) // Nur Zahlungen mit Rechnungsbezug
          .map(p => ({
            id: p.id,
            invoiceId: p.invoiceId!,
            amount: p.amount,
            date: p.date.toISOString().split('T')[0],
            method: p.method || 'bank_transfer',
            reference: p.reference || `REF-${p.id.slice(-6).toUpperCase()}`,
          }))
        }
      />
    </div>
  );
}
