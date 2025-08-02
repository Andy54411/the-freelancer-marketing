'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TimeTrackingComponent } from '@/components/finance/TimeTrackingComponent';

export default function TimeTrackingPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">Zeiterfassung</h1>
        <p className="text-gray-600 mt-1">
          Arbeitszeiten erfassen, Projekten zuordnen und automatisch abrechnen
        </p>
      </div>

      <TimeTrackingComponent companyId={uid} userId={uid} />
    </div>
  );
}
