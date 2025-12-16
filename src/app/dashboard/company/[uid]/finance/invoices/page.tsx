'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceListView } from '@/components/finance/InvoiceListView';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceData } from '@/types/invoiceTypes';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Download, Filter } from 'lucide-react';
import Link from 'next/link';
import { ImportXRechnungDialog } from '@/components/finance/ImportXRechnungDialog';

export default function InvoicesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Get initial tab from URL parameters
  const initialTab = searchParams?.get('tab') || 'all';
  const initialFilter = searchParams?.get('filter');

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showFilters, setShowFilters] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    if (user && user.uid === uid) {
      loadInvoices();
    }
  }, [user, uid]);

  // Update active tab when URL parameters change
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab') || 'all';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const companyInvoices = await FirestoreInvoiceService.getInvoicesByCompany(uid);
      setInvoices(companyInvoices);
    } catch (err) {
      setError('Fehler beim Laden der Rechnungen');
    } finally {
      setLoading(false);
    }
  };

  // Autorisierung prüfen
  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setShowImportDialog(true)}
            >
              <FileText className="h-4 w-4" />
              E-Rechnung lesen
            </Button>
            <Link href={`/dashboard/company/${uid}/finance/invoices/create`}>
              <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Rechnung schreiben
              </Button>
            </Link>
          </div>
        </header>
        
        <ImportXRechnungDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          companyId={uid}
          onSuccess={loadInvoices}
          defaultType="income" // 🎯 Default: Einnahme (da wir auf Invoices-Seite sind)
        />
        
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Rechnungen werden geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setShowImportDialog(true)}
            >
              <FileText className="h-4 w-4" />
              E-Rechnung lesen
            </Button>
            <Link href={`/dashboard/company/${uid}/finance/invoices/create`}>
              <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Rechnung schreiben
              </Button>
            </Link>
          </div>
        </header>
        
        <ImportXRechnungDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          companyId={uid}
          onSuccess={loadInvoices}
          defaultType="income" // 🎯 Default: Einnahme (da wir auf Invoices-Seite sind)
        />
        
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadInvoices} className="bg-[#14ad9f] hover:bg-taskilo-hover">
              Erneut versuchen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setShowImportDialog(true)}
          >
            <FileText className="h-4 w-4" />
            E-Rechnung lesen
          </Button>
          <Link href={`/dashboard/company/${uid}/finance/invoices/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Rechnung schreiben
            </Button>
          </Link>
        </div>
      </header>

      <ImportXRechnungDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        companyId={uid}
        onSuccess={loadInvoices}
        defaultType="income" // 🎯 Default: Einnahme (da wir auf Invoices-Seite sind)
      />

      <InvoiceListView
        invoices={invoices}
        onRefresh={loadInvoices}
        companyId={uid}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
      />
    </div>
  );
}
