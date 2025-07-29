'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TaxComponent } from '@/components/finance/TaxComponent';

export default function TaxesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

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

  // Mock tax data für Demo-Zwecke
  const mockTaxData = [
    {
      quarter: 'Q1 2024',
      revenue: 15750,
      expenses: 3250,
      taxableIncome: 12500,
      vatOwed: 2992.5, // 19% VAT
      incomeTaxOwed: 2500, // Simplified calculation
    },
    {
      quarter: 'Q4 2023',
      revenue: 18200,
      expenses: 4100,
      taxableIncome: 14100,
      vatOwed: 3458,
      incomeTaxOwed: 2820,
    },
    {
      quarter: 'Q3 2023',
      revenue: 16800,
      expenses: 3800,
      taxableIncome: 13000,
      vatOwed: 3192,
      incomeTaxOwed: 2600,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Steuern</h1>
        <p className="text-gray-600 mt-1">
          Steuerübersicht und Quartalsberichte für Ihr Unternehmen
        </p>
      </div>

      <TaxComponent taxData={mockTaxData} />
    </div>
  );
}
