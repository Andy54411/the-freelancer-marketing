'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase/clients';
import { onAuthStateChanged } from 'firebase/auth';

export default function DashboardProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        // User ist eingeloggt, leite zur Profile-Seite mit der User-ID weiter
        router.replace(`/profile/${user.uid}`);
      } else {
        // User ist nicht eingeloggt, leite zur Login-Seite weiter
        router.replace('/');
      }
    });

    // Use setTimeout to defer unsubscribe and avoid Firestore internal assertion errors
    return () => { setTimeout(() => unsubscribe(), 0); };
  }, [router]);

  // Zeige einen Loading-Spinner während der Weiterleitung
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
        <p className="text-gray-600">Weiterleitung zum Profil...</p>
      </div>
    </div>
  );
}
