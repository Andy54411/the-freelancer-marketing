'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  purpose: string;
  counterpartName?: string;
  counterpartIban?: string;
  bookingDate: string;
  valueDate: string;
  transactionType: 'CREDIT' | 'DEBIT';
  category?: string;
  isReconciled: boolean;
  isPending: boolean;
}

interface BankAccount {
  id: string;
  accountName: string;
  iban: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  availableBalance: number;
  currency: string;
  accountType: string;
  isDefault: boolean;
}

export default function TransactionsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // State Management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateRange, setDateRange] = useState('30');

  // Load Transactions from finAPI
  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user?.uid) {
        console.log('No user found, cannot load transactions');
        setTransactions([]);
        return;
      }

      console.log('Loading finAPI transactions for user:', user.uid);

      // Use new B2B API endpoint with user ID parameter
      const transactionsResponse = await fetch(
        `/api/finapi/transactions?userId=${user.uid}&credentialType=sandbox&page=1&perPage=100`
      );

      if (!transactionsResponse.ok) {
        const errorData = await transactionsResponse.json();
        throw new Error(`finAPI API Error: ${errorData.error || transactionsResponse.statusText}`);
      }

      const data = await transactionsResponse.json();

      if (data.success && data.transactions) {
        console.log(`Loaded ${data.transactions.length} finAPI transactions`);
        setTransactions(data.transactions);
      } else {
        console.log('No transactions found or user not connected to finAPI');
        setTransactions([]);
        setError(
          data.message || 'Keine Transaktionen gefunden. Bitte verbinden Sie zuerst ein Bankkonto.'
        );
      }

      // Also load accounts for filtering
      const accountsResponse = await fetch(
        `/api/finapi/accounts?userId=${user.uid}&credentialType=sandbox`
      );

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        if (accountsData.success && accountsData.accounts) {
          setAccounts(accountsData.accounts);
        }
      }
    } catch (err: any) {
      console.error('Error loading finAPI data:', err);
      setError(err.message || 'Fehler beim Laden der Daten');
      setTransactions([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshTransactions = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user?.uid) {
      loadTransactions();
    }
  }, [user]);

  // Utility Functions
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'CREDIT' || amount > 0) {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    } else {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch =
      transaction.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.counterpartName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.amount.toString().includes(searchTerm);

    const matchesAccount = selectedAccount === 'all' || transaction.accountId === selectedAccount;
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;

    return matchesSearch && matchesAccount && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];

  // Calculate summary statistics
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
          <p className="text-gray-600">Transaktionen werden geladen...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Fehler beim Laden</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadTransactions}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaktionen</h1>
            <p className="text-gray-600 mt-1">Übersicht über alle Kontobewegungen</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={refreshTransactions}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Aktualisiere...' : 'Aktualisieren'}
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
              <Download className="h-4 w-4 mr-2" />
              Exportieren
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowUpRight className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Einnahmen (30 Tage)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalIncome)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowDownRight className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ausgaben (30 Tage)</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalExpenses)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-[#14ad9f]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Gesamtsaldo</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalBalance)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] w-full"
            />
          </div>

          {/* Account Filter */}
          <select
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          >
            <option value="all">Alle Konten</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.accountName}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          >
            <option value="all">Alle Kategorien</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          >
            <option value="7">Letzte 7 Tage</option>
            <option value="30">Letzte 30 Tage</option>
            <option value="90">Letzte 90 Tage</option>
            <option value="365">Letztes Jahr</option>
            <option value="all">Alle</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredTransactions.map(transaction => {
            const account = accounts.find(a => a.id === transaction.accountId);
            return (
              <li key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getTransactionIcon(transaction.transactionType, transaction.amount)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.purpose}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              transaction.isReconciled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {transaction.isReconciled ? 'Abgeglichen' : 'Offen'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <div className="flex-1">
                          {transaction.counterpartName && (
                            <span>{transaction.counterpartName} • </span>
                          )}
                          <span>{account?.accountName || 'Unbekanntes Konto'}</span>
                          {transaction.category && <span> • {transaction.category}</span>}
                        </div>
                        <div className="ml-2">
                          <Calendar className="h-4 w-4 mr-1 inline" />
                          {formatDate(transaction.bookingDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.amount >= 0 ? '+' : ''}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      {transaction.isPending && <p className="text-xs text-gray-500">Ausstehend</p>}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Empty State */}
      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Transaktionen gefunden</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedAccount !== 'all' || selectedCategory !== 'all'
                ? 'Versuchen Sie andere Filterkriterien.'
                : 'Es sind noch keine Transaktionen vorhanden.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
