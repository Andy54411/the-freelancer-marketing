'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentComponent } from '@/components/finance/PaymentComponent';

export default function PaymentsPage() {
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

  // Mock data für Demo-Zwecke
  const mockPayments = [
    {
      id: 'pay_001',
      invoiceId: 'inv_001',
      amount: 1190,
      date: '2024-01-20',
      method: 'bank_transfer' as const,
      reference: 'BANK-REF-123',
    },
    {
      id: 'pay_002',
      invoiceId: 'inv_002',
      amount: 2975,
      date: '2024-01-25',
      method: 'credit_card' as const,
      reference: 'CC-REF-456',
    },
    {
      id: 'pay_003',
      invoiceId: 'inv_004',
      amount: 750,
      date: '2024-01-18',
      method: 'paypal' as const,
      reference: 'PP-REF-789',
    },
    {
      id: 'pay_004',
      invoiceId: 'inv_005',
      amount: 1500,
      date: '2024-01-22',
      method: 'bank_transfer' as const,
      reference: 'BANK-REF-456',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Zahlungen</h1>
        <p className="text-gray-600 mt-1">
          Übersicht über eingegangene Zahlungen und Transaktionen
        </p>
      </div>

      <PaymentComponent payments={mockPayments} />
    </div>
  );
}
