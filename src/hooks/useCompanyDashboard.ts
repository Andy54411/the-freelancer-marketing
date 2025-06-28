'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/clients";
import { RawFirestoreUserData } from "@/components/SettingsPage";
import tableJsonData from "@/app/dashboard/company/[uid]/data.json";
import { z } from "zod";
import { schema } from "@/components/data-table";

const isNonEmptyString = (val: unknown): val is string =>
    typeof val === "string" && val.trim() !== "";

export function useCompanyDashboard() {
    const router = useRouter();
    const params = useParams();

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [view, setView] = useState<"dashboard" | "settings">("dashboard");
    const [uid, setUid] = useState<string | null>(null);
    const [showPopup, setShowPopup] = useState(false);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const [userData, setUserData] = useState<RawFirestoreUserData | null>(null);
    const [tableData, setTableData] = useState<z.infer<typeof schema>[]>([]);

    useEffect(() => {
        if (params?.uid) {
            setUid(Array.isArray(params.uid) ? params.uid[0] : params.uid);
        }
    }, [params]);

    useEffect(() => {
        if (!uid) return;

        console.log("useCompanyDashboard: useEffect triggered for UID:", uid);
        setIsChecking(true);

        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log("useCompanyDashboard: onAuthStateChanged callback. User:", user ? user.uid : "null");
            if (!user) {
                console.log("useCompanyDashboard: User is null, redirecting to /login.");
                router.push("/login");
                return;
            }
            if (user.uid !== uid) {
                console.log(`useCompanyDashboard: Mismatch UID. Current user ${user.uid}, URL UID ${uid}. Redirecting to /.`);
                router.push("/");
                return;
            }
            console.log("useCompanyDashboard: User authorized. Fetching user data...");
            setIsAuthorized(true);

            try {
                // Lade Benutzer- und Firmendaten gleichzeitig, um die Ladezeit zu optimieren
                const userDocRef = doc(db, "users", uid);
                const companyDocRef = doc(db, "companies", uid);

                const [userSnap, companySnap] = await Promise.all([
                    getDoc(userDocRef),
                    getDoc(companyDocRef)
                ]);

                console.log("useCompanyDashboard: User document snapshot received. Exists:", userSnap.exists());
                if (!userSnap.exists()) {
                    console.log("useCompanyDashboard: User document does not exist.");
                    setIsChecking(false);
                    return;
                }

                // Beginne mit den Basis-Benutzerdaten
                let data = userSnap.data() as RawFirestoreUserData;

                // Wenn ein Firmendokument existiert, mische dessen Daten hinzu.
                // Das Firmendokument ist die primäre Quelle für Logo und Firmennamen.
                if (companySnap.exists()) {
                    console.log("useCompanyDashboard: Company document found. Merging data.");
                    const companyData = companySnap.data();
                    // Überschreibe/ergänze die Daten mit den spezifischen Firmendaten
                    if (!data.step2) data.step2 = {};
                    data.step2.companyName = companyData.companyName || data.step2.companyName;

                    if (!data.step3) data.step3 = {};
                    // KORREKTUR: Priorisiere die URL aus dem 'users'-Dokument (Firebase Storage URL),
                    // da diese für die Anzeige gedacht ist. Die 'logoUrl' aus 'companies' ist oft
                    // eine nicht anzeigbare Stripe File ID.
                    // Wenn im 'users'-Dokument eine URL vorhanden ist, wird diese verwendet. Andernfalls wird auf die 'logoUrl' zurückgegriffen.
                    data.step3.profilePictureURL = data.step3.profilePictureURL || companyData.logoUrl;
                }

                console.log("useCompanyDashboard: User data set. Checking for missing fields...");

                const missing = [];

                // Robustere Prüfung, die sowohl die finalen "step"-Pfade als auch die Root-Level-Pfade aus der Registrierung berücksichtigt.
                const companyName = data?.step2?.companyName || data?.companyName;
                if (!isNonEmptyString(companyName)) missing.push("Allgemeine Firmendaten");

                const taxNumber = data?.step3?.taxNumber || data?.taxNumber || data?.taxNumberForBackend; // Check step3, then root, then backend root
                const vatId = data?.step3?.vatId || data?.vatId || data?.vatIdForBackend; // Check step3, then root, then backend root
                if (!(isNonEmptyString(taxNumber) || isNonEmptyString(vatId))) missing.push("Buchhaltung & Steuer");

                const iban = data?.step4?.iban || data?.iban;
                const accountHolder = data?.step4?.accountHolder || data?.accountHolder;
                if (!(isNonEmptyString(iban) && isNonEmptyString(accountHolder))) missing.push("Bankverbindung");

                const profilePicture = data?.step3?.profilePictureURL || data?.profilePictureFirebaseUrl;
                if (!isNonEmptyString(profilePicture)) missing.push("Logo");

                const identityFront = data?.step3?.identityFrontUrl || data?.identityFrontUrlStripeId; // Check step3 first, then root-level StripeId
                if (!isNonEmptyString(identityFront)) missing.push("Ausweis Vorderseite");

                const identityBack = data?.step3?.identityBackUrl || data?.identityBackUrlStripeId; // Check step3 first, then root-level StripeId
                if (!isNonEmptyString(identityBack)) missing.push("Ausweis Rückseite");

                console.log("useCompanyDashboard: Missing fields identified:", missing);

                setTableData(tableJsonData);
                console.log("useCompanyDashboard: Table data set.");

                setUserData(data); // Setze den finalen, zusammengeführten State
                setMissingFields(missing);
                setShowPopup(missing.length > 0);
                if (missing.length > 0) setView("settings");

            } catch (error) {
                console.error("Fehler beim Laden der Benutzerdaten:", error);
                setIsChecking(false);
            } finally {
                console.log("useCompanyDashboard: finally block reached. Setting isChecking to false.");
                setIsChecking(false);
            }
        });

        return () => unsubscribe();
    }, [uid, router]);

    return { isChecking, isAuthorized, view, setView, uid, showPopup, setShowPopup, missingFields, userData, tableData };
}