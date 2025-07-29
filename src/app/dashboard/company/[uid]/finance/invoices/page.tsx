'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceComponent } from '@/components/finance/InvoiceComponent';

export default function InvoicesPage() {
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
  const mockInvoices = [
    {
      id: 'inv_001',
      invoiceNumber: 'R-2024-001',
      customerId: 'cust_001',
      customerName: 'Mustermann GmbH',
      amount: 1000,
      tax: 190,
      total: 1190,
      status: 'paid' as const,
      issueDate: '2024-01-15',
      dueDate: '2024-02-15',
      description: 'Webentwicklung',
    },
    {
      id: 'inv_002',
      invoiceNumber: 'R-2024-002',
      customerId: 'cust_002',
      customerName: 'Tech Solutions AG',
      amount: 2500,
      tax: 475,
      total: 2975,
      status: 'sent' as const,
      issueDate: '2024-01-20',
      dueDate: '2024-02-20',
      description: 'App-Entwicklung',
    },
    {
      id: 'inv_003',
      invoiceNumber: 'R-2024-003',
      customerId: 'cust_003',
      customerName: 'Digital Marketing GmbH',
      amount: 1500,
      tax: 285,
      total: 1785,
      status: 'overdue' as const,
      issueDate: '2024-01-05',
      dueDate: '2024-02-05',
      description: 'SEO Optimierung',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
        <p className="text-gray-600 mt-1">Verwalten Sie Ihre Rechnungen und deren Status</p>
      </div>

      <InvoiceComponent invoices={mockInvoices} />
    </div>
  );
}
