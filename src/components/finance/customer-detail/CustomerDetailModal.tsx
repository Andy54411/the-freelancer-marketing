'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Building2, 
  FileText, 
  Receipt, 
  Users, 
  History, 
  Upload, 
  Folder,
  CreditCard 
} from 'lucide-react';
import { Customer } from '../AddCustomerModal';
import { InvoiceData } from '@/types/invoiceTypes';
import { CustomerInfoCard } from './CustomerInfoCard';
import { CustomerInvoiceCard } from './CustomerInvoiceCard';
import { CustomerContactCard } from './CustomerContactCard';
import { CustomerHistoryTab } from './CustomerHistoryTab';
import { CustomerDocumentsTab } from './CustomerDocumentsTab';
import CustomerOrdersTab from './CustomerOrdersTab';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  invoices?: InvoiceData[];
  calendarEvents?: any[];
  loading?: boolean;
  calculatedStats?: {
    totalAmount: number;
    totalInvoices: number;
    totalMeetings?: number;
  };
  onEditContact?: () => void;
  companyId: string;
}

type TabType = 'overview' | 'invoices' | 'contacts' | 'history' | 'documents' | 'orders' | 'credits';

export function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  invoices = [],
  calendarEvents = [],
  loading = false,
  calculatedStats = { totalAmount: 0, totalInvoices: 0, totalMeetings: 0 },
  onEditContact,
  companyId,
}: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [documentsCount, setDocumentsCount] = useState(0);

  if (!customer) return null;

  // Tab definitions
  const tabs = [
    { 
      id: 'overview' as TabType, 
      label: 'Übersicht', 
      icon: Building2, 
      count: null 
    },
    { 
      id: 'invoices' as TabType, 
      label: 'Rechnungen', 
      icon: Receipt, 
      count: invoices.length 
    },
    { 
      id: 'contacts' as TabType, 
      label: 'Kontakte', 
      icon: Users, 
      count: customer.contactPersons?.length || 0 
    },
    { 
      id: 'history' as TabType, 
      label: 'Verlauf', 
      icon: History, 
      count: null 
    },
    { 
      id: 'documents' as TabType, 
      label: 'Dokumente', 
      icon: Upload, 
      count: documentsCount 
    },
    { 
      id: 'orders' as TabType, 
      label: 'Aufträge', 
      icon: Folder, 
      count: 0 
    },
    { 
      id: 'credits' as TabType, 
      label: 'Gutschriften', 
      icon: CreditCard, 
      count: 0 
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-none !w-[95vw] max-h-[90vh] overflow-y-auto"
        style={{ width: '95vw', maxWidth: 'none' }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#14ad9f]" />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#14ad9f]">
                  <path d="M9.75027 5.52371L10.7168 4.55722C13.1264 2.14759 17.0332 2.14759 19.4428 4.55722C21.8524 6.96684 21.8524 10.8736 19.4428 13.2832L18.4742 14.2519M5.52886 9.74513L4.55722 10.7168C2.14759 13.1264 2.1476 17.0332 4.55722 19.4428C6.96684 21.8524 10.8736 21.8524 13.2832 19.4428L14.2478 18.4782M9.5 14.5L14.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"></path>
                </svg>
                {customer.name}
              </DialogTitle>
              <DialogDescription>
                Kunde {customer.customerNumber} - Detailansicht und Verwaltung
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 -mx-6 px-6">
          <nav className="flex space-x-0 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[#14ad9f] text-[#14ad9f] bg-[#14ad9f]/5'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== null && (
                    <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id 
                        ? 'bg-[#14ad9f] text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Linke Spalte: Kundeninformationen (2/3 der Breite) */}
              <div className="lg:col-span-2">
                <CustomerInfoCard 
                  customer={customer} 
                  calculatedStats={calculatedStats} 
                />
              </div>

              {/* Rechte Spalte: Schnellaktionen (1/3 der Breite) */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Schnellaktionen</h3>
                  <div className="space-y-2">
                    <button 
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded border hover:shadow-sm transition-all"
                      onClick={() => setActiveTab('invoices')}
                    >
                      📄 Neue Rechnung erstellen
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded border hover:shadow-sm transition-all"
                      onClick={() => setActiveTab('contacts')}
                    >
                      👥 Kontakt hinzufügen
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded border hover:shadow-sm transition-all">
                      📧 E-Mail senden
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded border hover:shadow-sm transition-all">
                      📞 Anruf protokollieren
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <CustomerInvoiceCard 
              customer={customer} 
              invoices={invoices} 
              loading={loading} 
            />
          )}

          {activeTab === 'contacts' && (
            <CustomerContactCard 
              customer={customer} 
              onEditContact={onEditContact} 
            />
          )}

          {activeTab === 'history' && (
            <CustomerHistoryTab customer={customer} />
          )}

          {activeTab === 'documents' && (
            <CustomerDocumentsTab 
              customer={customer} 
              companyId={companyId}
              onDocumentsCountChange={setDocumentsCount}
            />
          )}

          {activeTab === 'orders' && (
            <CustomerOrdersTab customer={customer} companyId={companyId} />
          )}

          {activeTab === 'credits' && (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Gutschriften (0)</h3>
              <p className="text-sm mb-4">Hier werden alle Gutschriften für diesen Kunden angezeigt</p>
              <button className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors">
                Neue Gutschrift erstellen
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}