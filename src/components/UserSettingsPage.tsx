'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { FiLoader, FiSave, FiUser, FiLock, FiImage, FiMapPin } from 'react-icons/fi';
import { toast } from 'sonner';
import { RawFirestoreUserData } from './SettingsPage'; // Wiederverwenden des Typs

// Interne Datenstruktur für das User-Einstellungsformular
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword, User } from 'firebase/auth';
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

    useEffect(() => {
        if (userData) {
            setForm({
                uid: userData.uid,
                email: userData.email || '',
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                phoneNumber: userData.phoneNumber || '',
                personalStreet: userData.personalStreet || '',
                personalHouseNumber: userData.personalHouseNumber || '',
                personalPostalCode: userData.personalPostalCode || '',
                personalCity: userData.personalCity || '',
                personalCountry: userData.personalCountry || null,
                profilePictureURL: userData.profilePictureURL || '',
                profilePictureFile: null,
                oldPassword: '',
                newPassword: '',
                confirmNewPassword: '',
            });
        }
    }, [userData]);

    const handleChange = useCallback((field: keyof UserSettingsFormData, value: string | File | null) => {
        setForm(prevForm => {
            if (!prevForm) return null;
            return { ...prevForm, [field]: value };
        });
    }, []);

    const handleSave = async () => {
        if (!form || !form.uid) {
            toast.error("Keine Daten zum Speichern vorhanden.");
            return;
        }
        setSaving(true);

        // TODO: Implementiere File-Upload für profilePictureFile, falls vorhanden,
        // und erhalte die URL zurück, um sie in firestoreUpdateData.profilePictureURL zu speichern.
        // Für dieses Beispiel wird der Upload-Teil übersprungen.

        const firestoreUpdateData: Partial<RawFirestoreUserData> = {
            firstName: form.firstName,
            lastName: form.lastName,
            phoneNumber: form.phoneNumber,
            personalStreet: form.personalStreet,
            personalHouseNumber: form.personalHouseNumber,
            personalPostalCode: form.personalPostalCode,
            personalCity: form.personalCity,
            personalCountry: form.personalCountry,
            // profilePictureURL: aktualisierteURLNachUpload,
            updatedAt: serverTimestamp(),
        };

        try {
            await updateDoc(doc(db, "users", form.uid), firestoreUpdateData);
            toast.success("Benutzereinstellungen erfolgreich gespeichert!");
            onDataSaved(); // Callback aufrufen, um Daten in der übergeordneten Seite neu zu laden
        } catch (error: unknown) {
            console.error("Fehler beim Speichern der Benutzereinstellungen:", error);
            const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
            toast.error(`Fehler: ${message}`);
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        if (!form || !form.newPassword || !form.oldPassword || !form.confirmNewPassword) {
            toast.error("Bitte füllen Sie alle Passwortfelder aus.");
            return;
        }
        if (form.newPassword !== form.confirmNewPassword) {
            toast.error("Die neuen Passwörter stimmen nicht überein.");
            return;
        }
        if (form.newPassword.length < 6) {
            toast.error("Das neue Passwort muss mindestens 6 Zeichen lang sein.");
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
                toast.success("Passwort erfolgreich geändert!");
                // Reset password fields in form state
                setForm(prev => prev ? { ...prev, oldPassword: '', newPassword: '', confirmNewPassword: '' } : null);
            } catch (error: any) {
                console.error("Fehler beim Ändern des Passworts:", error);
                if (error.code === 'auth/wrong-password') {
                    toast.error("Das alte Passwort ist nicht korrekt.");
                } else {
                    toast.error(`Fehler beim Ändern des Passworts: ${error.message}`);
                }
            } finally {
                setChangingPassword(false);
            }
        } else {
            toast.error("Benutzer nicht angemeldet. Passwortänderung nicht möglich.");
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
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vorname</label>
                        <input type="text" id="firstName" value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" />
                    </div>
                    <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nachname</label>
                        <input type="text" id="lastName" value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-Mail</label>
                        <input type="email" id="email" value={form.email} readOnly className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm sm:text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-400 p-2 cursor-not-allowed" />
                    </div>
                    <div>
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefonnummer</label>
                        <input type="tel" id="phoneNumber" value={form.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" />
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
                        <label htmlFor="personalStreet" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Straße</label>
                        <input type="text" id="personalStreet" value={form.personalStreet || ''} onChange={(e) => handleChange('personalStreet', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" />
                    </div>
                    <div>
                        <label htmlFor="personalHouseNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hausnummer</label>
                        <input type="text" id="personalHouseNumber" value={form.personalHouseNumber || ''} onChange={(e) => handleChange('personalHouseNumber', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" />
                    </div>
                    <div>
                        <label htmlFor="personalPostalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PLZ</label>
                        <input type="text" id="personalPostalCode" value={form.personalPostalCode || ''} onChange={(e) => handleChange('personalPostalCode', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" />
                    </div>
                    <div>
                        <label htmlFor="personalCity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stadt</label>
                        <input type="text" id="personalCity" value={form.personalCity || ''} onChange={(e) => handleChange('personalCity', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" />
                    </div>
                    <div>
                        <label htmlFor="personalCountry" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Land</label>
                        <input type="text" id="personalCountry" value={form.personalCountry || ''} onChange={(e) => handleChange('personalCountry', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" />
                    </div>
                </div>
            </div>

            {/* Optional: Profilbild-Sektion */}
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
                    <FiImage className="mr-3 text-teal-500" /> Profilbild
                </h3>
                {form.profilePictureURL && !form.profilePictureFile && (
                    <img src={form.profilePictureURL} alt="Profilbild Vorschau" className="w-32 h-32 rounded-full object-cover mb-4" />
                )}
                {form.profilePictureFile && (
                    <img src={URL.createObjectURL(form.profilePictureFile)} alt="Profilbild Vorschau" className="w-32 h-32 rounded-full object-cover mb-4" />
                )}
                <div>
                    <label htmlFor="profilePictureFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Neues Profilbild hochladen</label>
                    <input
                        type="file"
                        id="profilePictureFile"
                        accept="image/*"
                        onChange={(e) => handleChange('profilePictureFile', e.target.files ? e.target.files[0] : null)}
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
                        <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Altes Passwort</label>
                        <input type="password" id="oldPassword" value={form.oldPassword || ''} onChange={(e) => handleChange('oldPassword', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" required />
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Neues Passwort</label>
                        <input type="password" id="newPassword" value={form.newPassword || ''} onChange={(e) => handleChange('newPassword', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" required />
                    </div>
                    <div>
                        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Neues Passwort bestätigen</label>
                        <input type="password" id="confirmNewPassword" value={form.confirmNewPassword || ''} onChange={(e) => handleChange('confirmNewPassword', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:text-white p-2" required />
                    </div>
                    <button
                        type="submit"
                        disabled={changingPassword}
                        className="w-full sm:w-auto px-4 py-2 rounded-md bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center text-sm"
                    >
                        {changingPassword ? (
                            <><FiLoader className="animate-spin h-4 w-4 mr-2" /> Ändere Passwort...</>
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
                    {saving ? <><FiLoader className="animate-spin h-5 w-5 mr-2" /> Speichern...</> : <><FiSave className="h-5 w-5 mr-2" /> Änderungen speichern</>}
                </button>
            </div>
        </div>
    );
};

export default UserSettingsPage;