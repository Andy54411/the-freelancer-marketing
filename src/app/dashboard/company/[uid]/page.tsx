'use client';

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable, schema } from "@/components/data-table"; // Assuming schema is also exported
import { SectionCards } from "@/components/section-cards";
import Link from "next/link";
import React, { useEffect } from 'react'; // Import useEffect
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import SettingsPage from "@/components/SettingsPage"; // RawFirestoreUserData importiert
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard"; // Import des neuen Hooks

const isNonEmptyString = (val: unknown): val is string =>
  typeof val === "string" && val.trim() !== "";

export default function Page() {
  const searchParams = useSearchParams();
  const {
    isChecking,
    isAuthorized,
    uid,
    view,      // view-State wieder aus dem Hook holen
    setView, // setView-Funktion wieder aus dem Hook holen
    missingFields,
    userData,
    tableData,
  } = useCompanyDashboard(); // Hook-Aufruf. isChecking und isAuthorized werden jetzt vom Layout behandelt.

  // Effekt, um die Ansicht basierend auf dem URL-Parameter zu synchronisieren
  useEffect(() => {
    const viewFromUrl = searchParams.get('view');
    if (viewFromUrl === 'settings' && view !== 'settings') {
      setView('settings');
    } else if (!viewFromUrl && view !== 'dashboard') {
      // Wenn kein view-Parameter vorhanden ist, zur Dashboard-Ansicht wechseln
      setView('dashboard');
    }
  }, [searchParams, view, setView]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 pb-4 md:gap-6 md:px-6 md:pb-6">
      {/* Bedingtes Rendern basierend auf dem 'view'-State */}
      {view === 'dashboard' ? (
        <>
          <SectionCards />
          <ChartAreaInteractive />
          <DataTable data={tableData} />
          <div className="mt-8 text-center">
            <Link
              href={`/dashboard/company/${uid}/orders/overview`}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129a8f]"
            >
              Alle eingegangenen Aufträge anzeigen
            </Link>
          </div>
        </>
      ) : (
        <SettingsPage userData={userData} onDataSaved={() => setView('dashboard')} />
      )}
    </div>
  );
}
