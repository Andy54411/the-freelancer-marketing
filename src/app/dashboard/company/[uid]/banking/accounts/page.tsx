'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BankAccount } from '@/types';
import { getFinAPICredentialType } from '@/lib/finapi-config';
import { PlusCircle, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react';

export default function BankingAccountsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Get environment-specific credential type
  const credentialType = getFinAPICredentialType();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountsByBank, setAccountsByBank] = useState<{ [bankName: string]: BankAccount[] }>({});
  const [bankingOverview, setBankingOverview] = useState<{
    totalBanks: number;
    totalAccounts: number;
    source: string;
    lastSync: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true); // Show balances by default
  const [refreshing, setRefreshing] = useState(false);
  const [expandedBanks, setExpandedBanks] = useState<{ [bankName: string]: boolean }>({});

  const loadFinAPIAccounts = useCallback(async () => {
    try {
      if (!user?.uid) {
        setAccounts([]);
        return;
      }

      // Use enhanced accounts API that includes local storage
      const response = await fetch(
        `/api/finapi/accounts-enhanced?userId=${user.uid}&credentialType=${credentialType}&forceRefresh=${refreshing}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`finAPI API Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.accounts) {
        setAccounts(data.accounts);

        // Set accounts grouped by bank if available
        if (data.accountsByBank) {
          setAccountsByBank(data.accountsByBank);
          // Auto-expand banks that have accounts
          const newExpandedBanks: { [bankName: string]: boolean } = {};
          Object.keys(data.accountsByBank).forEach(bankName => {
            newExpandedBanks[bankName] = true;
          });
          setExpandedBanks(newExpandedBanks);
        }

        // Set banking overview if available (bank count, total balance, etc.)
        if (data.bankCount) {
          setBankingOverview({
            totalBanks: data.bankCount,
            totalAccounts: data.totalCount,
            source: data.source,
            lastSync: data.lastSync,
          });
        }

        // Show success message if accounts were loaded from live API
        if (data.source === 'finapi_live' && refreshing) {
        }
      } else {
        setAccounts([]);
        setAccountsByBank({});
        setBankingOverview(null);
      }
    } catch (error) {
      setAccounts([]);
      setAccountsByBank({});
      setBankingOverview(null);
    }
  }, [user?.uid, refreshing]);

  // Load accounts on component mount - no token needed for B2B architecture
  useEffect(() => {
    if (user?.uid) {
      loadFinAPIAccounts();
    }
  }, [user, loadFinAPIAccounts]);

  const refreshAccounts = async () => {
    setRefreshing(true);
    await loadFinAPIAccounts();
    setRefreshing(false);
  };

  // Set loading to false after first load attempt
  useEffect(() => {
    if (user?.uid) {
      setLoading(false);
    }
  }, [accounts, user]);

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

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'CHECKING':
        return 'Girokonto';
      case 'SAVINGS':
        return 'Sparkonto';
      case 'CREDIT_CARD':
        return 'Kreditkarte';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
          <p className="text-gray-600">Konten werden geladen...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Bankkonten</h1>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-gray-600">Übersicht über alle finAPI-verbundenen Bankkonten</p>
              {bankingOverview && (
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>
                    {bankingOverview.totalBanks} Bank{bankingOverview.totalBanks !== 1 ? 'en' : ''}
                  </span>
                  <span>•</span>
                  <span>
                    {bankingOverview.totalAccounts} Konto
                    {bankingOverview.totalAccounts !== 1 ? 's' : ''}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{bankingOverview.source?.replace('_', ' ')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
            >
              {showBalances ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Salden ausblenden
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Salden anzeigen
                </>
              )}
            </button>
            <button
              onClick={refreshAccounts}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Aktualisiere...' : 'Aktualisieren'}
            </button>
          </div>
        </div>
      </div>

      {/* Bank-gruppierte Konten-Ansicht */}
      {Object.keys(accountsByBank).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(accountsByBank).map(([bankName, bankAccounts]) => {
            const isExpanded = expandedBanks[bankName];
            const totalBalance = bankAccounts.reduce(
              (sum, account) => sum + (account.balance || 0),
              0
            );
            const currency = bankAccounts[0]?.currency || 'EUR';

            return (
              <div key={bankName} className="bg-white shadow rounded-lg border border-gray-200">
                {/* Bank Header */}
                <div
                  className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setExpandedBanks(prev => ({
                      ...prev,
                      [bankName]: !prev[bankName],
                    }))
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-[#14ad9f] rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {bankName.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{bankName}</h3>
                        <p className="text-sm text-gray-500">
                          {bankAccounts.length} Konto{bankAccounts.length !== 1 ? 's' : ''}
                          {showBalances && ` • ${formatCurrency(totalBalance, currency)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-400">{isExpanded ? '▼' : '▶'}</div>
                  </div>
                </div>

                {/* Bank Accounts */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bankAccounts.map(account => (
                        <div
                          key={account.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div
                                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                    account.isDefault ? 'bg-[#14ad9f]' : 'bg-gray-100'
                                  }`}
                                >
                                  <span
                                    className={`text-xs font-medium ${
                                      account.isDefault ? 'text-white' : 'text-gray-600'
                                    }`}
                                  >
                                    {account.accountName.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {account.accountName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {getAccountTypeLabel(account.accountType)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {account.iban && (
                              <div>
                                <p className="text-xs text-gray-500">IBAN</p>
                                <p className="text-sm font-mono text-gray-900">
                                  {account.iban.replace(/(.{4})/g, '$1 ').trim()}
                                </p>
                              </div>
                            )}

                            {showBalances && (
                              <div>
                                <p className="text-xs text-gray-500">Verfügbarer Saldo</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(account.balance || 0, account.currency)}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex justify-between items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Aktiv
                            </span>
                            <button className="text-[#14ad9f] hover:text-[#129488] text-sm font-medium">
                              Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Fallback: Original flat view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(account => (
            <div
              key={account.id}
              className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          account.isDefault ? 'bg-[#14ad9f]' : 'bg-gray-100'
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            account.isDefault ? 'text-white' : 'text-gray-600'
                          }`}
                        >
                          {account.accountName.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{account.accountName}</h3>
                      <p className="text-sm text-gray-500">{account.bankName}</p>
                    </div>
                  </div>
                  {account.isDefault && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#14ad9f] text-white">
                      Standard
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">IBAN</p>
                    <p className="text-sm text-gray-900 font-mono">{account.iban}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500">Kontotyp</p>
                    <p className="text-sm text-gray-900">
                      {getAccountTypeLabel(account.accountType)}
                    </p>
                  </div>

                  {showBalances && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-500">Aktueller Saldo</p>
                        <p
                          className={`text-lg font-semibold ${
                            account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(account.balance, account.currency)}
                        </p>
                      </div>
                      {account.availableBalance !== account.balance && (
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-sm text-gray-500">Verfügbar</p>
                          <p className="text-sm text-gray-900">
                            {formatCurrency(account.availableBalance, account.currency)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex space-x-3">
                  <button className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
                    Details
                  </button>
                  <button className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Online Banking
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center">
            <PlusCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bankkonten verbunden</h3>
            <p className="text-gray-600 mb-6">
              Verwenden Sie &ldquo;Banking → Verbinden&rdquo; um Bankkonten hinzuzufügen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
