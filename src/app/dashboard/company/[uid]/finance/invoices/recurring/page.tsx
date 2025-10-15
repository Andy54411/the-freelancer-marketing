'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceListView } from '@/components/finance/InvoiceListView';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceData } from '@/types/invoiceTypes';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function RecurringInvoicesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Get initial tab from URL parameters
  const initialTab = searchParams?.get('tab') || 'all';

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user && user.uid === uid) {
      loadRecurringInvoices();
    }
  }, [user, uid]);

  // Update active tab when URL parameters change
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab') || 'all';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const loadRecurringInvoices = async () => {
    try {
      setLoading(true);
      // TODO: Implementiere Service für wiederkehrende Rechnungen
      // Für jetzt laden wir alle Rechnungen und filtern später
      const companyInvoices = await FirestoreInvoiceService.getInvoicesByCompany(uid);
      
      // Filter für wiederkehrende Rechnungen (wenn das Feld existiert)
      const recurringInvoices = companyInvoices.filter(
        (invoice) => invoice.isRecurring === true || invoice.recurringPattern
      );
      
      setInvoices(recurringInvoices);
    } catch (err) {
      setError('Fehler beim Laden der wiederkehrenden Rechnungen');
    } finally {
      setLoading(false);
    }
  };

  // Autorisierung prüfen
  if (!user || user.uid !== uid) {
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
            <p className="text-gray-600 text-sm mt-1">
              Verwalten Sie Abo-Rechnungen und wiederkehrende Leistungen
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
              <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Abo-Rechnung erstellen
              </Button>
            </Link>
          </div>
        </header>
        
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Wiederkehrende Rechnungen werden geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
            <p className="text-gray-600 text-sm mt-1">
              Verwalten Sie Abo-Rechnungen und wiederkehrende Leistungen
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
              <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Abo-Rechnung erstellen
              </Button>
            </Link>
          </div>
        </header>
        
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadRecurringInvoices} className="bg-[#14ad9f] hover:bg-[#129488]">
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
          <p className="text-gray-600 text-sm mt-1">
            Verwalten Sie Abo-Rechnungen und wiederkehrende Leistungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadRecurringInvoices}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </Button>
          <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Abo-Rechnung erstellen
            </Button>
          </Link>
        </div>
      </header>

      {invoices.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#14ad9f]/10 flex items-center justify-center mb-4">
            <RefreshCw className="h-6 w-6 text-[#14ad9f]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Noch keine wiederkehrenden Rechnungen
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Erstellen Sie Ihre erste Abo-Rechnung für wiederkehrende Leistungen wie Monatsabos,
            Wartungsverträge oder regelmäßige Dienstleistungen.
          </p>
          <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Erste Abo-Rechnung erstellen
            </Button>
          </Link>
        </div>
      ) : (
        <InvoiceListView
          invoices={invoices}
          onRefresh={loadRecurringInvoices}
          companyId={uid}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
        />
      )}
    </div>
  );
}
