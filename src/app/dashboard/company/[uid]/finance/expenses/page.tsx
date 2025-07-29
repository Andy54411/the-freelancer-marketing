'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseComponent } from '@/components/finance/ExpenseComponent';

export default function ExpensesPage() {
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
  const mockExpenses = [
    {
      id: 'exp_001',
      title: 'Büromaterial',
      amount: 150.5,
      category: 'Büroausstattung',
      date: '2024-01-10',
      description: 'Stifte, Papier, Drucker',
    },
    {
      id: 'exp_002',
      title: 'Software-Lizenzen',
      amount: 299.99,
      category: 'Software',
      date: '2024-01-15',
      description: 'Adobe Creative Suite Jahresabo',
    },
    {
      id: 'exp_003',
      title: 'Hosting & Domain',
      amount: 89.99,
      category: 'IT-Services',
      date: '2024-01-08',
      description: 'Webhosting und Domain-Erneuerung',
    },
    {
      id: 'exp_004',
      title: 'Fortbildung',
      amount: 450.0,
      category: 'Bildung',
      date: '2024-01-12',
      description: 'Online-Kurs für React Development',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Ausgaben</h1>
        <p className="text-gray-600 mt-1">Verwalten Sie Ihre Geschäftsausgaben und Belege</p>
      </div>

      <ExpenseComponent expenses={mockExpenses} />
    </div>
  );
}
