'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentListView, DocumentItem } from '@/components/finance/DocumentListView';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/firebase/clients';
import { collection, getDocs, query, Timestamp } from 'firebase/firestore';

export default function OrderConfirmationsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [confirmations, setConfirmations] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadConfirmations = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      const confirmationsRef = collection(db, 'companies', uid, 'orderConfirmations');
      const q = query(confirmationsRef);
      const snapshot = await getDocs(q);

      const docs: DocumentItem[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          confirmationNumber: d.confirmationNumber,
          number: d.confirmationNumber || d.number,
          customerName: d.customerName || d.customer?.name,
          customerEmail: d.customerEmail || d.customer?.email,
          date: d.date instanceof Timestamp ? d.date.toDate() : d.date ? new Date(d.date) : new Date(),
          status: d.status || 'draft',
          total: d.total || d.grandTotal || 0,
          amount: d.subtotal || 0,
          items: d.items || [],
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
        };
      });

      // Sort by date descending
      docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setConfirmations(docs);
    } catch {
      setError('Fehler beim Laden der Auftragsbestätigungen');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (uid && user) {
      loadConfirmations();
    }
  }, [uid, user, loadConfirmations]);

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
          <h1 className="text-2xl font-bold text-gray-900">Auftragsbestätigungen</h1>
          <Link href={`/dashboard/company/${uid}/finance/order-confirmations/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Auftragsbestätigung erstellen
            </Button>
          </Link>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Auftragsbestätigungen werden geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Auftragsbestätigungen</h1>
          <Link href={`/dashboard/company/${uid}/finance/order-confirmations/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Auftragsbestätigung erstellen
            </Button>
          </Link>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadConfirmations} className="bg-[#14ad9f] hover:bg-taskilo-hover">
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
        <h1 className="text-2xl font-bold text-gray-900">Auftragsbestätigungen</h1>
        <Link href={`/dashboard/company/${uid}/finance/order-confirmations/create`}>
          <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Auftragsbestätigung erstellen
          </Button>
        </Link>
      </header>

      <DocumentListView
        documents={confirmations}
        documentType="order-confirmation"
        companyId={uid}
        basePath={`/dashboard/company/${uid}/finance/order-confirmations`}
        onRefresh={loadConfirmations}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
      />
    </div>
  );
}
