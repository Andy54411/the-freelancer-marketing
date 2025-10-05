'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
// Entfernt: Tabs Import - verwenden jetzt custom Tab-Leiste
import { Button } from '@/components/ui/button';
import { Calculator, Hash, CreditCard, Wallet, ArrowLeftRight, Building2, Shield } from 'lucide-react';

// Import Tab Components
import NumberSequencesTab from '@/components/accounting/NumberSequencesTab';
import BookingAccountsTab from '@/components/accounting/BookingAccountsTab';
import PaymentMethodsTab, { PaymentMethod } from '@/components/accounting/PaymentMethodsTab';
import PaymentAccountsTab, { PaymentAccount } from '@/components/accounting/PaymentAccountsTab';
import TransactionMatchingTab from '@/components/accounting/TransactionMatchingTab';
import CostCentersTab, { CostCenter } from '@/components/accounting/CostCentersTab';
import { GoBDSystem } from '@/components/finance/gobd';

// Import Services
import { NumberSequenceService, NumberSequence } from '@/services/numberSequenceService';

export default function AccountingPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const [activeTab, setActiveTab] = useState('sequences');

  // State für Nummerkreise - wird aus der Datenbank geladen
  const [numberSequences, setNumberSequences] = useState<NumberSequence[]>([]);
  const [loadingSequences, setLoadingSequences] = useState(true);

  // Lade Nummerkreise aus der Datenbank
  useEffect(() => {
    const loadNumberSequences = async () => {
      if (!uid) return;

      try {
        setLoadingSequences(true);
        const sequences = await NumberSequenceService.getNumberSequences(uid);
        setNumberSequences(sequences);
      } catch (error) {
        console.error('Fehler beim Laden der Nummerkreise:', error);
        // Fallback: Erstelle Standard-Nummerkreise wenn keine existieren
        try {
          const defaultSequences = await NumberSequenceService.createDefaultSequences(uid);
          setNumberSequences(defaultSequences);
        } catch (createError) {
          console.error('Fehler beim Erstellen der Standard-Nummerkreise:', createError);
        }
      } finally {
        setLoadingSequences(false);
      }
    };

    loadNumberSequences();
  }, [uid]);

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
  const handleEditNumberSequence = (sequence: NumberSequence) => {};

  const handleDeleteNumberSequence = (sequence: NumberSequence) => {};

  const handleUpdateNumberSequence = async (updates: Partial<NumberSequence> & { id: string }) => {
    try {
      // Aktualisiere die Datenbank
      await NumberSequenceService.updateNumberSequence(uid, updates.id, {
        format: updates.format,
        nextNumber: updates.nextNumber,
      });

      // Aktualisiere den lokalen State
      setNumberSequences(prev =>
        prev.map(seq => (seq.id === updates.id ? { ...seq, ...updates } : seq))
      );
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Nummerkreises:', error);
    }
  };

  const handleEditPaymentMethod = (method: PaymentMethod) => {};

  const handleTogglePaymentMethod = (method: PaymentMethod) => {
    setPaymentMethods(prev =>
      prev.map(m => (m.id === method.id ? { ...m, active: !m.active } : m))
    );
  };

  const handleEditPaymentAccount = (account: PaymentAccount) => {};

  const handleDeletePaymentAccount = (account: PaymentAccount) => {};

  const handleCreateTransactionRule = () => {};

  const handleEditCostCenter = (center: CostCenter) => {};

  const handleDeleteCostCenter = (center: CostCenter) => {};

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
      </div>

      {/* NEUE CUSTOM TAB-LEISTE - Taskilo Design */}
      <div className="space-y-6">
        <div className="bg-gray-100 p-1 rounded-lg">
          <nav className="grid w-full grid-cols-7 gap-1">
            <button
              onClick={() => setActiveTab('sequences')}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'sequences'
                  ? 'bg-[#14ad9f] text-white shadow-sm'
                  : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Hash className="h-4 w-4" />
              Nummernkreise
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'accounts'
                  ? 'bg-[#14ad9f] text-white shadow-sm'
                  : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calculator className="h-4 w-4" />
              Buchungskonten
            </button>
            <button
              onClick={() => setActiveTab('payment-methods')}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'payment-methods'
                  ? 'bg-[#14ad9f] text-white shadow-sm'
                  : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Zahlungsmethoden
            </button>
            <button
              onClick={() => setActiveTab('payment-accounts')}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'payment-accounts'
                  ? 'bg-[#14ad9f] text-white shadow-sm'
                  : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Wallet className="h-4 w-4" />
              Zahlungskonten
            </button>
            <button
              onClick={() => setActiveTab('transaction-matching')}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'transaction-matching'
                  ? 'bg-[#14ad9f] text-white shadow-sm'
                  : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transaktionszuordnung
            </button>
            <button
              onClick={() => setActiveTab('cost-centers')}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'cost-centers'
                  ? 'bg-[#14ad9f] text-white shadow-sm'
                  : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Kostenstelle
            </button>
            <button
              onClick={() => setActiveTab('gobd')}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'gobd'
                  ? 'bg-[#14ad9f] text-white shadow-sm'
                  : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Shield className="h-4 w-4" />
              GoBD
            </button>
          </nav>
        </div>

        {/* TAB CONTENT */}
        <div>
          {activeTab === 'sequences' && (
            <NumberSequencesTab
              sequences={numberSequences}
              onEdit={handleEditNumberSequence}
              onDelete={handleDeleteNumberSequence}
              onUpdate={handleUpdateNumberSequence}
            />
          )}
          {activeTab === 'accounts' && <BookingAccountsTab companyUid={uid} />}
          {activeTab === 'payment-methods' && (
            <PaymentMethodsTab
              methods={paymentMethods}
              onEdit={handleEditPaymentMethod}
              onToggleActive={handleTogglePaymentMethod}
            />
          )}
          {activeTab === 'payment-accounts' && (
            <PaymentAccountsTab
              accounts={paymentAccounts}
              onEdit={handleEditPaymentAccount}
              onDelete={handleDeletePaymentAccount}
            />
          )}
          {activeTab === 'transaction-matching' && (
            <TransactionMatchingTab onCreateRule={handleCreateTransactionRule} />
          )}
          {activeTab === 'cost-centers' && (
            <CostCentersTab
              costCenters={costCenters}
              onEdit={handleEditCostCenter}
              onDelete={handleDeleteCostCenter}
              onToggleActive={handleToggleCostCenter}
            />
          )}
          {activeTab === 'gobd' && (
            <GoBDSystem companyId={uid} />
          )}
        </div>
      </div>
    </div>
  );
}
