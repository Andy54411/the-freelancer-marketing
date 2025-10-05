'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SuppliersPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Weiterleitung zur neuen einheitlichen Contacts-Seite mit Lieferanten-Filter
  useEffect(() => {
    if (user && user.uid === uid) {
      router.replace(`/dashboard/company/${uid}/finance/contacts?tab=suppliers`);
    }
  }, [user, uid, router]);

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
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
        <p className="text-gray-600">Weiterleitung zur Geschäftspartner-Seite...</p>
      </div>
    </div>
  );
}
