'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFinAPICredentialType } from '@/lib/finapi-config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';

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

interface SelectBankingTransactionModalProps {
  isOpen: boolean;
  companyId: string;
  invoiceAmount: number;
  transactionType?: 'CREDIT' | 'DEBIT' | 'ALL';
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
}

export default function SelectBankingTransactionModal({
  isOpen,
  companyId,
  invoiceAmount,
  transactionType = 'CREDIT',
  onClose,
  onSelect,
}: SelectBankingTransactionModalProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get environment-specific credential type
  const credentialType = getFinAPICredentialType();

  const loadTransactions = async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      // Load transactions from finAPI using the same API as Banking Transactions Page
      const response = await fetch(
        `/api/finapi/transactions?userId=${user.uid}&credentialType=${credentialType}&page=1&perPage=100`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`finAPI API Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.transactions) {
        let filteredTransactions = data.data.transactions;

        // Filter by transaction type if specified
        if (transactionType !== 'ALL') {
          filteredTransactions = filteredTransactions.filter((t: Transaction) => {
            if (transactionType === 'CREDIT') {
              return t.amount > 0; // Eingänge (positive amounts)
            } else if (transactionType === 'DEBIT') {
              return t.amount < 0; // Ausgänge (negative amounts)
            }
            return true;
          });
        }

        setTransactions(filteredTransactions);
      } else {
        setTransactions([]);
        // Don't set error for "please connect a bank first" message - this is normal
        if (data.message && !data.message.includes('please connect a bank first')) {
          setError(data.message);
        }
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der Transaktionen:', err);
      setError(err.message || 'Fehler beim Laden der Transaktionen');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
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

  const filteredTransactions = transactions.filter(transaction => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.purpose?.toLowerCase().includes(searchLower) ||
      transaction.counterpartName?.toLowerCase().includes(searchLower) ||
      transaction.amount.toString().includes(searchLower)
    );
  });

  const handleSelectTransaction = (transaction: Transaction) => {
    onSelect(transaction);
  };

  const isAmountMatch = (transactionAmount: number, invoiceAmount: number) => {
    // Check if amounts match within a small tolerance (for rounding differences)
    const tolerance = 0.01;
    return Math.abs(Math.abs(transactionAmount) - invoiceAmount) <= tolerance;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Banking-Transaktion auswählen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nach Verwendungszweck, Name oder Betrag suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="outline">
              Rechnungsbetrag: {formatCurrency(invoiceAmount)}
            </Badge>
            {transactionType !== 'ALL' && (
              <Badge variant="secondary">
                {transactionType === 'CREDIT' ? 'Eingänge' : 'Ausgänge'}
              </Badge>
            )}
          </div>

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-hidden border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Lade Transaktionen...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                {error ? 'Fehler beim Laden der Transaktionen' : 'Keine Transaktionen gefunden'}
              </div>
            ) : (
              <div className="overflow-auto h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Verwendungszweck</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow
                        key={transaction.id}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          isAmountMatch(transaction.amount, invoiceAmount)
                            ? 'bg-green-50 border-l-4 border-l-green-500'
                            : ''
                        }`}
                        onClick={() => handleSelectTransaction(transaction)}
                      >
                        <TableCell>
                          <div className="flex items-center">
                            {transaction.amount > 0 ? (
                              <ArrowDownRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(transaction.bankBookingDate)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {transaction.counterpartName || 'Unbekannt'}
                            </div>
                            {transaction.counterpartIban && (
                              <div className="text-xs text-gray-500">
                                {transaction.counterpartIban}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={transaction.purpose}>
                            {transaction.purpose || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`font-medium ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                          {isAmountMatch(transaction.amount, invoiceAmount) && (
                            <Badge variant="default" className="mt-1 bg-green-100 text-green-800">
                              Betrag stimmt überein
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTransaction(transaction);
                            }}
                          >
                            Auswählen
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    </Dialog>
  );
}