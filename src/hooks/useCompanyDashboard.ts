'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext'; // Importiere den zentralen Auth-Kontext
import { db } from '@/firebase/clients'; // Importiere die zentralisierte Firestore-Instanz
import { RawFirestoreUserData } from '@/types/settings';
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
    'dashboard' | 'calendar' | 'finance' | 'banking' | 'reviews' | 'profile' | 'settings'
  >('dashboard');
  const [showPopup, setShowPopup] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [userData, setUserData] = useState<RawFirestoreUserData | null>(null);
  const tableData = useMemo(() => tableJsonData, []);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Hilfsfunktion: Leite nächsten Onboarding-Schritt aus fehlenden Bereichen ab
  const deriveCurrentStep = (missing: string[]): number => {
    // Reihenfolge der Priorität: Allgemeine Firmendaten (1) → Buchhaltung & Steuer (2) → Logo/Identität (3) → Bankverbindung (4) → Abschluss (5)
    if (missing.includes('Allgemeine Firmendaten')) return 1;
    if (missing.includes('Buchhaltung & Steuer')) return 2;
    if (
      missing.includes('Logo') ||
      missing.includes('Ausweis Vorderseite') ||
      missing.includes('Ausweis Rückseite')
    )
      return 3;
    if (missing.includes('Bankverbindung')) return 4;
    return 5;
  };

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

        // Für Firmen: Prüfe zuerst Company-Daten, dann User-Daten als Fallback
        if (!companySnap.exists() && !userSnap.exists()) {
          setUserData(null);
          setMissingFields([]);
          return;
        }

        // Beginne mit den Basis-Firmendaten und mische die User-Daten hinzu (umgekehrt zu vorher).
        const data = {
          ...(userSnap.exists() ? userSnap.data() : {}),
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

        // KRITISCHER FIX: Prüfe Admin-Approval-Status BEVOR Onboarding-Status gesetzt wird!
        // Wenn Admin approvalStatus = 'approved' gesetzt hat, NIEMALS Onboarding zeigen!
        const isAdminApproved =
          (data as any)?.approvalStatus === 'approved' || (data as any)?.adminApproved === true;

        // Zentralen Onboarding-Status ableiten
        const totalAreas = 6; // Anzahl der betrachteten Bereiche
        const completed = Math.max(0, totalAreas - missing.length);
        const percent = Math.round((completed / totalAreas) * 100);

        // ENTSCHEIDEND: Admin-Approval überschreibt ALLES!
        if (isAdminApproved) {
          setNeedsOnboarding(false);
          setCompletionPercentage(100);
          setCurrentStep(5);
        } else {
          setNeedsOnboarding(missing.length > 0);
          setCompletionPercentage(percent);
          setCurrentStep(deriveCurrentStep(missing));
        }

        // UI-Popup nur wenn tatsächlich Onboarding benötigt wird
        if (!isAdminApproved && missing.length > 0) {
          setShowPopup(true);
          setView('settings');
        }
      } catch (error) {
        // Optional: Einen Fehlerstatus setzen, um ihn in der UI anzuzeigen.
      } finally {
        setIsChecking(false);
      }
    };

    fetchCompanyData();
  }, [authLoading, uid, user?.uid]); // FIXED: Nur user.uid statt ganzes user Objekt

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
    needsOnboarding,
    completionPercentage,
    currentStep,
  };
}
