'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BankingComponent } from '@/components/finance/BankingComponent';

export default function BankingPage() {
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

  // Mock bank accounts für Demo-Zwecke
  const mockBankAccounts = [
    {
      id: 'bank_001',
      bankName: 'Deutsche Bank',
      accountNumber: '0532013000',
      iban: 'DE89 3704 0044 0532 0130 00',
      balance: 25750.5,
      currency: 'EUR',
    },
    {
      id: 'bank_002',
      bankName: 'Sparkasse',
      accountNumber: '0000004711',
      iban: 'DE89 3705 0198 0000 0047 11',
      balance: 15000.0,
      currency: 'EUR',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Banking</h1>
        <p className="text-gray-600 mt-1">Verwalten Sie Ihre Bankverbindungen und Kontostände</p>
      </div>

      <BankingComponent bankAccounts={mockBankAccounts} />
    </div>
  );
}
