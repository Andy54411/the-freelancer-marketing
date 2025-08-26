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
      if (!uid || !user || user.uid !== uid) {
        setLoading(false);
        return;
      }

      try {
        // Lade Auth-Daten aus users collection
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
        console.error('Error loading user/company data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [uid, user]);

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

  // Kombiniere user und company Daten für Settings Component
  const combinedData = companyData ? { ...userData, ...companyData } : userData;

  // DEBUG: Log combined data structure
  console.log('🔍 Settings Data Debug:', {
    userData: userData,
    companyData: companyData,
    combinedData: combinedData,
    userType: userData?.user_type,
    languages: {
      inUserData: userData?.languages || userData?.['step2.languages'],
      inCompanyData: companyData?.languages || companyData?.['step2.languages'],
      inCombined: combinedData?.languages || combinedData?.['step2.languages'],
    },
  });

  return <SettingsComponent userData={combinedData} onDataSaved={handleDataSaved} />;
}
