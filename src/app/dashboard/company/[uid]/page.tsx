'use client';

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/clients";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header"; // Geändert zu benanntem Import
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import SettingsPage, { RawFirestoreUserData } from "@/components/SettingsPage"; // RawFirestoreUserData importiert
import PopupModal from "@/components/PopupModal";
import data from "./data.json";

export default function Page() {
  const router = useRouter();
  const params = useParams();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [view, setView] = useState<"dashboard" | "settings">("dashboard");
  const [uid, setUid] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [userData, setUserData] = useState<RawFirestoreUserData | null>(null);

  const isNonEmptyString = (val: unknown): val is string =>
    typeof val === "string" && val.trim() !== "";

  useEffect(() => {
    if (params?.uid) {
      setUid(Array.isArray(params.uid) ? params.uid[0] : params.uid);
    }
  }, [params]);

  useEffect(() => {
    if (!uid) return;

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      if (user.uid !== uid) {
        router.push("/");
        return;
      }
      setIsAuthorized(true);

      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setIsChecking(false);
          return;
        }
        const data = userSnap.data() as RawFirestoreUserData; // Type assertion
        setUserData(data);

        const missing = [];
        if (!isNonEmptyString(data?.step2?.companyName)) missing.push("Allgemeine Firmendaten");
        if (!(isNonEmptyString(data?.step3?.taxNumber) || isNonEmptyString(data?.step3?.vatId))) missing.push("Buchhaltung & Steuer");
        if (!(isNonEmptyString(data?.step4?.iban) && isNonEmptyString(data?.step4?.accountHolder))) missing.push("Bankverbindung");
        if (!isNonEmptyString(data?.step4?.logoUrl)) missing.push("Logo");
        if (!isNonEmptyString(data?.step3?.identityFrontUrl)) missing.push("Ausweis Vorderseite");
        if (!isNonEmptyString(data?.step3?.identityBackUrl)) missing.push("Ausweis Rückseite");

        setMissingFields(missing);
        setShowPopup(missing.length > 0);
        if (missing.length > 0) setView("settings");

      } catch (error) {
        console.error("Fehler beim Laden der Benutzerdaten:", error);
      } finally {
        setIsChecking(false);
      }
    });

    return () => unsubscribe();
  }, [uid, router]);

  if (isChecking || !isAuthorized) return null;

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" setView={setView} />
      <SidebarInset>
        <SiteHeader currentTab={view === "dashboard" ? "Dashboard" : "Einstellungen"} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              {view === "dashboard" ? (
                <>
                  <SectionCards />
                  <ChartAreaInteractive />
                  <DataTable data={data} />
                </>
              ) : (
                <SettingsPage userData={userData} onDataSaved={() => console.log("Settings data saved.")} />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {showPopup && (
        <PopupModal
          missingFields={missingFields}
          onClose={() => setShowPopup(false)}
        />
      )}
    </SidebarProvider>
  );
}
