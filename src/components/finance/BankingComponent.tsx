'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BankAccount {
  id: string;
  bankName: string;
  iban: string;
  bic: string;
  accountHolder: string;
  accountNumber: string;
  bankCode: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT';
  currency: string;
  balance: number;
  isActive: boolean;
  isDefault: boolean;
  autoSync: boolean;
  syncProvider?: string;
  lastSyncAt?: string;
}

interface BankTransaction {
  id: string;
  transactionId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  date: string;
  valueDate: string;
  reference: string;
  description: string;
  counterparty?: {
    name: string;
    iban?: string;
    bic?: string;
  };
  category?: string;
  isRecurring: boolean;
  status: 'IMPORTED' | 'MATCHED' | 'RECONCILED' | 'IGNORED';
  matchedInvoiceId?: string;
  matchedExpenseId?: string;
  autoMatched: boolean;
}

interface BankingComponentProps {
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
}

export default function BankingComponent({
  bankAccounts,
  bankTransactions,
}: BankingComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bankkonten</CardTitle>
          <CardDescription>Verwalten Sie Ihre Bankkonten und Transaktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(bankAccounts)
              ? bankAccounts.map(account => (
                  <div
                    key={account.id}
                    className="flex justify-between items-center p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium flex items-center space-x-2">
                        <span>{account.bankName}</span>
                        {account.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Standard
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {account.iban} • {account.accountType}
                      </div>
                      <div className="text-sm text-muted-foreground">{account.accountHolder}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(account.balance)}
                      </div>
                      <div className="text-sm text-muted-foreground">{account.currency}</div>
                    </div>
                  </div>
                ))
              : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Transaktionen</CardTitle>
          <CardDescription>Übersicht über Bank-Transaktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(bankTransactions)
              ? bankTransactions.slice(0, 10).map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-center p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          const date = new Date(transaction.date);
                          return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
                        })()}
                        {transaction.counterparty && ` • ${transaction.counterparty.name}`}
                      </div>
                      {transaction.reference && (
                        <div className="text-sm text-muted-foreground">
                          Ref: {transaction.reference}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <div
                        className={`font-medium ${
                          transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'CREDIT' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </div>
                      <Badge
                        variant={
                          transaction.status === 'RECONCILED'
                            ? 'default'
                            : transaction.status === 'MATCHED'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {transaction.status === 'RECONCILED'
                          ? 'Abgeglichen'
                          : transaction.status === 'MATCHED'
                            ? 'Zugeordnet'
                            : 'Importiert'}
                      </Badge>
                    </div>
                  </div>
                ))
              : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
