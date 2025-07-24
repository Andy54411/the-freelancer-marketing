// /Users/andystaudinger/Taskilo/src/app/dashboard/company/[uid]/layout.tsx
'use client';

import React, { useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard'; // Hook zum Abrufen der Unternehmensdaten und des Zustands
import { Loader2 as FiLoader } from 'lucide-react'; // Lade-Symbol

const isNonEmptyString = (val: unknown): val is string =>
  typeof val === 'string' && val.trim() !== '';

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Den Hook verwenden, um Unternehmensdaten und -zustand abzurufen
  const {
    isChecking,
    isAuthorized,
    userData,
    setView, // setView wird für die Header-Callbacks benötigt
  } = useCompanyDashboard();

  // Unternehmensdaten für die Header-Komponente vorbereiten
  const companyDataForHeader = useMemo(() => {
    if (!uid) return null;
    return {
      uid: uid,
      companyName: isNonEmptyString(userData?.step2?.companyName)
        ? userData.step2.companyName
        : isNonEmptyString(userData?.companyName)
          ? userData.companyName
          : 'Unbekannte Firma',
      // Für das company logoUrl verwenden wir nur echte Firmenlogos, nicht Benutzer-Profilbilder
      // Das Benutzer-Profilbild wird direkt im Header aus der Firestore geladen
      logoUrl: undefined, // Vorerst kein Firmenlogo, damit das Benutzer-Profilbild angezeigt wird
    };
  }, [uid, userData]);

  // Callbacks für die Header-Komponente, um die Ansicht zu wechseln
  const handleSettingsClick = useCallback(() => {
    // Navigiert zur Haupt-Dashboard-Seite und signalisiert über einen Query-Parameter, dass die Einstellungsansicht angezeigt werden soll.
    router.push(`/dashboard/company/${uid}?view=settings`);
  }, [router, uid]);

  const handleDashboardClick = useCallback(() => {
    // Navigiert zur Haupt-Dashboard-Seite (Standardansicht).
    router.push(`/dashboard/company/${uid}`);
  }, [router, uid]);

  // Lade- und Autorisierungszustand auf Layout-Ebene behandeln.
  // Das Root-Layout unter /dashboard/layout.tsx umschließt diese Komponente bereits mit `ProtectedRoute`.
  // Hier muss nur der Ladezustand für die firmenspezifischen Daten behandelt werden.
  if (isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Lade Dashboard...
      </div>
    );
  }

  return (
    <SidebarVisibilityProvider>
      <div
        className="flex flex-col min-h-screen"
        style={{ '--global-header-height': '64px' } as React.CSSProperties}
      >
        <Header
          company={companyDataForHeader}
          onSettingsClick={handleSettingsClick}
          onDashboardClick={handleDashboardClick}
        />
        <main className="flex-1 overflow-y-auto pt-[var(--global-header-height)]">
          {children} {/* Hier wird der Inhalt der jeweiligen Seite (page.tsx) gerendert */}
        </main>
      </div>
    </SidebarVisibilityProvider>
  );
}
