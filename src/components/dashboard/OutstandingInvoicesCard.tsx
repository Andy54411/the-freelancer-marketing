'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  dueDate: string;
  issueDate: string;
  customerName: string;
  amount: number;
  tax: number;
}

interface InvoiceStats {
  totalAmount: number;
  overdueCount: number;
  overdueAmount: number;
  openCount: number;
  openAmount: number;
  partiallyPaidCount: number;
  partiallyPaidAmount: number;
}

export default function OutstandingInvoicesCard() {
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats>({
    totalAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    openCount: 0,
    openAmount: 0,
    partiallyPaidCount: 0,
    partiallyPaidAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2).replace('.', ',')}\u00A0€`;
  };

  const isOverdue = (dueDate: string): boolean => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const loadInvoiceData = async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      console.log('🔄 Loading outstanding invoices for company:', user.uid);

      const invoicesRef = collection(db, 'companies', user.uid, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('status', '!=', 'paid') // Alle nicht bezahlten Rechnungen
      );
      
      const snapshot = await getDocs(invoicesQuery);
      const invoices: Invoice[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        invoices.push({
          id: doc.id,
          invoiceNumber: data.invoiceNumber || data.number || 'N/A',
          status: data.status || 'unknown',
          total: data.total || 0,
          dueDate: data.dueDate || '',
          issueDate: data.issueDate || data.date || '',
          customerName: data.customerName || 'Unbekannt',
          amount: data.amount || data.total || 0,
          tax: data.tax || 0,
        });
      });

      console.log('📊 Loaded invoices:', invoices.length, 'invoices');

      // Berechne Statistiken
      let totalAmount = 0;
      let overdueCount = 0;
      let overdueAmount = 0;
      let openCount = 0;
      let openAmount = 0;
      let partiallyPaidCount = 0;
      let partiallyPaidAmount = 0;

      invoices.forEach((invoice) => {
        const amount = invoice.total || invoice.amount || 0;
        
        // Bestimme Status
        if (invoice.status === 'partially_paid') {
          partiallyPaidCount++;
          partiallyPaidAmount += amount;
        } else if (isOverdue(invoice.dueDate)) {
          overdueCount++;
          overdueAmount += amount;
        } else if (invoice.status === 'finalized' || invoice.status === 'sent' || invoice.status === 'open') {
          openCount++;
          openAmount += amount;
        }

        totalAmount += amount;
      });

      setInvoiceStats({
        totalAmount,
        overdueCount,
        overdueAmount,
        openCount,
        openAmount,
        partiallyPaidCount,
        partiallyPaidAmount,
      });

      console.log('✅ Invoice stats calculated:', {
        totalAmount,
        overdueCount,
        overdueAmount,
        openCount,
        openAmount,
        partiallyPaidCount,
        partiallyPaidAmount,
      });

    } catch (error) {
      console.error('❌ Error loading invoice data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceData();
  }, [user?.uid]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Lade Rechnungsdaten...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ausstehende Rechnungen</h2>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-gray-600">Ausstehender Betrag</div>
              <div className="text-2xl font-bold text-gray-900">{formatAmount(invoiceStats.totalAmount)}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Link href={`/dashboard/company/${user?.uid}/finance/invoices?tab=overdue`} className="block">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    invoiceStats.overdueCount > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invoiceStats.overdueCount}
                  </span>
                  <span className="text-sm font-medium text-gray-900">Fällig</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{formatAmount(invoiceStats.overdueAmount)}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                    <path d="M10 16L13.6464 12.3536C13.8417 12.1583 13.8417 11.8417 13.6464 11.6464L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
            
            <Link href={`/dashboard/company/${user?.uid}/finance/invoices?tab=open`} className="block">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    invoiceStats.openCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invoiceStats.openCount}
                  </span>
                  <span className="text-sm font-medium text-gray-900">Offen</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{formatAmount(invoiceStats.openAmount)}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                    <path d="M10 16L13.6464 12.3536C13.8417 12.1583 13.8417 11.8417 13.6464 11.6464L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
            
            <Link href={`/dashboard/company/${user?.uid}/finance/invoices?tab=all&filter=partial`} className="block">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    invoiceStats.partiallyPaidCount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invoiceStats.partiallyPaidCount}
                  </span>
                  <span className="text-sm font-medium text-gray-900">Teilbezahlt</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{formatAmount(invoiceStats.partiallyPaidAmount)}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                    <path d="M10 16L13.6464 12.3536C13.8417 12.1583 13.8417 11.8417 13.6464 11.6464L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <Link href={`/dashboard/company/${user?.uid}/finance/invoices?tab=overdue`} className="text-sm text-[#14ad9f] hover:text-[#129a8f] font-medium flex items-center gap-2 transition-colors">
          Alle Rechnungen verwalten
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14.3322 5.83209L19.8751 11.375C20.2656 11.7655 20.2656 12.3987 19.8751 12.7892L14.3322 18.3321M19.3322 12.0821H3.83218" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}