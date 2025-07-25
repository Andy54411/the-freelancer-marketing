'use client';

import React, { useState, useEffect } from 'react';
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
import InvoiceCreateModal from '@/components/finance/InvoiceCreateModal';

// Types basierend auf Backend-Models
interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerData?: any;
  amount?: number;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  type: 'STANDARD' | 'RECURRING' | 'CREDIT_NOTE' | 'ADVANCE_PAYMENT';
  invoiceDate: string;
  dueDate: string;
  deliveryDate?: string;
  serviceDate?: string;
  description?: string;
  introduction?: string;
  conclusion?: string;
  notes?: string;
}

interface Customer {
  id: string;
  customerNumber: string;
  type: 'INDIVIDUAL' | 'BUSINESS';
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  displayName: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;
  statistics: {
    totalInvoices: number;
    totalRevenue: number;
    averageOrderValue: number;
    outstandingAmount: number;
    paymentDelayAverage: number;
  };
  notes?: string;
  tags: string[];
}

interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  netAmount: number;
  taxAmount: number;
  taxRate: number;
  category: string;
  subcategory?: string;
  date: string;
  vendor?: string;
  receiptNumber?: string;
  paymentMethod: string;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PAID';
  isRecurring: boolean;
  tags: string[];
  attachments: { id: string; filename: string; url: string }[];
  project?: { id: string; name: string };
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CASH' | 'PAYPAL' | 'SEPA_DIRECT_DEBIT';
  reference?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  bankAccount?: string;
  transactionId?: string;
  fees?: number;
  notes?: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  iban: string;
  bic: string;
  accountHolder: string;
  accountNumber: string;
  bankCode: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT';
  currency: string;
  balance: number;
  isActive: boolean;
  isDefault: boolean;
  autoSync: boolean;
  syncProvider?: string;
  lastSyncAt?: string;
}

interface BankTransaction {
  id: string;
  transactionId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  date: string;
  valueDate: string;
  reference: string;
  description: string;
  counterparty?: {
    name: string;
    iban?: string;
    bic?: string;
  };
  category?: string;
  isRecurring: boolean;
  status: 'IMPORTED' | 'MATCHED' | 'RECONCILED' | 'IGNORED';
  matchedInvoiceId?: string;
  matchedExpenseId?: string;
  autoMatched: boolean;
}

interface Report {
  id: string;
  type: 'EÜR' | 'USTVA' | 'BWA' | 'CUSTOM';
  title: string;
  description?: string;
  status: 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  dateFrom: string;
  dateTo: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
  language: string;
  generatedAt?: string;
  downloadUrl?: string;
  parameters?: Record<string, any>;
}

interface TaxRecord {
  id: string;
  type: 'USTVA' | 'EÜR' | 'GEWERBESTEUER' | 'KORPERSCHAFTSTEUER';
  period: string;
  year: number;
  quarter?: number;
  month?: number;
  amount: number;
  taxAmount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'PAID' | 'OVERDUE';
  dueDate: string;
  submissionDate?: string;
  paymentDate?: string;
  filingMethod: 'PAPER' | 'ELSTER' | 'API';
}

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  yearToDateRevenue: number;
  averageInvoiceValue: number;
  customerCount: number;
  activeCustomerCount: number;
  bankBalance: number;
  vatBalance: number;
  cashflow: {
    incoming: number;
    outgoing: number;
    net: number;
  };
}

interface FinanceComponentProps {
  companyUid: string;
}

