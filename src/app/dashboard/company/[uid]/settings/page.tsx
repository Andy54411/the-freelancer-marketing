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
    console.log('🔧 Settings Page: useEffect triggered', { uid, user: user?.uid, hasUser: !!user });

    const loadUserData = async () => {
      console.log('🔄 Settings Page: Starting loadUserData', { uid, userUid: user?.uid });

      if (!uid) {
        console.log('❌ Settings Page: No UID provided');
        setLoading(false);
        return;
      }

      if (!user) {
        console.log('⏳ Settings Page: No user yet, waiting...');
        return; // Don't set loading to false yet, wait for user
      }

      if (user.uid !== uid) {
        console.log('❌ Settings Page: User UID mismatch', { userUid: user.uid, paramUid: uid });
        setLoading(false);
        return;
      }

      try {
        console.log(
          '📄 Settings Page: Loading company document first (since this is company dashboard)...'
        );
        // Für Company-Dashboard: Lade zuerst companies collection
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        if (companyDoc.exists()) {
          const companyDocData = companyDoc.data();
          console.log('✅ Settings Page: Company document loaded', companyDocData);
          setCompanyData(companyDocData);

          // Setze Company-Daten auch als userData für Kompatibilität
          setUserData(companyDocData);
        } else {
          console.log('❌ Settings Page: No company document found, trying users collection...');

          // Fallback: Versuche users collection
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userDocData = userDoc.data();
            console.log('✅ Settings Page: User document loaded as fallback', userDocData);
            setUserData(userDocData);
          } else {
            console.log('❌ Settings Page: Neither company nor user document exists');
            // Erstelle ein minimales userData Objekt basierend auf dem Auth-User
            if (user) {
              console.log('🔧 Settings Page: Creating minimal userData from auth user');
              setUserData({
                uid: user.uid,
                email: user.email || '',
                user_type: 'company',
                firstName: '',
                lastName: '',
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Settings Page: Error loading user/company data:', error);
      } finally {
        console.log('✅ Settings Page: Loading complete, setting loading to false');
        setLoading(false);
      }
    };

    loadUserData();
  }, [uid, user]);

  // DEBUG: Log combined data when it changes
  useEffect(() => {
    if (userData || companyData) {
      const combinedForDebug = companyData ? { ...userData, ...companyData } : userData;
      console.log('🔍 Settings Data Debug:', {
        userData: userData,
        companyData: companyData,
        combinedData: combinedForDebug,
        userType: userData?.user_type,
        languages: {
          inUserData: userData?.languages || userData?.['step2.languages'],
          inCompanyData: companyData?.languages || companyData?.['step2.languages'],
          inCombined: combinedForDebug?.languages || combinedForDebug?.['step2.languages'],
        },
      });
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
      } catch (error) {
        console.error('Error reloading data:', error);
      }
    }
  };

  // Kombiniere die Daten stabil ohne useMemo um Hook-Reihenfolge zu erhalten
  let finalData = userData;
  if (companyData && userData) {
    finalData = { ...userData, ...companyData };
  }

  // Fallback: Wenn keine Daten vorhanden sind, aber wir einen eingeloggten User haben, erstelle Basis-Daten
  if (!finalData && user && !loading) {
    console.log('🔧 Settings Page: Creating fallback userData for user:', user);
    finalData = {
      uid: user.uid,
      email: user.email || '',
      user_type: 'company', // Standard für Company-Dashboard
      firstName: '',
      lastName: '',
      phoneNumber: '',
      companyName: '',
      // Weitere Basis-Eigenschaften...
    };
  }

  return <SettingsComponent userData={finalData} onDataSaved={handleDataSaved} />;
}
