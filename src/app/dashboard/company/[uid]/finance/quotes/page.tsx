'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { QuoteListView } from '@/components/finance/QuoteListView';
import { QuoteService, Quote } from '@/services/quoteService';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Download, Filter } from 'lucide-react';
import Link from 'next/link';

export default function QuotesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [quotes, setQuotes] = useState<Quote[]>([]);
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
      setQuotes(companyQuotes);
    } catch (err) {
      setError('Fehler beim Laden der Angebote');
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
          <h1 className="text-2xl font-bold text-gray-900">Angebote</h1>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Angebot importieren
            </Button>
            <Link href={`/dashboard/company/${uid}/finance/quotes/create`}>
              <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Angebot erstellen
              </Button>
            </Link>
          </div>
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
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Angebot importieren
            </Button>
            <Link href={`/dashboard/company/${uid}/finance/quotes/create`}>
              <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Angebot erstellen
              </Button>
            </Link>
          </div>
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
    <div className="container mx-auto px-6 py-8">
      <QuoteListView 
        quotes={quotes}
        onRefresh={loadQuotes}
        companyId={uid}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
      />
    </div>
  );
}
