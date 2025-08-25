'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceComponent } from '@/components/finance/InvoiceComponent';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceData } from '@/types/invoiceTypes';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function InvoicesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.uid === uid) {
      loadInvoices();
    }
  }, [user, uid]);

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
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Rechnungen und deren Status</p>
        </div>
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
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Rechnungen und deren Status</p>
        </div>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadInvoices} className="bg-[#14ad9f] hover:bg-[#129488]">
              Erneut versuchen
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Rechnungen und deren Status</p>
        </div>
        <Link href={`/dashboard/company/${uid}/finance/invoices/create`}>
          <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Neue Rechnung
          </Button>
        </Link>
      </div>

      <InvoiceComponent invoices={invoices} onRefresh={loadInvoices} companyId={uid} />
    </div>
  );
}
