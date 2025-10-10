'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFinAPICredentialType } from '@/lib/finapi-config';

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  balance: number;
  accountNumber?: string;
  iban?: string;
  isConnected: boolean;
}

interface Transaction {
  id: string;
  counterpartName: string;
  bookingDate: string;
  purpose: string;
  amount: number;
  type: 'income' | 'expense';
  accountName: string;
}

interface BankAccountCardProps {
  companyId: string;
  onConnectBank?: () => void;
  className?: string;
}

export default function BankAccountCard({
  companyId,
  onConnectBank,
  className = '',
}: BankAccountCardProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense'>('all');

  const credentialType = getFinAPICredentialType();

  // Load bank accounts
  const loadBankAccounts = React.useCallback(async () => {
    try {
      if (!user?.uid) return;

      const response = await fetch(
        `/api/finapi/accounts-enhanced?userId=${user.uid}&credentialType=${credentialType}`
      );

      if (!response.ok) {
        throw new Error('Failed to load accounts');
      }

      const data = await response.json();

      if (data.success && data.accounts) {
        const bankAccounts: BankAccount[] = data.accounts.map((acc: any) => ({
          id: acc.id,
          accountName: acc.accountName || acc.bankName || 'Unbekanntes Konto',
          bankName: acc.bankName || 'Unbekannte Bank',
          balance: acc.balance || 0,
          accountNumber: acc.accountNumber,
          iban: acc.iban,
          isConnected: true,
        }));

        setAccounts(bankAccounts);

        // Calculate total balance
        const total = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        setTotalBalance(total);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      setAccounts([]);
      setTotalBalance(0);
    }
  }, [user?.uid, credentialType]);

  // Load recent transactions
  const loadRecentTransactions = React.useCallback(async () => {
    try {
      if (!user?.uid || selectedAccounts.length === 0) return;

      const response = await fetch(
        `/api/finapi/transactions?userId=${user.uid}&accountIds=${selectedAccounts.join(',')}&credentialType=${credentialType}`
      );

      if (!response.ok) {
        console.warn(`Transaction API returned ${response.status}: ${response.statusText}`);
        // Setze leere Transaktionen statt Error zu werfen
        setTransactions([]);
        return;
      }

      const data = await response.json();

      if (data.success && data.transactions) {
        const formattedTransactions: Transaction[] = data.transactions.map((tx: any) => ({
          id: tx.id,
          counterpartName: tx.counterpartName || 'Unbekannt',
          amount: tx.amount || 0,
          date: tx.date || new Date().toISOString(),
          description: tx.purpose || tx.counterpartName || 'Transaktion',
          type: tx.amount >= 0 ? 'income' : 'expense',
          accountId: tx.accountId,
        }));

        setTransactions(formattedTransactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  }, [user?.uid, selectedAccounts, credentialType]);

  // Load saved account selection
  const loadSavedAccountSelection = React.useCallback(async () => {
    try {
      if (!user?.uid || !companyId) return [];

      // Try loading from Firestore first
      const response = await fetch(`/api/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        const savedSelection = data?.settings?.banking?.selectedAccounts;
        if (Array.isArray(savedSelection) && savedSelection.length > 0) {
          return savedSelection;
        }
      }

      // Fallback: localStorage
      const localSelection = localStorage.getItem(`selectedAccounts_${companyId}`);
      if (localSelection) {
        const parsedSelection = JSON.parse(localSelection);

        return parsedSelection;
      }
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten Konto-Auswahl:', error);
    }

    return [];
  }, [user?.uid, companyId]);

  // Load data on component mount
  useEffect(() => {
    if (!companyId || !user?.uid) return;

    const loadData = async () => {
      setLoading(true);
      await loadBankAccounts();
      setLoading(false);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, companyId]);

  // Load transactions after accounts are loaded
  useEffect(() => {
    if (!companyId) return;

    const initializeAccountSelection = async () => {
      if (accounts.length > 0) {
        // Lade gespeicherte Auswahl
        const savedSelection = await loadSavedAccountSelection();

        if (savedSelection.length > 0) {
          // Filtere nur die Konten, die noch existieren
          const validSelection = savedSelection.filter(accountId =>
            accounts.some(acc => acc.id === accountId)
          );

          if (validSelection.length > 0) {
            setSelectedAccounts(validSelection);
          } else {
            // Alle Konten auswählen, wenn keine gültige Auswahl gefunden
            setSelectedAccounts(accounts.map(acc => acc.id));
          }
        } else {
          // Standard: Alle Konten auswählen
          setSelectedAccounts(accounts.map(acc => acc.id));
        }

        // Lade Transaktionen
        await loadRecentTransactions();
      }
    };

    initializeAccountSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, companyId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!companyId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showAccountDropdown && !target.closest('.account-dropdown')) {
        setShowAccountDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAccountDropdown, companyId]);

  // Filter Transaktionen basierend auf dem aktuellen Filter
  const filteredTransactions = React.useMemo(() => {
    switch (transactionFilter) {
      case 'income':
        return transactions.filter(t => t.type === 'income');
      case 'expense':
        return transactions.filter(t => t.type === 'expense');
      default:
        return transactions;
    }
  }, [transactions, transactionFilter]);

  // Early return wenn companyId nicht verfügbar ist
  if (!companyId) {
    return null;
  }

  const formatAmount = (amount: number) => {
    return `${Math.abs(amount).toFixed(2).replace('.', ',')} €`;
  };

  const formatAmountWithSign = (amount: number) => {
    const formatted = `${Math.abs(amount).toFixed(2).replace('.', ',')} €`;
    return amount >= 0 ? formatted : `-${formatted}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Heute';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Gestern';
      } else {
        return date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    } catch {
      return dateString;
    }
  };

  const getBankInitial = (bankName: string) => {
    return bankName.charAt(0).toUpperCase();
  };

  const getBankAvatar = (bankName: string) => {
    if (!bankName || bankName === 'unknown') {
      return '/images/bank-avatar-fallback.svg';
    }

    const bankLogos: Record<string, string> = {
      sparkasse: '/images/banks/Sparkasse.png',
      commerzbank: '/images/banks/Commerzbank.png',
      'deutsche bank': '/images/banks/Deutsche_Bank.png',
      n26: '/images/banks/N26.png',
      paypal: '/images/banks/Paypal.png',
      qonto: '/images/banks/Qonto.png',
      fyrst: '/images/banks/Fyrst.png',
      volksbank: '/images/banks/Volksbanken_Raiffeisenbanken.png',
      raiffeisenbank: '/images/banks/Volksbanken_Raiffeisenbanken.png',
    };

    try {
      const lowerBankName = bankName.toLowerCase();
      for (const [key, logo] of Object.entries(bankLogos)) {
        if (lowerBankName.includes(key)) {
          return logo;
        }
      }
    } catch (error) {}

    return '/images/bank-avatar-fallback.svg';
  };

  const getCounterpartAvatar = (counterpartName: string) => {
    // Für Transaktionen verwenden wir das 32x32 Fallback-Avatar
    return '/images/transaction-avatar-fallback.svg';
  };

  const primaryAccount = accounts.length > 0 ? accounts[0].accountName : 'Kein Konto verbunden';
  const hasAccounts = accounts.length > 0;

  // Berechne Gesamtsaldo nur für ausgewählte Konten
  const calculateSelectedAccountsBalance = () => {
    if (selectedAccounts.length === 0) return totalBalance;

    return accounts
      .filter(account => selectedAccounts.includes(account.id))
      .reduce((sum, account) => sum + account.balance, 0);
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };

  const selectAllAccounts = () => {
    setSelectedAccounts(accounts.map(acc => acc.id));
  };

  const saveAccountSelection = async () => {
    try {
      // Speichere die Auswahl in Firestore (ähnlich wie in Receipt-Page)
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      if (!user?.uid || !companyId) {
        return;
      }

      // Speichere in company settings unter banking preferences
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        'settings.banking.selectedAccounts': selectedAccounts,
        'settings.banking.lastUpdated': new Date().toISOString(),
      });

      // Lade Transaktionen neu basierend auf der neuen Auswahl
      await loadRecentTransactions();

      setShowAccountDropdown(false);
    } catch (error) {
      console.error('Fehler beim Speichern der Konto-Auswahl:', error);

      // Fallback: localStorage als Backup
      try {
        localStorage.setItem(`selectedAccounts_${companyId}`, JSON.stringify(selectedAccounts));

        setShowAccountDropdown(false);
      } catch (localError) {
        console.error('Auch localStorage-Fallback fehlgeschlagen:', localError);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-20 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      <div className="p-6">
        <div className="mb-6">
          <span className="text-lg font-semibold text-gray-900">Bank</span>
        </div>

        <div>
          <div>
            <section role="region">
              {/* Gesamtsaldo mit überlappenden Account-Avataren */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    Gesamtsaldo
                    {selectedAccounts.length > 0 && selectedAccounts.length < accounts.length && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({selectedAccounts.length} von {accounts.length} Konten)
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatAmount(calculateSelectedAccountsBalance())}
                  </span>
                </div>
                <div className="flex items-center relative">
                  {hasAccounts
                    ? accounts.slice(0, 2).map((account, index) => (
                        <div
                          key={account.id}
                          className="relative"
                          title={account.accountName}
                          style={{ right: `${index * 21.6}px` }}
                        >
                          <img
                            alt={`avatar image ${account.accountName}`}
                            className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover bg-gray-100"
                            src={getBankAvatar(account.bankName || 'unknown')}
                            width="36"
                            height="36"
                            onError={e => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/bank-avatar-fallback.svg';
                            }}
                          />
                        </div>
                      ))
                    : // Fallback: Zeige 2 Standard-Avatare wenn keine Konten geladen sind
                      [0, 1].map(index => (
                        <div
                          key={`fallback-${index}`}
                          className="relative"
                          title="Konto wird geladen..."
                          style={{ right: `${index * 21.6}px` }}
                        >
                          <img
                            alt="avatar fallback"
                            className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover bg-gray-100"
                            src="/images/bank-avatar-fallback.svg"
                            width="36"
                            height="36"
                          />
                        </div>
                      ))}
                </div>
              </div>

              {/* Dropdown Menu - wird jetzt vom Filter-Button gesteuert */}
              <div className="relative account-dropdown">
                {showAccountDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Konto wählen</h2>
                      <ul className="space-y-0" data-testid="bank-account-list">
                        {accounts.map((account, index) => (
                          <li
                            key={account.id}
                            role="row"
                            className={
                              index < accounts.length - 1 ? 'border-b border-gray-100' : ''
                            }
                          >
                            <div
                              className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded cursor-pointer"
                              onClick={() => toggleAccountSelection(account.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={getBankAvatar(account.bankName)}
                                    width="32"
                                    height="32"
                                    className="w-8 h-8 rounded-full object-cover bg-gray-100"
                                    alt={`logo of ${account.accountName}`}
                                    onError={e => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/images/bank-avatar-fallback.svg';
                                    }}
                                  />

                                  <div>
                                    <div role="title">
                                      <span className="text-sm font-medium text-gray-900">
                                        {account.accountName}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      <span>
                                        {account.iban
                                          ? `${account.iban.slice(0, 8)}...`
                                          : account.accountNumber || ''}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {formatAmount(account.balance)}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    readOnly
                                    aria-hidden="true"
                                    data-testid="checkbox-input"
                                    checked={selectedAccounts.includes(account.id)}
                                    className="sr-only"
                                  />

                                  <div className="flex items-center">
                                    <div
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                        selectedAccounts.includes(account.id)
                                          ? 'bg-[#14ad9f] border-[#14ad9f]'
                                          : 'border-gray-300 bg-white'
                                      }`}
                                      role="checkbox"
                                      aria-checked={selectedAccounts.includes(account.id)}
                                      tabIndex={0}
                                    >
                                      {selectedAccounts.includes(account.id) && (
                                        <svg
                                          width="10"
                                          height="10"
                                          viewBox="0 0 10 10"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="text-white"
                                          data-testid="icon-check"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M9.03033 2.21967C9.32322 2.51256 9.32322 2.98744 9.03033 3.28033L4.53033 7.78033C4.23744 8.07322 3.76256 8.07322 3.46967 7.78033L1.21967 5.53033C0.926777 5.23744 0.926777 4.76256 1.21967 4.46967C1.51256 4.17678 1.98744 4.17678 2.28033 4.46967L4 6.18934L7.96967 2.21967C8.26256 1.92678 8.73744 1.92678 9.03033 2.21967Z"
                                            fill="currentColor"
                                            vectorEffect="non-scaling-stroke"
                                          ></path>
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <button
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-transparent border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          type="button"
                          onClick={selectAllAccounts}
                        >
                          Alle auswählen
                        </button>
                        <button
                          className="px-4 py-2 text-sm font-medium text-white bg-[#14ad9f] rounded-md hover:bg-[#129a8f] transition-colors"
                          type="button"
                          onClick={saveAccountSelection}
                        >
                          Speichern
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 3er Filter Grid */}
            <div className="grid grid-cols-3 gap-2 mt-4 mb-4">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="p-2 bg-[#14ad9f] hover:bg-[#129a8f] rounded text-xs font-medium text-white"
              >
                Konten auswahl
              </button>
              <button
                onClick={() =>
                  setTransactionFilter(transactionFilter === 'expense' ? 'all' : 'expense')
                }
                className={`p-2 rounded text-xs font-medium ${
                  transactionFilter === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
              >
                Ausgaben
              </button>
              <button
                onClick={() =>
                  setTransactionFilter(transactionFilter === 'income' ? 'all' : 'income')
                }
                className={`p-2 rounded text-xs font-medium ${
                  transactionFilter === 'income'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                Einnahmen
              </button>
            </div>

            {/* Transaktionsliste */}
            <div className="mt-4">
              <ul className="space-y-0">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(transaction => (
                    <li
                      key={transaction.id}
                      role="row"
                      className="border-b border-gray-100 last:border-0"
                    >
                      <div className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={getCounterpartAvatar(transaction.counterpartName)}
                                width="32"
                                height="32"
                                className="w-8 h-8 rounded-full object-cover bg-gray-100"
                                alt={`logo of ${transaction.counterpartName}`}
                                onError={e => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/images/transaction-avatar-fallback.svg';
                                }}
                              />

                              <div>
                                <div role="title">
                                  <span className="text-sm font-medium text-gray-900">
                                    {transaction.counterpartName}
                                  </span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                  <div className="flex items-center gap-1">
                                    <span>{formatDate(transaction.bookingDate)}</span>
                                    <svg
                                      className="w-1 h-1 text-gray-400"
                                      width="3"
                                      height="3"
                                      viewBox="0 0 100 100"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <circle cx="50" cy="50" r="50" fill="currentColor"></circle>
                                    </svg>
                                    <span className="truncate max-w-[120px]">
                                      {transaction.purpose}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-right">
                              <div
                                className={`text-sm font-semibold ${
                                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {formatAmountWithSign(transaction.amount)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-center py-6 text-gray-500">
                    <div className="text-sm">Keine Transaktionen gefunden</div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {!hasAccounts && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Bankkonto erforderlich</div>
            <button
              onClick={onConnectBank}
              className="text-sm text-[#14ad9f] hover:text-[#129a8f] font-medium flex items-center gap-2 transition-colors ml-auto"
            >
              Bankkonto verknüpfen
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14.3322 5.83209L19.8751 11.375C20.2656 11.7655 20.2656 12.3987 19.8751 12.7892L14.3322 18.3321M19.3322 12.0821H3.83218"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
