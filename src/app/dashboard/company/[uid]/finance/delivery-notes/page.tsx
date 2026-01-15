'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentListView, DocumentItem } from '@/components/finance/DocumentListView';
import { DeliveryNoteService } from '@/services/deliveryNoteService';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DeliveryNotesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [deliveryNotes, setDeliveryNotes] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadDeliveryNotes = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      const data = await DeliveryNoteService.getDeliveryNotesByCompany(uid);
      // Convert to DocumentItem format
      const docs: DocumentItem[] = data.map(dn => ({
        id: dn.id,
        deliveryNoteNumber: dn.deliveryNoteNumber,
        number: dn.deliveryNoteNumber,
        customerName: dn.customerName,
        customerEmail: dn.customerEmail,
        date: dn.date || dn.createdAt,
        deliveryDate: dn.deliveryDate,
        status: dn.status || 'draft',
        total: dn.total,
        items: dn.items,
        createdAt: dn.createdAt,
      }));
      setDeliveryNotes(docs);
    } catch {
      setError('Fehler beim Laden der Lieferscheine');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (user && uid) {
      loadDeliveryNotes();
    }
  }, [user, uid, loadDeliveryNotes]);

  const handleMarkAsSent = async (doc: DocumentItem) => {
    try {
      await DeliveryNoteService.markAsSent(doc.id);
      toast.success('Lieferschein als versendet markiert');
      loadDeliveryNotes();
    } catch {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const handleMarkAsDelivered = async (doc: DocumentItem) => {
    try {
      await DeliveryNoteService.markAsDelivered(doc.id);
      toast.success('Lieferschein als zugestellt markiert');
      loadDeliveryNotes();
    } catch {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const handleConvertToInvoice = async (doc: DocumentItem) => {
    router.push(`/dashboard/company/${uid}/finance/invoices/create?deliveryNoteId=${doc.id}`);
  };

  const handleDelete = async (doc: DocumentItem) => {
    try {
      await DeliveryNoteService.deleteDeliveryNote(doc.id);
      toast.success('Lieferschein gelöscht');
      loadDeliveryNotes();
    } catch {
      toast.error('Fehler beim Löschen des Lieferscheins');
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
          <h1 className="text-2xl font-bold text-gray-900">Lieferscheine</h1>
          <Link href={`/dashboard/company/${uid}/finance/delivery-notes/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Lieferschein erstellen
            </Button>
          </Link>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Lieferscheine werden geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Lieferscheine</h1>
          <Link href={`/dashboard/company/${uid}/finance/delivery-notes/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Lieferschein erstellen
            </Button>
          </Link>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadDeliveryNotes} className="bg-[#14ad9f] hover:bg-taskilo-hover">
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
        <h1 className="text-2xl font-bold text-gray-900">Lieferscheine</h1>
        <Link href={`/dashboard/company/${uid}/finance/delivery-notes/create`}>
          <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Lieferschein erstellen
          </Button>
        </Link>
      </header>

      <DocumentListView
        documents={deliveryNotes}
        documentType="delivery-note"
        companyId={uid}
        basePath={`/dashboard/company/${uid}/finance/delivery-notes`}
        onRefresh={loadDeliveryNotes}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        onMarkAsSent={handleMarkAsSent}
        onMarkAsDelivered={handleMarkAsDelivered}
        onConvertToInvoice={handleConvertToInvoice}
        onDelete={handleDelete}
      />
    </div>
  );
}
