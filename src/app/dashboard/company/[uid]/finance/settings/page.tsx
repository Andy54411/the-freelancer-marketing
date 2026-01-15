'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FinanceSettingsPage() {
  const params = useParams();
  const uid = params?.uid as string;
  const router = useRouter();

  useEffect(() => {
    // Redirect zu Buchhaltungseinstellungen
    router.replace(`/dashboard/company/${uid}/finance/accounting`);
  }, [uid, router]);

  return (
    <div className="container mx-auto p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
      </div>
    </div>
  );
}
