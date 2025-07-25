'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { InvoiceComponent } from '@/components/finance/InvoiceComponent';
import { ExpenseComponent } from '@/components/finance/ExpenseComponent';
import { CustomerComponent } from '@/components/finance/CustomerComponent';
import { PaymentComponent } from '@/components/finance/PaymentComponent';
import { BankingComponent } from '@/components/finance/BankingComponent';
import { TaxComponent } from '@/components/finance/TaxComponent';
import {
  Loader2,
  Plus,
  FileText,
  Users,
  CreditCard,
  Receipt,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

// Types
interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  description: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  taxNumber?: string;
  totalInvoices: number;
  totalAmount: number;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  receipt?: string;
  description: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: 'bank_transfer' | 'credit_card' | 'cash' | 'paypal';
  reference: string;
}

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  thisMonthRevenue: number;
}

export default function FinancePage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const [activeTab, setActiveTab] = useState('overview');

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
  const mockStats: FinanceStats = {
    totalRevenue: 15750,
    totalExpenses: 3250,
    netProfit: 12500,
    outstandingInvoices: 2,
    outstandingAmount: 2380,
    thisMonthRevenue: 4725,
  };

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
  ];

  const mockCustomers = [
    {
      id: 'cust_001',
      name: 'Mustermann GmbH',
      email: 'info@mustermann.de',
      address: 'Musterstraße 1, 12345 Musterstadt',
      totalInvoices: 5,
      totalAmount: 5950,
    },
  ];

  const mockExpenses = [
    {
      id: 'exp_001',
      title: 'Büromaterial',
      amount: 150.5,
      category: 'Büroausstattung',
      date: '2024-01-10',
      description: 'Stifte, Papier, etc.',
    },
  ];

  const mockPayments = [
    {
      id: 'pay_001',
      invoiceId: 'inv_001',
      amount: 1190,
      date: '2024-01-20',
      method: 'bank_transfer' as const,
      reference: 'BANK-REF-123',
    },
  ];

  const mockTaxData = [
    {
      quarter: 'Q1 2024',
      revenue: 5000,
      expenses: 1000,
      taxableIncome: 4000,
      vatOwed: 760,
      incomeTaxOwed: 800,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Finanzen</h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie Ihre Rechnungen, Ausgaben und finanzielle Übersicht
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="invoices">Rechnungen</TabsTrigger>
          <TabsTrigger value="customers">Kunden</TabsTrigger>
          <TabsTrigger value="expenses">Ausgaben</TabsTrigger>
          <TabsTrigger value="payments">Zahlungen</TabsTrigger>
          <TabsTrigger value="banking">Banking</TabsTrigger>
          <TabsTrigger value="taxes">Steuern</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <FinanceOverview stats={mockStats} />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <InvoiceComponent invoices={mockInvoices} />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <CustomerComponent customers={mockCustomers} />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <ExpenseComponent expenses={mockExpenses} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentComponent payments={mockPayments} />
        </TabsContent>

        <TabsContent value="banking" className="space-y-4">
          <BankingComponent bankAccounts={[]} />
        </TabsContent>

        <TabsContent value="taxes" className="space-y-4">
          <TaxComponent taxData={mockTaxData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
