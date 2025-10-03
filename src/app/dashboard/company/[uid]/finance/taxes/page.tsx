'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TaxComponent } from '@/components/finance/TaxComponent';
import { FinanceService } from '@/services/financeService';
import { toast } from 'sonner';

interface TaxData {
  quarter: string;
  revenue: number;
  expenses: number;
  taxableIncome: number;
  vatOwed: number;
  incomeTaxOwed: number;
}

export default function TaxesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [taxData, setTaxData] = useState<TaxData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Steuerberechnungen laden
    const loadTaxData = async () => {
      try {
        setLoading(true);

        // Finanzstatistiken laden
        const stats = await FinanceService.getFinanceStats(uid);

        // Vereinfachte Quartalsberechnung basierend auf aktuellen Daten
        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

        const quarterlyData: TaxData[] = [];

        // Aktuelles Quartal
        const taxableIncome = stats.totalRevenue - stats.totalExpenses;
        const vatOwed = stats.totalRevenue * 0.19; // 19% MwSt
        const incomeTaxOwed = taxableIncome * 0.2; // Vereinfachte Einkommensteuer

        quarterlyData.push({
          quarter: `Q${currentQuarter} ${currentYear}`,
          revenue: stats.totalRevenue,
          expenses: stats.totalExpenses,
          taxableIncome,
          vatOwed,
          incomeTaxOwed,
        });

        // Wenn keine realen Daten vorhanden sind, zeige leere Struktur
        if (stats.totalRevenue === 0) {
          quarterlyData[0] = {
            quarter: `Q${currentQuarter} ${currentYear}`,
            revenue: 0,
            expenses: 0,
            taxableIncome: 0,
            vatOwed: 0,
            incomeTaxOwed: 0,
          };
        }

        setTaxData(quarterlyData);
      } catch (error) {
        toast.error('Fehler beim Laden der Steuerdaten');

        // Fallback: Leere Daten
        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

        setTaxData([
          {
            quarter: `Q${currentQuarter} ${currentYear}`,
            revenue: 0,
            expenses: 0,
            taxableIncome: 0,
            vatOwed: 0,
            incomeTaxOwed: 0,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (uid) {
      loadTaxData();
    }
  }, [uid]);

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
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Steuern</h1>
          <p className="text-gray-600 mt-1">
            Steuerübersicht und Quartalsberichte für Ihr Unternehmen
          </p>
        </div>

        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          <span className="ml-3 text-gray-600">Lade Steuerdaten...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Steuern</h1>
        <p className="text-gray-600 mt-1">
          Steuerübersicht und Quartalsberichte für Ihr Unternehmen
        </p>
      </div>

      <TaxComponent taxData={taxData} companyId={uid} />
    </div>
  );
}
