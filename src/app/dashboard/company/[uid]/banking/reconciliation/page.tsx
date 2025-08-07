'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BankTransaction, ReconciliationRule } from '@/types';
import { CheckCircle, Search, Settings, Zap, FileText, AlertTriangle } from 'lucide-react';

export default function BankingReconciliationPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [unreconciledTransactions, setUnreconciledTransactions] = useState<BankTransaction[]>([]);
  const [reconciliationRules, setReconciliationRules] = useState<ReconciliationRule[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [_showRulesModal, setShowRulesModal] = useState(false);

  const loadUnreconciledTransactions = async () => {
    try {
      setLoading(true);
      // Mock data for unreconciled transactions
      setUnreconciledTransactions([
        {
          id: 'txn_001',
          accountId: 'acc_001',
          amount: -250.0,
          currency: 'EUR',
          purpose: 'Büromaterial Amazon Business',
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
          id: 'txn_003',
          accountId: 'acc_001',
          amount: -89.99,
          currency: 'EUR',
          purpose: 'Tankstelle Shell',
          counterpartName: 'Shell Deutschland',
          bookingDate: '2025-07-29',
          valueDate: '2025-07-29',
          transactionType: 'DEBIT',
          category: 'Fahrtkosten',
          isReconciled: false,
          isPending: false,
        },
        {
          id: 'txn_005',
          accountId: 'acc_001',
          amount: -45.8,
          currency: 'EUR',
          purpose: 'Bücher und Materialien',
          counterpartName: 'Thalia Buchhandlung',
          bookingDate: '2025-07-26',
          valueDate: '2025-07-26',
          transactionType: 'DEBIT',
          isReconciled: false,
          isPending: false,
        },
        {
          id: 'txn_006',
          accountId: 'acc_001',
          amount: 750.0,
          currency: 'EUR',
          purpose: 'Freelancer Zahlung Juli',
          counterpartName: 'Max Mustermann',
          counterpartIban: 'DE11 2222 3333 4444 5555 66',
          bookingDate: '2025-07-25',
          valueDate: '2025-07-25',
          transactionType: 'CREDIT',
          category: 'Umsatzerlöse',
          isReconciled: false,
          isPending: false,
        },
      ]);

      // Mock reconciliation rules
      setReconciliationRules([
        {
          id: 'rule_001',
          name: 'Amazon Büromaterial',
          description: 'Automatische Kategorisierung von Amazon Business Käufen',
          conditions: [
            { field: 'counterpartName', operator: 'contains', value: 'Amazon' },
            { field: 'purpose', operator: 'contains', value: 'Büro' },
          ],
          actions: [
            { type: 'SET_CATEGORY', value: 'Büroausstattung' },
            { type: 'MARK_RECONCILED', value: 'true' },
          ],
          isActive: true,
        },
        {
          id: 'rule_002',
          name: 'Tankstellen Abgleich',
          description: 'Automatischer Abgleich von Tankstellenrechnungen',
          conditions: [
            { field: 'purpose', operator: 'contains', value: 'Tankstelle' },
            { field: 'amount', operator: 'lessThan', value: 200 },
          ],
          actions: [{ type: 'SET_CATEGORY', value: 'Fahrtkosten' }],
          isActive: true,
        },
      ]);
    } catch (error) {
      console.error('Fehler beim Laden der Transaktionen:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.uid === uid) {
      loadUnreconciledTransactions();
    }
  }, [user, uid]);

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

  const handleTransactionSelect = (transactionId: string) => {
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    }
  };

  const handleBulkReconcile = () => {
    setUnreconciledTransactions(prev =>
      prev
        .map(t => (selectedTransactions.includes(t.id) ? { ...t, isReconciled: true } : t))
        .filter(t => !t.isReconciled)
    );
    setSelectedTransactions([]);
  };

  const handleApplyRules = () => {
    // Mock implementation of applying rules
    const updatedTransactions = unreconciledTransactions.map(transaction => {
      const updated = { ...transaction };

      reconciliationRules.forEach(rule => {
        if (!rule.isActive) return;

        const matchesConditions = rule.conditions.every(condition => {
          const fieldValue = updated[condition.field as keyof BankTransaction];

          switch (condition.operator) {
            case 'contains':
              return (
                fieldValue
                  ?.toString()
                  .toLowerCase()
                  .includes(condition.value.toString().toLowerCase()) || false
              );
            case 'equals':
              return fieldValue === condition.value;
            case 'lessThan':
              return Number(fieldValue) < Number(condition.value);
            case 'greaterThan':
              return Number(fieldValue) > Number(condition.value);
            default:
              return false;
          }
        });

        if (matchesConditions) {
          rule.actions.forEach(action => {
            switch (action.type) {
              case 'SET_CATEGORY':
                updated.category = action.value;
                break;
              case 'MARK_RECONCILED':
                updated.isReconciled = action.value === 'true';
                break;
            }
          });
        }
      });

      return updated;
    });

    setUnreconciledTransactions(updatedTransactions.filter(t => !t.isReconciled));
  };

  // Filter transactions
  const filteredTransactions = unreconciledTransactions.filter(
    transaction =>
      transaction.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.counterpartName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      transaction.amount.toString().includes(searchTerm)
  );

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <CheckCircle className="h-8 w-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
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
            <h1 className="text-2xl font-bold text-gray-900">Abgleich & Reconciliation</h1>
            <p className="text-gray-600 mt-1">
              Gleichen Sie Banktransaktionen mit Ihren Geschäftsdaten ab
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowRulesModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
            >
              <Settings className="h-4 w-4 mr-2" />
              Regeln verwalten
            </button>
            <button
              onClick={handleApplyRules}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
            >
              <Zap className="h-4 w-4 mr-2" />
              Regeln anwenden
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Offene Transaktionen
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {unreconciledTransactions.length}
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
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Aktive Regeln</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {reconciliationRules.filter(r => r.isActive).length}
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
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ausgewählt</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {selectedTransactions.length}
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
                <Zap className="h-6 w-6 text-[#14ad9f]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Automatisierung</dt>
                  <dd className="text-lg font-medium text-gray-900">85%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Transaktionen suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] w-80"
              />
            </div>
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
            >
              {selectedTransactions.length === filteredTransactions.length
                ? 'Alle abwählen'
                : 'Alle auswählen'}
            </button>
          </div>
          {selectedTransactions.length > 0 && (
            <button
              onClick={handleBulkReconcile}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {selectedTransactions.length} abgleichen
            </button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredTransactions.map(transaction => (
            <li key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedTransactions.includes(transaction.id)}
                  onChange={() => handleTransactionSelect(transaction.id)}
                  className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {transaction.purpose}
                    </p>
                    <div className="ml-2 flex-shrink-0">
                      <p
                        className={`text-sm font-semibold ${
                          transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.amount >= 0 ? '+' : ''}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <div className="flex-1">
                      {transaction.counterpartName && <span>{transaction.counterpartName} • </span>}
                      <span>{formatDate(transaction.bookingDate)}</span>
                      {transaction.category && <span> • {transaction.category}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      setUnreconciledTransactions(prev =>
                        prev
                          .map(t => (t.id === transaction.id ? { ...t, isReconciled: true } : t))
                          .filter(t => !t.isReconciled)
                      );
                    }}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Abgleichen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center">
            <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {unreconciledTransactions.length === 0
                ? 'Alle Transaktionen abgeglichen!'
                : 'Keine Ergebnisse'}
            </h3>
            <p className="text-gray-600">
              {unreconciledTransactions.length === 0
                ? 'Alle Banktransaktionen wurden erfolgreich abgeglichen.'
                : 'Versuchen Sie andere Suchbegriffe.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
