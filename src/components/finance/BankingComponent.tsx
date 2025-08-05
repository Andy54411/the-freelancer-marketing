'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, DollarSign, Settings, TestTube, Activity } from 'lucide-react';
import FinApiDebugComponent from '@/components/finapi/FinApiDebugComponent';
import { DatevDebugComponent } from '@/components/datev/DatevDebugComponent';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  balance: number;
  currency: string;
}

interface BankingComponentProps {
  bankAccounts: BankAccount[];
}

export function BankingComponent({ bankAccounts }: BankingComponentProps) {
  const [activeTab, setActiveTab] = useState('banking');

  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="banking" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Banking
          </TabsTrigger>
          <TabsTrigger value="finapi-debug" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            finAPI Debug
          </TabsTrigger>
          <TabsTrigger value="datev-debug" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            DATEV Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="banking" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Banking
              </CardTitle>
              <CardDescription>Übersicht über Ihre Bankkonten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bankAccounts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Bankkonten verknüpft
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bankAccounts.map(account => (
                      <div
                        key={account.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <CreditCard className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{account.bankName}</div>
                              <div className="text-sm text-muted-foreground">{account.iban}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrency(account.balance, account.currency)}
                            </div>
                            <div className="text-sm text-muted-foreground">Aktueller Saldo</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finapi-debug" className="mt-6">
          <FinApiDebugComponent />
        </TabsContent>

        <TabsContent value="datev-debug" className="mt-6">
          <DatevDebugComponent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
