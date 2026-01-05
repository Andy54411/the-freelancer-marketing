'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getFinAPICredentialType } from '@/lib/finapi-config';
import LinkTransactionModal from '@/components/finance/LinkTransactionModal';
import ConnectedDocumentsModal from '@/components/finance/ConnectedDocumentsModal';
import { TransactionLinkService, TransactionLink } from '@/services/transaction-link.service';
import { InvoiceStatusService } from '@/services/invoice-status.service';
import { Filter, Download, Search, ChevronDown, Link, FileText } from 'lucide-react';

// UI Transaction interface
interface Transaction {
  id: string;
  status: 'processed' | 'pending' | 'failed' | 'duplicate' | 'adjustment' | 'linked';
  name: string;
  verwendungszweck: string;
  buchungstag: string;
  betrag: number;
  offen: boolean;
  verknuepfungen: string[];
  linkedInvoices?: Array<{
    documentId: string;
    documentNumber: string;
    customerName: string;
  }>;
  accountId: string;
  accountName: string;
  category?: string;
  bookingStatus?: 'open' | 'booked';
}

export default function IncompleteTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const uid = params?.uid as string;

  const credentialType = getFinAPICredentialType();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [_isLoading, setIsLoading] = useState(false);
  const [linksLoaded, setLinksLoaded] = useState(false);

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIsOpen, setFilterIsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'buchungstag' | 'betrag' | 'name'>('buchungstag');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'incomplete' | 'linked' | 'all'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Modals
  const [linkTransactionModal, setLinkTransactionModal] = useState<{
    visible: boolean;
    transaction: Transaction | null;
  }>({
    visible: false,
    transaction: null,
  });

  const [connectedDocumentsModal, setConnectedDocumentsModal] = useState<{
    visible: boolean;
    transactionId: string;
    connectedDocuments: Array<{ 
      id: string; 
      documentId: string;
      documentNumber: string;
      customerName: string;
      type: 'Invoice' | 'Expense'; 
      href: string; 
      amount: number;
      date: string;
      selected: boolean;
      unlinkable: boolean;
    }>;
  }>({
    visible: false,
    transactionId: '',
    connectedDocuments: [],
  });

  // Transaction Links State
  const [transactionLinks, setTransactionLinks] = useState<TransactionLink[]>([]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!uid || !firebaseUser) {
        console.log('❌ No UID or firebaseUser provided');
        return;
      }

      console.log('🔄 Loading incomplete transactions for UID:', uid);

      // Get Firebase ID Token for authentication
      const idToken = await firebaseUser.getIdToken();
      
      const response = await fetch(
        `/api/finapi/transactions?userId=${uid}&credentialType=${credentialType}&page=1&perPage=500`,
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        }
      );

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        console.error('❌ API request failed:', response.status, response.statusText);
        throw new Error('Failed to load transactions');
      }

      const data = await response.json();
      console.log('📦 API Data:', data);

      if (data.success && data.data && data.data.transactions) {
        console.log('✅ Found transactions:', data.data.transactions.length);

        // Filter NUR unvollständige Transaktionen (keine Verknüpfungen)
        const allTransactions = data.data.transactions.map((t: { id: string | number; counterpartName?: string; purpose?: string; bankBookingDate?: string; amount: number; accountId?: string | number }) => ({
          id: t.id.toString(),
          status: 'pending' as const,
          name: t.counterpartName || 'Unbekannt',
          verwendungszweck: t.purpose || '',
          buchungstag: t.bankBookingDate || new Date().toISOString().split('T')[0],
          betrag: t.amount,
          offen: true,
          verknuepfungen: [],
          accountId: t.accountId?.toString() || 'unknown',
          accountName: 'Bank Account',
          bookingStatus: 'open' as const,
        }));

        console.log('🔍 All transactions before filtering:', allTransactions.length);
        setTransactions(allTransactions);
      } else {
        console.log('⚠️ No transactions in response');
        setTransactions([]);
      }
    } catch (error) {
      console.error('💥 Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [uid, credentialType, firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      loadTransactions();
    }
  }, [loadTransactions, firebaseUser]);

  // Load transaction links
  const loadTransactionLinks = useCallback(async () => {
    try {
      if (!uid) return;

      console.log('🔄 Loading transaction links for UID:', uid);

      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const transactionLinksRef = collection(db, 'companies', uid, 'transaction_links');
      const snapshot = await getDocs(transactionLinksRef);

      const links = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TransactionLink[];

      setTransactionLinks(links);

      console.log('📊 Transaction Links gefunden:', links.length);
      console.log('📊 Sample Links:', links.slice(0, 3));

      // Update transactions with links
      setTransactions(prevTransactions => {
        console.log('🔄 Updating transactions, count:', prevTransactions.length);

        const updated = prevTransactions.map(tx => {
          // Konvertiere beide IDs zu Strings für Vergleich
          const txLinks = links.filter((link: TransactionLink) => {
            const linkTxId = String(link.transactionId);
            const txId = String(tx.id);
            return linkTxId === txId;
          });

          if (txLinks.length > 0) {
            console.log(`✅ Transaction ${tx.id}: ${txLinks.length} links gefunden`, txLinks);
          }

          const linkedDocuments = txLinks.map((link: TransactionLink) => link.documentId);
          const linkedInvoices = txLinks.map((link: TransactionLink) => ({
            documentId: link.documentId,
            documentNumber: String(link.documentNumber || 'Unbekannt'),
            customerName: String(link.customerName || 'Unbekannt'),
          }));

          return {
            ...tx,
            verknuepfungen: linkedDocuments,
            linkedInvoices: linkedInvoices,
            bookingStatus: linkedDocuments.length > 0 ? ('booked' as const) : ('open' as const),
          };
        });

        console.log(
          '✅ Updated transactions with links:',
          updated.filter(t => t.verknuepfungen.length > 0).length
        );
        return updated;
      });

      setLinksLoaded(true);
    } catch (error) {
      console.error('❌ Error loading transaction links:', error);
      setLinksLoaded(true); // Set to true anyway to prevent infinite loading
    }
  }, [uid]);

  useEffect(() => {
    if (transactions.length > 0 && !linksLoaded) {
      loadTransactionLinks();
    }
  }, [transactions.length, linksLoaded, loadTransactionLinks]);

  // Handle transaction linking
  const handleLinkTransaction = async (
    transactionId: string,
    documentId: string,
    documentData?: Record<string, unknown>
  ) => {
    try {
      if (!firebaseUser?.uid || !uid) return;

      const transaction = transactions.find(tx => tx.id === transactionId);
      if (!transaction) return;

      const finalDocumentData = documentData || {
        id: documentId,
        documentNumber: `DOC-${documentId}`,
        customerName: transaction.name,
        total: Math.abs(transaction.betrag),
        date: new Date().toISOString(),
        isStorno: false,
      };

      const result = await TransactionLinkService.createLink(
        uid,
        transactionId,
        documentId,
        {
          id: transaction.id,
          name: transaction.name,
          verwendungszweck: transaction.verwendungszweck,
          buchungstag: transaction.buchungstag,
          betrag: transaction.betrag,
          accountId: transaction.accountId,
        },
        finalDocumentData,
        firebaseUser.uid
      );

      if (result.success) {
        try {
          const paidAmount = Math.abs(transaction.betrag);
          await InvoiceStatusService.markAsPaid(
            uid,
            documentId,
            paidAmount,
            transactionId,
            'Banküberweisung'
          );
        } catch (error) {
          console.error('❌ Error updating invoice status:', error);
        }

        // Update transaction to show linked status
        setTransactions(prevTransactions =>
          prevTransactions.map(tx =>
            tx.id === transactionId
              ? {
                  ...tx,
                  verknuepfungen: [...tx.verknuepfungen, documentId],
                  linkedInvoices: [
                    ...(tx.linkedInvoices || []),
                    {
                      documentId: documentId,
                      documentNumber: String(finalDocumentData.documentNumber || ''),
                      customerName: String(finalDocumentData.customerName || ''),
                    },
                  ],
                  bookingStatus: 'booked' as const,
                }
              : tx
          )
        );
      }
    } catch (error) {
      console.error('❌ Error linking transaction:', error);
    }
  };

  // Handle opening connected documents modal
  const handleOpenConnectedDocumentsModal = (transaction: Transaction) => {
    if (!transaction.linkedInvoices || transaction.linkedInvoices.length === 0) return;

    const connectedDocuments = transaction.linkedInvoices.map((invoice, index) => {
      const isExpense = invoice.documentNumber?.startsWith('BE-');
      const isInvoice = invoice.documentNumber?.startsWith('RE-');

      let href: string;
      let type: 'Invoice' | 'Expense' | 'Receipt';

      if (isExpense) {
        href = `/dashboard/company/${uid}/finance/expenses/${invoice.documentId}`;
        type = 'Expense';
      } else if (isInvoice) {
        href = `/dashboard/company/${uid}/finance/invoices/${invoice.documentId}`;
        type = 'Invoice';
      } else {
        href = `/dashboard/company/${uid}/finance/invoices/${invoice.documentId}`;
        type = 'Invoice';
      }

      const relevantLink = transactionLinks.find(
        (link: TransactionLink) =>
          link.transactionId === transaction.id && link.documentId === invoice.documentId
      );

      const documentAmount = relevantLink?.documentAmount || 0;

      return {
        id: `${transaction.id}-${index}`,
        documentId: invoice.documentId,
        documentNumber: invoice.documentNumber,
        customerName: invoice.customerName,
        amount: documentAmount,
        date: transaction.buchungstag,
        type: type,
        selected: false,
        unlinkable: true,
        href: href,
      };
    });

    setConnectedDocumentsModal({
      visible: true,
      transactionId: transaction.id,
      connectedDocuments: connectedDocuments,
    });
  };

  // Handle unlinking
  const handleUnlinkDocument = async (transactionId: string, documentId: string) => {
    try {
      if (!firebaseUser?.uid || !uid) return;

      const confirmed = window.confirm('Sind Sie sicher, dass Sie die Verknüpfung lösen möchten?');
      if (!confirmed) return;

      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const linkToDelete = transactionLinks.find(
        (link: TransactionLink) => link.transactionId === transactionId && link.documentId === documentId
      );

      if (linkToDelete && linkToDelete.id) {
        const linkDocRef = doc(db, 'companies', uid, 'transaction_links', linkToDelete.id);
        await deleteDoc(linkDocRef);
      }

      setTransactions(prevTransactions =>
        prevTransactions.map(tx =>
          tx.id === transactionId
            ? {
                ...tx,
                verknuepfungen: tx.verknuepfungen.filter(id => id !== documentId),
                linkedInvoices:
                  tx.linkedInvoices?.filter(inv => inv.documentId !== documentId) || [],
                bookingStatus:
                  tx.verknuepfungen.filter(id => id !== documentId).length > 0
                    ? ('booked' as const)
                    : ('open' as const),
              }
            : tx
        )
      );

      setTransactionLinks(prev =>
        prev.filter(
          (link: TransactionLink) => !(link.transactionId === transactionId && link.documentId === documentId)
        )
      );
    } catch (error) {
      console.error('❌ Error unlinking:', error);
    }
  };

  // Handle batch unlinking
  const handleBatchUnlinkDocuments = async (documentIds: string[]) => {
    try {
      const { transactionId } = connectedDocumentsModal;

      for (const documentId of documentIds) {
        await handleUnlinkDocument(transactionId, documentId);
      }

      setConnectedDocumentsModal({
        visible: false,
        transactionId: '',
        connectedDocuments: [],
      });
    } catch (error) {
      console.error('❌ Error batch unlinking:', error);
      throw error;
    }
  };

  // Handle receipt creation
  const handleCreateReceipt = (transaction: Transaction) => {
    const params = new URLSearchParams({
      beschreibung: transaction.verwendungszweck,
      betrag: Math.abs(transaction.betrag).toFixed(2).replace('.', ','),
      belegdatum: transaction.buchungstag,
      kunde: transaction.name,
      transactionId: transaction.id,
    });

    router.push(`/dashboard/company/${uid}/banking/receipt?${params.toString()}`);
  };

  // Filter and sort
  const getFilteredTransactions = () => {
    console.log('🔍 getFilteredTransactions called, total:', transactions.length);
    console.log(
      '🔍 Transactions with links:',
      transactions.filter(t => t.verknuepfungen.length > 0).length
    );

    let filtered = transactions;

    // Filter by view mode
    if (viewMode === 'incomplete') {
      filtered = filtered.filter(t => t.verknuepfungen.length === 0);
    } else if (viewMode === 'linked') {
      filtered = filtered.filter(t => t.verknuepfungen.length > 0);
    }
    // 'all' mode shows everything

    console.log('🔍 After viewMode filter:', filtered.length, 'viewMode:', viewMode);

    if (searchTerm) {
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.verwendungszweck.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFromFilter) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.buchungstag);
        const fromDate = new Date(dateFromFilter);
        return transactionDate >= fromDate;
      });
    }

    if (dateToFilter) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.buchungstag);
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        return transactionDate <= toDate;
      });
    }

    filtered.sort((a, b) => {
      // Zuerst nach Verknüpfungen sortieren (verknüpfte zuerst)
      const aHasLinks = a.verknuepfungen.length > 0 ? 1 : 0;
      const bHasLinks = b.verknuepfungen.length > 0 ? 1 : 0;

      if (aHasLinks !== bHasLinks) {
        return bHasLinks - aHasLinks; // Verknüpfte zuerst
      }

      // Dann nach gewähltem Kriterium sortieren
      let aVal: Date | number | string;
      let bVal: Date | number | string;

      switch (sortBy) {
        case 'buchungstag':
          aVal = new Date(a.buchungstag);
          bVal = new Date(b.buchungstag);
          break;
        case 'betrag':
          aVal = Math.abs(a.betrag);
          bVal = Math.abs(b.betrag);
          break;
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  };

  const handleSort = (column: 'buchungstag' | 'betrag' | 'name') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection(column === 'name' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <div className="flex flex-col ml-1">
          <ChevronDown className="h-3 w-3 text-gray-300 -mb-1" />
          <ChevronDown className="h-3 w-3 text-gray-300 rotate-180" />
        </div>
      );
    }

    return sortDirection === 'desc' ? (
      <ChevronDown className="h-4 w-4 ml-1 text-gray-700" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 text-gray-700 rotate-180" />
    );
  };

  const filteredTransactions = getFilteredTransactions();
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFromFilter, dateToFilter, viewMode]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading || !linksLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transaktionen</h1>
          <p className="text-sm text-gray-500 mt-1">
            Verwalten Sie Ihre Bank-Transaktionen und Verknüpfungen
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('incomplete')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'incomplete'
                ? 'bg-white text-[#14ad9f] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Unverknüpft
          </button>
          <button
            onClick={() => setViewMode('linked')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'linked'
                ? 'bg-white text-[#14ad9f] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Verknüpft
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-white text-[#14ad9f] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Alle
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nach Name oder Verwendungszweck suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f] w-80"
                />
              </div>

              <button
                onClick={() => setFilterIsOpen(!filterIsOpen)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  dateFromFilter || dateToFilter
                    ? 'bg-[#14ad9f] text-white hover:bg-taskilo-hover'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filter
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${filterIsOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {filteredTransactions.length} Transaktionen
              </span>
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {filterIsOpen && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Von</label>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={e => setDateFromFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f] w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bis</label>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={e => setDateToFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f] w-full"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">
                  {filteredTransactions.length} Transaktionen gefiltert
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setDateFromFilter('');
                      setDateToFilter('');
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-[#14ad9f] font-medium"
                  >
                    Zurücksetzen
                  </button>
                  <button
                    onClick={() => setFilterIsOpen(false)}
                    className="px-4 py-1.5 bg-[#14ad9f] text-white text-sm font-medium rounded-md hover:bg-taskilo-hover"
                  >
                    Fertig
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[40%] px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-[#14ad9f]"
                  >
                    Name / Verwendungszweck
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="w-[20%] px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('buchungstag')}
                    className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-[#14ad9f]"
                  >
                    Buchungstag
                    {getSortIcon('buchungstag')}
                  </button>
                </th>
                <th className="w-[20%] px-6 py-3 text-right">
                  <button
                    onClick={() => handleSort('betrag')}
                    className="flex items-center justify-end text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-[#14ad9f]"
                  >
                    Betrag
                    {getSortIcon('betrag')}
                  </button>
                </th>
                <th className="w-[20%] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedTransactions.map(transaction => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="w-[40%] px-6 py-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 mb-0.5 truncate">
                        {transaction.name?.toUpperCase() || 'UNBEKANNT'}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {transaction.verwendungszweck || 'Keine Verwendungsangabe'}
                      </div>
                    </div>
                  </td>

                  <td className="w-[20%] px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {(() => {
                        try {
                          if (!transaction.buchungstag) return '---';
                          const date = new Date(transaction.buchungstag);
                          if (isNaN(date.getTime())) return '---';
                          return date.toLocaleDateString('de-DE');
                        } catch {
                          return '---';
                        }
                      })()}
                    </div>
                  </td>

                  <td className="w-[20%] px-6 py-4 text-right">
                    <span
                      className={`text-sm font-bold whitespace-nowrap ${transaction.betrag >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(transaction.betrag)}
                    </span>
                  </td>

                  <td className="w-[20%] px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {transaction.verknuepfungen.length > 0 ? (
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#14ad9f] bg-[#14ad9f]/10 hover:bg-[#14ad9f]/20 rounded transition-colors"
                          onClick={() => handleOpenConnectedDocumentsModal(transaction)}
                          title={`${transaction.verknuepfungen.length} Verknüpfung(en) anzeigen`}
                        >
                          <Link className="h-3 w-3" />
                          {transaction.verknuepfungen.length}
                        </button>
                      ) : (
                        <>
                          <button
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                            title="Beleg erstellen"
                            onClick={() => handleCreateReceipt(transaction)}
                          >
                            <FileText className="h-4 w-4" />
                          </button>

                          <button
                            className="p-2 text-gray-600 hover:text-[#14ad9f] hover:bg-gray-100 rounded transition-colors"
                            onClick={() => {
                              setLinkTransactionModal({
                                visible: true,
                                transaction: transaction,
                              });
                            }}
                            title="Dokument verknüpfen"
                          >
                            <Link className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {viewMode === 'incomplete' && 'Keine unverknüpften Transaktionen gefunden'}
              {viewMode === 'linked' && 'Keine verknüpften Transaktionen gefunden'}
              {viewMode === 'all' && 'Keine Transaktionen gefunden'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Seite {currentPage} von {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Zurück
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {linkTransactionModal.visible && linkTransactionModal.transaction && (
        <LinkTransactionModal
          isOpen={linkTransactionModal.visible}
          companyId={uid}
          transaction={linkTransactionModal.transaction}
          onClose={() => setLinkTransactionModal({ visible: false, transaction: null })}
          onLink={handleLinkTransaction}
        />
      )}

      {connectedDocumentsModal.visible && (
        <ConnectedDocumentsModal
          isOpen={connectedDocumentsModal.visible}
          transactionId={connectedDocumentsModal.transactionId}
          connectedDocuments={connectedDocumentsModal.connectedDocuments}
          onClose={() =>
            setConnectedDocumentsModal({
              visible: false,
              transactionId: '',
              connectedDocuments: [],
            })
          }
          onUnlinkDocuments={handleBatchUnlinkDocuments}
        />
      )}
    </div>
  );
}
