'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EInvoiceComponent } from '@/components/finance/EInvoiceComponent';

export default function EInvoicesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

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

  return (
    <div className="space-y-6">
      <EInvoiceComponent companyId={uid} />
    </div>
  );
}
