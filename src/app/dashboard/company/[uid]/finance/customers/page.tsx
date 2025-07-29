'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerComponent } from '@/components/finance/CustomerComponent';

export default function CustomersPage() {
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
  const mockCustomers = [
    {
      id: 'cust_001',
      name: 'Mustermann GmbH',
      email: 'info@mustermann.de',
      address: 'Musterstraße 1, 12345 Musterstadt',
      taxNumber: 'DE123456789',
      totalInvoices: 5,
      totalAmount: 5950,
    },
    {
      id: 'cust_002',
      name: 'Tech Solutions AG',
      email: 'kontakt@techsolutions.de',
      address: 'Technologiepark 15, 80333 München',
      taxNumber: 'DE987654321',
      totalInvoices: 3,
      totalAmount: 8750,
    },
    {
      id: 'cust_003',
      name: 'Digital Marketing GmbH',
      email: 'hello@digitalmarketing.de',
      address: 'Marketingstraße 42, 10178 Berlin',
      taxNumber: 'DE456789123',
      totalInvoices: 7,
      totalAmount: 12300,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie Ihre Kundeninformationen und Rechnungshistorie
        </p>
      </div>

      <CustomerComponent customers={mockCustomers} />
    </div>
  );
}
