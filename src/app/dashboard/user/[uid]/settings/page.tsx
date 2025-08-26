// /Users/andystaudinger/Taskilo/src/app/dashboard/user/[uid]/settings/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; // Importiere useAuth
import { User as FirebaseUser } from 'firebase/auth'; // Importiere den User-Typ
import UserHeader from '@/components/UserHeader'; // Importiere die UserHeader-Komponente als Standard-Export
import { doc, getDoc } from 'firebase/firestore';
import { db, app } from '@/firebase/clients';
import SettingsComponent from '@/components/dashboard/SettingsComponent'; // Import SettingsComponent
import { RawFirestoreUserData } from '@/components/dashboard/SettingsComponent'; // Import Interface
import UserSettingsPage from '@/app/dashboard/user/[uid]/components/UserSettingsPage'; // NEU: Import für User-Einstellungen‚
import { Loader2 as FiLoader, AlertCircle as FiAlertCircle } from 'lucide-react';

export default function UserSettingsDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const pageUid = typeof params?.uid === 'string' ? params.uid : '';

  const { user: globalCurrentUser, loading: authLoading } = useAuth();

  const [currentUser, setCurrentUser] = useState<typeof globalCurrentUser>(null);
  const [userData, setUserData] = useState<RawFirestoreUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        setUserData({ uid: userDocSnap.id, ...userDocSnap.data() } as RawFirestoreUserData);
      } else {
        setError('Benutzerdaten nicht gefunden.');
      }
    } catch (err: any) {
      setError(`Fehler beim Laden der Daten: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (globalCurrentUser) {
      setCurrentUser(globalCurrentUser);
      // Daten nur abrufen, wenn die UID mit der Seiten-UID übereinstimmt
      if (globalCurrentUser.uid === pageUid) {
        fetchUserData(globalCurrentUser.uid);
      } else {
        router.replace(`/dashboard/user/${globalCurrentUser.uid}/settings`);
      }
    } else {
      router.replace(`/login?redirectTo=/dashboard/user/${pageUid}/settings`);
    }
  }, [pageUid, router, fetchUserData, globalCurrentUser, authLoading]); // Add globalCurrentUser and authLoading to dependencies

  const handleDataSaved = () => {
    // Daten neu laden oder eine Erfolgsmeldung anzeigen
    if (currentUser) {
      fetchUserData(currentUser.uid);
    }
    // Optional: toast.success('Einstellungen erfolgreich gespeichert!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Lade Einstellungen...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        <FiAlertCircle className="mr-2" /> {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {' '}
      {/* Header is now provided by layout.tsx */}
      <main className="flex-1 overflow-y-auto pt-[var(--global-header-height)]">
        {' '}
        {/* Hauptinhaltsbereich, der scrollbar ist, mit Padding */}
        {/* Check if user has company data by checking for company-specific fields */}
        {userData?.companyName || userData?.selectedCategory ? (
          <SettingsComponent userData={userData} onDataSaved={handleDataSaved} />
        ) : (
          <UserSettingsPage userData={userData} onDataSaved={handleDataSaved} />
        )}
      </main>
    </div>
  );
}
