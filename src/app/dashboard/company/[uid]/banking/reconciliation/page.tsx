'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle,
  Search,
  RefreshCw,
  FileText,
  AlertTriangle,
  CreditCard,
  ArrowUpRight,
  DollarSign,
  Link,
  Unlink,
  Clock,
} from 'lucide-react';

interface BankTransaction {
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

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  total: number;
  status: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  description: string;
  createdAt?: string;
  finalizedAt?: string;
  companyId?: string;
  companyName?: string;
  tax?: number;
  vatRate?: number;
  priceInput?: string;
  template?: string;
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  isReconciled?: boolean;
  reconciledTransactionId?: string;
  reconciledAt?: string;
}

export default function BankingReconciliationPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // State Management
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [showReconciled, setShowReconciled] = useState(true); // Standardmäßig alle Rechnungen anzeigen
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  // Reconciliation State
  const [reconcilingInvoice, setReconcilingInvoice] = useState<string | null>(null);

  // Load Invoices from Firestore
  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      console.log(`🔍 Loading invoices for companyId: ${uid}`);

      // Lade ALLE Rechnungen aus der Datenbank ohne Status-Filter
      const response = await fetch(
        `/api/banking/reconciliation/invoices?companyId=${uid}&status=all`
      );
      const data = await response.json();

      console.log(`🔍 Full API Response:`, data);
      console.log(`� API Success: ${data.success}`);
      console.log(`📊 Total invoices received: ${data.invoices?.length || 0}`);

      if (data.success) {
        setInvoices(data.invoices || []);
        console.log(
          `✅ Successfully loaded ${data.invoices?.length || 0} invoices for reconciliation`
        );

        // Debug: Log each invoice
        data.invoices?.forEach((invoice: Invoice, index: number) => {
          console.log(`📄 Invoice ${index + 1}:`, {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
            status: invoice.status,
            companyId: invoice.companyId,
          });
        });
      } else {
        console.error('❌ API Error:', data.error);
        setError(data.error || 'Fehler beim Laden der Rechnungen');
        setInvoices([]); // Ensure invoices array is empty on error
      }
    } catch (err: unknown) {
      console.error('❌ Network/Parse Error loading invoices:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Fehler beim Laden der Rechnungen: ' + errorMessage);
      setInvoices([]); // Ensure invoices array is empty on error
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Load Transactions from finAPI
  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await fetch(
        `/api/finapi/transactions?userId=${uid}&credentialType=sandbox&page=1&perPage=100`
      );
      const data = await response.json();

      if (data.success && data.transactions) {
        setTransactions(data.transactions);
        console.log(`✅ Loaded ${data.transactions.length} transactions for reconciliation`);
      } else {
        console.log('No transactions found or user not connected to finAPI');
        setTransactions([]);
      }
    } catch (err: unknown) {
      console.error('Error loading transactions:', err);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Reconcile Invoice with Transaction
  const reconcileInvoice = async (invoiceId: string, transactionId: string) => {
    if (!selectedInvoice || !selectedTransaction) return;

    setReconcilingInvoice(invoiceId);
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      const transaction = transactions.find(txn => txn.id === transactionId);

      if (!invoice || !transaction) {
        throw new Error('Rechnung oder Transaktion nicht gefunden');
      }

      const response = await fetch('/api/banking/reconciliation/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoiceId,
          transactionId: transactionId,
          companyId: uid,
          action: 'reconcile',
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Successfully reconciled invoice:', invoiceId);
        // Refresh data
        await Promise.all([loadInvoices(), loadTransactions()]);
        setSelectedInvoice(null);
        setSelectedTransaction(null);
      } else {
        setError(data.error || 'Fehler beim Abgleich');
      }
    } catch (err: unknown) {
      console.error('Error reconciling:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Fehler beim Abgleich: ' + errorMessage);
    } finally {
      setReconcilingInvoice(null);
    }
  };

  // Undo Reconciliation
  const undoReconciliation = async (invoiceId: string) => {
    try {
      const response = await fetch('/api/banking/reconciliation/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoiceId,
          companyId: uid,
          action: 'unreconcile',
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Successfully undid reconciliation for invoice:', invoiceId);
        await loadInvoices();
      } else {
        setError(data.error || 'Fehler beim Rückgängigmachen');
      }
    } catch (err: unknown) {
      console.error('Error undoing reconciliation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Fehler beim Rückgängigmachen: ' + errorMessage);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (uid) {
      setLoading(true);
      Promise.all([loadInvoices(), loadTransactions()]).finally(() => setLoading(false));
    }
  }, [uid, loadInvoices, loadTransactions]); // Entferne showReconciled Dependency, da wir alle Rechnungen laden

  // Utility Functions
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Kein Datum';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filter functions
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.description.toLowerCase().includes(searchTerm.toLowerCase());

    // Standardmäßig alle Rechnungen anzeigen, nur verstecken wenn explizit ausgeschaltet
    // showReconciled = true: Zeige alle (auch abgeglichene)
    // showReconciled = false: Zeige nur offene (nicht abgeglichene)
    const matchesReconcileFilter = showReconciled || !invoice.isReconciled;

    return matchesSearch && matchesReconcileFilter;
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch =
      transaction.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.counterpartName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.amount.toString().includes(searchTerm);

    // Only show credit transactions (incoming payments) for reconciliation
    return matchesSearch && transaction.transactionType === 'CREDIT';
  });

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
          <p className="text-gray-600">Lade Abgleichsdaten...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Banking Reconciliation</h1>
            <p className="text-gray-600 mt-1">Gleiche deine Rechnungen mit Banktransaktionen ab</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => Promise.all([loadInvoices(), loadTransactions()])}
              disabled={loadingInvoices || loadingTransactions}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loadingInvoices || loadingTransactions ? 'animate-spin' : ''}`}
              />
              Aktualisieren
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Fehler</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => setError(null)}
                  className="text-sm font-medium text-red-800 hover:text-red-600"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Offene Rechnungen</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {invoices.filter(inv => !inv.isReconciled).length}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Abgeglichene Rechnungen
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {invoices.filter(inv => inv.isReconciled).length}
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
                <ArrowUpRight className="h-6 w-6 text-[#14ad9f]" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Eingänge (verfügbar)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {filteredTransactions.length}
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
                <DollarSign className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Offener Betrag</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(
                      invoices
                        .filter(inv => !inv.isReconciled)
                        .reduce((sum, inv) => sum + inv.total, 0)
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Show Reconciled Toggle */}
          <div className="flex items-center">
            <input
              id="show-reconciled"
              type="checkbox"
              checked={showReconciled}
              onChange={e => setShowReconciled(e.target.checked)}
              className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
            />
            <label htmlFor="show-reconciled" className="ml-2 block text-sm text-gray-900">
              Abgeglichene Rechnungen anzeigen
            </label>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (selectedInvoice && selectedTransaction) {
                  reconcileInvoice(selectedInvoice, selectedTransaction);
                }
              }}
              disabled={!selectedInvoice || !selectedTransaction || reconcilingInvoice !== null}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Link className="h-4 w-4 mr-2" />
              {reconcilingInvoice ? 'Gleiche ab...' : 'Abgleichen'}
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Invoices and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Invoices */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Rechnungen
              {loadingInvoices && (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin text-[#14ad9f]" />
              )}
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {filteredInvoices.map(invoice => (
                <li
                  key={invoice.id}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer border-l-4 ${
                    selectedInvoice === invoice.id
                      ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                      : invoice.isReconciled
                        ? 'border-green-400'
                        : 'border-transparent'
                  }`}
                  onClick={() =>
                    setSelectedInvoice(selectedInvoice === invoice.id ? null : invoice.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{invoice.customerName}</p>
                      <p className="text-xs text-gray-400">{formatDate(invoice.issueDate)}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.total)}
                      </p>
                      {invoice.isReconciled ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Abgeglichen
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Offen
                        </span>
                      )}
                    </div>
                  </div>
                  {invoice.isReconciled && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          undoReconciliation(invoice.id);
                        }}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        <Unlink className="h-3 w-3 mr-1 inline" />
                        Rückgängig
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {filteredInvoices.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              <div className="space-y-2">
                <p>Keine Rechnungen gefunden</p>
                <div className="text-xs bg-gray-100 p-2 rounded">
                  <p>🔍 Debug Info:</p>
                  <p>Company ID: {uid}</p>
                  <p>Total Invoices Loaded: {invoices.length}</p>
                  <p>Loading: {loadingInvoices ? 'Ja' : 'Nein'}</p>
                  <p>Show Reconciled: {showReconciled ? 'Ja' : 'Nein'}</p>
                  <p>Search Term: &quot;{searchTerm}&quot;</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Transactions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-green-500" />
              Transaktionen (Eingänge)
              {loadingTransactions && (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin text-[#14ad9f]" />
              )}
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {filteredTransactions.map(transaction => (
                <li
                  key={transaction.id}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer border-l-4 ${
                    selectedTransaction === transaction.id
                      ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                      : 'border-transparent'
                  }`}
                  onClick={() =>
                    setSelectedTransaction(
                      selectedTransaction === transaction.id ? null : transaction.id
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.purpose}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {transaction.counterpartName || 'Unbekannter Absender'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(transaction.bookingDate)}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-green-600">
                        +{formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      {transaction.category && (
                        <p className="text-xs text-gray-500">{transaction.category}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {filteredTransactions.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              Keine Eingangstransaktionen gefunden
            </div>
          )}
        </div>
      </div>

      {/* Selection Info */}
      {(selectedInvoice || selectedTransaction) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">Ausgewählt für Abgleich</h3>
              <div className="mt-2 text-sm text-blue-700">
                {selectedInvoice && (
                  <p>
                    <strong>Rechnung:</strong>{' '}
                    {invoices.find(inv => inv.id === selectedInvoice)?.invoiceNumber}
                    {' - '}
                    {formatCurrency(invoices.find(inv => inv.id === selectedInvoice)?.total || 0)}
                  </p>
                )}
                {selectedTransaction && (
                  <p>
                    <strong>Transaktion:</strong>{' '}
                    {transactions.find(txn => txn.id === selectedTransaction)?.purpose}
                    {' - '}
                    {formatCurrency(
                      transactions.find(txn => txn.id === selectedTransaction)?.amount || 0
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {invoices.length === 0 && transactions.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center">
            <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Daten verfügbar</h3>
            <p className="text-gray-600 mb-6">
              Verbinden Sie zuerst ein Bankkonto und erstellen Sie Rechnungen.
            </p>
            <button
              onClick={() => Promise.all([loadInvoices(), loadTransactions()])}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
            >
              Daten neu laden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
