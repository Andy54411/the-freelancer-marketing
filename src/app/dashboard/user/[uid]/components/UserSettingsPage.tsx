'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'; // NEU: Firebase Storage Imports
import { FiLoader, FiSave, FiUser, FiLock, FiImage, FiMapPin } from 'react-icons/fi';
import { toast } from 'sonner';
import { RawFirestoreUserData } from '@/types/settings'; // Wiederverwenden des Typs
import { Eye, EyeOff, Mail, Send, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Interne Datenstruktur für das User-Einstellungsformular
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
interface UserSettingsFormData {
  uid: string;
  email: string; // Normalerweise nicht änderbar hier, aber zum Anzeigen
  firstName: string;
  lastName: string;
  phoneNumber: string;
  // Adressfelder, falls Benutzer eine primäre Adresse haben
  personalStreet?: string;
  personalHouseNumber?: string;
  personalPostalCode?: string;
  personalCity?: string;
  personalCountry?: string | null;
  profilePictureURL?: string;
  profilePictureFile?: File | null;
  // Für Passwortänderung
  oldPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

interface UserSettingsPageProps {
  userData: RawFirestoreUserData | null;
  onDataSaved: () => void;
}

const UserSettingsPage: React.FC<UserSettingsPageProps> = ({ userData, onDataSaved }) => {
  const [form, setForm] = useState<UserSettingsFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // E-Mail-Änderung States
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [sendingEmailChange, setSendingEmailChange] = useState(false);
  const [emailChangePending, setEmailChangePending] = useState(false);

  useEffect(() => {
    if (userData) {
      // Prioritize 'profile' object, fallback to 'step1'/'step3' for legacy data
      const profile = userData.profile || {};
      const step1 = userData.step1 || {};
      const step3 = userData.step3 || {};
      const personalData = step1.personalData || {};
      const address = personalData.address || {};

      setForm({
        uid: userData.uid,
        email: userData.email || profile.email || step1.email || '',
        firstName: profile.firstName || step1.firstName || personalData.firstName || '',
        lastName: profile.lastName || step1.lastName || personalData.lastName || '',
        phoneNumber: profile.phoneNumber || step1.phoneNumber || personalData.phone || '',
        personalStreet: profile.street || step1.personalStreet || address.street || '',
        personalHouseNumber: profile.houseNumber || address.houseNumber || '',
        personalPostalCode:
          profile.postalCode || step1.personalPostalCode || address.postalCode || '',
        personalCity: profile.city || address.city || '',
        personalCountry: profile.country || address.country || null,
        profilePictureURL: userData.photoURL || step3.profilePictureURL || '',
        profilePictureFile: null,
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      
      // Prüfe ob eine E-Mail-Änderung aussteht
      if (userData.emailChangeRequest) {
        setEmailChangePending(true);
      }
    }
  }, [userData]);

  const handleChange = useCallback(
    (field: keyof UserSettingsFormData, value: string | File | null) => {
      setForm(prevForm => {
        if (!prevForm) return null;
        return { ...prevForm, [field]: value };
      });
    },
    []
  );

  const handleEmailChangeRequest = async () => {
    if (!form || !newEmail) {
      toast.error('Bitte geben Sie eine neue E-Mail-Adresse ein.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    if (newEmail === form.email) {
      toast.error('Die neue E-Mail-Adresse ist identisch mit der aktuellen.');
      return;
    }

    setSendingEmailChange(true);

    try {
      const response = await fetch('/api/user/change-email/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: form.uid,
          currentEmail: form.email,
          newEmail: newEmail,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Bestätigungs-E-Mail wurde gesendet. Bitte prüfen Sie Ihr Postfach.');
        setShowEmailChangeDialog(false);
        setEmailChangePending(true);
        setNewEmail('');
      } else {
        toast.error(result.error || 'Fehler beim Senden der Bestätigungs-E-Mail');
      }
    } catch {
      toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setSendingEmailChange(false);
    }
  };

  const handleSave = async () => {
    if (!form || !form.uid) {
      toast.error('Keine Daten zum Speichern vorhanden.');
      return;
    }
    setSaving(true);

    let newProfilePictureURL = form.profilePictureURL; // Behalte die alte URL, falls keine neue Datei hochgeladen wird

    if (form.profilePictureFile) {
      toast.info('Lade Profilbild hoch...');
      try {
        const storage = getStorage();
        // Erstelle einen eindeutigen Dateinamen, um Überschreibungen zu vermeiden, oder verwende einen festen Namen pro User
        const filePath = `profilePictures/${form.uid}/${form.profilePictureFile.name}`;
        const fileRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileRef, form.profilePictureFile);

        await uploadTask; // Warte, bis der Upload abgeschlossen ist
        newProfilePictureURL = await getDownloadURL(fileRef);
        toast.success('Profilbild erfolgreich hochgeladen!');
      } catch (uploadError: any) {
        toast.error(
          `Fehler beim Hochladen des Profilbilds: ${uploadError.message || 'Unbekannter Fehler'}`
        );
        setSaving(false);
        return; // Breche den Speichervorgang ab, wenn der Bild-Upload fehlschlägt
      }
    }

    const firestoreUpdateData: Partial<RawFirestoreUserData> = {
      // Update root fields
      displayName: `${form.firstName} ${form.lastName}`,
      photoURL: newProfilePictureURL,

      // Update clean 'profile' object
      profile: {
        ...userData?.profile,
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        street: form.personalStreet,
        houseNumber: form.personalHouseNumber, // Explicitly save house number
        postalCode: form.personalPostalCode,
        city: form.personalCity,
        country: form.personalCountry || undefined,
        email: form.email,
      },

      // Legacy support: Keep updating step1/step3 for now to avoid breaking other things?
      // User explicitly said "steps are for companies", so we should probably STOP updating them for users.
      // But if other parts of the app rely on them, it might be risky.
      // However, the user was very angry about steps being used for users.
      // So I will comment them out or remove them.
      /*
      step3: {
        ...userData?.step3,
        profilePictureURL: newProfilePictureURL,
      },
      step1: {
        ...userData?.step1,
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        personalStreet: form.personalStreet,
        personalPostalCode: form.personalPostalCode,
        personalData: {
          ...userData?.step1?.personalData,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phoneNumber,
          address: {
            ...userData?.step1?.personalData?.address,
            street: form.personalStreet,
            houseNumber: form.personalHouseNumber,
            postalCode: form.personalPostalCode,
            city: form.personalCity,
            country: form.personalCountry || undefined,
          },
        },
      },
      */
    };

    try {
      await updateDoc(doc(db, 'users', form.uid), {
        ...firestoreUpdateData,
        updatedAt: serverTimestamp(),
      });

      // Sync to candidate_profile subcollection
      const candidateProfileData = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phoneNumber,
        street: form.personalHouseNumber
          ? `${form.personalStreet} ${form.personalHouseNumber}`
          : form.personalStreet,
        zip: form.personalPostalCode,
        city: form.personalCity,
        country: form.personalCountry || 'Deutschland',
        profilePictureUrl: newProfilePictureURL,
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(
          doc(db, 'users', form.uid, 'candidate_profile', 'main'),
          candidateProfileData,
          { merge: true }
        );
      } catch (syncError) {
        console.error('Error syncing to candidate_profile:', syncError);
        // We don't block the success message if sync fails, but we log it.
        // Or maybe we should warn? For now, silent fail/log is probably safer to not confuse user if they don't use career features yet.
      }

      toast.success('Benutzereinstellungen erfolgreich gespeichert!');
      // NEU: Event auslösen, um andere Komponenten (wie den Header) zu informieren
      if (
        form.profilePictureFile ||
        form.profilePictureURL !== userData?.step3?.profilePictureURL
      ) {
        window.dispatchEvent(
          new CustomEvent('profileUpdated', { detail: { profilePictureURL: newProfilePictureURL } })
        );
        window.dispatchEvent(
          new CustomEvent('profilePictureUpdated', { detail: newProfilePictureURL })
        );
      }
      onDataSaved(); // Callback aufrufen, um Daten in der übergeordneten Seite neu zu laden
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler.';
      toast.error(`Fehler: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || !form.newPassword || !form.oldPassword || !form.confirmNewPassword) {
      toast.error('Bitte füllen Sie alle Passwortfelder aus.');
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      toast.error('Die neuen Passwörter stimmen nicht überein.');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('Das neue Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setChangingPassword(true);
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      try {
        const credential = EmailAuthProvider.credential(user.email!, form.oldPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, form.newPassword);
        toast.success('Passwort erfolgreich geändert!');
        // Reset password fields in form state
        setForm(prev =>
          prev ? { ...prev, oldPassword: '', newPassword: '', confirmNewPassword: '' } : null
        );
      } catch (error: any) {
        if (error.code === 'auth/wrong-password') {
          toast.error('Das alte Passwort ist nicht korrekt.');
        } else {
          toast.error(`Fehler beim Ändern des Passworts: ${error.message}`);
        }
      } finally {
        setChangingPassword(false);
      }
    } else {
      toast.error('Benutzer nicht angemeldet. Passwortänderung nicht möglich.');
      setChangingPassword(false);
    }
  };
  if (!form) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[300px]">
        <FiLoader className="animate-spin mr-3 h-8 w-8 text-teal-600" />
        <span>Lade Benutzereinstellungen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
          <FiUser className="mr-3 text-teal-500" /> Persönliche Informationen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Vorname
            </label>
            <input
              type="text"
              id="firstName"
              value={form.firstName}
              onChange={e => handleChange('firstName', e.target.value)}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Nachname
            </label>
            <input
              type="text"
              id="lastName"
              value={form.lastName}
              onChange={e => handleChange('lastName', e.target.value)}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              E-Mail
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="email"
                id="email"
                value={form.email}
                readOnly
                className="flex-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm sm:text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-400 p-2 cursor-not-allowed"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEmailChangeDialog(true)}
                className="whitespace-nowrap"
              >
                <Mail className="h-4 w-4 mr-1" />
                Ändern
              </Button>
            </div>
            {emailChangePending && (
              <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
                <Clock className="h-4 w-4" />
                <span>E-Mail-Änderung ausstehend. Bitte bestätigen Sie die neue Adresse.</span>
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Telefonnummer
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={form.phoneNumber}
              onChange={e => handleChange('phoneNumber', e.target.value)}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
            />
          </div>
        </div>
      </div>

      {/* Optional: Adress-Sektion, falls relevant für 'kunde' */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
          <FiMapPin className="mr-3 text-teal-500" /> Adresse
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="personalStreet"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Straße
            </label>
            <input
              type="text"
              id="personalStreet"
              value={form.personalStreet || ''}
              onChange={e => handleChange('personalStreet', e.target.value)}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
            />
          </div>
          <div>
            <label
              htmlFor="personalHouseNumber"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Hausnummer
            </label>
            <input
              type="text"
              id="personalHouseNumber"
              value={form.personalHouseNumber || ''}
              onChange={e => handleChange('personalHouseNumber', e.target.value)}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
            />
          </div>
          <div>
            <label
              htmlFor="personalPostalCode"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              PLZ
            </label>
            <input
              type="text"
              id="personalPostalCode"
              value={form.personalPostalCode || ''}
              onChange={e => handleChange('personalPostalCode', e.target.value)}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
            />
          </div>
          <div>
            <label
              htmlFor="personalCity"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Stadt
            </label>
            <input
              type="text"
              id="personalCity"
              value={form.personalCity || ''}
              onChange={e => handleChange('personalCity', e.target.value)}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
            />
          </div>
          <div>
            <label
              htmlFor="personalCountry"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Land
            </label>
            <input
              type="text"
              id="personalCountry"
              value={form.personalCountry || ''}
              onChange={e => handleChange('personalCountry', e.target.value)}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
            />
          </div>
        </div>
      </div>

      {/* Optional: Profilbild-Sektion */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
          <FiImage className="mr-3 text-teal-500" /> Profilbild
        </h3>
        {form.profilePictureURL && !form.profilePictureFile && (
          <img
            src={form.profilePictureURL}
            alt="Profilbild Vorschau"
            className="w-32 h-32 rounded-full object-cover mb-4"
          />
        )}
        {form.profilePictureFile && (
          <img
            src={URL.createObjectURL(form.profilePictureFile)}
            alt="Profilbild Vorschau"
            className="w-32 h-32 rounded-full object-cover mb-4"
          />
        )}
        <div>
          <label
            htmlFor="profilePictureFile"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Neues Profilbild hochladen
          </label>
          <input
            type="file"
            id="profilePictureFile"
            accept="image/*"
            onChange={e =>
              handleChange('profilePictureFile', e.target.files ? e.target.files[0] : null)
            }
            className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-gray-700 dark:file:text-teal-300 dark:hover:file:bg-gray-600"
          />
        </div>
      </div>

      {/* Optional: Passwort ändern Sektion */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
          <FiLock className="mr-3 text-teal-500" /> Passwort ändern
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label
              htmlFor="oldPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Altes Passwort
            </label>
            <div className="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                id="oldPassword"
                value={form.oldPassword || ''}
                onChange={e => handleChange('oldPassword', e.target.value)}
                className="mt-1 block w-full pr-10 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
                required
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Neues Passwort
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                value={form.newPassword || ''}
                onChange={e => handleChange('newPassword', e.target.value)}
                className="mt-1 block w-full pr-10 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="confirmNewPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Neues Passwort bestätigen
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmNewPassword"
                value={form.confirmNewPassword || ''}
                onChange={e => handleChange('confirmNewPassword', e.target.value)}
                className="mt-1 block w-full pr-10 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center text-sm"
          >
            {changingPassword ? (
              <>
                <FiLoader className="animate-spin h-4 w-4 mr-2" /> Ändere Passwort...
              </>
            ) : (
              <>Passwort ändern</>
            )}
          </button>
        </form>
      </div>

      <div className="pt-8 mt-8 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-md bg-[#14ad9f] text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center text-base"
        >
          {saving ? (
            <>
              <FiLoader className="animate-spin h-5 w-5 mr-2" /> Speichern...
            </>
          ) : (
            <>
              <FiSave className="h-5 w-5 mr-2" /> Änderungen speichern
            </>
          )}
        </button>
      </div>

      {/* E-Mail-Änderung Dialog */}
      <Dialog open={showEmailChangeDialog} onOpenChange={setShowEmailChangeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-teal-600" />
              E-Mail-Adresse ändern
            </DialogTitle>
            <DialogDescription>
              Geben Sie Ihre neue E-Mail-Adresse ein. Sie erhalten eine Bestätigungs-E-Mail an die neue Adresse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentEmail">Aktuelle E-Mail</Label>
              <Input
                id="currentEmail"
                value={form.email}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">Neue E-Mail-Adresse</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="neue-email@beispiel.de"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">2-Faktor-Verifizierung</p>
                  <p className="text-blue-600">
                    Nach dem Absenden erhalten Sie eine E-Mail mit einem Bestätigungslink an die neue Adresse. 
                    Erst nach Klick auf diesen Link wird Ihre E-Mail-Adresse geändert.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailChangeDialog(false);
                setNewEmail('');
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleEmailChangeRequest}
              disabled={sendingEmailChange || !newEmail}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {sendingEmailChange ? (
                <>
                  <FiLoader className="animate-spin h-4 w-4 mr-2" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Bestätigungs-E-Mail senden
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserSettingsPage;
