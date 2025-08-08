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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (!uid || !user || user.uid !== uid) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Fehler beim Laden der Benutzerdaten:', error);
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

  const handleDataSaved = () => {
    console.log('Settings updated');
    // Benutzerdaten neu laden nach dem Speichern
    if (uid) {
      getDoc(doc(db, 'users', uid)).then(userDoc => {
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      });
    }
  };

  return <SettingsComponent userData={userData} onDataSaved={handleDataSaved} />;
}
