'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BankAccount } from '@/types';
import { getFinAPICredentialType } from '@/lib/finapi-config';
import LinkTransactionModal from '@/components/finance/LinkTransactionModal';
import ConnectedDocumentsModal from '@/components/finance/ConnectedDocumentsModal';
import BankTransferModal from '@/components/finance/BankTransferModal';
import { TransactionLinkService, TransactionLink } from '@/services/transaction-link.service';
import { InvoiceStatusService } from '@/services/invoice-status.service';
import {
  Filter,
  Download,
  Search,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  X,
  Plus,
  Link,
  FileText,
  Archive,
  Euro,
  Calendar,
  Tag,
  Send } from
'lucide-react';

// FinAPI Transaction interface - ERWEITERT
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
  typeCodeZka?: string;
  typeCodeSwift?: string;
  sepaPurposeCode?: string;
  mcCode?: string;
  primanota?: string;
  category?: {
    id: string;
    name: string;
    parentName?: string;
  };
  labels?: Array<{
    id: string;
    name: string;
  }>;
  isPotentialDuplicate: boolean;
  isAdjustingEntry: boolean;
  isNew: boolean;
  importDate: string;
}

// UI Transaction interface for SevDesk-style table - ERWEITERT
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
    // Erweiterte Verknüpfungsdaten
    documentId: string;
    documentNumber: string;
    customerName: string;
  }>;
  accountId: string;
  accountName: string;
  category?: string;
  bookingStatus?: 'open' | 'booked'; // Neuer Buchungsstatus

  // ERWEITERTE DATEN
  empfaengerBank?: string; // Bank des Empfängers
  empfaengerBic?: string; // BIC des Empfängers
  empfaengerIban?: string; // IBAN des Empfängers
  transaktionsart?: string; // ZKA/SWIFT Code
  sepaPurpose?: string; // SEPA Verwendungscode
  merchantCategory?: string; // MCC Code
  primanota?: string; // Primanota-Nummer
  labels?: string[]; // Benutzerdefinierte Labels
  isDuplicate?: boolean; // Potentielles Duplikat
  isAdjustment?: boolean; // Korrektur-Buchung
  importDate?: string; // Import-Zeitstempel
}

// Convert FinAPI transaction to UI transaction format
const convertFinAPITransaction = (
finapiTx: FinAPITransaction,
accountName: string)
: Transaction => {
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
    offen: finapiTx.isNew,
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
    labels: finapiTx.labels?.map((label) => label.name) || [],
    isDuplicate: finapiTx.isPotentialDuplicate,
    isAdjustment: finapiTx.isAdjustingEntry,
    importDate: finapiTx.importDate
  };
};

