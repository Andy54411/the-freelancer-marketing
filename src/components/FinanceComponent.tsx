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

interface FinanceComponentProps {
  companyUid: string;
}

export default function FinanceComponent({ companyUid }: FinanceComponentProps) {
  const { user, loading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // API Base URL
  const API_BASE = 'https://europe-west1-tilvo-f142f.cloudfunctions.net/financeApi';

  // Headers für API-Calls
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-id': user?.uid || '',
    'x-company-id': companyUid,
  });

  // Data loading
  useEffect(() => {
    if (!user || !companyUid || authLoading) return;

    loadFinanceData();
  }, [user, companyUid, authLoading]);

  const loadFinanceData = async () => {
    try {
      setIsLoading(true);

      // Load stats
      const statsResponse = await fetch(`${API_BASE}/stats`, {
        headers: getHeaders(),
      });
      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      }

      // Load invoices
      const invoicesResponse = await fetch(`${API_BASE}/invoices`, {
        headers: getHeaders(),
      });
      if (invoicesResponse.ok) {
        setInvoices(await invoicesResponse.json());
      }

      // Load customers
      const customersResponse = await fetch(`${API_BASE}/customers`, {
        headers: getHeaders(),
      });
      if (customersResponse.ok) {
        setCustomers(await customersResponse.json());
      }

      // Load expenses
      const expensesResponse = await fetch(`${API_BASE}/expenses`, {
        headers: getHeaders(),
      });
      if (expensesResponse.ok) {
        setExpenses(await expensesResponse.json());
      }

      // Load payments
      const paymentsResponse = await fetch(`${API_BASE}/payments`, {
        headers: getHeaders(),
      });
      if (paymentsResponse.ok) {
        setPayments(await paymentsResponse.json());
      }
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Table columns
  const invoiceColumns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'Rechnungsnummer',
    },
    {
      accessorKey: 'customerName',
      header: 'Kunde',
    },
    {
      accessorKey: 'total',
      header: 'Betrag',
      cell: ({ row }) => formatCurrency(row.getValue('total')),
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
      accessorKey: 'dueDate',
      header: 'Fälligkeitsdatum',
      cell: ({ row }) => {
        const date = new Date(row.getValue('dueDate'));
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
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Finance-Daten werden geladen...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Finanzen</h2>
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
                  {invoices.slice(0, 5).map(invoice => (
                    <div key={invoice.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-muted-foreground">{invoice.customerName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(invoice.total)}</div>
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
                  {customers
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
              <DataTable columns={invoiceColumns} data={invoices} />
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
              <DataTable columns={customerColumns} data={customers} />
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
              <DataTable columns={expenseColumns} data={expenses} />
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
                {payments.map(payment => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">Zahlung für Rechnung #{payment.invoiceId}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString('de-DE')} • {payment.method}
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
      </Tabs>
    </div>
  );
}
