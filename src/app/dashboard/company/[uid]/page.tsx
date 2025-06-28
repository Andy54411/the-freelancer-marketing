'use client';

import { AppSidebar } from "@/components/app-sidebar"; // Import AppSidebar
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable, schema } from "@/components/data-table"; // Assuming schema is also exported
import { SectionCards } from "@/components/section-cards";
import Link from "next/link"; // Hinzugefügt: Import der Link-Komponente
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
    // Der Haupt-Layout-Container, SidebarVisibilityProvider und ProtectedRoute sind jetzt in layout.tsx
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
      } as React.CSSProperties}>
      <AppSidebar // Sidebar kann auch den View ändern
        variant="inset"
        setView={setView} // setView an die Sidebar übergeben
        className="pt-[var(--global-header-height)]"
      />
      <SidebarInset>
        <main className="flex flex-1 flex-col pt-[var(--global-header-height)]"> {/* Padding für sticky Header */}
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
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
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
