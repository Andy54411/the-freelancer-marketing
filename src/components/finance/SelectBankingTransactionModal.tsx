'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFinAPICredentialType } from '@/lib/finapi-config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowDownRight, ArrowUpRight, Loader2, AlertTriangle } from 'lucide-react';
import { TransactionLinkService, TransactionLink } from '@/services/transaction-link.service';
import BookingAccountSelectionModal from './BookingAccountSelectionModal';
import { BookingAccount } from '@/services/bookingAccountService';
import { ModalTransaction } from '@/types/banking';

// EXACT same interface as Banking Accounts Page - ERWEITERT
interface FinAPITransaction {
  id: string;
  accountId: number;
  parentId?: number;
  amount: number;
  currency: string;
  purpose: string;
  counterpartName?: string;
  counterpartIban?: string;
  counterpartBic?: string;
  counterpartBlz?: string;
  counterpartBankName?: string;
  counterpartAccountNumber?: string;
  bookingDate: string;
  valueDate: string;
  type: string;
  typeId: number;
  typeCodeZka?: string;
  typeCodeSwift?: string;
  sepaPurposeCode?: string;
  primanota?: string;
  category?: any;
  isPotentialDuplicate: boolean;
  isNew: boolean;
  isAdjustingEntry?: boolean;
  labels?: any[];
  mcCode?: string;
  importDate?: string;
}

// UI Transaction interface - EXACT same as Banking Accounts Page - ERWEITERT
// Transaction ist ein Alias für ModalTransaction (keine leere Interface-Declaration)
type Transaction = ModalTransaction;

interface SelectBankingTransactionModalProps {
  isOpen: boolean;
  companyId: string;
  invoiceAmount: number;
  documentType: 'INVOICE' | 'EXPENSE';
  documentNumber?: string;
  transactionType?: 'CREDIT' | 'DEBIT' | 'ALL';
  onClose: () => void;
  onSelect: (transaction: Transaction, bookingAccount?: BookingAccount) => void;
}

