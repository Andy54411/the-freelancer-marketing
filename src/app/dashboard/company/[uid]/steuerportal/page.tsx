'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SteuerberaterPortal } from '@/components/datev/SteuerberaterPortal';

export default function SteuerportalPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

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

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Steuerportal</h1>
        <p className="text-gray-600 mt-1">
          Arbeiten Sie sicher und effizient mit Ihrem Steuerberater zusammen
        </p>
      </div>

      {/* Steuerberater Portal Content */}
      <SteuerberaterPortal companyId={uid} />
    </div>
  );
}
