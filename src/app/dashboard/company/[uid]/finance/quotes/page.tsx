'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentListView, DocumentItem } from '@/components/finance/DocumentListView';
import { QuoteService } from '@/services/quoteService';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function QuotesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [quotes, setQuotes] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user && user.uid === uid) {
      loadQuotes();
    }
  }, [user, uid]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const companyQuotes = await QuoteService.getQuotes(uid);
      // Convert to DocumentItem format
      const docs: DocumentItem[] = companyQuotes.map(q => ({
        id: q.id,
        number: q.number,
        customerName: q.customerName,
        customerEmail: q.customerEmail,
        date: q.date,
        validUntil: q.validUntil,
        status: q.status || 'draft',
        total: q.total,
        amount: q.subtotal,
        items: q.items,
      }));
      setQuotes(docs);
    } catch {
      setError('Fehler beim Laden der Angebote');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToInvoice = (doc: DocumentItem) => {
    router.push(`/dashboard/company/${uid}/finance/invoices/create?quoteId=${doc.id}`);
  };

  const handleDuplicate = (doc: DocumentItem) => {
    router.push(`/dashboard/company/${uid}/finance/quotes/create?duplicateId=${doc.id}`);
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
          <h1 className="text-2xl font-bold text-gray-900">Angebote</h1>
          <Link href={`/dashboard/company/${uid}/finance/quotes/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Angebot erstellen
            </Button>
          </Link>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Angebote werden geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Angebote</h1>
          <Link href={`/dashboard/company/${uid}/finance/quotes/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Angebot erstellen
            </Button>
          </Link>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadQuotes} className="bg-[#14ad9f] hover:bg-taskilo-hover">
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
        <h1 className="text-2xl font-bold text-gray-900">Angebote</h1>
        <Link href={`/dashboard/company/${uid}/finance/quotes/create`}>
          <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Angebot erstellen
          </Button>
        </Link>
      </header>

      <DocumentListView
        documents={quotes}
        documentType="quote"
        companyId={uid}
        basePath={`/dashboard/company/${uid}/finance/quotes`}
        onRefresh={loadQuotes}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        onConvertToInvoice={handleConvertToInvoice}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