export default function SelectBankingTransactionModal({
  isOpen,
  companyId,
  invoiceAmount,
  documentType,
  documentNumber,
  transactionType = 'CREDIT',
  onClose,
  onSelect,
}: SelectBankingTransactionModalProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [transactionLinks, setTransactionLinks] = useState<TransactionLink[]>([]);

  // Booking Account Selection Modal State
  const [bookingAccountModal, setBookingAccountModal] = useState<{
    isOpen: boolean;
    transaction: ModalTransaction | null;
  }>({
    isOpen: false,
    transaction: null,
  });

  // Warning Modal State
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    transaction: Transaction | null;
    difference: number;
    tolerance: number;
  }>({
    isOpen: false,
    transaction: null,
    difference: 0,
    tolerance: 0,
  });

  // Get environment-specific credential type
  const credentialType = getFinAPICredentialType();

  // Convert FinAPI transaction to UI transaction format - EXACT COPY from Banking Accounts Page
  const convertFinAPITransaction = (
    finapiTx: FinAPITransaction,
    accountName: string
  ): Transaction => {
    // Konvertiere FinAPI-Datum zu korrektem Format
    const convertFinAPIDate = (dateString: string): string => {
      if (!dateString) return new Date().toISOString().split('T')[0];

      try {
        // FinAPI liefert Daten meist im Format YYYY-MM-DD oder als ISO String
        let date: Date;

        if (dateString.includes('T')) {
          // ISO String Format
          date = new Date(dateString);
        } else if (dateString.includes('-')) {
          // YYYY-MM-DD Format
          date = new Date(dateString);
        } else {
          // Fallback: Versuche direkten Parse
          date = new Date(dateString);
        }

        // Validiere das Datum
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date from FinAPI: ${dateString}, using current date`);
          return new Date().toISOString().split('T')[0];
        }

        // Konvertiere zu YYYY-MM-DD Format für HTML date inputs
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error(`Error parsing FinAPI date: ${dateString}`, error);
        return new Date().toISOString().split('T')[0];
      }
    };

    // Intelligente Status-Bestimmung
    const getTransactionStatus = (tx: FinAPITransaction): Transaction['status'] => {
      if (tx.isPotentialDuplicate) return 'duplicate';
      if (tx.isAdjustingEntry) return 'adjustment';
      if (tx.isNew) return 'pending';
      return 'processed';
    };

    // Transaktionsart aus Codes bestimmen
    const getTransactionType = (tx: FinAPITransaction): string => {
      if (tx.typeCodeZka) return `ZKA: ${tx.typeCodeZka}`;
      if (tx.typeCodeSwift) return `SWIFT: ${tx.typeCodeSwift}`;
      if (tx.sepaPurposeCode) return `SEPA: ${tx.sepaPurposeCode}`;
      return 'Standard';
    };

    return {
      id: finapiTx.id ? String(finapiTx.id) : `tx-${Date.now()}-${Math.random()}`,
      status: getTransactionStatus(finapiTx),
      name: finapiTx.counterpartName || 'Unbekannt',
      verwendungszweck: finapiTx.purpose || 'Keine Beschreibung',
      buchungstag: convertFinAPIDate(finapiTx.bookingDate),
      betrag: finapiTx.amount,
      offen: true, // Wird später basierend auf TransactionLinks aktualisiert
      verknuepfungen: [], // Would be populated from your internal system
      accountId: finapiTx.accountId.toString(),
      accountName: accountName,
      category: finapiTx.category?.name,

      // ERWEITERTE DATEN
      empfaengerBank: finapiTx.counterpartBankName,
      empfaengerBic: finapiTx.counterpartBic,
      empfaengerIban: finapiTx.counterpartIban,
      transaktionsart: getTransactionType(finapiTx),
      sepaPurpose: finapiTx.sepaPurposeCode,
      merchantCategory: finapiTx.mcCode,
      primanota: finapiTx.primanota,
      labels: finapiTx.labels?.map(label => label.name) || [],
      isDuplicate: finapiTx.isPotentialDuplicate,
      isAdjustment: finapiTx.isAdjustingEntry,
      importDate: finapiTx.importDate,
    };
  };

  const loadTransactions = async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      console.log(
        'Modal: Loading transactions for user:',
        user.uid,
        'credentialType:',
        credentialType
      );

      // STEP 1: Load accounts first - EXAKT wie Banking Seite
      const accountsResponse = await fetch(
        `/api/finapi/accounts-enhanced?userId=${user.uid}&credentialType=${credentialType}&forceRefresh=false`
      );

      let accounts: any[] = [];
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        console.log('Modal: Accounts response:', accountsData);
        if (accountsData.success && accountsData.accounts) {
          accounts = accountsData.accounts;
        }
      }

      // STEP 2: Load transactions - EXAKTE Parameter wie Banking Seite
      const params = new URLSearchParams({
        userId: user.uid,
        credentialType,
        page: '1',
        perPage: '500',
      });

      const transactionUrl = `/api/finapi/transactions?${params}`;
      console.log('Modal: Fetching transactions from:', transactionUrl);

      const response = await fetch(transactionUrl);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Modal: Transaction API error:', errorData);
        throw new Error(`FinAPI Transactions Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('Modal: Transaction API response:', data);

      if (data.success && data.data?.transactions) {
        const rawTransactions = data.data.transactions;
        console.log('Modal: Raw transactions count:', rawTransactions.length);
        console.log('Modal: Sample raw transaction:', rawTransactions[0]);

        // EXAKTE Konvertierungslogik wie Banking Seite
        const convertedTransactions: Transaction[] = rawTransactions.map(
          (finapiTx: FinAPITransaction) => {
            // Account matching - EXAKT wie Banking Seite
            let account = accounts.find(acc => acc.id === finapiTx.accountId.toString());

            if (!account) {
              account = accounts.find(
                acc =>
                  acc.accountNumber === finapiTx.accountId.toString() ||
                  (acc.id &&
                    typeof acc.id === 'string' &&
                    acc.id.includes(finapiTx.accountId.toString())) ||
                  (acc.id &&
                    typeof acc.id === 'string' &&
                    finapiTx.accountId.toString().includes(acc.id))
              );
            }

            const accountName = account?.accountName || account?.bankName || 'Unbekanntes Konto';
            const accountId = account?.id || finapiTx.accountId.toString();

            const convertedTx = convertFinAPITransaction(finapiTx, accountName);
            return {
              ...convertedTx,
              accountId: accountId,
            };
          }
        );

        console.log('Modal: Converted transactions count:', convertedTransactions.length);
        console.log('Modal: Sample converted transaction:', convertedTransactions[0]);

        // Sort by booking date (newest first) - SAME as Banking Accounts Page
        const sortedTransactions = convertedTransactions.sort((a, b) => {
          const dateA = new Date(a.buchungstag).getTime();
          const dateB = new Date(b.buchungstag).getTime();
          return dateB - dateA; // Newest first
        });

        // STRIKTE FILTERUNG basierend auf Document Type - KEINE GEMISCHTEN VERKNÜPFUNGEN
        let filteredTransactions = sortedTransactions;

        if (documentType === 'INVOICE') {
          // NUR positive Transaktionen (Eingänge) für Einnahmen-Rechnungen
          filteredTransactions = sortedTransactions.filter((t: Transaction) => t.betrag > 0);
        } else if (documentType === 'EXPENSE') {
          // NUR negative Transaktionen (Ausgänge) für Ausgaben-Belege
          filteredTransactions = sortedTransactions.filter((t: Transaction) => t.betrag < 0);
        } else {
          // Fallback: verwende transactionType wenn documentType unbekannt
          if (transactionType !== 'ALL') {
            filteredTransactions = sortedTransactions.filter((t: Transaction) => {
              if (transactionType === 'CREDIT') {
                return t.betrag > 0;
              } else if (transactionType === 'DEBIT') {
                return t.betrag < 0;
              }
              return true;
            });
          }
        }

        console.log('Modal: Final filtered transactions count:', filteredTransactions.length);
        console.log('Modal: First 3 final transactions:', filteredTransactions.slice(0, 3));
        setTransactions(filteredTransactions);

        // Update transaction status nach dem Laden der Links
        setTimeout(() => {
          updateTransactionStatus(filteredTransactions);
        }, 100);
      } else {
        console.log('Modal: No transactions in response or unsuccessful');
        setTransactions([]);
        if (data.message && !data.message.includes('please connect a bank first')) {
          setError(data.message);
        }
      }
    } catch (err: any) {
      console.error('Modal: Error loading transactions:', err);
      setError(err.message || 'Fehler beim Laden der Transaktionen');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load transaction links - EXACT same as Banking Accounts Page
  const loadTransactionLinks = async () => {
    if (!user?.uid) return;

    try {
      console.log('Modal: Loading transaction links...');
      const result = await TransactionLinkService.getLinks(companyId);
      if (result.success && result.links) {
        console.log('Modal: Transaction links loaded:', result.links.length);
        setTransactionLinks(result.links);

        // Update transaction status after loading links
        updateTransactionStatus(transactions);
      } else {
        console.log('Modal: No transaction links or error:', result.error);
        setTransactionLinks([]);
      }
    } catch (error) {
      console.error('Modal: Error loading transaction links:', error);
      setTransactionLinks([]);
    }
  };

  // Update transaction status based on links
  const updateTransactionStatus = (transactionList: Transaction[]) => {
    if (!transactionLinks.length) return;

    const updatedTransactions = transactionList.map(transaction => {
      const isLinked = transactionLinks.some(link => link.transactionId === transaction.id);
      return {
        ...transaction,
        offen: !isLinked, // offen = true wenn NICHT verknüpft
        status: isLinked ? ('linked' as const) : ('processed' as const),
      };
    });

    console.log('Modal: Updated transaction status based on links');
    setTransactions(updatedTransactions);
  };

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
      // Load transaction links nach dem Laden der Transaktionen
      setTimeout(() => {
        loadTransactionLinks();
      }, 500);
    }
  }, [isOpen, user?.uid]);

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

    let date: Date;

    // Handle different date formats from finAPI
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

  // Filter nur verfügbare (unverknüpfte) Transaktionen - verwende das 'offen' Feld
  const availableTransactions = transactions.filter(transaction => {
    // Zeige nur offene (unverknüpfte) Transaktionen
    return transaction.offen === true;
  });

  // Debug Log
  console.log('Modal: Total transactions:', transactions.length);
  console.log('Modal: Transaction links:', transactionLinks.length);
  console.log('Modal: Available (open) transactions:', availableTransactions.length);

  const filteredTransactions = availableTransactions.filter(transaction => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.verwendungszweck?.toLowerCase().includes(searchLower) ||
      transaction.name?.toLowerCase().includes(searchLower) ||
      transaction.betrag.toString().includes(searchLower)
    );
  });

  const handleSelectTransaction = (transaction: Transaction) => {
    // Strikte Document-Type Validierung - BLOCKIERE falsche Zuordnungen
    const isPositiveTransaction = transaction.betrag > 0;

    if (documentType === 'INVOICE' && !isPositiveTransaction) {
      setWarningModal({
        isOpen: true,
        transaction,
        difference: 0,
        tolerance: 0,
      });
      return; // STOPPE die Verknüpfung
    }

    if (documentType === 'EXPENSE' && isPositiveTransaction) {
      setWarningModal({
        isOpen: true,
        transaction,
        difference: 0,
        tolerance: 0,
      });
      return; // STOPPE die Verknüpfung
    }

    // Validiere Betragsübereinstimmung - BLOCKIERE bei großer Differenz
    const transactionAmount = Math.abs(transaction.betrag);
    const rechnungsBetrag = Math.abs(invoiceAmount);
    const difference = Math.abs(transactionAmount - rechnungsBetrag);
    const tolerance = Math.max(rechnungsBetrag * 0.05, 1); // 5% Toleranz oder mindestens 1€

    if (difference > tolerance) {
      // Zeige Warning Modal
      setWarningModal({
        isOpen: true,
        transaction,
        difference,
        tolerance,
      });
      return; // STOPPE die Verknüpfung
    }

    // NEUE LOGIK: Öffne Buchungskonten-Modal anstatt direkte Verknüpfung
    setBookingAccountModal({
      isOpen: true,
      transaction,
    });
  };

  // Handle booking account selection
  const handleBookingAccountSelection = (
    transaction: ModalTransaction,
    bookingAccount: BookingAccount
  ) => {
    setBookingAccountModal({ isOpen: false, transaction: null });

    // Erweiterte Callback mit bookingAccount - Konvertiere ModalTransaction zu Transaction
    const fullTransaction = transaction as Transaction;
    onSelect(fullTransaction, bookingAccount);
  };

  const handleCloseWarningModal = () => {
    setWarningModal({
      isOpen: false,
      transaction: null,
      difference: 0,
      tolerance: 0,
    });
  };

  const isAmountMatch = (transactionAmount: number, invoiceAmount: number) => {
    // Check if amounts match within a small tolerance (for rounding differences)
    const tolerance = 0.01;
    return Math.abs(Math.abs(transactionAmount) - invoiceAmount) <= tolerance;
  };

  const hasLargeDifference = (transactionAmount: number, invoiceAmount: number) => {
    const difference = Math.abs(Math.abs(transactionAmount) - invoiceAmount);
    const tolerance = Math.max(invoiceAmount * 0.05, 1); // 5% Toleranz oder mindestens 1€
    return difference > tolerance;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {documentType === 'INVOICE'
              ? 'Eingang für Rechnung auswählen'
              : documentType === 'EXPENSE'
                ? 'Ausgang für Beleg auswählen'
                : 'Banking-Transaktion auswählen'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nach Verwendungszweck, Name oder Betrag suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="outline">
              {documentType === 'INVOICE' ? 'Rechnungsbetrag' : 'Belegbetrag'}:{' '}
              {formatCurrency(invoiceAmount)}
            </Badge>
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              {availableTransactions.length} verfügbare{' '}
              {documentType === 'INVOICE' ? 'Eingänge' : 'Ausgänge'}
            </Badge>
            {documentNumber && <Badge variant="secondary">{documentNumber}</Badge>}
            <Badge
              variant={documentType === 'INVOICE' ? 'default' : 'destructive'}
              className={
                documentType === 'INVOICE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }
            >
              {documentType === 'INVOICE' ? '💰 Einnahmen-Rechnung' : '💸 Ausgaben-Beleg'}
            </Badge>
          </div>

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <div className="border rounded-lg bg-white" style={{ height: '500px' }}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Lade Transaktionen...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                {error ? 'Fehler beim Laden der Transaktionen' : 'Keine Transaktionen gefunden'}
              </div>
            ) : (
              <div style={{ height: '500px', overflow: 'auto' }}>
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Typ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Datum
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Verwendungszweck
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Betrag
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Aktion
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map(transaction => (
                      <tr
                        key={transaction.id}
                        className={`cursor-pointer hover:bg-gray-50 border-b ${
                          isAmountMatch(transaction.betrag, invoiceAmount)
                            ? 'bg-green-50 border-l-4 border-l-green-500'
                            : hasLargeDifference(transaction.betrag, invoiceAmount)
                              ? 'bg-yellow-50 border-l-4 border-l-yellow-500'
                              : ''
                        }`}
                        onClick={() => handleSelectTransaction(transaction)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            {transaction.betrag > 0 ? (
                              <ArrowDownRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(transaction.buchungstag)}</td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-sm">
                              {transaction.name || 'Unbekannt'}
                            </div>
                            <div className="text-xs text-gray-500">{transaction.accountName}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="max-w-xs truncate text-sm"
                            title={transaction.verwendungszweck}
                          >
                            {transaction.verwendungszweck || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div
                            className={`font-medium text-sm ${
                              transaction.betrag > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(transaction.betrag, 'EUR')}
                          </div>
                          {isAmountMatch(transaction.betrag, invoiceAmount) && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Betrag stimmt überein
                              </span>
                            </div>
                          )}
                          {hasLargeDifference(transaction.betrag, invoiceAmount) && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                ⚠️ Große Differenz:{' '}
                                {formatCurrency(
                                  Math.abs(Math.abs(transaction.betrag) - invoiceAmount)
                                )}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                            onClick={e => {
                              e.stopPropagation();
                              handleSelectTransaction(transaction);
                            }}
                          >
                            Auswählen
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Warning Modal für Betragsdifferenzen */}
      <Dialog open={warningModal.isOpen} onOpenChange={handleCloseWarningModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-red-900">
                  {warningModal.difference === 0
                    ? 'Falsche Transaktionsrichtung!'
                    : 'Verknüpfung nicht möglich'}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {warningModal.difference === 0 ? (
              // Document Type Mismatch Warning
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-900 mb-2">
                  {documentType === 'INVOICE'
                    ? 'Einnahmen-Rechnungen können nur mit Eingängen verknüpft werden!'
                    : 'Ausgaben-Belege können nur mit Ausgängen verknüpft werden!'}
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dokument-Typ:</span>
                    <span className="font-medium">
                      {documentType === 'INVOICE' ? '💰 Einnahmen-Rechnung' : '💸 Ausgaben-Beleg'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaktionsrichtung:</span>
                    <span className="font-medium">
                      {warningModal.transaction?.betrag && warningModal.transaction.betrag > 0
                        ? '💰 Eingang'
                        : '💸 Ausgang'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaktionsbetrag:</span>
                    <span className="font-medium">
                      {warningModal.transaction
                        ? formatCurrency(warningModal.transaction.betrag)
                        : ''}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Amount Difference Warning (existing)
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-900 mb-2">
                  Die Beträge weichen zu stark voneinander ab:
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {documentType === 'INVOICE' ? 'Rechnungsbetrag' : 'Belegbetrag'}:
                    </span>
                    <span className="font-medium">{formatCurrency(invoiceAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaktionsbetrag:</span>
                    <span className="font-medium">
                      {warningModal.transaction
                        ? formatCurrency(warningModal.transaction.betrag)
                        : ''}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Differenz:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(warningModal.difference)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Maximal erlaubt:</span>
                      <span className="font-medium text-gray-500">
                        {formatCurrency(warningModal.tolerance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                {warningModal.difference === 0 ? (
                  <>
                    <strong>Wählen Sie eine Transaktion in der richtigen Richtung:</strong>
                    <br />
                    {documentType === 'INVOICE'
                      ? '• Einnahmen-Rechnungen (RE-) → nur Eingänge (positive Beträge)'
                      : '• Ausgaben-Belege (BE-) → nur Ausgänge (negative Beträge)'}
                  </>
                ) : (
                  <>
                    <strong>Bitte wählen Sie eine Transaktion mit passendem Betrag.</strong>
                    <br />
                    Nur Transaktionen mit einer Differenz von maximal 5% oder 1€ können verknüpft
                    werden.
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleCloseWarningModal}
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
              >
                Verstanden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Account Selection Modal */}
      <BookingAccountSelectionModal
        isOpen={bookingAccountModal.isOpen}
        companyId={companyId}
        transaction={bookingAccountModal.transaction}
        documentType={documentType}
        documentNumber={documentNumber}
        onClose={() => setBookingAccountModal({ isOpen: false, transaction: null })}
        onSelect={handleBookingAccountSelection}
      />
    </Dialog>
  );
}
