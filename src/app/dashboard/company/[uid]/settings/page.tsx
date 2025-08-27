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
    console.log('🔍 Settings page useEffect:', { uid, user: !!user, userUid: user?.uid });

    const loadUserData = async () => {
      if (!uid || !user || user.uid !== uid) {
        console.log('❌ Settings page - authorization failed:', {
          uid,
          user: !!user,
          userUid: user?.uid,
        });
        setLoading(false);
        return;
      }

      console.log('📡 Settings page - loading data for uid:', uid);

      try {
        // Lade Auth-Daten aus users collection
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userDocData = userDoc.data();
          console.log('✅ Settings page - user data loaded:', userDocData);
          setUserData(userDocData);
        } else {
          console.log('❌ Settings page - no user data found');
        }

        // IMMER auch companies collection prüfen (für Firmen)
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        if (companyDoc.exists()) {
          const companyDocData = companyDoc.data();
          console.log('✅ Settings page - company data loaded:', companyDocData);
          setCompanyData(companyDocData);

          // FALLBACK: Wenn keine user data vorhanden, verwende company data als user data
          if (!userDoc.exists()) {
            console.log('🔄 Settings page - using company data as fallback for user data');
            setUserData(companyDocData);
          }
        } else {
          console.log('⚠️ Settings page - no company data found');
        }
      } catch (error) {
        console.error('❌ Settings page - error loading data:', error);
      } finally {
        console.log('✅ Settings page - loading complete');
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

  console.log('🚀 Settings page render:', {
    loading,
    userData: !!userData,
    companyData: !!companyData,
  });

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

  return <SettingsComponent userData={finalData} onDataSaved={handleDataSaved} />;
}
