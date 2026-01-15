'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentListView, DocumentItem } from '@/components/finance/DocumentListView';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function CreditsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [stornos, setStornos] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadStornos = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      const allInvoices = await FirestoreInvoiceService.getInvoicesByCompany(uid);
      
      // Filter only storno invoices
      const stornoInvoices = allInvoices.filter(invoice => 
        invoice.isStorno === true || 
        (invoice.invoiceNumber && invoice.invoiceNumber.startsWith('ST-'))
      );
      
      // Convert to DocumentItem format
      const docs: DocumentItem[] = stornoInvoices.map(s => ({
        id: s.id,
        invoiceNumber: s.invoiceNumber || s.number,
        number: s.invoiceNumber || s.number,
        customerName: s.customerName,
        customerEmail: s.customerEmail,
        date: s.date || s.createdAt,
        dueDate: s.dueDate,
        status: s.status || 'draft',
        amount: s.amount,
        total: s.total,
        isStorno: true,
        createdAt: s.createdAt,
      }));
      
      setStornos(docs);
    } catch {
      setError('Fehler beim Laden der Stornorechnungen');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (user && uid) {
      loadStornos();
    }
  }, [user, uid, loadStornos]);

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
          <h1 className="text-2xl font-bold text-gray-900">Stornorechnungen</h1>
          <Link href={`/dashboard/company/${uid}/finance/credits/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Stornorechnung erstellen
            </Button>
          </Link>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Stornorechnungen werden geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Stornorechnungen</h1>
          <Link href={`/dashboard/company/${uid}/finance/credits/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Stornorechnung erstellen
            </Button>
          </Link>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadStornos} className="bg-[#14ad9f] hover:bg-taskilo-hover">
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
        <h1 className="text-2xl font-bold text-gray-900">Stornorechnungen</h1>
        <Link href={`/dashboard/company/${uid}/finance/credits/create`}>
          <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Stornorechnung erstellen
          </Button>
        </Link>
      </header>

      <DocumentListView
        documents={stornos}
        documentType="credit"
        companyId={uid}
        basePath={`/dashboard/company/${uid}/finance/credits`}
        onRefresh={loadStornos}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
      />
    </div>
  );
}
