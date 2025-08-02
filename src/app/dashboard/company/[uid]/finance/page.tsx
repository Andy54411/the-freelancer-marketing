'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { FinanceService, FinanceStats } from '@/services/financeService';
import { toast } from 'sonner';

export default function FinancePage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  
  const [stats, setStats] = useState<FinanceStats | null>(null);
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

  // Finanzstatistiken laden
  const loadFinanceStats = async () => {
    try {
      setLoading(true);
      const financeStats = await FinanceService.getFinanceStats(uid);
      setStats(financeStats);
    } catch (error) {
      console.error('Fehler beim Laden der Finanzstatistiken:', error);
      toast.error('Fehler beim Laden der Finanzstatistiken');
      
      // Fallback: Leere Statistiken
      setStats({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        outstandingInvoices: 0,
        outstandingAmount: 0,
        thisMonthRevenue: 0,
        lastUpdate: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid) {
      loadFinanceStats();
    }
  }, [uid, loadFinanceStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Finanzen - Übersicht</h1>
          <p className="text-gray-600 mt-1">
            Überblick über Ihre finanzielle Situation und wichtigste Kennzahlen
          </p>
        </div>
        
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <span className="ml-3 text-gray-600">Lade Finanzstatistiken...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Finanzen - Übersicht</h1>
        <p className="text-gray-600 mt-1">
          Überblick über Ihre finanzielle Situation und wichtigste Kennzahlen
        </p>
      </div>

      {stats && <FinanceOverview stats={stats} />}
    </div>
  );
}
