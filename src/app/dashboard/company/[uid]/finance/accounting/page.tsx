'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  Hash,
  CreditCard,
  Wallet,
  ArrowLeftRight,
  Building2,
  Plus,
} from 'lucide-react';

// Import Tab Components
import NumberSequencesTab, { NumberSequence } from '@/components/accounting/NumberSequencesTab';
import BookingAccountsTab, { BookingAccount } from '@/components/accounting/BookingAccountsTab';
import PaymentMethodsTab, { PaymentMethod } from '@/components/accounting/PaymentMethodsTab';
import PaymentAccountsTab, { PaymentAccount } from '@/components/accounting/PaymentAccountsTab';
import TransactionMatchingTab from '@/components/accounting/TransactionMatchingTab';
import CostCentersTab, { CostCenter } from '@/components/accounting/CostCentersTab';

export default function AccountingPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const [activeTab, setActiveTab] = useState('sequences');

  // Mock data - replace with actual API calls
  const [numberSequences, setNumberSequences] = useState<NumberSequence[]>([
    {
      id: '1',
      format: '%NUMBER',
      type: 'Kreditor',
      nextNumber: 70000,
      nextFormatted: '70000',
      canEdit: false,
      canDelete: false,
    },
    {
      id: '2',
      format: '%NUMBER',
      type: 'Debitor',
      nextNumber: 10000,
      nextFormatted: '10000',
      canEdit: false,
      canDelete: false,
    },
    {
      id: '3',
      format: '%NUMBER',
      type: 'Inventar',
      nextNumber: 1000,
      nextFormatted: '1000',
      canEdit: true,
      canDelete: false,
    },
    {
      id: '4',
      format: '%NUMBER',
      type: 'Kontakt',
      nextNumber: 1000,
      nextFormatted: '1000',
      canEdit: true,
      canDelete: false,
    },
    {
      id: '5',
      format: 'GU-%NUMBER',
      type: 'Gutschrift',
      nextNumber: 1000,
      nextFormatted: 'GU-1000',
      canEdit: true,
      canDelete: false,
    },
    {
      id: '6',
      format: 'RE-%NUMBER',
      type: 'Rechnung',
      nextNumber: 1000,
      nextFormatted: 'RE-1000',
      canEdit: true,
      canDelete: false,
    },
    {
      id: '7',
      format: 'AB-%NUMBER',
      type: 'Auftragsbestätigung',
      nextNumber: 1000,
      nextFormatted: 'AB-1000',
      canEdit: true,
      canDelete: false,
    },
    {
      id: '8',
      format: 'AN-%NUMBER',
      type: 'Angebot',
      nextNumber: 1000,
      nextFormatted: 'AN-1000',
      canEdit: true,
      canDelete: false,
    },
    {
      id: '9',
      format: 'LI-%NUMBER',
      type: 'Lieferschein',
      nextNumber: 1000,
      nextFormatted: 'LI-1000',
      canEdit: true,
      canDelete: false,
    },
    {
      id: '10',
      format: '%NUMBER',
      type: 'Produkt',
      nextNumber: 1001,
      nextFormatted: '1001',
      canEdit: true,
      canDelete: false,
    },
  ]);

  const [bookingAccounts, setBookingAccounts] = useState<BookingAccount[]>([
    { id: '1', number: '1000', name: 'Kasse', type: 'ASSET', automaticBooking: true },
    { id: '2', number: '1200', name: 'Bank', type: 'ASSET', automaticBooking: true },
    { id: '3', number: '1400', name: 'Forderungen', type: 'ASSET', automaticBooking: false },
    {
      id: '4',
      number: '3400',
      name: 'Verbindlichkeiten',
      type: 'LIABILITY',
      automaticBooking: false,
    },
    { id: '5', number: '8400', name: 'Umsatzerlöse 19%', type: 'INCOME', automaticBooking: true },
    { id: '6', number: '4400', name: 'Wareneinkauf 19%', type: 'EXPENSE', automaticBooking: false },
  ]);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      name: 'Banküberweisung',
      type: 'BANK_TRANSFER',
      active: true,
      defaultAccount: '1200',
    },
    { id: '2', name: 'Barzahlung', type: 'CASH', active: true, defaultAccount: '1000' },
    { id: '3', name: 'Kreditkarte', type: 'CARD', active: true },
    { id: '4', name: 'PayPal', type: 'PAYPAL', active: false },
  ]);

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([
    {
      id: '1',
      name: 'Geschäftskonto',
      iban: 'DE89 3704 0044 0532 0130 00',
      bic: 'COBADEFFXXX',
      bankName: 'Commerzbank',
      type: 'CHECKING',
      active: true,
    },
    {
      id: '2',
      name: 'Sparkonto',
      iban: 'DE12 5001 0517 0648 4898 72',
      bic: 'INGDDEFFXXX',
      bankName: 'ING Bank',
      type: 'SAVINGS',
      active: true,
    },
  ]);

  const [costCenters, setCostCenters] = useState<CostCenter[]>([
    {
      id: '1',
      number: '100',
      name: 'Verwaltung',
      description: 'Allgemeine Verwaltungskosten',
      active: true,
    },
    {
      id: '2',
      number: '200',
      name: 'Vertrieb',
      description: 'Vertriebskosten und Marketing',
      active: true,
    },
    { id: '3', number: '300', name: 'Produktion', description: 'Produktionskosten', active: false },
  ]);

  // Event handlers
  const handleEditNumberSequence = (sequence: NumberSequence) => {
    console.log('Edit number sequence:', sequence);
  };

  const handleDeleteNumberSequence = (sequence: NumberSequence) => {
    console.log('Delete number sequence:', sequence);
  };

  const handleEditBookingAccount = (account: BookingAccount) => {
    console.log('Edit booking account:', account);
  };

  const handleDeleteBookingAccount = (account: BookingAccount) => {
    console.log('Delete booking account:', account);
  };

  const handleEditPaymentMethod = (method: PaymentMethod) => {
    console.log('Edit payment method:', method);
  };

  const handleTogglePaymentMethod = (method: PaymentMethod) => {
    setPaymentMethods(prev =>
      prev.map(m => (m.id === method.id ? { ...m, active: !m.active } : m))
    );
  };

  const handleEditPaymentAccount = (account: PaymentAccount) => {
    console.log('Edit payment account:', account);
  };

  const handleDeletePaymentAccount = (account: PaymentAccount) => {
    console.log('Delete payment account:', account);
  };

  const handleCreateTransactionRule = () => {
    console.log('Create transaction rule');
  };

  const handleEditCostCenter = (center: CostCenter) => {
    console.log('Edit cost center:', center);
  };

  const handleDeleteCostCenter = (center: CostCenter) => {
    console.log('Delete cost center:', center);
  };

  const handleToggleCostCenter = (center: CostCenter) => {
    setCostCenters(prev => prev.map(c => (c.id === center.id ? { ...c, active: !c.active } : c)));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buchhaltung</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Buchhaltungseinstellungen und Konfigurationen
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Eintrag
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sequences" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Nummernkreise
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Buchungskonten
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Zahlungsmethoden
          </TabsTrigger>
          <TabsTrigger value="payment-accounts" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Zahlungskonten
          </TabsTrigger>
          <TabsTrigger value="transaction-matching" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Transaktionszuordnung
          </TabsTrigger>
          <TabsTrigger value="cost-centers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Kostenstelle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sequences">
          <NumberSequencesTab
            sequences={numberSequences}
            onEdit={handleEditNumberSequence}
            onDelete={handleDeleteNumberSequence}
          />
        </TabsContent>

        <TabsContent value="accounts">
          <BookingAccountsTab
            accounts={bookingAccounts}
            onEdit={handleEditBookingAccount}
            onDelete={handleDeleteBookingAccount}
          />
        </TabsContent>

        <TabsContent value="payment-methods">
          <PaymentMethodsTab
            methods={paymentMethods}
            onEdit={handleEditPaymentMethod}
            onToggleActive={handleTogglePaymentMethod}
          />
        </TabsContent>

        <TabsContent value="payment-accounts">
          <PaymentAccountsTab
            accounts={paymentAccounts}
            onEdit={handleEditPaymentAccount}
            onDelete={handleDeletePaymentAccount}
          />
        </TabsContent>

        <TabsContent value="transaction-matching">
          <TransactionMatchingTab onCreateRule={handleCreateTransactionRule} />
        </TabsContent>

        <TabsContent value="cost-centers">
          <CostCentersTab
            costCenters={costCenters}
            onEdit={handleEditCostCenter}
            onDelete={handleDeleteCostCenter}
            onToggleActive={handleToggleCostCenter}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
