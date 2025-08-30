'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getFinAPICredentialType } from '@/lib/finapi-config';
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
  X,
  Eye,
  Copy,
} from 'lucide-react';

interface Transaction {
  id: number;
  accountId: number;
  amount: number;
  currency: string;
  purpose: string;
  counterpartName?: string;
  counterpartIban?: string;
  bankBookingDate: string;
  valueDate: string;
  type: string;
  category?: any;
  isPotentialDuplicate: boolean;
  isNew: boolean;
  labels?: any[];
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

  // Get environment-specific credential type
  const credentialType = getFinAPICredentialType();

  // State Management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Load Transactions from finAPI and local storage
  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user?.uid) {
        setTransactions([]);
        return;
      }

      // First try to load from enhanced accounts API (includes local storage)
      const accountsResponse = await fetch(
        `/api/finapi/accounts-enhanced?userId=${user.uid}&credentialType=${credentialType}`
      );

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        if (accountsData.success && accountsData.accounts) {
          setAccounts(accountsData.accounts);
        }
      }

      // Then load transactions from finAPI
      const transactionsResponse = await fetch(
        `/api/finapi/transactions?userId=${user.uid}&credentialType=${credentialType}&page=1&perPage=100`
      );

      if (!transactionsResponse.ok) {
        const errorData = await transactionsResponse.json();
        throw new Error(`finAPI API Error: ${errorData.error || transactionsResponse.statusText}`);
      }

      const data = await transactionsResponse.json();

      if (data.success && data.transactions) {
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
        // Don't set error for "no user found" message - this is normal
        if (data.message && !data.message.includes('please connect a bank first')) {
          setError(data.message);
        }
      }
    } catch (err: any) {
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

  // Modal functions
  const openTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const closeTransactionDetails = () => {
    setSelectedTransaction(null);
    setIsModalOpen(false);
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
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
      return 'Kein Datum';
    }

    // Handle different date formats from finAPI
    let date: Date;

    // Check if it's already a valid date string
    if (dateString.includes('-')) {
      date = new Date(dateString);
    } else if (dateString.includes('/')) {
      date = new Date(dateString);
    } else if (dateString.length === 8) {
      // Handle YYYYMMDD format
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      date = new Date(`${year}-${month}-${day}`);
    } else {
      // Try parsing as-is
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum';
    }

    return date.toLocaleDateString('de-DE', {
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

    const matchesAccount =
      selectedAccount === 'all' || transaction.accountId.toString() === selectedAccount;
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;

    // Date range filtering
    let matchesDateRange = true;
    if (dateRange !== 'all') {
      const transactionDateStr = transaction.bankBookingDate || transaction.valueDate;
      if (transactionDateStr) {
        const transactionDate = new Date(transactionDateStr);

        if (!isNaN(transactionDate.getTime())) {
          const today = new Date();
          const currentYear = today.getFullYear();

          if (dateRange === '365') {
            // "Letztes Jahr" = komplettes vorheriges Jahr (z.B. 2024)
            const lastYear = currentYear - 1;
            const yearStart = new Date(lastYear, 0, 1); // 1. Januar des letzten Jahres
            const yearEnd = new Date(lastYear, 11, 31, 23, 59, 59); // 31. Dezember des letzten Jahres

            // Debug logging for first transaction
            if (transaction.id === transactions[0]?.id) {
              const debugData = {
                dateRange: `Letztes Jahr (${lastYear})`,
                currentYear: currentYear,
                lastYear: lastYear,
                yearStart: yearStart.toDateString(),
                yearEnd: yearEnd.toDateString(),
                transactionDate: isNaN(transactionDate.getTime())
                  ? 'Invalid Date'
                  : transactionDate.toDateString(),
                transactionYear: isNaN(transactionDate.getTime())
                  ? 'Invalid'
                  : transactionDate.getFullYear(),
                isInRange:
                  !isNaN(transactionDate.getTime()) &&
                  transactionDate >= yearStart &&
                  transactionDate <= yearEnd,
                logic: `Aktuelles Jahr: ${currentYear} → Letztes Jahr: ${lastYear}`,
                totalTransactions: transactions.length,
                yearTransactions: transactions.filter(t => {
                  const td = new Date(t.bankBookingDate || t.valueDate);
                  return !isNaN(td.getTime()) && td >= yearStart && td <= yearEnd;
                }).length,
              };
            }

            matchesDateRange =
              !isNaN(transactionDate.getTime()) &&
              !isNaN(yearStart.getTime()) &&
              !isNaN(yearEnd.getTime()) &&
              transactionDate >= yearStart &&
              transactionDate <= yearEnd;
          } else if (dateRange === 'custom' && customDate) {
            // Benutzerdefiniertes Datum: Exakt an diesem Tag
            const selectedDate = new Date(customDate);
            const dayStart = new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              selectedDate.getDate(),
              0,
              0,
              0
            );
            const dayEnd = new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              selectedDate.getDate(),
              23,
              59,
              59
            );

            // Debug logging for first transaction
            if (transaction.id === transactions[0]?.id) {
              const debugData = {
                dateRange: `Benutzerdefiniert (${customDate})`,
                selectedDate: isNaN(selectedDate.getTime())
                  ? 'Invalid Date'
                  : selectedDate.toDateString(),
                dayStart: isNaN(dayStart.getTime()) ? 'Invalid Date' : dayStart.toDateString(),
                dayEnd: isNaN(dayEnd.getTime()) ? 'Invalid Date' : dayEnd.toDateString(),
                transactionDate: isNaN(transactionDate.getTime())
                  ? 'Invalid Date'
                  : transactionDate.toDateString(),
                isExactDay:
                  !isNaN(transactionDate.getTime()) &&
                  !isNaN(dayStart.getTime()) &&
                  !isNaN(dayEnd.getTime()) &&
                  transactionDate >= dayStart &&
                  transactionDate <= dayEnd,
                totalTransactions: transactions.length,
                dayTransactions: transactions.filter(t => {
                  const td = new Date(t.bankBookingDate || t.valueDate);
                  return (
                    !isNaN(td.getTime()) &&
                    !isNaN(dayStart.getTime()) &&
                    !isNaN(dayEnd.getTime()) &&
                    td >= dayStart &&
                    td <= dayEnd
                  );
                }).length,
              };
            }

            matchesDateRange =
              !isNaN(transactionDate.getTime()) &&
              !isNaN(dayStart.getTime()) &&
              !isNaN(dayEnd.getTime()) &&
              transactionDate >= dayStart &&
              transactionDate <= dayEnd;
          } else {
            // Andere Filter: Letzte X Tage vom heutigen Datum
            const days = parseInt(dateRange);
            const cutoffDate = new Date(today);
            cutoffDate.setDate(today.getDate() - days);

            // Debug logging for first transaction
            if (transaction.id === transactions[0]?.id) {
              const debugData = {
                dateRange: `Letzte ${days} Tage`,
                today: isNaN(today.getTime()) ? 'Invalid Date' : today.toDateString(),
                cutoffDate: isNaN(cutoffDate.getTime())
                  ? 'Invalid Date'
                  : cutoffDate.toDateString(),
                transactionDate: isNaN(transactionDate.getTime())
                  ? 'Invalid Date'
                  : transactionDate.toDateString(),
                isAfterCutoff:
                  !isNaN(transactionDate.getTime()) &&
                  !isNaN(cutoffDate.getTime()) &&
                  transactionDate >= cutoffDate,
                totalTransactions: transactions.length,
                dateRangeTransactions: transactions.filter(t => {
                  const td = new Date(t.bankBookingDate || t.valueDate);
                  return !isNaN(td.getTime()) && !isNaN(cutoffDate.getTime()) && td >= cutoffDate;
                }).length,
              };
            }

            matchesDateRange =
              !isNaN(transactionDate.getTime()) &&
              !isNaN(cutoffDate.getTime()) &&
              transactionDate >= cutoffDate;
          }
        }
      }
    }

    return matchesSearch && matchesAccount && matchesCategory && matchesDateRange;
  });

  // Get unique categories
  const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];

  // Calculate summary statistics from filtered transactions
  const totalIncome = filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
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
            <p className="text-gray-600 mt-1">
              Übersicht über alle Kontobewegungen ({filteredTransactions.length} von{' '}
              {transactions.length} angezeigt)
            </p>
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
            onChange={e => {
              setDateRange(e.target.value);
              setShowCustomDate(e.target.value === 'custom');
              if (e.target.value !== 'custom') {
                setCustomDate('');
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          >
            <option value="7">Letzte 7 Tage</option>
            <option value="30">Letzte 30 Tage</option>
            <option value="90">Letzte 90 Tage</option>
            <option value="365">Letztes Jahr</option>
            <option value="custom">Benutzerdefiniert</option>
            <option value="all">Alle</option>
          </select>
        </div>

        {/* Custom Date Input */}
        {showCustomDate && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={customDate ? formatDate(customDate) : ''}
                readOnly
                onClick={() => setShowCalendarModal(true)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] w-full cursor-pointer bg-white"
                placeholder="Datum auswählen..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const today = new Date();
                  setCustomDate(today.toISOString().split('T')[0]);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
              >
                Heute
              </button>
              <button
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setCustomDate(yesterday.toISOString().split('T')[0]);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
              >
                Gestern
              </button>
              {customDate && (
                <button
                  onClick={() => {
                    setCustomDate('');
                    setDateRange('30');
                    setShowCustomDate(false);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredTransactions.map(transaction => {
            const account = accounts.find(a => a.id === transaction.accountId.toString());
            return (
              <li key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getTransactionIcon(
                        transaction.amount > 0 ? 'CREDIT' : 'DEBIT',
                        transaction.amount
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.purpose}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              !transaction.isPotentialDuplicate
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {!transaction.isPotentialDuplicate ? 'Abgeglichen' : 'Offen'}
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
                          {formatDate(transaction.bankBookingDate)}
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
                      {transaction.isNew && <p className="text-xs text-gray-500">Ausstehend</p>}
                    </div>
                    <button
                      onClick={() => openTransactionDetails(transaction)}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Details
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Empty State */}
      {filteredTransactions.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center">
            {accounts.length === 0 ? (
              <>
                <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bank verbunden</h3>
                <p className="text-gray-600 mb-6">
                  Verbinden Sie zuerst ein Bankkonto, um Transaktionen zu sehen.
                </p>
                <button
                  onClick={() =>
                    (window.location.href = `/dashboard/company/${uid}/finance/banking/import`)
                  }
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                  Bank verbinden
                </button>
              </>
            ) : (
              <>
                <Search className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine Transaktionen gefunden
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || selectedAccount !== 'all' || selectedCategory !== 'all'
                    ? 'Versuchen Sie andere Filterkriterien.'
                    : 'Es sind noch keine Transaktionen vorhanden.'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {isModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Transaktionsdetails</h3>
              <button
                onClick={closeTransactionDetails}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Transaction Overview */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {getTransactionIcon(
                      selectedTransaction.transactionType,
                      selectedTransaction.amount
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {selectedTransaction.purpose}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedTransaction.counterpartName || 'Unbekannter Empfänger'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xl font-bold ${
                        selectedTransaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {selectedTransaction.amount >= 0 ? '+' : ''}
                      {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                    </p>
                  </div>
                </div>

                {/* Transaction Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transaktions-ID
                      </label>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-900 font-mono">{selectedTransaction.id}</p>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(selectedTransaction.id.toString())
                          }
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Konto</label>
                      <p className="text-sm text-gray-900">
                        {accounts.find(a => a.id === selectedTransaction.accountId.toString())
                          ?.accountName || 'Unbekanntes Konto'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buchungsdatum
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedTransaction.bankBookingDate)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wertstellungsdatum
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedTransaction.valueDate)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedTransaction.transactionType === 'CREDIT'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {selectedTransaction.transactionType === 'CREDIT' ? 'Einnahme' : 'Ausgabe'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {selectedTransaction.counterpartName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gegenstelle
                        </label>
                        <p className="text-sm text-gray-900">
                          {selectedTransaction.counterpartName}
                        </p>
                      </div>
                    )}

                    {selectedTransaction.counterpartIban && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          IBAN der Gegenstelle
                        </label>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-900 font-mono">
                            {selectedTransaction.counterpartIban}
                          </p>
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(
                                selectedTransaction.counterpartIban || ''
                              )
                            }
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Währung
                      </label>
                      <p className="text-sm text-gray-900">{selectedTransaction.currency}</p>
                    </div>

                    {selectedTransaction.category && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kategorie
                        </label>
                        <p className="text-sm text-gray-900">{selectedTransaction.category}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <div className="flex space-x-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedTransaction.isReconciled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {selectedTransaction.isReconciled ? 'Abgeglichen' : 'Offen'}
                        </span>
                        {selectedTransaction.isPending && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Ausstehend
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full Purpose Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verwendungszweck
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedTransaction.purpose}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeTransactionDetails}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
              >
                Schließen
              </button>
              <button
                onClick={() => {
                  const details = `
Transaktion: ${selectedTransaction.purpose}
Betrag: ${formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
Datum: ${formatDate(selectedTransaction.bankBookingDate)}
Gegenstelle: ${selectedTransaction.counterpartName || 'Unbekannt'}
IBAN: ${selectedTransaction.counterpartIban || 'Nicht verfügbar'}
ID: ${selectedTransaction.id}
                  `.trim();
                  navigator.clipboard.writeText(details);
                }}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
              >
                <Copy className="h-4 w-4 mr-2 inline" />
                Kopieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Datum auswählen</h3>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Calendar Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Date Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datum eingeben
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>

                {/* Quick Date Buttons */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Schnellauswahl</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const today = new Date();
                        setCustomDate(today.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                    >
                      Heute
                    </button>
                    <button
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setCustomDate(yesterday.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                    >
                      Gestern
                    </button>
                    <button
                      onClick={() => {
                        const lastWeek = new Date();
                        lastWeek.setDate(lastWeek.getDate() - 7);
                        setCustomDate(lastWeek.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                    >
                      Vor 1 Woche
                    </button>
                    <button
                      onClick={() => {
                        const lastMonth = new Date();
                        lastMonth.setMonth(lastMonth.getMonth() - 1);
                        setCustomDate(lastMonth.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                    >
                      Vor 1 Monat
                    </button>
                  </div>
                </div>

                {/* Selected Date Preview */}
                {customDate && (
                  <div className="p-3 bg-[#14ad9f]/10 rounded-md border border-[#14ad9f]/20">
                    <p className="text-sm text-[#14ad9f] font-medium">
                      Ausgewähltes Datum: {formatDate(customDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCalendarModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  setShowCalendarModal(false);
                  if (!customDate) {
                    setDateRange('30');
                    setShowCustomDate(false);
                  }
                }}
                disabled={!customDate}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anwenden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
