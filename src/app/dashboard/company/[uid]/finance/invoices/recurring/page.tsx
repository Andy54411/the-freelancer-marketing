'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RecurringInvoicesPage() {
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
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Rechnungen</h1>
        <p className="text-gray-600 mt-1">
          Erstellen und verwalten Sie wiederkehrende (Abo-)Rechnungen für regelmäßige Leistungen.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <p className="text-gray-700">
          Diese Funktion ist in Vorbereitung. Sie werden hier demnächst Vorlagen, Intervalle und
          Automatisierung für wiederkehrende Rechnungen verwalten können.
        </p>
      </div>
    </div>
  );
}