export default function FinanceComponent({ companyUid }: FinanceComponentProps) {
  const { user, loading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [taxes, setTaxes] = useState<TaxRecord[]>([]);
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

      // Load bank accounts
      const bankAccountsResponse = await fetch(`${API_BASE}/bank-accounts`, {
        headers: getHeaders(),
      });
      if (bankAccountsResponse.ok) {
        setBankAccounts(await bankAccountsResponse.json());
      }

      // Load bank transactions
      const bankTransactionsResponse = await fetch(`${API_BASE}/bank-transactions`, {
        headers: getHeaders(),
      });
      if (bankTransactionsResponse.ok) {
        setBankTransactions(await bankTransactionsResponse.json());
      }

      // Load reports
      const reportsResponse = await fetch(`${API_BASE}/reports`, {
        headers: getHeaders(),
      });
      if (reportsResponse.ok) {
        setReports(await reportsResponse.json());
      }

      // Load tax records
      const taxesResponse = await fetch(`${API_BASE}/taxes`, {
        headers: getHeaders(),
      });
      if (taxesResponse.ok) {
        setTaxes(await taxesResponse.json());
      }
    } catch (error) {
      console.error('Fehler beim Laden der Finance-Daten:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle invoice creation
  const handleCreateInvoice = async (data: any) => {
    try {
      const response = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newInvoice = await response.json();
        setInvoices(prev => [newInvoice, ...prev]);
        await loadFinanceData(); // Reload to update stats
      } else {
        throw new Error('Fehler beim Erstellen der Rechnung');
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Rechnung:', error);
      throw error;
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
      accessorKey: 'customerData',
      header: 'Kunde',
      cell: ({ row }) => {
        const invoice = row.original;
        return invoice.customerName || invoice.customerData?.displayName || 'Unbekannt';
      },
    },
    {
      accessorKey: 'grossAmount',
      header: 'Betrag',
      cell: ({ row }) => formatCurrency(row.getValue('grossAmount')),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig = {
          DRAFT: { label: 'Entwurf', variant: 'secondary' as const },
          SENT: { label: 'Gesendet', variant: 'default' as const },
          PAID: { label: 'Bezahlt', variant: 'default' as const },
          OVERDUE: { label: 'Überfällig', variant: 'destructive' as const },
          CANCELLED: { label: 'Storniert', variant: 'secondary' as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Fälligkeitsdatum',
      cell: ({ row }) => {
        const date = new Date(row.getValue('dueDate'));
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
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
      accessorKey: 'displayName',
      header: 'Name',
    },
    {
      accessorKey: 'customerNumber',
      header: 'Kundennummer',
    },
    {
      accessorKey: 'type',
      header: 'Typ',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return type === 'BUSINESS' ? 'Unternehmen' : 'Privatperson';
      },
    },
    {
      accessorKey: 'statistics',
      header: 'Rechnungen',
      cell: ({ row }) => {
        const stats = row.getValue('statistics') as Customer['statistics'];
        return stats.totalInvoices;
      },
    },
    {
      accessorKey: 'statistics',
      header: 'Gesamtumsatz',
      cell: ({ row }) => {
        const stats = row.getValue('statistics') as Customer['statistics'];
        return formatCurrency(stats.totalRevenue);
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig = {
          ACTIVE: { label: 'Aktiv', variant: 'default' as const },
          INACTIVE: { label: 'Inaktiv', variant: 'secondary' as const },
          BLOCKED: { label: 'Gesperrt', variant: 'destructive' as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;
        return <Badge variant={config.variant}>{config.label}</Badge>;
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
      accessorKey: 'vendor',
      header: 'Lieferant',
    },
    {
      accessorKey: 'amount',
      header: 'Bruttobetrag',
      cell: ({ row }) => formatCurrency(row.getValue('amount')),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig = {
          DRAFT: { label: 'Entwurf', variant: 'secondary' as const },
          APPROVED: { label: 'Genehmigt', variant: 'default' as const },
          REJECTED: { label: 'Abgelehnt', variant: 'destructive' as const },
          PAID: { label: 'Bezahlt', variant: 'default' as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: 'date',
      header: 'Datum',
      cell: ({ row }) => {
        const date = new Date(row.getValue('date'));
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
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
            <p className="text-xs text-muted-foreground">
              YTD: {stats ? formatCurrency(stats.yearToDateRevenue || 0) : '€0,00'}
            </p>
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
            <p className="text-xs text-muted-foreground">
              Marge: {stats ? `${stats.profitMargin?.toFixed(1) || 0}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Rechnungen</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? stats.outstandingInvoices : 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? formatCurrency(stats.outstandingAmount) : '€0,00'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kunden</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? stats.customerCount : 0}</div>
            <p className="text-xs text-muted-foreground">
              Aktiv: {stats ? stats.activeCustomerCount : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank-Saldo</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.bankBalance || 0) : '€0,00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Cashflow: {stats?.cashflow ? formatCurrency(stats.cashflow.net) : '€0,00'}
            </p>
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
            <TabsTrigger value="banking">Banking</TabsTrigger>
            <TabsTrigger value="reports">Berichte</TabsTrigger>
            <TabsTrigger value="taxes">Steuern</TabsTrigger>
          </TabsList>

          <div className="flex space-x-2">
            {activeTab === 'invoices' && (
              <Button onClick={() => setShowInvoiceModal(true)}>
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
            {activeTab === 'banking' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Konto hinzufügen
              </Button>
            )}
            {activeTab === 'reports' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Bericht erstellen
              </Button>
            )}
            {activeTab === 'taxes' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Steueranmeldung
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
                  {Array.isArray(invoices)
                    ? invoices.slice(0, 5).map(invoice => (
                        <div key={invoice.id} className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{invoice.invoiceNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {invoice.customerName ||
                                invoice.customerData?.displayName ||
                                'Unbekannt'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(invoice.grossAmount)}</div>
                            <Badge
                              variant={
                                invoice.status === 'PAID'
                                  ? 'default'
                                  : invoice.status === 'OVERDUE'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {invoice.status === 'PAID'
                                ? 'Bezahlt'
                                : invoice.status === 'OVERDUE'
                                  ? 'Überfällig'
                                  : invoice.status === 'SENT'
                                    ? 'Gesendet'
                                    : 'Entwurf'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    : null}
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
                  {Array.isArray(customers)
                    ? customers
                        .sort((a, b) => b.statistics.totalRevenue - a.statistics.totalRevenue)
                        .slice(0, 5)
                        .map(customer => (
                          <div key={customer.id} className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{customer.displayName}</div>
                              <div className="text-sm text-muted-foreground">
                                {customer.statistics.totalInvoices} Rechnungen
                              </div>
                            </div>
                            <div className="font-medium">
                              {formatCurrency(customer.statistics.totalRevenue)}
                            </div>
                          </div>
                        ))
                    : null}
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
                {Array.isArray(payments)
                  ? payments.map(payment => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            Zahlung für Rechnung #{payment.invoiceId}
                          </div>
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
                        <div className="flex flex-col items-end space-y-1">
                          <div className="font-medium text-green-600">
                            {formatCurrency(payment.amount)}
                          </div>
                          <Badge
                            variant={
                              payment.status === 'CONFIRMED'
                                ? 'default'
                                : payment.status === 'FAILED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {payment.status === 'CONFIRMED'
                              ? 'Bestätigt'
                              : payment.status === 'FAILED'
                                ? 'Fehlgeschlagen'
                                : payment.status === 'PENDING'
                                  ? 'Ausstehend'
                                  : 'Storniert'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bankkonten</CardTitle>
              <CardDescription>Verwalten Sie Ihre Bankkonten und Transaktionen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(bankAccounts)
                  ? bankAccounts.map(account => (
                      <div
                        key={account.id}
                        className="flex justify-between items-center p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium flex items-center space-x-2">
                            <span>{account.bankName}</span>
                            {account.isDefault && (
                              <Badge variant="outline" className="text-xs">
                                Standard
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {account.iban} • {account.accountType}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {account.accountHolder}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(account.balance)}
                          </div>
                          <div className="text-sm text-muted-foreground">{account.currency}</div>
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Letzte Transaktionen</CardTitle>
              <CardDescription>Übersicht über Bank-Transaktionen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(bankTransactions)
                  ? bankTransactions.slice(0, 10).map(transaction => (
                      <div
                        key={transaction.id}
                        className="flex justify-between items-center p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {(() => {
                              const date = new Date(transaction.date);
                              return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
                            })()}
                            {transaction.counterparty && ` • ${transaction.counterparty.name}`}
                          </div>
                          {transaction.reference && (
                            <div className="text-sm text-muted-foreground">
                              Ref: {transaction.reference}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <div
                            className={`font-medium ${
                              transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.type === 'CREDIT' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </div>
                          <Badge
                            variant={
                              transaction.status === 'RECONCILED'
                                ? 'default'
                                : transaction.status === 'MATCHED'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {transaction.status === 'RECONCILED'
                              ? 'Abgeglichen'
                              : transaction.status === 'MATCHED'
                                ? 'Zugeordnet'
                                : 'Importiert'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  : null}
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
                {Array.isArray(reports)
                  ? reports.map(report => (
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
                                return isNaN(date.getTime())
                                  ? '-'
                                  : date.toLocaleDateString('de-DE');
                              })()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {(() => {
                              const fromDate = new Date(report.dateFrom);
                              const toDate = new Date(report.dateTo);
                              const fromStr = isNaN(fromDate.getTime())
                                ? '-'
                                : fromDate.toLocaleDateString('de-DE');
                              const toStr = isNaN(toDate.getTime())
                                ? '-'
                                : toDate.toLocaleDateString('de-DE');
                              return `${fromStr} bis ${toStr}`;
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={report.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {report.status === 'COMPLETED'
                              ? 'Abgeschlossen'
                              : report.status === 'GENERATING'
                                ? 'Wird erstellt'
                                : report.status === 'FAILED'
                                  ? 'Fehlgeschlagen'
                                  : 'Entwurf'}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Steuern</CardTitle>
              <CardDescription>Verwalten Sie Ihre Steuerpflichten und Anmeldungen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(taxes)
                  ? taxes.map(tax => (
                      <div
                        key={tax.id}
                        className="flex justify-between items-center p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{tax.type}</div>
                          <div className="text-sm text-muted-foreground">
                            {tax.period} ({tax.year}){tax.quarter && ` • Q${tax.quarter}`}
                            {tax.month && ` • Monat ${tax.month}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Fällig bis{' '}
                            {(() => {
                              const date = new Date(tax.dueDate);
                              return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
                            })()}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <div className="font-medium">{formatCurrency(tax.amount)}</div>
                          <Badge
                            variant={
                              tax.status === 'PAID'
                                ? 'default'
                                : tax.status === 'OVERDUE'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {tax.status === 'PAID'
                              ? 'Bezahlt'
                              : tax.status === 'SUBMITTED'
                                ? 'Eingereicht'
                                : tax.status === 'OVERDUE'
                                  ? 'Überfällig'
                                  : 'Entwurf'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Create Modal */}
      <InvoiceCreateModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        customers={customers}
        onSubmit={handleCreateInvoice}
      />
    </div>
  );
}
