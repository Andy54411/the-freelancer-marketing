'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BankTransaction, BankAccount } from '@/types';
import { FinAPIService } from '@/lib/finapi';
import { Search, Filter, Download, RefreshCw, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

export default function BankingTransactionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

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

  // finAPI Service initialisieren
  const finAPIService = new FinAPIService();

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const [finAPITransactionResponse, finAPIAccountResponse] = await Promise.all([
        finAPIService.getTransactions(),
        finAPIService.getAccounts(),
      ]);
      
      // Convert finAPI data to our interface format
      const convertedTransactions: BankTransaction[] = finAPITransactionResponse.transactions.map(tx => ({
        id: tx.id.toString(),
        accountId: tx.accountId.toString(),
        amount: tx.amount,
        currency: 'EUR', // Default currency
        purpose: tx.purpose || 'Keine Beschreibung',
        counterpartName: tx.counterpartName,
        counterpartIban: tx.counterpartIban,
        bookingDate: tx.bankBookingDate,
        valueDate: tx.valueDate,
        transactionType: tx.amount >= 0 ? 'CREDIT' : 'DEBIT',
        category: tx.category?.name,
        isReconciled: false,
        isPending: tx.isNew,
      }));
      
      const convertedAccounts: BankAccount[] = finAPIAccountResponse.accounts.map(acc => ({
        id: acc.id.toString(),
        accountName: acc.accountName,
        iban: acc.iban || '',
        bankName: 'Unbekannte Bank', // Bank information not available in this structure
        accountNumber: acc.accountNumber || '',
        balance: acc.balance || 0,
        availableBalance: acc.availableFunds || acc.balance || 0,
        currency: acc.accountCurrency,
        accountType: 'CHECKING',
        isDefault: false,
      }));
      
      setTransactions(convertedTransactions);
      setAccounts(convertedAccounts);
    } catch (error) {
      console.error('Fehler beim Laden der Transaktionen:', error);
      // Fallback auf Mock-Daten bei Fehler
      setAccounts([
        {
          id: 'mock_001',
          accountName: 'Geschäftskonto',
          iban: 'DE89 3704 0044 0532 0130 00',
          bankName: 'Deutsche Bank AG',
          accountNumber: '0532013000',
          balance: 25750.50,
          availableBalance: 25750.50,
          currency: 'EUR',
          accountType: 'CHECKING',
          isDefault: true,
        },
      ]);
      setTransactions([
        {
          id: 'txn_001',
          accountId: 'mock_001',
          amount: -250.00,
          currency: 'EUR',
          purpose: 'Büromaterial Online-Shop',
          counterpartName: 'Amazon Business',
          counterpartIban: 'DE12 3456 7890 1234 5678 90',
          bookingDate: '2025-08-01',
          valueDate: '2025-08-01',
          transactionType: 'DEBIT',
          category: 'Büroausstattung',
          isReconciled: false,
          isPending: false,
        },
        {
          id: 'txn_002',
          accountId: 'mock_001',
          amount: 1500.00,
          currency: 'EUR',
          purpose: 'Rechnung INV-2025-001',
          counterpartName: 'Musterfirma GmbH',
          counterpartIban: 'DE98 7654 3210 9876 5432 10',
          bookingDate: '2025-07-30',
          valueDate: '2025-07-30',
          transactionType: 'CREDIT',
          category: 'Umsatzerlöse',
          isReconciled: true,
          isPending: false,
        },
        {
          id: 'txn_003',
          accountId: 'mock_001',
          amount: -89.99,
          currency: 'EUR',
          purpose: 'Tankstelle Automat',
          counterpartName: 'Shell Deutschland',
          bookingDate: '2025-07-29',
          valueDate: '2025-07-29',
          transactionType: 'DEBIT',
          category: 'Fahrtkosten',
          isReconciled: false,
          isPending: false,
        },
        {
          id: 'txn_004',
          accountId: 'mock_001',
          amount: 2500.00,
          currency: 'EUR',
          purpose: 'Projektabrechnung Q3',
          counterpartName: 'Großkunde AG',
          counterpartIban: 'DE11 2222 3333 4444 5555 66',
          bookingDate: '2025-07-28',
          valueDate: '2025-07-28',
          transactionType: 'CREDIT',
          category: 'Umsatzerlöse',
          isReconciled: true,
          isPending: false,
        },
        {
          id: 'txn_005',
          accountId: 'mock_001',
          amount: -1200.00,
          currency: 'EUR',
          purpose: 'Miete Büroräume August',
          counterpartName: 'Immobilien Partner',
          counterpartIban: 'DE77 8888 9999 0000 1111 22',
          bookingDate: '2025-07-27',
          valueDate: '2025-08-01',
          transactionType: 'DEBIT',
          category: 'Miete',
          isReconciled: true,
          isPending: false,
        },
      ]);
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
    loadTransactions();
  }, []);

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
      (transaction.counterpartName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      transaction.amount.toString().includes(searchTerm);
    
    const matchesAccount = selectedAccount === 'all' || transaction.accountId === selectedAccount;
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
    
    return matchesSearch && matchesAccount && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];

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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] w-full"
            />
          </div>

          {/* Account Filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
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
            onChange={(e) => setSelectedCategory(e.target.value)}
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
            onChange={(e) => setDateRange(e.target.value)}
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
          {filteredTransactions.map((transaction) => {
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
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.isReconciled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
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
                          {transaction.category && (
                            <span> • {transaction.category}</span>
                          )}
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
                      <p className={`text-sm font-semibold ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      {transaction.isPending && (
                        <p className="text-xs text-gray-500">Ausstehend</p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Transaktionen gefunden</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedAccount !== 'all' || selectedCategory !== 'all' 
                ? 'Versuchen Sie andere Filterkriterien.'
                : 'Es sind noch keine Transaktionen vorhanden.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
