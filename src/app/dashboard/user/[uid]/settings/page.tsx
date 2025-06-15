// /Users/andystaudinger/Tasko/src/app/dashboard/user/[uid]/settings/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, app } from '@/firebase/clients';
import CompanySettingsPage, { RawFirestoreUserData } from '@/components/SettingsPage'; // Umbenannt für Klarheit
import UserSettingsPage from '@/app/dashboard/user/[uid]/components/UserSettingsPage'; // NEU: Import für User-Einstellungen‚
import FooterSection from '@/components/footer'; // Dein Footer
import { FiLoader, FiAlertCircle } from 'react-icons/fi';

const auth = getAuth(app);

export default function UserSettingsDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const pageUid = typeof params.uid === 'string' ? params.uid : '';

    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
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
            console.error("Fehler beim Laden der Benutzerdaten für Einstellungen:", err);
            setError(`Fehler beim Laden der Daten: ${err.message || 'Unbekannter Fehler'}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                if (user.uid !== pageUid) {
                    // Wenn die UID in der URL nicht mit dem eingeloggten Benutzer übereinstimmt,
                    // leite zum Dashboard des eingeloggten Benutzers oder zur Login-Seite um.
                    // Für Einstellungen ist es meist sinnvoll, nur die eigenen zu sehen.
                    router.replace(`/dashboard/user/${user.uid}/settings`);
                    return;
                }
                setCurrentUser(user);
                fetchUserData(user.uid);
            } else {
                router.replace(`/login?redirectTo=/dashboard/user/${pageUid}/settings`);
            }
        });
        return () => unsubscribe();
    }, [pageUid, router, fetchUserData]);

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
        return <div className="flex justify-center items-center min-h-screen text-red-500"><FiAlertCircle className="mr-2" /> {error}</div>;
    }

    return (
        <>
            {userData?.user_type === 'firma' ? (
                <CompanySettingsPage userData={userData} onDataSaved={handleDataSaved} />
            ) : userData?.user_type === 'kunde' ? (
                <UserSettingsPage userData={userData} onDataSaved={handleDataSaved} />
            ) : null}
            <FooterSection />
        </>
    );
}