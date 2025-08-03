'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BankAccount } from '@/types';
import { FinAPITokenManager } from '@/lib/finapi-token-manager';
import { PlusCircle, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react';

export default function BankingAccountsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasFinAPIToken, setHasFinAPIToken] = useState(false);

  // Check for existing finAPI token on component mount
  useEffect(() => {
    const checkFinAPIToken = () => {
      const token = FinAPITokenManager.getUserToken();
      if (token) {
        console.log('finAPI token found, loading real banking data');
        setHasFinAPIToken(true);
      } else {
        console.log('No finAPI token found, user needs to complete setup');
        setHasFinAPIToken(false);
      }
    };

    checkFinAPIToken();
  }, []);

  const loadFinAPIAccounts = async () => {
    try {
      // Check if user has finAPI token
      const token = FinAPITokenManager.getUserToken();
      if (!token) {
        console.log('No finAPI token found, user needs to complete setup');
        setAccounts([]);
        return;
      }

      console.log('Loading finAPI accounts for user:', token.user_email);

      // Call our accounts API with user token
      const response = await fetch('/api/finapi/accounts', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`finAPI API Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.accounts) {
        console.log(`Loaded ${data.accounts.length} finAPI accounts`);
        setAccounts(data.accounts);
      } else {
        console.log('No accounts found in finAPI response');
        setAccounts([]);
      }
    } catch (error) {
      console.error('finAPI Accounts Fehler:', error);

      // If token is expired or invalid, clear it
      if (error instanceof Error && error.message.includes('401')) {
        FinAPITokenManager.clearUserToken();
        setHasFinAPIToken(false);
      }

      // Show empty state for setup
      setAccounts([]);
    }
  };

  const loadAccounts = async () => {
    setLoading(true);

    if (hasFinAPIToken) {
      await loadFinAPIAccounts();
    } else {
      // No token available, show empty state
      setAccounts([]);
    }

    setLoading(false);
  };

  const refreshAccounts = async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAccounts();
  }, [hasFinAPIToken]); // Reload when token status changes

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
            <p className="text-gray-600 mt-1">Übersicht über alle finAPI-verbundenen Bankkonten</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() =>
                (window.location.href = `/dashboard/company/${uid}/finance/banking/setup`)
              }
              className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              finAPI Setup
            </button>
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
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
              <PlusCircle className="h-4 w-4 mr-2" />
              Konto hinzufügen
            </button>
          </div>
        </div>
      </div>

      {/* Konten-Grid */}
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

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center">
            <PlusCircle className="h-12 w-12 text-gray-400 mb-4" />
            {hasFinAPIToken ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine Bankkonten verbunden
                </h3>
                <p className="text-gray-600 mb-6">
                  Sie haben einen finAPI-Account, aber noch keine Bankkonten verbunden. Gehen Sie
                  zum Setup, um Ihre ersten Bankkonten zu verbinden.
                </p>
                <button
                  onClick={() =>
                    (window.location.href = `/dashboard/company/${uid}/finance/banking/setup`)
                  }
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Bankkonten verbinden
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  finAPI Setup erforderlich
                </h3>
                <p className="text-gray-600 mb-6">
                  Um Ihre Bankdaten anzuzeigen, müssen Sie zuerst einen finAPI-Benutzer erstellen
                  und Ihre Bankkonten verbinden.
                </p>
                <button
                  onClick={() =>
                    (window.location.href = `/dashboard/company/${uid}/finance/banking/setup`)
                  }
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  finAPI Setup starten
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
