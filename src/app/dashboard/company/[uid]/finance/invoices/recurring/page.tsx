'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentListView, DocumentItem } from '@/components/finance/DocumentListView';
import { RecurringInvoiceService, RecurringInvoiceTemplate } from '@/services/recurringInvoiceService';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RecurringInvoicesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Get initial tab from URL parameters
  const initialTab = searchParams?.get('tab') || 'all';

  const [templates, setTemplates] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [showFilters, setShowFilters] = useState(false);

  const loadRecurringInvoices = useCallback(async () => {
    if (!user || user.uid !== uid) return;
    try {
      setLoading(true);
      const loadedTemplates = await RecurringInvoiceService.getRecurringInvoices(uid);
      
      // Convert to DocumentItem format
      const docs: DocumentItem[] = loadedTemplates.map((t: RecurringInvoiceTemplate) => ({
        id: t.id,
        number: t.id,
        title: t.title,
        customerName: t.customerName,
        customerEmail: t.customerEmail,
        date: t.recurringStartDate,
        status: t.recurringStatus || 'active',
        recurringStatus: t.recurringStatus,
        recurringInterval: t.recurringInterval,
        recurringNextExecutionDate: t.recurringNextExecutionDate,
        total: t.total,
        items: t.items,
      }));
      
      setTemplates(docs);
      setError(null);
    } catch {
      setError('Fehler beim Laden der wiederkehrenden Rechnungen');
    } finally {
      setLoading(false);
    }
  }, [user, uid]);

  useEffect(() => {
    loadRecurringInvoices();
  }, [loadRecurringInvoices]);

  // Update active tab when URL parameters change
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab') || 'all';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const handlePauseResume = async (doc: DocumentItem) => {
    try {
      const newStatus = doc.recurringStatus === 'active' ? 'paused' : 'active';
      await RecurringInvoiceService.updateRecurringInvoiceStatus(uid, doc.id, newStatus);
      toast.success(
        newStatus === 'active'
          ? 'Wiederkehrende Rechnung wurde fortgesetzt'
          : 'Wiederkehrende Rechnung wurde pausiert'
      );
      loadRecurringInvoices();
    } catch {
      toast.error('Fehler beim Ändern des Status');
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm('Möchten Sie diese wiederkehrende Rechnung wirklich löschen?')) {
      return;
    }
    try {
      await RecurringInvoiceService.deleteRecurringInvoice(uid, doc.id);
      toast.success('Wiederkehrende Rechnung wurde gelöscht');
      loadRecurringInvoices();
    } catch {
      toast.error('Fehler beim Löschen');
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
          <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
          <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Abo-Rechnung erstellen
            </Button>
          </Link>
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
          <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
          <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Abo-Rechnung erstellen
            </Button>
          </Link>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadRecurringInvoices} className="bg-[#14ad9f] hover:bg-taskilo-hover">
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
        <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
        <Link href={`/dashboard/company/${uid}/finance/invoices/recurring/create`}>
          <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Abo-Rechnung erstellen
          </Button>
        </Link>
      </header>

      <DocumentListView
        documents={templates}
        documentType="recurring-invoice"
        companyId={uid}
        basePath={`/dashboard/company/${uid}/finance/invoices/recurring`}
        onRefresh={loadRecurringInvoices}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        onPauseResume={handlePauseResume}
        onDelete={handleDelete}
      />
    </div>
  );
}
