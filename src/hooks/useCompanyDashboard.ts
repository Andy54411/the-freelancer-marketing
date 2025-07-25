'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext'; // Importiere den zentralen Auth-Kontext
import { db } from '@/firebase/clients'; // Importiere die zentralisierte Firestore-Instanz
import { RawFirestoreUserData } from '@/components/SettingsPage';
import tableJsonData from '@/app/dashboard/company/[uid]/data.json';

const isNonEmptyString = (val: unknown): val is string =>
  typeof val === 'string' && val.trim() !== '';

export function useCompanyDashboard() {
  const { user, loading: authLoading } = useAuth(); // Verwende den zentralen Auth-Kontext
  const params = useParams();
  const uid = useMemo(
    () => (Array.isArray(params?.uid) ? params.uid[0] : params?.uid),
    [params?.uid]
  );

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [view, setView] = useState<
    'dashboard' | 'calendar' | 'finance' | 'reviews' | 'profile' | 'settings'
  >('dashboard');
  const [showPopup, setShowPopup] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [userData, setUserData] = useState<RawFirestoreUserData | null>(null);
  const tableData = useMemo(() => tableJsonData, []);

  useEffect(() => {
    // Nichts tun, solange der zentrale Auth-Status noch nicht geklärt ist.
    if (authLoading) {
      setIsChecking(true);
      return;
    }

    // Wenn die Authentifizierung abgeschlossen ist, aber kein Benutzer da ist
    // oder die UID nicht mit der URL übereinstimmt, ist der Zugriff nicht gestattet.
    if (!user || user.uid !== uid) {
      setIsAuthorized(false);
      setIsChecking(false);
      // Die <ProtectedRoute>-Komponente kümmert sich um die Weiterleitung.
      // Die Aufgabe dieses Hooks ist hier beendet.
      return;
    }

    // An diesem Punkt ist der Benutzer authentifiziert und für diese Seite autorisiert.
    setIsAuthorized(true);

    const fetchCompanyData = async () => {
      setIsChecking(true);
      try {
        // Lade Benutzer- und Firmendaten gleichzeitig, um die Ladezeit zu optimieren
        const userDocRef = doc(db, 'users', uid);
        const companyDocRef = doc(db, 'companies', uid);

        const [userSnap, companySnap] = await Promise.all([
          getDoc(userDocRef),
          getDoc(companyDocRef),
        ]);

        if (!userSnap.exists()) {
          console.warn('useCompanyDashboard: User document does not exist for UID:', uid);
          setUserData(null);
          setMissingFields([]);
          return;
        }

        // Beginne mit den Basis-Benutzerdaten und mische die Firmendaten hinzu.
        const data = {
          ...userSnap.data(),
          ...(companySnap.exists() ? companySnap.data() : {}),
        } as RawFirestoreUserData;

        setUserData(data);

        // Die Logik zur Überprüfung fehlender Felder bleibt gleich.
        const missing: string[] = [];
        const companyName = data?.companyName || data?.step2?.companyName;
        if (!isNonEmptyString(companyName)) missing.push('Allgemeine Firmendaten');

        const taxNumber = data?.taxNumber || data?.taxNumberForBackend || data?.step3?.taxNumber;
        const vatId = data?.vatId || data?.vatIdForBackend || data?.step3?.vatId;
        if (!isNonEmptyString(taxNumber) && !isNonEmptyString(vatId))
          missing.push('Buchhaltung & Steuer');

        const iban = data?.iban || data?.step4?.iban;
        const accountHolder = data?.accountHolder || data?.step4?.accountHolder;
        if (!isNonEmptyString(iban) && !isNonEmptyString(accountHolder))
          missing.push('Bankverbindung');

        const profilePicture =
          data?.profilePictureURL ||
          data?.profilePictureFirebaseUrl ||
          data?.step3?.profilePictureURL;
        if (!isNonEmptyString(profilePicture)) missing.push('Logo');

        const identityFront = data?.identityFrontUrlStripeId || data?.step3?.identityFrontUrl;
        if (!isNonEmptyString(identityFront)) missing.push('Ausweis Vorderseite');

        const identityBack = data?.identityBackUrlStripeId || data?.step3?.identityBackUrl;
        if (!isNonEmptyString(identityBack)) missing.push('Ausweis Rückseite');

        setMissingFields(missing);
        if (missing.length > 0) {
          setShowPopup(true);
          setView('settings');
        }
      } catch (error) {
        console.error('Fehler beim Laden der Firmendaten:', error);
        // Optional: Einen Fehlerstatus setzen, um ihn in der UI anzuzeigen.
      } finally {
        setIsChecking(false);
      }
    };

    fetchCompanyData();
  }, [user, authLoading, uid]); // Der Effekt hängt jetzt vom zentralen Auth-Status ab.

  return {
    isChecking,
    isAuthorized,
    view,
    setView,
    uid,
    showPopup,
    setShowPopup,
    missingFields,
    userData,
    tableData,
  };
}
