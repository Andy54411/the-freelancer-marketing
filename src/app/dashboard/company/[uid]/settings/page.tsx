'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import SettingsComponent from '@/components/dashboard/SettingsComponent';

export default function SettingsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const [userData, setUserData] = useState<any | null>(null);
  const [companyData, setCompanyData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (!uid) {
        setLoading(false);
        return;
      }

      if (!user) {
        return; // Don't set loading to false yet, wait for user
      }

      if (user.uid !== uid) {
        setLoading(false);
        return;
      }

      try {
        // Für Company-Dashboard: Lade zuerst companies collection
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        if (companyDoc.exists()) {
          const companyDocData = companyDoc.data();

          setCompanyData(companyDocData);

          // Setze Company-Daten auch als userData für Kompatibilität
          setUserData(companyDocData);
        } else {
          // Fallback: Versuche users collection
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userDocData = userDoc.data();

            setUserData(userDocData);
          } else {
            // Erstelle ein minimales userData Objekt basierend auf dem Auth-User
            if (user) {
              setUserData({
                uid: user.uid,
                email: user.email || '',
                user_type: 'firma',
                firstName: '',
                lastName: '',
              });
            }
          }
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [uid, user]);

  // DEBUG: Log combined data when it changes
  useEffect(() => {
    if (userData || companyData) {
      const combinedForDebug = companyData ? { ...userData, ...companyData } : userData;
    }
  }, [userData, companyData]);

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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Laden...</h2>
          <p className="text-gray-600">Benutzerdaten werden geladen...</p>
        </div>
      </div>
    );
  }

  const handleDataSaved = async () => {
    // Benutzerdaten neu laden nach dem Speichern
    if (uid) {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userDocData = userDoc.data();
          setUserData(userDocData);

          // Check if user is a company by checking companies collection
          const companyDoc = await getDoc(doc(db, 'companies', uid));
          if (companyDoc.exists()) {
            setCompanyData(companyDoc.data());
          }
        }
      } catch (error) {}
    }
  };

  // Kombiniere die Daten stabil ohne useMemo um Hook-Reihenfolge zu erhalten
  let finalData = userData;
  if (companyData && userData) {
    finalData = { ...userData, ...companyData };
  }

  // Fallback: Wenn keine Daten vorhanden sind, aber wir einen eingeloggten User haben, erstelle Basis-Daten
  if (!finalData && user && !loading) {
    finalData = {
      uid: user.uid,
      email: user.email || '',
      user_type: 'firma', // Standard für Company-Dashboard
      firstName: '',
      lastName: '',
      phoneNumber: '',
      companyName: '',
      // Weitere Basis-Eigenschaften...
    };
  }

  return <SettingsComponent userData={finalData} onDataSaved={handleDataSaved} />;
}