export default function BankingAccountsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params?.uid as string;

  const credentialType = getFinAPICredentialType();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  // Load transactions from FinAPI
  const loadFinAPITransactions = useCallback(
    async (accountIds?: string[]) => {
      try {
        if (!user?.uid) {
          setTransactions([]);
          return;
        }

        setLoadingTransactions(true);

        // Build query parameters
        const params = new URLSearchParams({
          userId: user.uid,
          credentialType,
          page: '1',
          perPage: '500' // Load more transactions
        });

        if (accountIds && accountIds.length > 0) {
          params.set('accountIds', accountIds.join(','));
        }

        const response = await fetch(`/api/finapi/transactions?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`FinAPI Transactions Error: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data?.transactions) {







          // Convert FinAPI transactions to UI format
          const convertedTransactions = data.data.transactions.map(
            (finapiTx: FinAPITransaction) => {
              // Debug: Log FinAPI transaction with all enhanced data













              // Try to find account by different ID matching strategies
              let account = accounts.find((acc) => acc.id === finapiTx.accountId.toString());

              // If not found, try by account number or other identifiers
              if (!account) {
                account = accounts.find(
                  (acc) =>
                  acc.accountNumber === finapiTx.accountId.toString() ||
                  acc.id &&
                  typeof acc.id === 'string' &&
                  acc.id.includes(finapiTx.accountId.toString()) ||
                  acc.id &&
                  typeof acc.id === 'string' &&
                  finapiTx.accountId.toString().includes(acc.id)
                );
              }

              const accountName = account?.accountName || account?.bankName || 'Unbekanntes Konto';





              // Use the matched account ID if found, otherwise use FinAPI accountId
              const accountId = account?.id || finapiTx.accountId.toString();

              return {
                ...convertFinAPITransaction(finapiTx, accountName),
                accountId: accountId
              };
            }
          );

          // Prüfe auf doppelte IDs
          const seenIds = new Set<string>();
          const duplicateIds = convertedTransactions.filter((tx) => {
            if (seenIds.has(tx.id)) {
              console.warn('⚠️ Doppelte Transaction ID gefunden:', tx.id, tx);
              return true;
            }
            seenIds.add(tx.id);
            return false;
          });

          if (duplicateIds.length > 0) {
            console.error(
              '❌ Doppelte Transaction IDs gefunden:',
              duplicateIds.map((tx) => tx.id)
            );
            // Mache IDs eindeutig
            convertedTransactions.forEach((tx, index) => {
              if (duplicateIds.some((dup) => dup.id === tx.id)) {
                tx.id = `${tx.id}-${index}`;
              }
            });
          }

          setTransactions(convertedTransactions);












          // Nach dem Laden der Transaktionen, lade auch die Links

          setTimeout(() => {
            loadTransactionLinks();
          }, 100);
        } else {

          setTransactions([]);
        }
      } catch (error) {
        console.error('Error loading FinAPI transactions:', error);
        setTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    },
    [user?.uid, credentialType, accounts]
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // UI States
  const [activeAccountTab, setActiveAccountTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIsOpen, setFilterIsOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<
    'buchungstag' | 'betrag' | 'name' | 'status' | 'verwendungszweck'>(
    'buchungstag');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>(
    'ALL'
  );
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  // Link Transaction Modal State
  const [linkTransactionModal, setLinkTransactionModal] = useState<{
    visible: boolean;
    transaction: Transaction | null;
  }>({
    visible: false,
    transaction: null
  });

  // Connected Documents Modal State
  const [connectedDocumentsModal, setConnectedDocumentsModal] = useState<{
    visible: boolean;
    transactionId: string;
    connectedDocuments: any[];
  }>({
    visible: false,
    transactionId: '',
    connectedDocuments: []
  });

  // Bank Transfer Modal State
  const [bankTransferModal, setBankTransferModal] = useState<{
    visible: boolean;
  }>({
    visible: false
  });

  // Transaction Links State
  const [transactionLinks, setTransactionLinks] = useState<TransactionLink[]>([]);

  const loadFinAPIAccounts = useCallback(async () => {
    try {
      if (!user?.uid) {
        setAccounts([]);
        return;
      }

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

        // Load real transactions after accounts are loaded
        // We'll call loadFinAPITransactions in a separate useEffect
      } else {
        console.error('Failed to load accounts:', data.error);
      }
    } catch (error) {
      console.error('Error loading FinAPI accounts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, credentialType, refreshing]);

  useEffect(() => {
    loadFinAPIAccounts();
  }, [loadFinAPIAccounts]);

  // Load transactions when accounts are loaded
  useEffect(() => {
    if (accounts.length > 0) {
      loadFinAPITransactions();
    }
  }, [accounts, loadFinAPITransactions]);

  // Load existing transaction links (Enhanced für automatische Receipt-Links)
  const loadTransactionLinks = useCallback(async () => {
    try {
      if (!uid) {
        console.warn('⚠️ Keine Company UID für Transaction Links');
        return;
      }



      // Lade Transaction Links aus der transaction_links subcollection
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const transactionLinksRef = collection(db, 'companies', uid, 'transaction_links');
      const snapshot = await getDocs(transactionLinksRef);

      const links = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      setTransactionLinks(links);


      // Update transactions mit bestehenden Verknüpfungen
      setTransactions((prevTransactions) => {


        return prevTransactions.map((tx) => {
          const txLinks = links.filter((link) => link.transactionId === tx.id);

          const linkedDocuments = txLinks.map((link) => link.documentId);
          const linkedInvoices = txLinks.map((link) => ({
            documentId: link.documentId,
            documentNumber: link.documentNumber || link.documentData?.number || 'Unbekannt',
            customerName: link.customerName || link.documentData?.customerName || 'Unbekannt'
          }));

          const hasLinks = linkedDocuments.length > 0;

          if (hasLinks) {




          }

          return {
            ...tx,
            verknuepfungen: linkedDocuments,
            linkedInvoices: linkedInvoices,
            bookingStatus: hasLinks ? 'booked' : 'open'
          };
        });
      });
    } catch (error) {
      console.error('❌ Fehler beim Laden der Transaction Links:', error);
      setTransactionLinks([]);
    }
  }, [uid]);

  // Load transaction links when transactions are loaded
  useEffect(() => {
    if (transactions.length > 0) {

      loadTransactionLinks();
    }
  }, [transactions, loadTransactionLinks]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFinAPIAccounts();
    if (accounts.length > 0) {
      loadFinAPITransactions();
    }
  }, [loadFinAPIAccounts, loadFinAPITransactions, accounts]);

  // Handle bank transfer submission
  const handleBankTransfer = async (transferData: any) => {
    try {
      if (!user?.uid || !uid) {
        throw new Error('User ID oder Company ID fehlt');
      }

      console.log('🏦 Initiating bank transfer:', transferData);

      // Build the transfer payload for FinAPI
      const transferPayload = {
        userId: user.uid,
        credentialType,
        accountId: transferData.selectedAccount.id,
        receiverName: transferData.receiverName,
        iban: transferData.iban.replace(/\s/g, ''), // Remove spaces
        bic: transferData.bic,
        purpose: transferData.purpose,
        amount: transferData.amount,
        executionDate: transferData.executionDate || undefined
      };

      // Make API call to execute transfer via FinAPI
      const response = await fetch('/api/finapi/bank-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transferPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der Überweisung');
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Überweisung erfolgreich:', result.data);
        
        // Show success message
        alert('Überweisung wurde erfolgreich eingereicht!');
        
        // Refresh transactions to show the new outgoing transfer
        setTimeout(() => {
          handleRefresh();
        }, 1000);
        
      } else if (result.requiresWebForm) {
        // Handle Web Form requirement
        console.log('🔐 Überweisung erfordert Web Form Authentifizierung:', result);
        
        alert(`Für diese Überweisung ist eine Web Form Authentifizierung erforderlich.\n\n${result.message}\n\nBitte kontaktieren Sie den Support für weitere Informationen.`);
        
        // In a full implementation, you would redirect to the web form here
        // window.open(result.webFormUrl, '_blank');
        
      } else {
        throw new Error(result.error || 'Unbekannter Fehler bei der Überweisung');
      }
    } catch (error) {
      console.error('❌ Fehler bei der Überweisung:', error);
      alert(`Fehler bei der Überweisung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      throw error; // Re-throw to let modal handle it
    }
  };

  // Handle receipt creation - navigate to dedicated page
  const handleCreateReceipt = (transaction: Transaction) => {
    const params = new URLSearchParams({
      beschreibung: transaction.verwendungszweck,
      betrag: Math.abs(transaction.betrag).toFixed(2).replace('.', ','),
      belegdatum: transaction.buchungstag,
      kunde: transaction.name,
      transactionId: transaction.id
    });

    router.push(`/dashboard/company/${uid}/banking/receipt?${params.toString()}`);
  };

  // Update Invoice Status using the service
  const updateInvoiceStatus = async (
  invoiceId: string,
  transactionId: string,
  paidAmount: number) =>
  {
    const result = await InvoiceStatusService.markAsPaid(
      uid,
      invoiceId,
      paidAmount,
      transactionId,
      'Banküberweisung'
    );

    if (!result.success) {
      throw new Error(result.error || 'Fehler beim Aktualisieren des Rechnung Status');
    }
  };

  // Handle opening connected documents modal
  const handleOpenConnectedDocumentsModal = (transaction: Transaction) => {
    if (!transaction.linkedInvoices || transaction.linkedInvoices.length === 0) {
      return;
    }

    // Konvertiere linkedInvoices in das erwartete Format für das Modal
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

      // Finde den echten documentAmount aus transaction_links
      const relevantLink = transactionLinks.find(link => 
        link.transactionId === transaction.id && 
        link.documentId === invoice.documentId
      );
      
      // Verwende den echten documentAmount oder fallback zu 0
      const documentAmount = relevantLink?.documentAmount || 0;

      return {
        id: `${transaction.id}-${index}`,
        documentId: invoice.documentId,
        documentNumber: invoice.documentNumber,
        customerName: invoice.customerName,
        amount: documentAmount, // Verwende den echten Dokument-Betrag
        date: transaction.buchungstag,
        type: type,
        selected: false,
        unlinkable: true,
        href: href
      };
    });

    setConnectedDocumentsModal({
      visible: true,
      transactionId: transaction.id,
      connectedDocuments: connectedDocuments
    });
  };

  // Handle batch unlinking from modal
  const handleBatchUnlinkDocuments = async (documentIds: string[]) => {
    try {
      const { transactionId } = connectedDocumentsModal;
      
      // Führe das Unlinking für alle ausgewählten Dokumente aus
      for (const documentId of documentIds) {
        await handleUnlinkDocument(transactionId, documentId);
      }

      // Schließe das Modal nach erfolgreichem Unlinking
      setConnectedDocumentsModal({
        visible: false,
        transactionId: '',
        connectedDocuments: []
      });
    } catch (error) {
      console.error('❌ Fehler beim Batch-Unlinking:', error);
      throw error;
    }
  };

  // Handle unlinking and deleting documents
  const handleUnlinkDocument = async (transactionId: string, documentId: string) => {
    try {
      if (!user?.uid || !uid) {
        console.error('❌ User ID oder Company ID fehlt');
        return;
      }

      // Bestätige die Aktion
      const confirmed = window.confirm(
        'Sind Sie sicher, dass Sie die Verknüpfung lösen und das Dokument vollständig löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.'
      );

      if (!confirmed) return;

      console.log('🗑️ Löse Verknüpfung und lösche Dokument:', { transactionId, documentId });

      // 1. Lösche Transaction Link aus Subcollection
      const { doc, deleteDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      // Finde den entsprechenden Link
      const transactionLinksRef = collection(db, 'companies', uid, 'transaction_links');
      const linkToDelete = transactionLinks.find(
        link => link.transactionId === transactionId && link.documentId === documentId
      );

      if (linkToDelete && linkToDelete.id) {
        const linkDocRef = doc(db, 'companies', uid, 'transaction_links', linkToDelete.id);
        await deleteDoc(linkDocRef);
        console.log('✅ Transaction Link gelöscht');
      }

      // 2. Lösche das Dokument aus der entsprechenden Collection
      const transaction = transactions.find(tx => tx.id === transactionId);
      const linkedInvoice = transaction?.linkedInvoices?.find(inv => inv.documentId === documentId);
      
      if (linkedInvoice) {
        const isExpense = linkedInvoice.documentNumber?.startsWith('BE-');
        const collectionName = isExpense ? 'expenses' : 'invoices';
        
        const documentRef = doc(db, 'companies', uid, collectionName, documentId);
        await deleteDoc(documentRef);
        console.log(`✅ Dokument aus ${collectionName} Collection gelöscht`);
      }

      // 3. Lösche PDF aus Firebase Storage
      try {
        const { ref, deleteObject } = await import('firebase/storage');
        const { storage } = await import('@/firebase/clients');
        
        // Versuche verschiedene mögliche PDF Pfade
        const possiblePaths = [
          `companies/${uid}/invoices/${documentId}.pdf`,
          `companies/${uid}/expenses/${documentId}.pdf`,
          `companies/${uid}/receipts/${documentId}.pdf`,
          `companies/${uid}/documents/${documentId}.pdf`
        ];

        for (const path of possiblePaths) {
          try {
            const pdfRef = ref(storage, path);
            await deleteObject(pdfRef);
            console.log(`✅ PDF gelöscht: ${path}`);
            break; // Erfolgreich gelöscht, stoppe die Schleife
          } catch (storageError: any) {
            if (storageError.code !== 'storage/object-not-found') {
              console.warn(`⚠️ Fehler beim Löschen von ${path}:`, storageError);
            }
          }
        }
      } catch (storageError) {
        console.warn('⚠️ Fehler beim Löschen der PDF aus Storage:', storageError);
      }

      // 4. Update UI - Entferne Verknüpfung aus Transaction
      setTransactions(prevTransactions =>
        prevTransactions.map(tx =>
          tx.id === transactionId
            ? {
                ...tx,
                verknuepfungen: tx.verknuepfungen.filter(id => id !== documentId),
                linkedInvoices: tx.linkedInvoices?.filter(inv => inv.documentId !== documentId) || [],
                bookingStatus: tx.verknuepfungen.filter(id => id !== documentId).length > 0 ? 'booked' : 'open'
              }
            : tx
        )
      );

      // 5. Update Transaction Links State
      setTransactionLinks(prev => 
        prev.filter(link => !(link.transactionId === transactionId && link.documentId === documentId))
      );

      console.log('✅ Verknüpfung erfolgreich gelöst und Dokument gelöscht');

    } catch (error) {
      console.error('❌ Fehler beim Lösen der Verknüpfung:', error);
      alert('Fehler beim Lösen der Verknüpfung. Bitte versuchen Sie es erneut.');
    }
  };

  // Handle transaction linking to documents
  const handleLinkTransaction = async (
  transactionId: string,
  documentId: string,
  documentData?: any) =>
  {
    try {
      if (!user?.uid || !uid) {
        console.error('❌ User ID oder Company ID fehlt');
        return;
      }

      // Finde Transaction Daten
      const transaction = transactions.find((tx) => tx.id === transactionId);
      if (!transaction) {
        console.error('❌ Transaction nicht gefunden:', transactionId);
        return;
      }




      // Verwende echte Document-Daten aus der Modal oder Fallback-Daten
      const finalDocumentData = documentData || {
        id: documentId,
        documentNumber: `DOC-${documentId}`,
        customerName: transaction.name,
        total: Math.abs(transaction.betrag),
        date: new Date().toISOString(),
        isStorno: false
      };

      // Erstelle Link über TransactionLinkService
      const result = await TransactionLinkService.createLink(
        uid, // companyId
        transactionId,
        documentId,
        {
          id: transaction.id,
          name: transaction.name,
          verwendungszweck: transaction.verwendungszweck,
          buchungstag: transaction.buchungstag,
          betrag: transaction.betrag,
          accountId: transaction.accountId
        },
        finalDocumentData,
        user.uid
      );

      if (result.success) {


        // Update Invoice Status zu "bezahlt"
        try {

          const paidAmount = Math.abs(transaction.betrag);
          await updateInvoiceStatus(documentId, transactionId, paidAmount);

        } catch (error) {
          console.error('❌ Fehler beim Aktualisieren des Rechnung Status:', error);
          // Weiter machen auch wenn Status-Update fehlschlägt
        }

        // Update Transaction in UI um verknüpften Status zu zeigen
        setTransactions((prevTransactions) =>
        prevTransactions.map((tx) =>
        tx.id === transactionId ?
        {
          ...tx,
          verknuepfungen: [...tx.verknuepfungen, documentId],
          linkedInvoices: [
          ...(tx.linkedInvoices || []),
          {
            documentId: documentId,
            documentNumber: finalDocumentData.documentNumber,
            customerName: finalDocumentData.customerName
          }],

          bookingStatus: 'booked'
        } :
        tx
        )
        );

        // Erfolgreiche Verknüpfung anzeigen



      } else {
        console.error('❌ Fehler beim Erstellen der Transaction Link:', result.error);
        alert('Fehler beim Verknüpfen der Transaktion: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Unerwarteter Fehler beim Verknüpfen:', error);
      alert('Unerwarteter Fehler beim Verknüpfen der Transaktion');
    }
  };

  // Generate dynamic tabs only for connected accounts
  const generateAccountTabs = () => {
    const tabs = [{ id: 'all', label: 'Alle', count: transactions.length }];

    // Debug: Log all accounts and their connection status











    // Only show accounts that are actually connected
    const connectedAccounts = accounts.filter((account) => {
      // Check if account is connected via isConnected flag or has balance data
      return (
        account.isConnected === true || account.balance !== undefined && account.balance !== null);

    });



    connectedAccounts.forEach((account) => {
      const accountTransactions = transactions.filter((t) => t.accountId === account.id);


      tabs.push({
        id: account.id,
        label: account.accountName || account.bankName || 'Unbekannt',
        count: accountTransactions.length
      });
    });


    return tabs;
  };

  // Filter transactions based on active tab
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Filter by account tab
    if (activeAccountTab !== 'all') {
      filtered = filtered.filter((t) => t.accountId === activeAccountTab);
    }

    // Filter by transaction type (INCOME/EXPENSE)
    if (transactionTypeFilter !== 'ALL') {
      filtered = filtered.filter((t) => {
        const isIncome = t.betrag > 0;
        if (transactionTypeFilter === 'INCOME') {
          return isIncome;
        } else if (transactionTypeFilter === 'EXPENSE') {
          return !isIncome;
        }
        return true;
      });
    }

    // Filter by date range
    if (dateFromFilter) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.buchungstag);
        const fromDate = new Date(dateFromFilter);
        return transactionDate >= fromDate;
      });
    }

    if (dateToFilter) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.buchungstag);
        const toDate = new Date(dateToFilter);
        // Set time to end of day for "to" date
        toDate.setHours(23, 59, 59, 999);
        return transactionDate <= toDate;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.verwendungszweck.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.accountName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort transactions
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'buchungstag':
          // Handle different date formats properly
          const parseDate = (dateStr: string): Date => {
            if (!dateStr || dateStr === 'Invalid Date') return new Date(0);

            try {
              // If it's already in YYYY-MM-DD format
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return new Date(dateStr);
              }

              // If it's in DD.MM.YYYY format, convert it
              if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
                const [day, month, year] = dateStr.split('.');
                return new Date(`${year}-${month}-${day}`);
              }

              // Try parsing as-is
              const date = new Date(dateStr);
              return isNaN(date.getTime()) ? new Date(0) : date;
            } catch (error) {
              console.warn('Error parsing date:', dateStr, error);
              return new Date(0);
            }
          };

          aVal = parseDate(a.buchungstag);
          bVal = parseDate(b.buchungstag);
          break;
        case 'betrag':
          aVal = Math.abs(a.betrag);
          bVal = Math.abs(b.betrag);
          break;
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'verwendungszweck':
          aVal = a.verwendungszweck?.toLowerCase() || '';
          bVal = b.verwendungszweck?.toLowerCase() || '';
          break;
        case 'status':
          // Sort by booking status: linked transactions first
          aVal = a.verknuepfungen.length > 0 ? 0 : 1;
          bVal = b.verknuepfungen.length > 0 ? 0 : 1;
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

  // Handle column sorting
  const handleSort = (
  column: 'buchungstag' | 'betrag' | 'name' | 'status' | 'verwendungszweck') =>
  {
    if (sortBy === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to desc for most columns, asc for name/verwendungszweck
      setSortBy(column);
      setSortDirection(['name', 'verwendungszweck'].includes(column) ? 'asc' : 'desc');
    }
  };

  // Get sort icon for table headers
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <div className="flex flex-col ml-1">
          <ChevronDown className="h-3 w-3 text-gray-300 -mb-1" />
          <ChevronDown className="h-3 w-3 text-gray-300 rotate-180" />
        </div>);

    }

    return sortDirection === 'desc' ?
    <ChevronDown className="h-4 w-4 ml-1 text-gray-700" /> :

    <ChevronDown className="h-4 w-4 ml-1 text-gray-700 rotate-180" />;

  };

  const accountTabs = generateAccountTabs();
  const filteredTransactions = getFilteredTransactions();

  // Auto-reset active tab if selected account is no longer available
  useEffect(() => {
    if (activeAccountTab !== 'all' && !accountTabs.find((tab) => tab.id === activeAccountTab)) {
      setActiveAccountTab('all');
    }
  }, [accountTabs, activeAccountTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountDropdownOpen) {
        const dropdown = document.querySelector('[data-dropdown="account-dropdown"]');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setAccountDropdownOpen(false);
        }
      }

      // Close any open action dropdowns when clicking outside
      const hasOpenActionDropdown = selectedTransactions.some((id) => id.startsWith('dropdown-'));
      if (hasOpenActionDropdown) {
        const target = event.target as Element;
        const isInsideDropdown = target.closest('.relative') !== null;
        if (!isInsideDropdown) {
          setSelectedTransactions((prev) => prev.filter((id) => !id.startsWith('dropdown-')));
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountDropdownOpen, selectedTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      processed: { color: 'bg-green-100 text-green-800', label: 'Verbucht', icon: '✓' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Ausstehend', icon: '⏳' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Fehler', icon: '✗' },
      duplicate: { color: 'bg-orange-100 text-orange-800', label: 'Duplikat', icon: '⚠️' },
      adjustment: { color: 'bg-blue-100 text-blue-800', label: 'Korrektur', icon: '🔧' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processed;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>

        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>);

  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>);

  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bankkonto-Transaktionen</h1>
          <p className="text-sm text-gray-500 mt-1">
            Übersicht und Verwaltung Ihrer Banktransaktionen
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setBankTransferModal({ visible: true })}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#14ad9f] border border-[#14ad9f] rounded-md hover:bg-[#129488] transition-colors whitespace-nowrap">

            <Send className="h-4 w-4 mr-2" />
            Überweisung
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap">

            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing || loadingTransactions ? 'animate-spin' : ''}`} />

            {loadingTransactions ? 'Transaktionen laden...' : 'Aktualisieren'}
          </button>
        </div>
      </div>

      {/* Transactions View */}
      {/* Account Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex items-center px-6" aria-label="Tabs">
            <div className="flex space-x-8 flex-1 min-w-0">
              {accountTabs.slice(0, 6).map((tab) => {
                // Find the account to check connection status
                const account = accounts.find((acc) => acc.id === tab.id);
                const isConnected =
                account?.isConnected === true ||
                account?.balance !== undefined && account?.balance !== null;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAccountTab(tab.id)}
                    className={`${
                    activeAccountTab === tab.id ?
                    'border-blue-500 text-blue-600' :
                    'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 flex-shrink-0`
                    }>

                    <div className="flex items-center gap-1">
                      {tab.id !== 'all' && isConnected &&
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Verbunden" />
                      }
                      {tab.label}
                    </div>
                    <span
                      className={`${
                      activeAccountTab === tab.id ?
                      'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-900'} inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`
                      }>

                      {tab.count}
                    </span>
                  </button>);

              })}
            </div>

            {/* Dropdown für weitere Konten */}
            {accountTabs.length > 6 &&
            <div className="relative flex-shrink-0 ml-4" data-dropdown="account-dropdown">
                <button
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className={`${
                accountTabs.slice(6).some((tab) => tab.id === activeAccountTab) ?
                'border-blue-500 text-blue-600' :
                'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm flex items-center gap-2`
                }>

                  <span>Weitere ({accountTabs.length - 6})</span>
                  <ChevronDown
                  className={`h-4 w-4 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`} />

                </button>

                {accountDropdownOpen &&
              <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="py-2 max-h-64 overflow-y-auto">
                      {accountTabs.slice(6).map((tab) => {
                    const account = accounts.find((acc) => acc.id === tab.id);
                    const isConnected =
                    account?.isConnected === true ||
                    account?.balance !== undefined && account?.balance !== null;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveAccountTab(tab.id);
                          setAccountDropdownOpen(false);
                        }}
                        className={`${
                        activeAccountTab === tab.id ?
                        'bg-blue-50 text-blue-600' :
                        'text-gray-700 hover:bg-gray-50'} w-full px-4 py-2 text-left text-sm flex items-center justify-between`
                        }>

                            <div className="flex items-center gap-2">
                              {isConnected &&
                          <div
                            className="w-2 h-2 bg-green-500 rounded-full"
                            title="Verbunden" />

                          }
                              <span className="truncate">{tab.label}</span>
                            </div>
                            <span
                          className={`${
                          activeAccountTab === tab.id ?
                          'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-900'} inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium`
                          }>

                              {tab.count}
                            </span>
                          </button>);

                  })}
                    </div>
                  </div>
              }
              </div>
            }
          </nav>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nach Name oder Verwendungszweck suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f] w-80" />

              </div>

              <div className="relative">
                <button
                  onClick={() => setFilterIsOpen(!filterIsOpen)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  transactionTypeFilter !== 'ALL' || dateFromFilter || dateToFilter ?
                  'bg-[#14ad9f] text-white hover:bg-[#129488]' :
                  'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`
                  }>

                  <Filter className="h-4 w-4" />
                  Filter
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${filterIsOpen ? 'rotate-180' : ''}`} />

                </button>

                {/* Active Filter Indicator */}
                {(transactionTypeFilter !== 'ALL' || dateFromFilter || dateToFilter) &&
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {[
                    transactionTypeFilter !== 'ALL' ? 1 : 0,
                    dateFromFilter || dateToFilter ? 1 : 0].
                    reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                }
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {filteredTransactions.length} Transaktionen
              </span>
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Dropdown Panel - Taskilo Design */}
          {filterIsOpen &&
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Transaktionstyp
                  </label>
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    {[
                  { id: 'ALL', label: 'Alle', icon: null },
                  { id: 'INCOME', label: 'Einnahmen', icon: <ArrowUp className="h-3 w-3" /> },
                  { id: 'EXPENSE', label: 'Ausgaben', icon: <ArrowDown className="h-3 w-3" /> }].
                  map((type) =>
                  <button
                    key={type.id}
                    onClick={() =>
                    setTransactionTypeFilter(type.id as 'ALL' | 'INCOME' | 'EXPENSE')
                    }
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    transactionTypeFilter === type.id ?
                    'bg-[#14ad9f] text-white shadow-sm' :
                    'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`
                    }>

                        {type.icon}
                        {type.label}
                      </button>
                  )}
                  </div>
                </div>

                {/* Datumsfilter */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Zeitraum</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Von</label>
                      <div className="relative">
                        <Calendar className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                        type="date"
                        value={dateFromFilter}
                        onChange={(e) => setDateFromFilter(e.target.value)}
                        className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f] w-full" />

                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Bis</label>
                      <div className="relative">
                        <Calendar className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                        type="date"
                        value={dateToFilter}
                        onChange={(e) => setDateToFilter(e.target.value)}
                        className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f] w-full" />

                      </div>
                    </div>
                  </div>

                  {/* Schnell-Filter für häufige Zeiträume */}
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                    {
                      label: 'Heute',
                      getValue: () => ({
                        from: new Date().toISOString().split('T')[0],
                        to: new Date().toISOString().split('T')[0]
                      })
                    },
                    {
                      label: 'Diese Woche',
                      getValue: () => {
                        const today = new Date();
                        const monday = new Date(today);
                        monday.setDate(today.getDate() - today.getDay() + 1);
                        return {
                          from: monday.toISOString().split('T')[0],
                          to: today.toISOString().split('T')[0]
                        };
                      }
                    },
                    {
                      label: 'Dieser Monat',
                      getValue: () => {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                        return {
                          from: firstDay.toISOString().split('T')[0],
                          to: today.toISOString().split('T')[0]
                        };
                      }
                    },
                    {
                      label: 'Letzten 30 Tage',
                      getValue: () => {
                        const today = new Date();
                        const thirtyDaysAgo = new Date(today);
                        thirtyDaysAgo.setDate(today.getDate() - 30);
                        return {
                          from: thirtyDaysAgo.toISOString().split('T')[0],
                          to: today.toISOString().split('T')[0]
                        };
                      }
                    }].
                    map((preset) =>
                    <button
                      key={preset.label}
                      onClick={() => {
                        const { from, to } = preset.getValue();
                        setDateFromFilter(from);
                        setDateToFilter(to);
                      }}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 hover:text-[#14ad9f] transition-colors">

                          {preset.label}
                        </button>
                    )}
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    {filteredTransactions.length} Transaktionen gefiltert
                  </span>
                  <div className="flex space-x-2">
                    <button
                    onClick={() => {
                      setTransactionTypeFilter('ALL');
                      setDateFromFilter('');
                      setDateToFilter('');
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-[#14ad9f] font-medium">

                      Zurücksetzen
                    </button>
                    <button
                    onClick={() => setFilterIsOpen(false)}
                    className="px-4 py-1.5 bg-[#14ad9f] text-white text-sm font-medium rounded-md hover:bg-[#129488] transition-colors">

                      Fertig
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        {/* Transactions Table - Echte HTML Tabelle wie SevDesk */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-8 px-2 py-2 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />

                  </th>
                  <th className="w-28 px-2 py-2 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-[#14ad9f] transition-colors">

                      Status
                      {getSortIcon('status')}
                    </button>
                  </th>
                  <th className="min-w-64 px-2 py-2 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-[#14ad9f] transition-colors">

                      Name / Verwendungszweck
                      {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="w-28 px-2 py-2 text-right">
                    <button
                      onClick={() => handleSort('buchungstag')}
                      className="flex items-center justify-end text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-[#14ad9f] transition-colors whitespace-nowrap">

                      Buchungstag
                      {getSortIcon('buchungstag')}
                    </button>
                  </th>
                  <th className="w-32 px-2 py-2 text-center">
                    <button
                      onClick={() => handleSort('betrag')}
                      className="flex items-center justify-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-[#14ad9f] transition-colors whitespace-nowrap">

                      Betrag (Brutto)
                      {getSortIcon('betrag')}
                    </button>
                  </th>
                  <th className="w-32 px-2 py-2 text-center">
                    <button
                      onClick={() => handleSort('betrag')}
                      className="flex items-center justify-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-[#14ad9f] transition-colors whitespace-nowrap">

                      Offen (Brutto)
                      {getSortIcon('betrag')}
                    </button>
                  </th>
                  <th className="w-32 px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verknüpfungen
                  </th>
                  <th className="w-24 px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredTransactions.map((transaction) =>
                <tr key={transaction.id} className="hover:bg-gray-50 h-12">
                    {/* Checkbox */}
                    <td className="px-2 py-2">
                      <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />

                    </td>

                    {/* Status */}
                    <td className="px-2 py-2">
                      <div className="flex items-center">
                        {transaction.verknuepfungen.length > 0 ?
                      <>
                            <div className="w-2 h-2 rounded-full bg-green-400 mr-1"></div>
                            <span className="text-xs font-medium text-gray-700">Gebucht</span>
                          </> :

                      <>
                            <div className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></div>
                            <span className="text-xs font-medium text-gray-700">Offen</span>
                          </>
                      }
                      </div>
                    </td>

                    {/* Name / Verwendungszweck */}
                    <td className="px-2 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 mb-0.5 truncate">
                          {transaction.name?.toUpperCase() || 'UNBEKANNT'}
                        </div>
                        <div className="text-xs text-gray-600 truncate max-w-xs">
                          {(() => {
                          const verwendung =
                          transaction.verwendungszweck || 'Keine Verwendungsangabe';
                          if (verwendung.length > 40) {
                            return verwendung.substring(0, 37) + '...';
                          }
                          return verwendung;
                        })()}
                        </div>
                      </div>
                    </td>

                    {/* Buchungstag */}
                    <td className="px-2 py-2 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {(() => {
                        try {
                          if (
                          !transaction.buchungstag ||
                          transaction.buchungstag === 'Invalid Date')

                          return '---';
                          if (/^\d{4}-\d{2}-\d{2}$/.test(transaction.buchungstag)) {
                            const [year, month, day] = transaction.buchungstag.split('-');
                            return `${day}.${month}.${year}`;
                          }
                          const date = new Date(transaction.buchungstag);
                          if (isNaN(date.getTime())) return '---';
                          return date.toLocaleDateString('de-DE');
                        } catch (error) {
                          return '---';
                        }
                      })()}
                      </div>
                    </td>

                    {/* Betrag */}
                    <td className="px-2 py-2 text-center">
                      <span
                      className={`text-sm font-bold whitespace-nowrap ${transaction.betrag >= 0 ? 'text-green-600' : 'text-red-600'}`}>

                        {transaction.betrag >= 0 ? '' : '-'}
                        {new Intl.NumberFormat('de-DE', {
                        style: 'decimal',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(Math.abs(transaction.betrag))}{' '}
                        €
                      </span>
                    </td>

                    {/* Offen */}
                    <td className="px-2 py-2 text-center">
                      {(() => {
                        // Berechne den offenen Betrag basierend auf transaction_links Daten
                        let offenerBetrag = transaction.betrag;
                        let istVollstaendigBeglichen = false;
                        
                        if (transaction.verknuepfungen.length > 0) {
                          // Finde entsprechende Transaction Links für diese Transaktion
                          const relevantLinks = transactionLinks.filter(link => 
                            link.transactionId === transaction.id
                          );
                          
                          if (relevantLinks.length > 0) {

                            
                            // Berechne den offenen Betrag mit korrekter Storno-Behandlung
                            // Normale Rechnungen: Reduzieren den offenen Betrag
                            // Storno-Rechnungen: Erhöhen den offenen Betrag (werden zum ursprünglichen Betrag addiert)
                            
                            let normalRechnungen = 0;
                            let stornoRechnungen = 0;
                            
                            relevantLinks.forEach(link => {
                              const documentAmount = link.documentAmount || 0;
                              
                              if (documentAmount < 0) {
                                // Storno-Rechnung: Negative Beträge werden als Kredite behandelt
                                const stornoAmount = Math.abs(documentAmount);
                                stornoRechnungen += stornoAmount;

                              } else {
                                // Normale Rechnung: Positive Beträge reduzieren den offenen Betrag
                                normalRechnungen += documentAmount;

                              }
                            });
                            
                            // Finale Berechnung: Ursprungsbetrag + Storno-Rechnungen - normale Rechnungen
                            offenerBetrag = transaction.betrag + stornoRechnungen - normalRechnungen;
                            

                            
                            if (transaction.betrag < 0) {
                              // Bei Ausgaben: Vollständig beglichen wenn offener Betrag >= 0
                              istVollstaendigBeglichen = offenerBetrag >= 0;
                            } else {
                              // Bei Einnahmen: Vollständig beglichen wenn offener Betrag <= 0
                              istVollstaendigBeglichen = offenerBetrag <= 0;
                            }
                          }
                        }
                        
                        return (
                          <span
                            className={`text-sm font-bold whitespace-nowrap ${
                              istVollstaendigBeglichen 
                                ? 'text-gray-400' // Grau wenn beglichen
                                : offenerBetrag >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                            }`}
                          >
                            {istVollstaendigBeglichen ? (
                              '0,00 €'
                            ) : (
                              <>
                                {offenerBetrag >= 0 ? '' : '-'}
                                {new Intl.NumberFormat('de-DE', {
                                  style: 'decimal',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                }).format(Math.abs(offenerBetrag))}{' '}
                                €
                              </>
                            )}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Verknüpfungen - Links zu verknüpften Rechnungen */}
                    <td 
                      className="px-2 py-2"
                      colSpan={transaction.verknuepfungen.length > 0 ? 1 : 1}
                    >
                      <div className={`${transaction.verknuepfungen.length === 0 ? 'flex justify-center' : 'flex flex-col gap-1'}`}>
                        {transaction.linkedInvoices && transaction.linkedInvoices.length > 0 ? (
                          <>
                            {transaction.linkedInvoices.map((invoice, index) => {
                              // Dynamisches Routing basierend auf documentNumber
                              const isExpense = invoice.documentNumber?.startsWith('BE-');
                              const isInvoice = invoice.documentNumber?.startsWith('RE-');
                              
                              // Bestimme die korrekte URL basierend auf Dokumenttyp
                              let href: string;
                              let title: string;
                              
                              if (isExpense) {
                                href = `/dashboard/company/${uid}/finance/expenses/${invoice.documentId}`;
                                title = `Zum Beleg - ${invoice.customerName}`;
                              } else if (isInvoice) {
                                href = `/dashboard/company/${uid}/finance/invoices/${invoice.documentId}`;
                                title = `Zur Rechnung - ${invoice.customerName}`;
                              } else {
                                // Fallback für unbekannte Dokumenttypen
                                href = `/dashboard/company/${uid}/finance/invoices/${invoice.documentId}`;
                                title = `Zum Dokument - ${invoice.customerName}`;
                              }

                              return (
                                <div key={index} className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      // Hauptlogik: Modal öffnen wenn Rechnung noch nicht vollständig beglichen ist
                                      // Berechne den offenen Betrag basierend auf transaction_links Daten
                                      let offenerBetrag = transaction.betrag;
                                      let istVollstaendigBeglichen = false;
                                      
                                      if (transaction.verknuepfungen.length > 0) {
                                        // Finde entsprechende Transaction Links für diese Transaktion
                                        const relevantLinks = transactionLinks.filter(link => 
                                          link.transactionId === transaction.id
                                        );
                                        
                                        if (relevantLinks.length > 0) {
                                          // Verwende die gleiche Logik wie in der Spalten-Berechnung
                                          let normalRechnungen = 0;
                                          let stornoRechnungen = 0;
                                          
                                          relevantLinks.forEach(link => {
                                            const documentAmount = link.documentAmount || 0;
                                            
                                            if (documentAmount < 0) {
                                              // Storno-Rechnung: Negative Beträge werden als Kredite behandelt
                                              stornoRechnungen += Math.abs(documentAmount);
                                            } else {
                                              // Normale Rechnung: Positive Beträge reduzieren den offenen Betrag
                                              normalRechnungen += documentAmount;
                                            }
                                          });
                                          
                                          // Finale Berechnung: Ursprungsbetrag + Storno-Rechnungen - normale Rechnungen
                                          offenerBetrag = transaction.betrag + stornoRechnungen - normalRechnungen;
                                          
                                          if (transaction.betrag < 0) {
                                            // Bei Ausgaben: Vollständig beglichen wenn offener Betrag >= 0
                                            istVollstaendigBeglichen = offenerBetrag >= 0;
                                          } else {
                                            // Bei Einnahmen: Vollständig beglichen wenn offener Betrag <= 0
                                            istVollstaendigBeglichen = offenerBetrag <= 0;
                                          }
                                        }
                                      }
                                      
                                      // Zusätzliche Bedingungen für Modal-Öffnung:
                                      const hasMultipleDocuments = transaction.linkedInvoices && transaction.linkedInvoices.length > 1;
                                      
                                      // Modal öffnen wenn:
                                      // 1. Rechnung noch nicht vollständig beglichen ist (offener Betrag > 0)
                                      // 2. ODER mehrere Dokumente verknüpft sind (zur Übersicht)
                                      const shouldOpenModal = !istVollstaendigBeglichen || hasMultipleDocuments;
                                      

                                      
                                      if (shouldOpenModal) {
                                        handleOpenConnectedDocumentsModal(transaction);
                                      } else {
                                        // Rechnung ist vollständig beglichen - direkte Navigation
                                        window.open(href, '_blank');
                                      }
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-[#14ad9f] text-white hover:bg-[#129488] transition-colors duration-200 shadow-sm hover:shadow-md whitespace-nowrap flex-1"
                                    title={title}
                                  >
                                    <svg
                                      className="w-3 h-3 mr-1.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    {invoice.documentNumber}
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      await handleUnlinkDocument(transaction.id, invoice.documentId);
                                    }}
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors duration-200 shadow-sm hover:shadow-md flex-shrink-0"
                                    title="Verknüpfung lösen und Dokument löschen"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>

                    {/* Actions - Angezeigt wenn keine Verknüpfungen ODER noch ein Defizit vorhanden ist */}
                    {(() => {
                      // Berechne ob noch ein Defizit vorhanden ist
                      let offenerBetrag = transaction.betrag;
                      let istVollstaendigBeglichen = false;
                      
                      if (transaction.verknuepfungen.length > 0) {
                        const relevantLinks = transactionLinks.filter(link => 
                          link.transactionId === transaction.id
                        );
                        
                        if (relevantLinks.length > 0) {
                          let normalRechnungen = 0;
                          let stornoRechnungen = 0;
                          
                          relevantLinks.forEach(link => {
                            const documentAmount = link.documentAmount || 0;
                            
                            if (documentAmount < 0) {
                              stornoRechnungen += Math.abs(documentAmount);
                            } else {
                              normalRechnungen += documentAmount;
                            }
                          });
                          
                          offenerBetrag = transaction.betrag + stornoRechnungen - normalRechnungen;
                          
                          if (transaction.betrag < 0) {
                            istVollstaendigBeglichen = offenerBetrag >= 0;
                          } else {
                            istVollstaendigBeglichen = offenerBetrag <= 0;
                          }
                        }
                      }
                      
                      // Zeige Actions wenn: keine Verknüpfungen ODER noch nicht vollständig beglichen
                      const shouldShowActions = transaction.verknuepfungen.length === 0 || !istVollstaendigBeglichen;
                      
                      return shouldShowActions ? (
                        <td className="px-3 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                          title="Beleg erstellen"
                          onClick={() => {
                          const receiptUrl =
                          `/dashboard/company/${uid}/banking/receipt?` +
                          new URLSearchParams({
                            transactionId: transaction.id,
                            beschreibung: transaction.verwendungszweck || '',
                            betrag: transaction.betrag.toString().replace('.', ','),
                            belegdatum: (() => {
                              try {
                                if (
                                !transaction.buchungstag ||
                                transaction.buchungstag === 'Invalid Date')

                                return new Date().toLocaleDateString('de-DE');
                                if (/^\d{4}-\d{2}-\d{2}$/.test(transaction.buchungstag)) {
                                  const [year, month, day] = transaction.buchungstag.split('-');
                                  return `${day}.${month}.${year}`;
                                }
                                const date = new Date(transaction.buchungstag);
                                if (isNaN(date.getTime()))
                                return new Date().toLocaleDateString('de-DE');
                                return date.toLocaleDateString('de-DE');
                              } catch (error) {
                                return new Date().toLocaleDateString('de-DE');
                              }
                            })(),
                            kunde: transaction.name || '',
                            type: transaction.betrag >= 0 ? 'INCOME' : 'EXPENSE'
                          }).toString();
                          router.push(receiptUrl);
                        }}>

                          <FileText className="h-4 w-4" />
                        </button>

                        <button
                        className={`relative p-2 rounded transition-colors ${
                        transaction.verknuepfungen.length > 0 ?
                        'text-[#14ad9f] bg-[#14ad9f]/10 hover:bg-[#14ad9f]/20' :
                        'text-gray-600 hover:text-[#14ad9f] hover:bg-gray-100'}`
                        }
                        onClick={() => {
                          setLinkTransactionModal({
                            visible: true,
                            transaction: transaction
                          });
                        }}
                        title={
                        transaction.verknuepfungen.length > 0 ?
                        `${transaction.verknuepfungen.length} Dokument(e) verknüpft` :
                        'Dokument verknüpfen'
                        }>

                          <Link className="h-4 w-4" />
                          {transaction.verknuepfungen.length > 0 &&
                        <span className="absolute -top-1 -right-1 bg-[#14ad9f] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                              {transaction.verknuepfungen.length}
                            </span>
                        }
                        </button>

                        {/* Dreipunkte-Menü nur bei Transaktionen ohne Verknüpfungen */}
                        {transaction.verknuepfungen.length === 0 && (
                          <div className="relative">
                          <button
                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                          title="Weitere Aktionen"
                          onClick={() => {
                            const newSelected = selectedTransactions.includes(
                              `dropdown-${transaction.id}`
                            ) ?
                            selectedTransactions.filter(
                              (id) => id !== `dropdown-${transaction.id}`
                            ) :
                            [
                            ...selectedTransactions.filter(
                              (id) => !id.startsWith('dropdown-')
                            ),
                            `dropdown-${transaction.id}`];

                            setSelectedTransactions(newSelected);
                          }}>

                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {selectedTransactions.includes(`dropdown-${transaction.id}`) &&
                        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                              <div className="py-1">
                                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="text-gray-500">

                                      <path
                                    d="M15.75 6.5C15.75 8.57107 14.0711 10.25 12 10.25C9.92894 10.25 8.25 8.57107 8.25 6.5C8.25 4.42893 9.92894 2.75 12 2.75C14.0711 2.75 15.75 4.42893 15.75 6.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round" />

                                      <path
                                    d="M12 13.25C8.2044 13.25 5.43391 15.7735 4.67155 19.1657C4.54235 19.7406 5.00917 20.25 5.59842 20.25H18.4016C18.9908 20.25 19.4577 19.7406 19.3285 19.1657C18.5661 15.7735 15.7956 13.25 12 13.25Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round" />

                                    </svg>
                                  </div>
                                  <span>Als privat markieren</span>
                                </button>

                                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="text-gray-500">

                                      <path
                                    d="M21.0646 8.34671C20.3564 5.71561 18.2844 3.64359 15.6533 2.93541C15.3802 2.86191 15.2437 2.82516 15.1084 2.86513C14.9978 2.8978 14.8841 2.98495 14.8238 3.08326C14.75 3.20355 14.75 3.35989 14.75 3.67259V8.45001C14.75 8.73004 14.75 8.87005 14.8045 8.97701C14.8524 9.07109 14.9289 9.14758 15.023 9.19552C15.13 9.25001 15.27 9.25001 15.55 9.25001H20.3274C20.6401 9.25001 20.7965 9.25001 20.9168 9.17625C21.0151 9.11596 21.1022 9.00224 21.1349 8.89164C21.1748 8.75632 21.1381 8.61978 21.0646 8.34671Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round" />

                                      <path
                                    d="M19.25 13C19.25 17.5564 15.5563 21.25 11 21.25C6.44365 21.25 2.75 17.5564 2.75 13C2.75 8.44366 6.44365 4.75001 11 4.75001C11.085 4.75001 11.1697 4.7513 11.2541 4.75385V11.1502C11.2541 11.7103 11.2541 11.9903 11.3631 12.2042C11.459 12.3924 11.612 12.5454 11.8002 12.6412C12.0141 12.7502 12.2941 12.7502 12.8541 12.7502H19.2463C19.2488 12.8332 19.25 12.9165 19.25 13Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round" />

                                    </svg>
                                  </div>
                                  <div>
                                    <div>Als Kreditaufnahme markieren</div>
                                    <div className="text-xs text-gray-500">
                                      Auszahlung eines Kredits
                                    </div>
                                  </div>
                                </button>

                                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="text-gray-500">

                                      <path
                                    d="M14.3322 5.83209L19.8751 11.375C20.2656 11.7655 20.2656 12.3987 19.8751 12.7892L14.3322 18.3321M19.3322 12.0821H3.83218"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round" />

                                    </svg>
                                  </div>
                                  <div>
                                    <div>Geldbewegung</div>
                                    <div className="text-xs text-gray-500">
                                      Geldeingang von einem anderen Konto
                                    </div>
                                  </div>
                                </button>

                                <hr className="my-1 border-gray-200" />

                                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="text-red-500">

                                      <path
                                    d="M5.68964 20.3144L4.94119 20.3627L5.68964 20.3144ZM18.3104 20.3144L19.0588 20.3627V20.3627L18.3104 20.3144ZM2.75 5C2.33579 5 2 5.33579 2 5.75C2 6.16421 2.33579 6.5 2.75 6.5V5ZM21.25 6.5C21.6642 6.5 22 6.16421 22 5.75C22 5.33579 21.6642 5 21.25 5V6.5ZM10.5 10.75C10.5 10.3358 10.1642 10 9.75 10C9.33579 10 9 10.3358 9 10.75H10.5ZM9 16.25C9 16.6642 9.33579 17 9.75 17C10.1642 17 10.5 16.6642 10.5 16.25H9ZM15 10.75C15 10.3358 14.6642 10 14.25 10C13.8358 10 13.5 10.3358 13.5 10.75H15ZM13.5 16.25C13.5 16.6642 13.8358 17 14.25 17C14.6642 17 15 16.6642 15 16.25H13.5Z"
                                    fill="currentColor" />

                                    </svg>
                                  </div>
                                  <span>Löschen</span>
                                </button>
                              </div>
                            </div>
                        }
                          </div>
                        )}
                        </div>
                      </td>
                      ) : null;
                    })()}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredTransactions.length === 0 &&
        <div className="text-center py-12">
            <Euro className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Transaktionen gefunden</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ?
            'Versuchen Sie einen anderen Suchbegriff' :
            'Es sind noch keine Transaktionen vorhanden'}
            </p>
          </div>
        }
      </div>

      {/* Link Transaction Modal */}
      <LinkTransactionModal
        isOpen={linkTransactionModal.visible}
        transaction={linkTransactionModal.transaction}
        companyId={uid}
        onClose={() => setLinkTransactionModal({ visible: false, transaction: null })}
        onLink={handleLinkTransaction} />

      {/* Connected Documents Modal */}
      <ConnectedDocumentsModal
        isOpen={connectedDocumentsModal.visible}
        transactionId={connectedDocumentsModal.transactionId}
        connectedDocuments={connectedDocumentsModal.connectedDocuments}
        onClose={() => setConnectedDocumentsModal({
          visible: false,
          transactionId: '',
          connectedDocuments: []
        })}
        onUnlinkDocuments={handleBatchUnlinkDocuments}
        allowUnlink={true}
      />

      {/* Bank Transfer Modal */}
      <BankTransferModal
        isOpen={bankTransferModal.visible}
        onClose={() => setBankTransferModal({ visible: false })}
        accounts={accounts}
        onSubmit={handleBankTransfer}
        companyId={uid}
        onCreateContact={() => {
          // TODO: Implementiere Navigation zum Kontakt-erstellen Modal
          console.log('Neuen Kontakt erstellen...');
        }}
      />

    </div>);

}