'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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

interface Report {
  id: string;
  type: string;
  title: string;
  status: string;
  generatedAt?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  iban: string;
  balance: number;
  accountType?: string;
  isDefault?: boolean;
}

interface TaxRecord {
  id: string;
  type: string;
  period: string;
  amount: number;
  status: string;
  dueDate: string;
}

export default function FinancePage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // API Base URL - Updated für das neue Backend
  const API_BASE = 'https://financeapi-d4kdcd73ia-ew.a.run.app';

  // Headers für API-Calls - Updated für das neue Backend
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-id': user?.uid || 'mock-user',
    'x-company-id': uid,
  });

  // Data loading
  useEffect(() => {
    if (!user || !uid || authLoading) return;

    loadFinanceData();
  }, [user, uid, authLoading]);

  const loadFinanceData = async () => {
    try {
      setIsLoading(true);

      // Load stats from the dedicated /stats endpoint
      const statsResponse = await fetch(`${API_BASE}/stats`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Stats data received:', statsData);

        // Map backend stats to frontend format
        setStats({
          totalRevenue: statsData.totalRevenue || 0,
          totalExpenses: statsData.totalExpenses || 0,
          netProfit: statsData.profit || 0,
          outstandingInvoices: statsData.pendingInvoices || 0,
          outstandingAmount: 0, // Could be calculated from pending invoices
          thisMonthRevenue: statsData.totalRevenue || 0, // Simplified for now
        });
      }

      // Load all finance data from the unified API
      const response = await fetch(API_BASE, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Finance data received:', data);

        // Extract data from the unified response
        setInvoices(data.invoices || []);
        setCustomers(data.customers || []);
        setExpenses(data.expenses || []);
        setPayments(data.payments || []); // Now using the correct payments field
        setReports(data.reports || []);
        setBankAccounts(data.bankAccounts || []);

        // Mock tax data (would come from backend)
        setTaxes([
          {
            id: 'tax_001',
            type: 'Umsatzsteuer-Voranmeldung',
            period: 'Januar 2024',
            amount: 380.0,
            status: 'bezahlt',
            dueDate: '2024-02-10',
          },
        ]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Finance-Daten:', error);

      // Fallback: Load mock data if API fails
      setInvoices([
        {
          id: 'inv_001',
          invoiceNumber: 'R-2024-001',
          customerId: 'cust_001',
          customerName: 'Mustermann GmbH',
          amount: 1000,
          tax: 190,
          total: 1190,
          status: 'paid',
          issueDate: '2024-01-15',
          dueDate: '2024-02-15',
          description: 'Webentwicklung',
        },
      ]);

      setCustomers([
        {
          id: 'cust_001',
          name: 'Mustermann GmbH',
          email: 'info@mustermann.de',
          address: 'Musterstraße 1, 12345 Musterstadt',
          totalInvoices: 5,
          totalAmount: 5950,
        },
      ]);

      setExpenses([
        {
          id: 'exp_001',
          title: 'Büromaterial',
          amount: 150.5,
          category: 'Büroausstattung',
          date: '2024-01-10',
          description: 'Stifte, Papier, etc.',
        },
      ]);

      setPayments([
        {
          id: 'pay_001',
          invoiceId: 'inv_001',
          amount: 1190,
          date: '2024-01-16',
          method: 'bank_transfer',
          reference: 'TRANSFER-2024-001',
        },
      ]);

      setReports([
        {
          id: 'rep_001',
          type: 'EÜR',
          title: 'Einnahme-Überschuss-Rechnung 2024',
          status: 'completed',
          generatedAt: '2024-01-31',
        },
      ]);

      setBankAccounts([
        {
          id: 'bank_001',
          bankName: 'Sparkasse',
          iban: 'DE89370400440532013000',
          balance: 15750.0,
          accountType: 'checking',
          isDefault: true,
        },
      ]);

      setTaxes([
        {
          id: 'tax_001',
          type: 'Umsatzsteuer-Voranmeldung',
          period: 'Januar 2024',
          amount: 380.0,
          status: 'bezahlt',
          dueDate: '2024-02-10',
        },
      ]);

      setStats({
        totalRevenue: 15750,
        totalExpenses: 3250,
        netProfit: 12500,
        outstandingInvoices: 2,
        outstandingAmount: 2380,
        thisMonthRevenue: 4725,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(validAmount);
  };

  // Table columns
  const invoiceColumns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'id',
      header: 'Rechnungsnummer',
      cell: ({ row }) => {
        const invoiceNumber = (row.original as any).invoiceNumber;
        const id = row.getValue('id') as string;
        return invoiceNumber || id || '-';
      },
    },
    {
      accessorKey: 'customerName',
      header: 'Kunde',
    },
    {
      accessorKey: 'amount',
      header: 'Betrag',
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number;
        const total = (row.original as any).total;
        return formatCurrency(total || amount || 0);
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig = {
          draft: { label: 'Entwurf', variant: 'secondary' as const },
          sent: { label: 'Gesendet', variant: 'default' as const },
          paid: { label: 'Bezahlt', variant: 'default' as const },
          overdue: { label: 'Überfällig', variant: 'destructive' as const },
          cancelled: { label: 'Storniert', variant: 'secondary' as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: 'date',
      header: 'Datum',
      cell: ({ row }) => {
        const date = row.getValue('date') as string;
        const dueDate = (row.original as any).dueDate;
        const dateToUse = dueDate || date;
        if (!dateToUse) return '-';
        return new Date(dateToUse).toLocaleDateString('de-DE');
      },
    },
    {
      id: 'actions',
      header: 'Aktionen',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const customerColumns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'E-Mail',
    },
    {
      accessorKey: 'totalInvoices',
      header: 'Rechnungen',
    },
    {
      accessorKey: 'totalAmount',
      header: 'Gesamtumsatz',
      cell: ({ row }) => formatCurrency(row.getValue('totalAmount')),
    },
    {
      id: 'actions',
      header: 'Aktionen',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const expenseColumns: ColumnDef<Expense>[] = [
    {
      accessorKey: 'title',
      header: 'Titel',
    },
    {
      accessorKey: 'category',
      header: 'Kategorie',
    },
    {
      accessorKey: 'amount',
      header: 'Betrag',
      cell: ({ row }) => formatCurrency(row.getValue('amount')),
    },
    {
      accessorKey: 'date',
      header: 'Datum',
      cell: ({ row }) => {
        const date = new Date(row.getValue('date'));
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('de-DE');
      },
    },
    {
      id: 'actions',
      header: 'Aktionen',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Finance-Daten werden geladen...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Finanzen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Rechnungen, Kunden und Ausgaben
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.totalRevenue) : '€0,00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausgaben</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.totalExpenses) : '€0,00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nettogewinn</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.netProfit) : '€0,00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Rechnungen</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? stats.outstandingInvoices : 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offener Betrag</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.outstandingAmount) : '€0,00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dieser Monat</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.thisMonthRevenue) : '€0,00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="invoices">Rechnungen</TabsTrigger>
            <TabsTrigger value="customers">Kunden</TabsTrigger>
            <TabsTrigger value="expenses">Ausgaben</TabsTrigger>
            <TabsTrigger value="payments">Zahlungen</TabsTrigger>
            <TabsTrigger value="reports">Berichte</TabsTrigger>
            <TabsTrigger value="taxes">Steuern</TabsTrigger>
            <TabsTrigger value="banking">Banking</TabsTrigger>
          </TabsList>

          <div className="flex space-x-2">
            {activeTab === 'invoices' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neue Rechnung
              </Button>
            )}
            {activeTab === 'customers' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neuer Kunde
              </Button>
            )}
            {activeTab === 'expenses' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neue Ausgabe
              </Button>
            )}
            {activeTab === 'reports' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Bericht erstellen
              </Button>
            )}
            {activeTab === 'banking' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Konto hinzufügen
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Aktuelle Rechnungen</CardTitle>
                <CardDescription>Die neuesten Rechnungen im Überblick</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(invoices) &&
                    invoices.slice(0, 5).map(invoice => (
                      <div key={invoice.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.customerName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(invoice.total || invoice.amount)}
                          </div>
                          <Badge
                            variant={
                              invoice.status === 'paid'
                                ? 'default'
                                : invoice.status === 'overdue'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {invoice.status === 'paid'
                              ? 'Bezahlt'
                              : invoice.status === 'overdue'
                                ? 'Überfällig'
                                : invoice.status === 'sent'
                                  ? 'Gesendet'
                                  : 'Entwurf'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Kunden</CardTitle>
                <CardDescription>Ihre wertvollsten Kunden</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(customers) &&
                    customers
                      .sort((a, b) => b.totalAmount - a.totalAmount)
                      .slice(0, 5)
                      .map(customer => (
                        <div key={customer.id} className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {customer.totalInvoices} Rechnungen
                            </div>
                          </div>
                          <div className="font-medium">{formatCurrency(customer.totalAmount)}</div>
                        </div>
                      ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rechnungen</CardTitle>
              <CardDescription>Verwalten Sie Ihre Rechnungen</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={invoiceColumns} data={Array.isArray(invoices) ? invoices : []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kunden</CardTitle>
              <CardDescription>Verwalten Sie Ihre Kundendaten</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={customerColumns}
                data={Array.isArray(customers) ? customers : []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ausgaben</CardTitle>
              <CardDescription>Verwalten Sie Ihre Geschäftsausgaben</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={expenseColumns} data={Array.isArray(expenses) ? expenses : []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zahlungen</CardTitle>
              <CardDescription>Übersicht über eingegangene Zahlungen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(payments) &&
                  payments.map(payment => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">Zahlung für Rechnung #{payment.invoiceId}</div>
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            const date = new Date(payment.date);
                            return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
                          })()}{' '}
                          • {payment.method}
                        </div>
                        {payment.reference && (
                          <div className="text-sm text-muted-foreground">
                            Referenz: {payment.reference}
                          </div>
                        )}
                      </div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Berichte</CardTitle>
              <CardDescription>Erstellen und verwalten Sie Finanzberichte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(reports) &&
                  reports.map(report => (
                    <div
                      key={report.id}
                      className="flex justify-between items-center p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{report.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {report.type} •{' '}
                          {report.generatedAt &&
                            (() => {
                              const date = new Date(report.generatedAt);
                              return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
                            })()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                          {report.status === 'completed' ? 'Abgeschlossen' : 'In Bearbeitung'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Steuern</CardTitle>
              <CardDescription>Verwalten Sie Ihre Steuerpflichten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(taxes) &&
                  taxes.map(tax => (
                    <div
                      key={tax.id}
                      className="flex justify-between items-center p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{tax.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {tax.period} • Fällig bis{' '}
                          {(() => {
                            const date = new Date(tax.dueDate);
                            return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(tax.amount)}</div>
                          <Badge variant={tax.status === 'bezahlt' ? 'default' : 'destructive'}>
                            {tax.status === 'bezahlt' ? 'Bezahlt' : 'Offen'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Banking</CardTitle>
              <CardDescription>Verwalten Sie Ihre Bankkonten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(bankAccounts) &&
                  bankAccounts.map(account => (
                    <div
                      key={account.id}
                      className="flex justify-between items-center p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{account.bankName}</div>
                        <div className="text-sm text-muted-foreground">
                          {account.iban} {account.isDefault && '• Standard-Konto'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {account.accountType === 'checking' ? 'Girokonto' : 'Sparkonto'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(account.balance)}
                        </div>
                        <div className="flex space-x-2 mt-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
