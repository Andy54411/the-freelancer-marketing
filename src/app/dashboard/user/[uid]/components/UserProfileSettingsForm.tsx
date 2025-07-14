// src/app/dashboard/user/[uid]/components/UserProfileSettingsForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { db } from '../../../../../firebase/clients'; // Dein Firebase-Client
import { FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const auth = getAuth();

interface UserProfileData {
  firstname: string;
  lastName: string;
  email: string;
  phone: string;
  jobStreet: string;
  jobPostalCode: string;
  jobCity: string;
  jobCountry: string;
}

interface UserProfileSettingsFormProps {
  uid?: string;

  onSaveSuccess?: () => void;

  onSaveError?: (errorMessage: string) => void;
}

export function UserProfileSettingsForm({
  uid,
  onSaveSuccess,
  onSaveError,
}: UserProfileSettingsFormProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async (user: FirebaseAuthUser, targetUid: string) => {
      try {
        const userDocRef = doc(db, 'users', targetUid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData({
            firstname: data.firstname || '',
            lastName: data.lastName || '',
            email: user.email || data.email || '',
            phone: data.phone || '',
            jobStreet: data.jobStreet || '',
            jobPostalCode: data.jobPostalCode || '',
            jobCity: data.jobCity || '',
            jobCountry: data.jobCountry || '',
          });
        } else {
          setProfileData({
            firstname: '',
            lastName: '',
            email: user.email || '',
            phone: '',
            jobStreet: '',
            jobPostalCode: '',
            jobCity: '',
            jobCountry: '',
          });
          console.warn(
            `UserProfileSettingsForm: Nutzerdokument für UID ${targetUid} nicht gefunden. Initialisiere leeres Profil.`
          );
        }
      } catch (error) {
        console.error('UserProfileSettingsForm: Fehler beim Laden der Profildaten:', error);
        setErrorMessage('Fehler beim Laden deines Profils. Bitte versuche es später erneut.');
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      if (!user) {
        console.warn('UserProfileSettingsForm: Kein Nutzer eingeloggt.');
        setIsLoading(false);

        return;
      }
      setCurrentUser(user);
      const targetUid = uid || user.uid;
      if (user.uid === targetUid) {
        loadUserData(user, targetUid);
      } else {
        console.warn(
          `UserProfileSettingsForm: UID-Mismatch. Angemeldet als ${user.uid}, Komponente ist für ${targetUid}.`
        );
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [uid]);

  // Formular-Input-Handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prevData => ({
      ...prevData!,
      [name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !profileData || isSaving) return;

    setIsSaving(true);
    setSaveStatus(null);
    setErrorMessage(null);

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        ...profileData,
        updatedAt: new Date(),
      });
      setSaveStatus('success');
      console.log('UserProfileSettingsForm: Profildaten erfolgreich gespeichert!');
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error('UserProfileSettingsForm: Fehler beim Speichern der Profildaten:', error);
      setSaveStatus('error');
      const msg = 'Fehler beim Speichern deines Profils. Bitte versuche es erneut.';
      setErrorMessage(msg);
      if (onSaveError) onSaveError(msg);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (isLoading || !currentUser || !profileData) {
    return (
      <div className="flex justify-center items-center p-6 min-h-[300px]">
        {' '}
        {/* min-h für besseres Laden */}
        <FiLoader className="animate-spin text-4xl text-blue-500 mr-3" />
        Lade dein Profil...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Dein Profil bearbeiten
      </h1>

      {saveStatus === 'success' && (
        <div
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <FiCheckCircle className="inline mr-2" />
          Profil erfolgreich gespeichert!
        </div>
      )}
      {saveStatus === 'error' && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <FiAlertCircle className="inline mr-2" />
          {errorMessage || 'Fehler beim Speichern des Profils.'}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Persönliche Daten */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="firstname"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Vorname
            </label>
            <input
              type="text"
              id="firstname"
              name="firstname"
              value={profileData.firstname}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Nachname
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={profileData.lastName}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
        </div>

        {/* Kontaktdaten */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            E-Mail
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={profileData.email}
            onChange={handleChange}
            readOnly
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Telefonnummer
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={profileData.phone}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Adressdaten */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">Adresse</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="jobStreet"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Straße & Hausnummer
            </label>
            <input
              type="text"
              id="jobStreet"
              name="jobStreet"
              value={profileData.jobStreet}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="jobPostalCode"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Postleitzahl
            </label>
            <input
              type="text"
              id="jobPostalCode"
              name="jobPostalCode"
              value={profileData.jobPostalCode}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="jobCity"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Stadt
            </label>
            <input
              type="text"
              id="jobCity"
              name="jobCity"
              value={profileData.jobCity}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="jobCountry"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Land
            </label>
            <input
              type="text"
              id="jobCountry"
              name="jobCountry"
              value={profileData.jobCountry}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Speichern Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-lg transition-colors duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving && <FiLoader className="animate-spin text-xl mr-2" />}
          {isSaving ? 'Speichern...' : 'Profil speichern'}
        </button>
      </form>
    </div>
  );
}
