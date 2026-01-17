'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/clients';
import CompanyReviewManagement from '@/components/CompanyReviewManagement';
import { Loader2 } from 'lucide-react';

export default function CompanyReviewsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Hier würdest du normalerweise die Company-Daten aus deiner Datenbank laden
        // Beispiel-Implementation:
        setCompanyData({
          id: currentUser.uid, // oder die echte Company ID
          name: currentUser.displayName || 'Beispiel Firma GmbH', // oder der echte Firmenname
        });
      }
    });

    // Use setTimeout to defer unsubscribe and avoid Firestore internal assertion errors
    return () => { setTimeout(() => unsubscribe(), 0); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
        <span className="ml-2">Laden...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Anmeldung erforderlich</h1>
          <p className="text-gray-600">
            Sie müssen angemeldet sein, um auf Bewertungen zu antworten.
          </p>
        </div>
      </div>
    );
  }

  if (!companyData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
        <span className="ml-2">Firmendaten werden geladen...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bewertungen verwalten</h1>
          <p className="text-gray-600">
            Antworten Sie auf Kundenbewertungen und verbessern Sie Ihre Online-Präsenz.
          </p>
        </div>

        <CompanyReviewManagement companyId={companyData.id} companyName={companyData.name} />
      </div>
    </div>
  );
}
